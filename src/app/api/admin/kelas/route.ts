import { NextResponse } from "next/server";
import { db } from "@/db";
import { kelasSeminar, pendaftaran } from "@/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await db.select().from(kelasSeminar);
    
    // Count students per class from the actual pendaftaran table for accuracy
    const pendaftarans = await db.select().from(pendaftaran);
    
    const withCounts = data.map(k => {
      const terisi = pendaftarans.filter(p => p.kelasSeminarId === k.id).length;
      return { ...k, kuotaTerisi: terisi };
    });

    const formattedData = withCounts.filter(k => {
      if (k.kuotaTerisi > 0) return true; // Always show non-empty classes

      // For empty classes (e.g., Kelas D cancelled): show them only if there's
      // a higher-letter class in the same periode. This lets admin move students
      // into the gap to keep the class ordering tidy.
      const samePeriodeClasses = withCounts
        .filter(c => c.periodeId === k.periodeId)
        .sort((a, b) => a.namaKelas.localeCompare(b.namaKelas));
      
      const thisIndex = samePeriodeClasses.findIndex(c => c.id === k.id);
      const hasHigherClass = samePeriodeClasses.slice(thisIndex + 1).some(c => c.kuotaTerisi > 0);
      
      return hasHigherClass; // Only show gap class if later non-empty classes exist
    });
    
    return NextResponse.json({ kelas: formattedData }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch kelas" }, { status: 500 });
  }
}

