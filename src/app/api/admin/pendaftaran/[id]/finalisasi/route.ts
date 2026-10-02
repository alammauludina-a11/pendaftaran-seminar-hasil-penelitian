import { NextResponse } from "next/server";
import { transaksi } from "@/db";
import { pendaftaran, moderator } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/admin-auth";
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

    // Checks and update in one transaction, so e.g. a moderator cancellation approved at the same moment
    // can't result in a finalized schedule without a moderator.
    const hasil = await transaksi(async (tx) => {
      const existing = await tx.select().from(pendaftaran).where(eq(pendaftaran.id, id)).limit(1);
      if (!existing.length) {
        return { error: "Pendaftaran tidak ditemukan.", status: 404 } as const;
      }
      const reg = existing[0];

      // Requirements: approved, in a class, room and moderator set. Pembahas is optional ("Paksa Finalisasi").
      if (reg.statusVerifikasi !== "disetujui") {
        return { error: "Pendaftaran belum disetujui.", status: 400 } as const;
      }
      if (!reg.kelasSeminarId) {
        return { error: "Mahasiswa belum masuk kelas.", status: 400 } as const;
      }
      if (!reg.ruanganDisetujui) {
        return { error: "Ruangan belum ditetapkan.", status: 400 } as const;
      }
      const mod = await tx.select({ id: moderator.id }).from(moderator).where(eq(moderator.pendaftaranId, id)).limit(1);
      if (!mod.length) {
        return { error: "Moderator belum dipilih.", status: 400 } as const;
      }

      // Finalisasi also publishes the schedule (rilis happens at finalisasi)
      const updated = await tx
        .update(pendaftaran)
        .set({ isFinalized: true, isReleased: true })
        .where(eq(pendaftaran.id, id))
        .returning();
      return { updated };
    });
    if ("error" in hasil) {
      return NextResponse.json({ error: hasil.error }, { status: hasil.status });
    }
    const { updated } = hasil;

    catatAktivitas({
      kategori: "jadwal",
      aksi: "jadwal.finalisasi",
      deskripsi: "Memfinalisasi dan merilis jadwal {mahasiswa}",
      targetTipe: "pendaftaran",
      targetId: id,
      pendaftaranIds: [id],
    });

    return NextResponse.json({
      message: "Pendaftaran berhasil difinalisasi.",
      data: updated[0],
    }, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Gagal memfinalisasi pendaftaran." }, { status: 500 });
  }
}
