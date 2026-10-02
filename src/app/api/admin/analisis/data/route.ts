import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { db } from "@/db";
import { pendaftaran, users, periode, slotWaktu } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET() {
  try {
    const denied = await requireAdmin();
    if (denied) return denied;

    // Fetch hasil_penelitian rows with their slot time
    const rawData = await db
      .select({
        userId: pendaftaran.userId,
        angkatan: periode.angkatan,
        prodi: users.prodi,
        konsentrasi: pendaftaran.konsentrasi,
        judulPenelitian: pendaftaran.judulPenelitian,
        isReleased: pendaftaran.isReleased,
        statusVerifikasi: pendaftaran.statusVerifikasi,
        hasilWaktuMulai: slotWaktu.waktuMulai,
      })
      .from(pendaftaran)
      .leftJoin(users, eq(pendaftaran.userId, users.id))
      .leftJoin(periode, eq(pendaftaran.periodeId, periode.id))
      .leftJoin(slotWaktu, eq(pendaftaran.slotWaktuId, slotWaktu.id))
      .where(eq(pendaftaran.jenisSeminar, "hasil_penelitian"));

    // Fetch every approved kolokium in one query, keyed by student (earliest slot wins)
    const kolokiumRows = await db
      .select({ userId: pendaftaran.userId, angkatan: periode.angkatan, isReleased: pendaftaran.isReleased, waktuMulai: slotWaktu.waktuMulai })
      .from(pendaftaran)
      .leftJoin(periode, eq(pendaftaran.periodeId, periode.id))
      .leftJoin(slotWaktu, eq(pendaftaran.slotWaktuId, slotWaktu.id))
      .where(
        and(
          eq(pendaftaran.jenisSeminar, "kolokium"),
          eq(pendaftaran.statusVerifikasi, "disetujui")
        )
      );

    const kolokiumByUser = new Map<string, Date>();
    for (const k of kolokiumRows) {
      if (!k.userId || !k.waktuMulai || isNaN(k.waktuMulai.getTime())) continue;
      const existing = kolokiumByUser.get(k.userId);
      if (!existing || k.waktuMulai < existing) kolokiumByUser.set(k.userId, k.waktuMulai);
    }

    const now = new Date();
    let tanpaKolokium = 0;

    // Progress funnel: distinct students per stage, grouped by angkatan
    type FunnelSets = { kolokium: Set<string>; daftarHasil: Set<string>; disetujui: Set<string>; dirilis: Set<string>; selesai: Set<string> };
    const funnelMap: Record<string, FunnelSets> = {};
    const funnelFor = (angkatan: string) =>
      (funnelMap[angkatan] ??= { kolokium: new Set(), daftarHasil: new Set(), disetujui: new Set(), dirilis: new Set(), selesai: new Set() });

    // A kolokium counts as finished once its schedule is released and the slot has passed
    for (const k of kolokiumRows) {
      if (!k.userId || !k.isReleased || !k.waktuMulai || k.waktuMulai > now) continue;
      funnelFor(k.angkatan || "Unknown").kolokium.add(k.userId);
    }

    for (const row of rawData) {
      if (!row.userId) continue;
      const f = funnelFor(row.angkatan || "Unknown");
      f.daftarHasil.add(row.userId);
      if (row.statusVerifikasi !== "disetujui") continue;
      f.disetujui.add(row.userId);
      if (!row.isReleased || !row.hasilWaktuMulai) continue;
      f.dirilis.add(row.userId);
      if (new Date(row.hasilWaktuMulai) <= now) f.selesai.add(row.userId);
    }

    const durationMap: Record<string, { "< 1 Bulan": number, "1 - 3 Bulan": number, "3 - 6 Bulan": number, "> 6 Bulan": number }> = {};
    const konsentrasiMap: Record<string, Record<string, number>> = {};
    const titles: string[] = [];

    for (const row of rawData) {
      const angkatan = row.angkatan || "Unknown";

      // Tren konsentrasi counts every hasil_penelitian registration the admin has approved,
      // without waiting for the seminar to be released or held
      if (row.statusVerifikasi === "disetujui") {
        if (!konsentrasiMap[angkatan]) {
          konsentrasiMap[angkatan] = {};
        }
        const kons = row.konsentrasi || row.prodi || "Lainnya";
        konsentrasiMap[angkatan][kons] = (konsentrasiMap[angkatan][kons] || 0) + 1;
      }

      // Duration and title analysis only cover students who have finished the seminar
      if (!row.isReleased || !row.hasilWaktuMulai) continue;
      if (new Date(row.hasilWaktuMulai) > now) continue;

      if (!durationMap[angkatan]) {
        durationMap[angkatan] = { "< 1 Bulan": 0, "1 - 3 Bulan": 0, "3 - 6 Bulan": 0, "> 6 Bulan": 0 };
      }

      if (row.judulPenelitian) {
        titles.push(row.judulPenelitian);
      }

      // Resolve the actual kolokium date from the student's kolokium pendaftaran slot
      const tKol = row.userId ? kolokiumByUser.get(row.userId) : undefined;
      if (!tKol) {
        tanpaKolokium++;
        continue;
      }

      const hasilSlotTime = new Date(row.hasilWaktuMulai);
      const diffTime = Math.abs(hasilSlotTime.getTime() - tKol.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      const diffMonths = diffDays / 30;

      if (diffMonths < 1) durationMap[angkatan]["< 1 Bulan"]++;
      else if (diffMonths <= 3) durationMap[angkatan]["1 - 3 Bulan"]++;
      else if (diffMonths <= 6) durationMap[angkatan]["3 - 6 Bulan"]++;
      else durationMap[angkatan]["> 6 Bulan"]++;
    }

    const durationData = Object.keys(durationMap).map(angkatan => ({
      name: angkatan,
      ...durationMap[angkatan]
    })).sort((a, b) => a.name.localeCompare(b.name));

    const konsentrasiData = Object.keys(konsentrasiMap).map(angkatan => ({
      name: angkatan,
      ...konsentrasiMap[angkatan]
    })).sort((a, b) => a.name.localeCompare(b.name));

    const funnelData = Object.keys(funnelMap).map(angkatan => ({
      name: angkatan,
      kolokium: funnelMap[angkatan].kolokium.size,
      daftarHasil: funnelMap[angkatan].daftarHasil.size,
      disetujui: funnelMap[angkatan].disetujui.size,
      dirilis: funnelMap[angkatan].dirilis.size,
      selesai: funnelMap[angkatan].selesai.size,
    })).sort((a, b) => a.name.localeCompare(b.name));

    const sampleTitles = titles.slice(-100);

    return NextResponse.json({
      durationData,
      konsentrasiData,
      tanpaKolokium,
      funnelData,
      titles: sampleTitles
    }, { status: 200 });

  } catch (error: any) {
    console.error("Analisis data fetch error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch data" }, { status: 500 });
  }
}
