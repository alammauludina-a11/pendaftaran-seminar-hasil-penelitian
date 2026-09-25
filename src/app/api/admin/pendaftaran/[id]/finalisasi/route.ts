import { NextResponse } from "next/server";
import { db } from "@/db";
import { pendaftaran, moderator } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/admin-auth";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const denied = await requireAdmin();
    if (denied) return denied;

    const { id: idStr } = await params;
    const id = parseInt(idStr);

    const existing = await db.select().from(pendaftaran).where(eq(pendaftaran.id, id)).limit(1);
    if (!existing.length) {
      return NextResponse.json({ error: "Pendaftaran tidak ditemukan." }, { status: 404 });
    }
    const reg = existing[0];

    // Requirements: approved, in a class, room and moderator set. Pembahas is optional ("Paksa Finalisasi").
    if (reg.statusVerifikasi !== "disetujui") {
      return NextResponse.json({ error: "Pendaftaran belum disetujui." }, { status: 400 });
    }
    if (!reg.kelasSeminarId) {
      return NextResponse.json({ error: "Mahasiswa belum masuk kelas." }, { status: 400 });
    }
    if (!reg.ruanganDisetujui) {
      return NextResponse.json({ error: "Ruangan belum ditetapkan." }, { status: 400 });
    }
    const mod = await db.select({ id: moderator.id }).from(moderator).where(eq(moderator.pendaftaranId, id)).limit(1);
    if (!mod.length) {
      return NextResponse.json({ error: "Moderator belum dipilih." }, { status: 400 });
    }

    // Finalisasi also publishes the schedule (rilis happens at finalisasi)
    const updated = await db
      .update(pendaftaran)
      .set({ isFinalized: true, isReleased: true })
      .where(eq(pendaftaran.id, id))
      .returning();

    return NextResponse.json({
      message: "Pendaftaran berhasil difinalisasi.",
      data: updated[0],
    }, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Gagal memfinalisasi pendaftaran." }, { status: 500 });
  }
}
