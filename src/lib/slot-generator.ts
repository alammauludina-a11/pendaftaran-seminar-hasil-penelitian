import { db } from "@/db";
import { slotWaktu } from "@/db/schema";
import { and, gte, lte } from "drizzle-orm";

export async function autoGenerateSlots(startDateStr: string, endDateStr: string) {
  if (!startDateStr || !endDateStr) return;
  
  try {
    const start = new Date(startDateStr);
    const end = new Date(endDateStr);
    const slotsToInsert = [];
    
    // Fetch existing slots to avoid duplicates
    const existingSlots = await db
      .select()
      .from(slotWaktu)
      .where(
        and(
          gte(slotWaktu.waktuMulai, start),
          lte(slotWaktu.waktuSelesai, new Date(end.getTime() + 24 * 60 * 60 * 1000))
        )
      );

    const slotExists = (startTime: Date) => {
      return existingSlots.some(s => new Date(s.waktuMulai).getTime() === startTime.getTime());
    };

    let current = new Date(start);
    let loopLimit = 0; // prevent infinite loops
    
    while (current <= end && loopLimit < 200) {
      const day = current.getDay();
      
      // Skip Sundays
      if (day !== 0) {
        // Generate slots from 08:00 to 16:50 (skip 12:00)
        for (let hour = 8; hour <= 16; hour++) {
          if (hour === 12) continue;

          const slotStart = new Date(current);
          slotStart.setHours(hour, 0, 0, 0);
          
          const slotEnd = new Date(current);
          slotEnd.setHours(hour, 50, 0, 0);

          if (!slotExists(slotStart)) {
            slotsToInsert.push({
              waktuMulai: slotStart,
              waktuSelesai: slotEnd,
              tersedia: true
            });
          }
        }
      }
      current.setDate(current.getDate() + 1);
      loopLimit++;
    }

    if (slotsToInsert.length > 0) {
      const chunkSize = 100;
      for (let i = 0; i < slotsToInsert.length; i += chunkSize) {
        const chunk = slotsToInsert.slice(i, i + chunkSize);
        await db.insert(slotWaktu).values(chunk);
      }
    }
  } catch (error) {
    console.error("Auto generate slots error:", error);
  }
}
