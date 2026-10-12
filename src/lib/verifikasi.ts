// Admin verification of a registration (approve / reject / back to waiting), shared by the API route and the tests.
import { eq } from "drizzle-orm";
import type { Tx } from "@/db";
import { pendaftaran, moderator, periode } from "@/db/schema";
import { formClassFromQueue } from "@/lib/jadwal";
import { MAX_CATATAN_VERIFIKASI } from "@/lib/aturan-teks";
import type { Aktivitas } from "@/lib/audit";

export type StatusVerifikasi = "disetujui" | "ditolak" | "menunggu";

export type HasilVerifikasi =
  | { error: string; status: number }
  /** Same status and note as already saved: nothing written and nothing to log (e.g. a double click) */
  | { unchanged: true }
  | { reg: typeof pendaftaran.$inferSelect; log: Aktivitas };

/**
 * Changes the verification status inside the caller's transaction: leaving the class when no longer approved,
 * auto-forming a class when the queue reaches batas kelas. Returns the audit entry to write, if anything changed.
 */
export async function ubahVerifikasi(
  tx: Tx,
  id: number,
  input: { status: unknown; note: unknown },
): Promise<HasilVerifikasi> {
  const status = input.status as StatusVerifikasi;
  if (!["disetujui", "ditolak", "menunggu"].includes(status)) {
    return { error: "Status tidak valid", status: 400 };
  }
  const note = typeof input.note === "string" ? input.note.trim() : "";
  if (note.length > MAX_CATATAN_VERIFIKASI) {
    return { error: `Catatan maksimal ${MAX_CATATAN_VERIFIKASI} karakter.`, status: 400 };
  }
  if (status === "ditolak" && !note) {
    return { error: "Catatan penolakan wajib diisi agar mahasiswa tahu yang perlu diperbaiki.", status: 400 };
  }

  const [existing] = await tx.select().from(pendaftaran).where(eq(pendaftaran.id, id)).limit(1);
  if (!existing) {
    return { error: "Pendaftaran tidak ditemukan", status: 404 };
  }
  if (existing.statusVerifikasi === status && (existing.catatanAdmin ?? "").trim() === note) {
    return { unchanged: true };
  }
  if (existing.isFinalized || existing.isReleased) {
    return { error: "Pendaftaran sudah difinalisasi. Batalkan finalisasi terlebih dahulu untuk mengubah verifikasi.", status: 400 };
  }

  // A student that is no longer approved leaves their class (and its moderator assignment),
  // otherwise a rejected student would stay listed in the class.
  const leavesClass = status !== "disetujui" && existing.kelasSeminarId !== null;

  const [reg] = await tx.update(pendaftaran)
    .set({
      statusVerifikasi: status,
      catatanAdmin: note,
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

  const statusLama = existing.statusVerifikasi;
  return {
    reg,
    log: {
      kategori: "verifikasi",
      aksi: `verifikasi.${status}`,
      deskripsi: statusLama === status
        ? `Mengubah catatan verifikasi {mahasiswa} (status tetap "${status}")`
        : `Mengubah status verifikasi {mahasiswa} dari "${statusLama}" menjadi "${status}"`,
      targetTipe: "pendaftaran",
      targetId: id,
      pendaftaranIds: [id],
      detail: { dari: statusLama, ke: status, catatan: note || null },
    },
  };
}
