import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { transaksi } from "@/db";
import { pendaftaran, kelasSeminar, slotWaktu, users } from "@/db/schema";
import { and, eq, ne } from "drizzle-orm";
import { getWaktuMulaiPendaftaran } from "@/lib/jadwal";
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
    const kelasSeminarId: number | null = body.kelasSeminarId ?? null;

    // Checks and move in one transaction, so two students can't be moved into the same time slot of a class at once
    const hasil = await transaksi(async (tx) => {
      // Fetch the registration
      const existing = await tx.select().from(pendaftaran).where(eq(pendaftaran.id, id));
      if (existing.length === 0) {
        return { error: "Data pendaftaran tidak ditemukan", status: 404 } as const;
      }
      const reg = existing[0];

      if (reg.isFinalized || reg.isReleased) {
        return { error: "Mahasiswa yang sudah difinalisasi tidak dapat dipindah kelas. Batalkan finalisasi terlebih dahulu.", status: 400 } as const;
      }

      let namaKelasTujuan: string | null = null;
      if (kelasSeminarId !== null) {
        if (reg.statusVerifikasi !== "disetujui") {
          return { error: "Hanya pendaftaran yang sudah disetujui yang dapat dimasukkan ke kelas.", status: 400 } as const;
        }

        // Target class must exist and belong to the same periode (= same seminar type & angkatan)
        const targetClass = await tx.select().from(kelasSeminar).where(eq(kelasSeminar.id, kelasSeminarId));
        if (targetClass.length === 0) {
          return { error: "Kelas tujuan tidak ditemukan", status: 404 } as const;
        }
        namaKelasTujuan = targetClass[0].namaKelas;
        if (targetClass[0].periodeId !== reg.periodeId) {
          return { error: "Kelas tujuan berada di periode/jenis seminar yang berbeda.", status: 400 } as const;
        }

        // Schedule clash: the target class must not already have another student at the same slot time
        const waktuMulai = await getWaktuMulaiPendaftaran(reg.id, tx);
        if (waktuMulai) {
          const clash = await tx
            .select({ nama: users.nama })
            .from(pendaftaran)
            .innerJoin(slotWaktu, eq(pendaftaran.slotWaktuId, slotWaktu.id))
            .innerJoin(users, eq(pendaftaran.userId, users.id))
            .where(and(
              eq(pendaftaran.kelasSeminarId, kelasSeminarId),
              eq(slotWaktu.waktuMulai, waktuMulai),
              ne(pendaftaran.statusVerifikasi, "ditolak"),
              ne(pendaftaran.id, reg.id)
            ))
            .limit(1);
          if (clash.length > 0) {
            return { error: `Jadwal bentrok: di kelas tujuan sudah ada ${clash[0].nama} pada jam yang sama.`, status: 409 } as const;
          }
        }
        // Note: admin may exceed the class capacity on purpose (as per requirement).
      }

      await tx.update(pendaftaran)
        .set({ kelasSeminarId })
        .where(eq(pendaftaran.id, id));
      return { reg, namaKelasTujuan };
    });
    if ("error" in hasil) {
      return NextResponse.json({ error: hasil.error }, { status: hasil.status });
    }
    const { reg, namaKelasTujuan } = hasil;

    catatAktivitas({
      kategori: "kelas",
      aksi: kelasSeminarId !== null ? "kelas.pindah" : "kelas.keluarkan",
      deskripsi: kelasSeminarId !== null ? `Memindahkan {mahasiswa} ke Kelas ${namaKelasTujuan}` : "Mengeluarkan {mahasiswa} dari kelas",
      targetTipe: "pendaftaran",
      targetId: id,
      pendaftaranIds: [id],
      detail: { dariKelasId: reg.kelasSeminarId, keKelasId: kelasSeminarId },
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Error updating kelas:", error);
    return NextResponse.json({ error: "Gagal memindahkan kelas" }, { status: 500 });
  }
}
