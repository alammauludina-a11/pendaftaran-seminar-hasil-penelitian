// Room change requests. A student may request a new room at any time, also after finalisasi; the admin approves it.
// Approving a change on a finalized schedule changes the published announcement, so it needs an explicit confirmation.
import { and, eq } from "drizzle-orm";
import { db, type Executor } from "@/db";
import { pendaftaran } from "@/db/schema";

export type HasilSetujuiRuangan =
  | { status: "disetujui"; data: typeof pendaftaran.$inferSelect; dari: string | null; ke: string; setelahFinal: boolean }
  | { status: "perlu_konfirmasi"; dari: string | null; ke: string; dirilis: boolean }
  | { status: "gagal"; error: string; httpStatus: number };

export async function setujuiPengajuanRuangan(
  id: number,
  opts: { konfirmasiFinal?: boolean } = {},
  ex: Executor = db
): Promise<HasilSetujuiRuangan> {
  const [p] = await ex.select().from(pendaftaran).where(eq(pendaftaran.id, id)).limit(1);
  if (!p) return { status: "gagal", error: "Data tidak ditemukan", httpStatus: 404 };
  if (!p.ruanganDiajukan || p.statusRuangan !== "menunggu") {
    return { status: "gagal", error: "Tidak ada pengajuan ruangan yang menunggu", httpStatus: 400 };
  }

  const setelahFinal = p.isFinalized || p.isReleased;
  if (setelahFinal && !opts.konfirmasiFinal) {
    return { status: "perlu_konfirmasi", dari: p.ruanganDisetujui, ke: p.ruanganDiajukan, dirilis: p.isReleased };
  }

  // Only the request that was reviewed is approved: if the student changed it in the meantime, nothing is updated
  const [data] = await ex.update(pendaftaran)
    .set({ ruanganDisetujui: p.ruanganDiajukan, statusRuangan: "disetujui" })
    .where(and(eq(pendaftaran.id, id), eq(pendaftaran.ruanganDiajukan, p.ruanganDiajukan), eq(pendaftaran.statusRuangan, "menunggu")))
    .returning();
  if (!data) return { status: "gagal", error: "Pengajuan ruangan baru saja berubah. Muat ulang lalu periksa lagi.", httpStatus: 409 };

  return { status: "disetujui", data, dari: p.ruanganDisetujui, ke: p.ruanganDiajukan, setelahFinal };
}
