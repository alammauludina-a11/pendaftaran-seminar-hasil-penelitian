import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { db } from "@/db";
import { kelasSeminar, pendaftaran } from "@/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const denied = await requireAdmin();
    if (denied) return denied;

    // Count students per class from the actual pendaftaran table for accuracy (run both queries in parallel)
    const [data, pendaftarans] = await Promise.all([
      db.select().from(kelasSeminar),
      db.select({ kelasSeminarId: pendaftaran.kelasSeminarId }).from(pendaftaran),
    ]);

    const countByKelas = new Map<number, number>();
    for (const p of pendaftarans) {
      if (p.kelasSeminarId != null) countByKelas.set(p.kelasSeminarId, (countByKelas.get(p.kelasSeminarId) || 0) + 1);
    }

    const withCounts = data.map(k => ({ ...k, kuotaTerisi: countByKelas.get(k.id) || 0 }));

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

