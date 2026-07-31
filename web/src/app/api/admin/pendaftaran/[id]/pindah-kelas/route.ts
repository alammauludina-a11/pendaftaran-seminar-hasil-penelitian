import { NextResponse } from "next/server";
import { db } from "@/db";
import { pendaftaran, kelasSeminar } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { kelasSeminarId } = body;

    // Fetch the registration
    const existing = await db.select().from(pendaftaran).where(eq(pendaftaran.id, parseInt(id)));
    if (existing.length === 0) {
      return NextResponse.json({ error: "Data pendaftaran tidak ditemukan" }, { status: 404 });
    }

    if (kelasSeminarId !== null) {
      // Validate that the target class exists
      const targetClass = await db.select().from(kelasSeminar).where(eq(kelasSeminar.id, kelasSeminarId));
      if (targetClass.length === 0) {
        return NextResponse.json({ error: "Kelas tujuan tidak ditemukan" }, { status: 404 });
      }
      // Note: we are explicitly allowing admin to override the capacity limit as per requirement.
    }

    // Update the record
    await db.update(pendaftaran)
      .set({ kelasSeminarId: kelasSeminarId })
      .where(eq(pendaftaran.id, parseInt(id)));

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Error updating kelas:", error);
    return NextResponse.json({ error: "Gagal memindahkan kelas" }, { status: 500 });
  }
}
