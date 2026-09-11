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
    
    const formattedData = data
      .map(k => {
        const terisi = pendaftarans.filter(p => p.kelasSeminarId === k.id).length;
        return {
          ...k,
          kuotaTerisi: terisi
        };
      })
      // Only show classes that actually have at least 1 student (exclude ghost/empty classes)
      .filter(k => k.kuotaTerisi > 0);
    
    return NextResponse.json({ kelas: formattedData }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch kelas" }, { status: 500 });
  }
}

