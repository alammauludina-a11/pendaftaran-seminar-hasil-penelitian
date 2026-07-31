import { NextResponse } from "next/server";
import { db } from "@/db";
import { slotWaktu, pendaftaran } from "@/db/schema";
import { eq, isNotNull, ne, and } from "drizzle-orm";

export async function GET() {
  try {
    const slots = await db.select().from(slotWaktu).where(eq(slotWaktu.tersedia, true));

    // Get all times that are currently booked by students (not rejected)
    const takenSlots = await db
      .select({ waktuMulai: slotWaktu.waktuMulai })
      .from(pendaftaran)
      .innerJoin(slotWaktu, eq(pendaftaran.slotWaktuId, slotWaktu.id))
      .where(
        and(
          isNotNull(pendaftaran.slotWaktuId),
          ne(pendaftaran.statusVerifikasi, 'ditolak')
        )
      );

    const takenTimes = new Set(takenSlots.map(t => t.waktuMulai?.getTime()));

    // Combine into a structure that front-end can easily use
    const uniqueKeys = new Set();
    const availableSlots = [];
    
    for (const s of slots) {
      if (!s.waktuMulai) continue;
      
      // If this time is taken by any non-rejected registration, skip it entirely
      if (takenTimes.has(s.waktuMulai.getTime())) {
        continue;
      }
      
      const dateObj = new Date(s.waktuMulai);
      const isoDate = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
      const time = s.waktuSelesai ? `${dateObj.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} - ${new Date(s.waktuSelesai).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}` : "";
      
      const key = `${isoDate}_${time}`;
      if (!uniqueKeys.has(key)) {
        uniqueKeys.add(key);
        availableSlots.push({
          id: s.id,
          isoDate: isoDate,
          date: dateObj.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
          hari: dateObj.toLocaleDateString('id-ID', { weekday: 'long' }),
          time: time,
          available: true
        });
      }
    }

    return NextResponse.json({ availableSlots }, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch data" }, { status: 500 });
  }
}
