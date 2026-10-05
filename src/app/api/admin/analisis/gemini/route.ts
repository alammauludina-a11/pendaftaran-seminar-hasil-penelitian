import { NextResponse } from 'next/server';
import { createHash } from "node:crypto";
import { requireAdmin } from "@/lib/admin-auth";
import { GoogleGenAI } from '@google/genai';
import { analisisJudul } from "@/lib/analisis-judul";
import { ambilJudulDisetujui } from "@/lib/analisis-judul-db";
import {
  MIN_JUDUL, SKEMA_INTERPRETASI, VERSI_PROMPT, buatPrompt, cariPembanding, rapikanInterpretasi, susunRingkasanAI,
  type Interpretasi,
} from "@/lib/interpretasi-judul";

const MODEL = 'gemini-3.6-flash';

// Same data + same prompt version → same answer, so repeat clicks don't call Gemini again.
// In-memory is enough: the app runs as a single server and a restart only costs one extra call.
type Tersimpan = { interpretasi: Interpretasi; dibuatPada: string };
const cache = new Map<string, Tersimpan>();
const MAKS_CACHE = 30;

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
          temperature: 0.3,
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

    // The summary is built here from the database, never from data sent by the browser
    const semuaJudul = await ambilJudulDisetujui();
    const daftar = semuaJudul[angkatan] ?? [];
    if (daftar.length < MIN_JUDUL) {
      return NextResponse.json({
        error: `Interpretasi AI membutuhkan minimal ${MIN_JUDUL} judul yang disetujui. Angkatan ${angkatan} baru memiliki ${daftar.length} judul.`,
      }, { status: 400 });
    }

    const angkatanPembanding = cariPembanding(angkatan, semuaJudul);
    const ringkasan = susunRingkasanAI(
      angkatan,
      analisisJudul(daftar, { batas: 30 }),
      angkatanPembanding ? { angkatan: angkatanPembanding, hasil: analisisJudul(semuaJudul[angkatanPembanding], { batas: 30 }) } : undefined,
    );

    const kunci = createHash("sha256").update(VERSI_PROMPT + JSON.stringify(ringkasan)).digest("hex");
    const tersimpan = cache.get(kunci);
    if (tersimpan) {
      return NextResponse.json({ ...tersimpan, model: MODEL, pembanding: angkatanPembanding, dariCache: true });
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

    const hasil: Tersimpan = { interpretasi, dibuatPada: new Date().toISOString() };
    if (cache.size >= MAKS_CACHE) cache.delete(cache.keys().next().value!);
    cache.set(kunci, hasil);

    return NextResponse.json({ ...hasil, model: MODEL, pembanding: angkatanPembanding, dariCache: false });
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
