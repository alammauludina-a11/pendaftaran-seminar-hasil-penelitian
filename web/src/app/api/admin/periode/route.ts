import { NextResponse } from "next/server";
import { db } from "@/db";
import { periode } from "@/db/schema";
import { eq } from "drizzle-orm";
import { autoGenerateSlots } from "@/lib/slot-generator";

export async function GET() {
  try {
    const periodesData = await db.select().from(periode);
    const periodes = periodesData.map(p => ({
      ...p,
      forcedClasses: [],
      cancelledClasses: []
    }));
    return NextResponse.json({ periodes }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch data" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { 
      angkatan, startDate, endDate, registrationEndDate, isOpen, batasKelas, isDraft, jenisSeminar
    } = body;

    if (!angkatan) {
      return NextResponse.json(
        { error: "Nama angkatan wajib diisi." },
        { status: 400 }
      );
    }

    let finalStart = startDate || '';
    let finalEnd = endDate || '';
    
    if (finalStart && finalEnd && new Date(finalStart) > new Date(finalEnd)) {
      const temp = finalStart;
      finalStart = finalEnd;
      finalEnd = temp;
    }

    const newPeriode = await db.insert(periode).values({
      angkatan,
      jenisSeminar: jenisSeminar || "hasil_penelitian",
      startDate: finalStart,
      endDate: finalEnd,
      registrationEndDate: registrationEndDate || '',
      isOpen: isOpen || false,
      batasKelas: batasKelas || 31,
      isDraft: isDraft !== undefined ? isDraft : true
    }).returning();

    // Auto generate slots if the period is created as open
    if (newPeriode[0].isOpen && newPeriode[0].startDate && newPeriode[0].endDate) {
      await autoGenerateSlots(newPeriode[0].startDate, newPeriode[0].endDate);
    }

    // The current frontend uses properties like forcedClasses and cancelledClasses 
    // which aren't in our current simple DB schema. We will append them as empty arrays 
    // to satisfy the frontend type for now.
    const responsePeriode = {
      ...newPeriode[0],
      forcedClasses: [],
      cancelledClasses: []
    };

    return NextResponse.json({
      message: "Periode berhasil dibuat.",
      periode: responsePeriode
    }, { status: 201 });

  } catch (error) {
    return NextResponse.json(
      { error: "Gagal memproses permintaan." },
      { status: 500 }
    );
  }
}
