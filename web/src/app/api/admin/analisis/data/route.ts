import { NextResponse } from "next/server";
import { db } from "@/db";
import { pendaftaran, users, periode, slotWaktu } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  const parseIndoDate = (str: string) => {
    if (!str) return new Date("");
    const months: Record<string, string> = {
      'januari': 'jan', 'februari': 'feb', 'maret': 'mar', 'april': 'apr', 'mei': 'may', 'juni': 'jun', 
      'juli': 'jul', 'agustus': 'aug', 'september': 'sep', 'oktober': 'oct', 'november': 'nov', 'desember': 'dec',
      'agt': 'aug', 'okt': 'oct', 'des': 'dec'
    };
    const cleaned = str.toLowerCase().replace(/[^a-z0-9 ]/g, '');
    const parts = cleaned.split(' ');
    if (parts.length === 3) {
      parts[1] = months[parts[1]] || parts[1];
      return new Date(parts.join(' '));
    }
    return new Date(str);
  };

  try {
    const rawData = await db
      .select({
        angkatan: periode.angkatan,
        prodi: users.prodi,
        konsentrasi: pendaftaran.konsentrasi,
        judulPenelitian: pendaftaran.judulPenelitian,
        tanggalKolokium: pendaftaran.tanggalKolokium,
        createdAt: pendaftaran.createdAt,
        isReleased: pendaftaran.isReleased,
        waktuMulai: slotWaktu.waktuMulai,
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
      if (!row.isReleased || !row.waktuMulai) continue;
      if (new Date(row.waktuMulai) > now) continue;

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

      if (row.tanggalKolokium && row.createdAt) {
        const tKol = parseIndoDate(row.tanggalKolokium);
        const tSem = new Date(row.createdAt); 
        
        if (!isNaN(tKol.getTime()) && !isNaN(tSem.getTime())) {
          const diffTime = Math.abs(tSem.getTime() - tKol.getTime());
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
