import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { db } from "@/db";
import { pendaftaran, moderator } from "@/db/schema";
import { eq } from "drizzle-orm";
import { formClassFromQueue } from "@/lib/jadwal";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const denied = await requireAdmin();
    if (denied) return denied;

    const { id: idStr } = await params;
    const id = parseInt(idStr);
    const body = await request.json();
    const { status, note } = body;

    if (!['disetujui', 'ditolak', 'menunggu'].includes(status)) {
      return NextResponse.json({ error: "Status tidak valid" }, { status: 400 });
    }

    const existing = await db.select().from(pendaftaran).where(eq(pendaftaran.id, id)).limit(1);
    if (!existing.length) {
      return NextResponse.json({ error: "Pendaftaran tidak ditemukan" }, { status: 404 });
    }
    if (existing[0].isFinalized || existing[0].isReleased) {
      return NextResponse.json({ error: "Pendaftaran sudah difinalisasi. Batalkan finalisasi terlebih dahulu untuk mengubah verifikasi." }, { status: 400 });
    }

    // A student that is no longer approved leaves their class (and its moderator assignment),
    // otherwise a rejected student would stay listed in the class.
    const leavesClass = status !== "disetujui" && existing[0].kelasSeminarId !== null;

    const updated = await db.update(pendaftaran)
      .set({
        statusVerifikasi: status,
        catatanAdmin: note || "",
        ...(leavesClass ? { kelasSeminarId: null } : {}),
      })
      .where(eq(pendaftaran.id, id))
      .returning();

    if (leavesClass) {
      await db.delete(moderator).where(eq(moderator.pendaftaranId, id));
    }

    const reg = updated[0];

    // If the queue of this periode reaches batas kelas, auto-form a class
    if (status === "disetujui" && reg.slotWaktuId && reg.periodeId) {
      const [p] = await db.query.periode.findMany({ where: (t, { eq }) => eq(t.id, reg.periodeId!), limit: 1 });
      if (p) {
        await formClassFromQueue(reg.periodeId, { minStudents: p.batasKelas || 31 });
      }
    }

    return NextResponse.json({
      message: "Status verifikasi berhasil diperbarui.",
      data: reg
    }, { status: 200 });

  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Gagal memproses permintaan." },
      { status: 500 }
    );
  }
}
