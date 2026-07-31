import { NextResponse } from "next/server";
import { db } from "@/db";
import { pendaftaran } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idStr } = await params;
    const id = parseInt(idStr);
    const body = await request.json();
    const { action } = body;

    if (action === "approve") {
      // Find the application
      const existing = await db.select().from(pendaftaran).where(eq(pendaftaran.id, id));
      if (!existing.length) {
        return NextResponse.json({ error: "Data tidak ditemukan" }, { status: 404 });
      }

      const p = existing[0];
      if (!p.ruanganDiajukan) {
        return NextResponse.json({ error: "Tidak ada pengajuan ruangan" }, { status: 400 });
      }

      // Approve it
      const updated = await db.update(pendaftaran)
        .set({
          ruanganDisetujui: p.ruanganDiajukan,
          statusRuangan: "disetujui"
        })
        .where(eq(pendaftaran.id, id))
        .returning();

      return NextResponse.json({
        message: "Ruangan disetujui",
        data: updated[0]
      }, { status: 200 });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { error: "Gagal memproses permintaan." },
      { status: 500 }
    );
  }
}
