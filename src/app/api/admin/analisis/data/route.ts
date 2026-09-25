import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { db } from "@/db";
import { pendaftaran, users, periode, slotWaktu } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { alias } from "drizzle-orm/sqlite-core";

const kolokiumSlot = alias(slotWaktu, "kolokiumSlot");
const kolokiumPend = alias(pendaftaran, "kolokiumPend");

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
        hasilWaktuMulai: slotWaktu.waktuMulai,
      })
      .from(pendaftaran)
      .leftJoin(users, eq(pendaftaran.userId, users.id))
      .leftJoin(periode, eq(pendaftaran.periodeId, periode.id))
      .leftJoin(slotWaktu, eq(pendaftaran.slotWaktuId, slotWaktu.id))
      .where(eq(pendaftaran.jenisSeminar, "hasil_penelitian"));

    const now = new Date();

    const durationMap: Record<string, { "< 1 Bulan": number, "1 - 3 Bulan": number, "3 - 6 Bulan": number, "> 6 Bulan": number }> = {};
    const konsentrasiMap: Record<string, Record<string, number>> = {};
    const titles: string[] = [];

    for (const row of rawData) {
      if (!row.isReleased || !row.hasilWaktuMulai) continue;
      if (new Date(row.hasilWaktuMulai) > now) continue;

      const angkatan = row.angkatan || "Unknown";

      if (!durationMap[angkatan]) {
        durationMap[angkatan] = { "< 1 Bulan": 0, "1 - 3 Bulan": 0, "3 - 6 Bulan": 0, "> 6 Bulan": 0 };
      }
      if (!konsentrasiMap[angkatan]) {
        konsentrasiMap[angkatan] = {};
      }

      if (row.judulPenelitian) {
        titles.push(row.judulPenelitian);
      }

      const kons = row.konsentrasi || row.prodi || "Lainnya";
      konsentrasiMap[angkatan][kons] = (konsentrasiMap[angkatan][kons] || 0) + 1;

      // Resolve the actual kolokium date from the student's kolokium pendaftaran slot
      if (row.userId) {
        const kolokiumData = await db
          .select({ waktuMulai: slotWaktu.waktuMulai })
          .from(pendaftaran)
          .leftJoin(slotWaktu, eq(pendaftaran.slotWaktuId, slotWaktu.id))
          .where(
            and(
              eq(pendaftaran.userId, row.userId),
              eq(pendaftaran.jenisSeminar, "kolokium"),
              eq(pendaftaran.statusVerifikasi, "disetujui")
            )
          )
          .limit(1);

        const kolokiumSlotTime = kolokiumData[0]?.waktuMulai;
        const hasilSlotTime = new Date(row.hasilWaktuMulai);

        if (kolokiumSlotTime && !isNaN(kolokiumSlotTime.getTime())) {
          const tKol = new Date(kolokiumSlotTime);
          const diffTime = Math.abs(hasilSlotTime.getTime() - tKol.getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          const diffMonths = diffDays / 30;

          if (diffMonths < 1) durationMap[angkatan]["< 1 Bulan"]++;
          else if (diffMonths <= 3) durationMap[angkatan]["1 - 3 Bulan"]++;
          else if (diffMonths <= 6) durationMap[angkatan]["3 - 6 Bulan"]++;
          else durationMap[angkatan]["> 6 Bulan"]++;
        }
      }
    }

    const durationData = Object.keys(durationMap).map(angkatan => ({
      name: angkatan,
      ...durationMap[angkatan]
    })).sort((a, b) => a.name.localeCompare(b.name));

    const konsentrasiData = Object.keys(konsentrasiMap).map(angkatan => ({
      name: angkatan,
      ...konsentrasiMap[angkatan]
    })).sort((a, b) => a.name.localeCompare(b.name));

    const sampleTitles = titles.slice(-100);

    return NextResponse.json({
      durationData,
      konsentrasiData,
      titles: sampleTitles
    }, { status: 200 });

  } catch (error: any) {
    console.error("Analisis data fetch error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch data" }, { status: 500 });
  }
}
