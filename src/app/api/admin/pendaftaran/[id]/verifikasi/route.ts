import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { transaksi } from "@/db";
import { pendaftaran, moderator, periode } from "@/db/schema";
import { eq } from "drizzle-orm";
import { formClassFromQueue } from "@/lib/jadwal";
import { catatAktivitas } from "@/lib/audit";

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

    // Status change, leaving the class and auto-forming a class happen in one transaction:
    // either all of it is saved or nothing (no rejected student left behind with a moderator or class).
    const hasil = await transaksi(async (tx) => {
      const existing = await tx.select().from(pendaftaran).where(eq(pendaftaran.id, id)).limit(1);
      if (!existing.length) {
        return { error: "Pendaftaran tidak ditemukan", status: 404 } as const;
      }
      if (existing[0].isFinalized || existing[0].isReleased) {
        return { error: "Pendaftaran sudah difinalisasi. Batalkan finalisasi terlebih dahulu untuk mengubah verifikasi.", status: 400 } as const;
      }

      // A student that is no longer approved leaves their class (and its moderator assignment),
      // otherwise a rejected student would stay listed in the class.
      const leavesClass = status !== "disetujui" && existing[0].kelasSeminarId !== null;

      const [reg] = await tx.update(pendaftaran)
        .set({
          statusVerifikasi: status,
          catatanAdmin: note || "",
          ...(leavesClass ? { kelasSeminarId: null } : {}),
        })
        .where(eq(pendaftaran.id, id))
        .returning();

      if (leavesClass) {
        await tx.delete(moderator).where(eq(moderator.pendaftaranId, id));
      }

      // If the queue of this periode reaches batas kelas, auto-form a class
      if (status === "disetujui" && reg.slotWaktuId && reg.periodeId) {
        const [p] = await tx.select({ batasKelas: periode.batasKelas }).from(periode).where(eq(periode.id, reg.periodeId)).limit(1);
        if (p) {
          await formClassFromQueue(reg.periodeId, { minStudents: p.batasKelas || 31 }, tx);
        }
      }

      return { reg, statusLama: existing[0].statusVerifikasi };
    });
    if ("error" in hasil) {
      return NextResponse.json({ error: hasil.error }, { status: hasil.status });
    }
    const { reg, statusLama } = hasil;

    catatAktivitas({
      kategori: "verifikasi",
      aksi: `verifikasi.${status}`,
      deskripsi: `Mengubah status verifikasi {mahasiswa} dari "${statusLama}" menjadi "${status}"`,
      targetTipe: "pendaftaran",
      targetId: id,
      pendaftaranIds: [id],
      detail: { dari: statusLama, ke: status, catatan: note || null },
    });

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
