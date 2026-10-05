// Loads the titles that Analisis Judul works on. Shared by the dashboard data route and the AI
// interpretation route so both always look at exactly the same set of titles.
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { pendaftaran, periode, users } from "@/db/schema";
import type { JudulInput } from "@/lib/analisis-judul";

/** Approved Seminar Hasil titles grouped by angkatan (seminar does not need to have taken place). */
export async function ambilJudulDisetujui(): Promise<Record<string, JudulInput[]>> {
  const rows = await db
    .select({
      id: pendaftaran.id,
      judul: pendaftaran.judulPenelitian,
      konsentrasi: pendaftaran.konsentrasi,
      prodi: users.prodi,
      nama: users.nama,
      nim: users.nipNim,
      angkatan: periode.angkatan,
    })
    .from(pendaftaran)
    .leftJoin(users, eq(pendaftaran.userId, users.id))
    .leftJoin(periode, eq(pendaftaran.periodeId, periode.id))
    .where(and(eq(pendaftaran.jenisSeminar, "hasil_penelitian"), eq(pendaftaran.statusVerifikasi, "disetujui")));

  const perAngkatan: Record<string, JudulInput[]> = {};
  for (const r of rows) {
    const judul = r.judul?.trim();
    if (!judul) continue;
    (perAngkatan[r.angkatan || "Unknown"] ??= []).push({
      id: r.id,
      judul,
      konsentrasi: r.konsentrasi || r.prodi || null,
      nama: r.nama,
      nim: r.nim,
    });
  }
  return perAngkatan;
}
