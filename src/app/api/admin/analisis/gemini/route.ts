import { NextResponse } from 'next/server';
import { headers } from "next/headers";
import { createHash } from "node:crypto";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { interpretasiJudul } from "@/db/schema";
import { auth } from "@/lib/auth";
import { requireAdmin } from "@/lib/admin-auth";
import { GoogleGenAI } from '@google/genai';
import { analisisJudul } from "@/lib/analisis-judul";
import { ambilJudulDisetujui } from "@/lib/analisis-judul-db";
import {
  MIN_JUDUL, SKEMA_INTERPRETASI, VERSI_PROMPT, buatPrompt, cariPembanding, rapikanInterpretasi, susunRingkasanAI,
  type Interpretasi, type RingkasanAI,
} from "@/lib/interpretasi-judul";
import type { JudulInput } from "@/lib/analisis-judul";

const MODEL = 'gemini-3.6-flash';

type Persiapan =
  | { cukup: false; pesan: string }
  | { cukup: true; daftar: JudulInput[]; ringkasan: RingkasanAI; kunci: string; pembanding: string | null };

/** Builds the AI summary for an angkatan from the database (never from data sent by the browser). */
async function siapkan(angkatan: string): Promise<Persiapan> {
  const semuaJudul = await ambilJudulDisetujui();
  const daftar = semuaJudul[angkatan] ?? [];
  if (daftar.length < MIN_JUDUL) {
    return { cukup: false, pesan: `Interpretasi AI membutuhkan minimal ${MIN_JUDUL} judul yang disetujui. Angkatan ${angkatan} baru memiliki ${daftar.length} judul.` };
  }
  const pembanding = cariPembanding(angkatan, semuaJudul);
  const ringkasan = susunRingkasanAI(
    angkatan,
    analisisJudul(daftar, { batas: 30 }),
    pembanding ? { angkatan: pembanding, hasil: analisisJudul(semuaJudul[pembanding], { batas: 30 }) } : undefined,
  );
  const kunci = createHash("sha256").update(VERSI_PROMPT + JSON.stringify(ringkasan)).digest("hex");
  return { cukup: true, daftar, ringkasan, kunci, pembanding };
}

type Baris = typeof interpretasiJudul.$inferSelect;

/** Shape sent to the dashboard. `kedaluwarsa`: the titles (or the prompt) changed since it was made. */
function keKlien(row: Baris, kunciSekarang: string | null) {
  return {
    interpretasi: JSON.parse(row.hasil) as Interpretasi,
    dibuatPada: row.createdAt.toISOString(),
    dibuatOleh: row.dibuatOlehNama,
    model: row.model,
    pembanding: row.pembanding,
    kedaluwarsa: kunciSekarang !== null && row.kunciData !== kunciSekarang,
  };
}

async function terbaru(angkatan: string): Promise<Baris | undefined> {
  const [row] = await db.select().from(interpretasiJudul)
    .where(eq(interpretasiJudul.angkatan, angkatan))
    .orderBy(desc(interpretasiJudul.createdAt))
    .limit(1);
  return row;
}

/** Latest saved interpretation for an angkatan, so it survives restarts and reads the same for everyone. */
export async function GET(request: Request) {
  try {
    const denied = await requireAdmin();
    if (denied) return denied;

    const angkatan = new URL(request.url).searchParams.get("angkatan") ?? "";
    if (!angkatan) return NextResponse.json({ error: "Angkatan wajib dipilih." }, { status: 400 });

    const row = await terbaru(angkatan);
    if (!row) return NextResponse.json({ tersimpan: null });
    const persiapan = await siapkan(angkatan);
    return NextResponse.json({ tersimpan: keKlien(row, persiapan.cukup ? persiapan.kunci : null) });
  } catch (error: any) {
    console.error("Gagal memuat interpretasi tersimpan:", error);
    return NextResponse.json({ error: "Gagal memuat interpretasi tersimpan." }, { status: 500 });
  }
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function generateWithRetry(ai: GoogleGenAI, prompt: string, maxRetries = 3): Promise<string> {
  let lastError: any;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: MODEL,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseJsonSchema: SKEMA_INTERPRETASI,
          // Same input should give (nearly) the same reading: no sampling freedom and a fixed seed
          temperature: 0,
          seed: 20261005,
        }
      });
      const resultText = response.text;
      if (!resultText) throw new Error("Empty response from Gemini");
      return resultText;
    } catch (err: any) {
      lastError = err;
      const isRetryable = err?.status === 503 || err?.code === 503 ||
        (err?.message && (err.message.includes('503') || err.message.includes('UNAVAILABLE') || err.message.includes('high demand')));
      
      if (isRetryable && attempt < maxRetries) {
        const delay = attempt * 2000; // 2s, 4s
        console.warn(`Gemini 503 on attempt ${attempt}, retrying in ${delay}ms...`);
        await sleep(delay);
        continue;
      }
      throw err;
    }
  }
  throw lastError;
}

export async function POST(request: Request) {
  try {
    const denied = await requireAdmin();
    if (denied) return denied;

    const body = await request.json().catch(() => ({}));
    const angkatan = typeof body?.angkatan === "string" ? body.angkatan : "";
    if (!angkatan) {
      return NextResponse.json({ error: "Angkatan wajib dipilih." }, { status: 400 });
    }

    const buatUlang = body?.buatUlang === true;

    const persiapan = await siapkan(angkatan);
    if (!persiapan.cukup) {
      return NextResponse.json({ error: persiapan.pesan }, { status: 400 });
    }
    const { daftar, ringkasan, kunci, pembanding } = persiapan;

    // Same data + same prompt version → reuse the saved reading unless a regeneration is asked for
    if (!buatUlang) {
      const [sama] = await db.select().from(interpretasiJudul)
        .where(eq(interpretasiJudul.kunciData, kunci))
        .orderBy(desc(interpretasiJudul.createdAt))
        .limit(1);
      if (sama) return NextResponse.json({ tersimpan: keKlien(sama, kunci) });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ 
        error: 'GEMINI_API_KEY is not set in environment variables. Silakan tambahkan di .env.local' 
      }, { status: 500 });
    }

    const ai = new GoogleGenAI({ apiKey });
    const resultText = await generateWithRetry(ai, buatPrompt(ringkasan));
    const interpretasi = rapikanInterpretasi(JSON.parse(resultText), ringkasan, daftar);
    if (interpretasi.ringkasanEksekutif.length === 0) {
      throw new Error("Jawaban AI tidak lengkap. Silakan coba lagi.");
    }

    const session = await auth.api.getSession({ headers: await headers() });
    const [row] = await db.insert(interpretasiJudul).values({
      id: crypto.randomUUID(),
      angkatan,
      kunciData: kunci,
      versiPrompt: VERSI_PROMPT,
      model: MODEL,
      pembanding,
      hasil: JSON.stringify(interpretasi),
      dibuatOlehId: session?.user.id ?? null,
      dibuatOlehNama: (session?.user as { nama?: string } | undefined)?.nama ?? session?.user.name ?? null,
    }).returning();

    return NextResponse.json({ tersimpan: keKlien(row, kunci) });
  } catch (error: any) {
    console.error('Gemini API Error:', error);
    
    // Extract a user-friendly message from various error shapes
    let friendlyMessage = 'Terjadi kesalahan saat menghubungi Gemini API.';
    
    const rawMessage: string = error?.message || '';
    const errorObj = error?.error || error;
    const code = errorObj?.code || error?.status;
    const status = errorObj?.status || '';
    
    if (code === 503 || status === 'UNAVAILABLE' || rawMessage.includes('503') || rawMessage.includes('UNAVAILABLE') || rawMessage.includes('high demand')) {
      friendlyMessage = 'Server AI sedang mengalami beban tinggi. Silakan coba lagi dalam beberapa saat.';
    } else if (code === 429 || status === 'RESOURCE_EXHAUSTED' || rawMessage.includes('429') || rawMessage.includes('quota')) {
      friendlyMessage = 'Batas penggunaan API Gemini tercapai. Silakan coba lagi nanti.';
    } else if (code === 400 || status === 'INVALID_ARGUMENT') {
      friendlyMessage = 'Permintaan tidak valid. Pastikan data yang dikirim sudah benar.';
    } else if (rawMessage.includes('API key') || rawMessage.includes('GEMINI_API_KEY')) {
      friendlyMessage = 'API Key Gemini tidak valid atau belum dikonfigurasi.';
    } else if (rawMessage) {
      friendlyMessage = rawMessage;
    }
    
    return NextResponse.json({ error: friendlyMessage }, { status: 500 });
  }
}
