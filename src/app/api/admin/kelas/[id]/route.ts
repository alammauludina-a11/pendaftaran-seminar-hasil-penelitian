import { NextResponse } from "next/server";
import { transaksi } from "@/db";
import { pendaftaran, kelasSeminar } from "@/db/schema";
import { and, eq, or } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { catatAktivitas } from "@/lib/audit";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: idStr } = await params;
    const id = parseInt(idStr);

    // Check, unassign and delete in one transaction: no student can be finalized or moved in between,
    // and a failure halfway never leaves students pointing at a deleted class.
    const hasil = await transaksi(async (tx) => {
      // A class with finalized/released students can't be cancelled (their schedule is already published)
      const locked = await tx.select({ id: pendaftaran.id }).from(pendaftaran)
        .where(and(eq(pendaftaran.kelasSeminarId, id), or(eq(pendaftaran.isFinalized, true), eq(pendaftaran.isReleased, true))))
        .limit(1);
      if (locked.length > 0) return { locked: true } as const;

      const [kelas] = await tx.select({ namaKelas: kelasSeminar.namaKelas }).from(kelasSeminar).where(eq(kelasSeminar.id, id)).limit(1);

      // Unassign students from this class
      await tx.update(pendaftaran)
        .set({ kelasSeminarId: null })
        .where(eq(pendaftaran.kelasSeminarId, id));

      // Delete the class
      await tx.delete(kelasSeminar)
        .where(eq(kelasSeminar.id, id));

      return { kelas };
    });
    if ("locked" in hasil) {
      return NextResponse.json({ error: "Kelas tidak dapat dibatalkan karena ada mahasiswa yang sudah difinalisasi. Batalkan finalisasinya terlebih dahulu." }, { status: 400 });
    }
    const { kelas } = hasil;

    catatAktivitas({
      kategori: "kelas",
      aksi: "kelas.batal",
      deskripsi: `Membatalkan Kelas ${kelas?.namaKelas ?? id}`,
      targetTipe: "kelas",
      targetId: id,
    });

    return NextResponse.json({
      message: "Kelas berhasil dibatalkan."
    }, { status: 200 });

  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Gagal membatalkan kelas." },
      { status: 500 }
    );
  }
}
