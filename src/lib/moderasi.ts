// A dosen asking to be released from a moderation (and withdrawing that request) and the admin answering it, shared by the API routes and the tests.
import { and, eq } from "drizzle-orm";
import { db, type Executor } from "@/db";
import { moderator } from "@/db/schema";
import { getWaktuMulaiPendaftaran } from "@/lib/jadwal";
import { MAX_REASON_LENGTH } from "@/lib/aturan-teks";

export type HasilBatalModerasi = { message: string } | { error: string; status: number };

export async function pengajuanBatalModerasi(
  input: { pendaftaranId: unknown; dosenId: string; action: unknown; reason: unknown },
  ex: Executor = db,
): Promise<HasilBatalModerasi> {
  const pendaftaranId = Number(input.pendaftaranId);
  const reason = typeof input.reason === "string" ? input.reason.trim() : "";
  if (!Number.isInteger(pendaftaranId) || pendaftaranId <= 0 || !input.action) {
    return { error: "pendaftaranId dan action diperlukan", status: 400 };
  }
  if (reason.length > MAX_REASON_LENGTH) {
    return { error: `Alasan maksimal ${MAX_REASON_LENGTH} karakter`, status: 400 };
  }

  // Only the moderator of this registration may ask
  const [modRecord] = await ex.select().from(moderator)
    .where(and(eq(moderator.pendaftaranId, pendaftaranId), eq(moderator.dosenId, input.dosenId)))
    .limit(1);
  if (!modRecord) {
    return { error: "Anda bukan moderator untuk jadwal ini", status: 403 };
  }

  if (input.action === "ajukan") {
    // The admin decides on the request, so it needs a reason
    if (!reason) {
      return { error: "Alasan pembatalan wajib diisi.", status: 400 };
    }
    if (modRecord.batalStatus === "menunggu") {
      return { error: "Pengajuan batal sudah dalam proses", status: 400 };
    }
    // A seminar that already took place can no longer be cancelled (it would erase the moderation history)
    const waktuMulai = await getWaktuMulaiPendaftaran(pendaftaranId, ex);
    if (waktuMulai && waktuMulai.getTime() <= Date.now()) {
      return { error: "Seminar ini sudah berlangsung, moderasi tidak dapat dibatalkan.", status: 400 };
    }
    await ex.update(moderator)
      .set({ batalStatus: "menunggu", batalReason: reason })
      .where(eq(moderator.id, modRecord.id));
    return { message: "Pengajuan batal berhasil diajukan. Menunggu persetujuan admin." };
  }

  if (input.action === "batalkan_pengajuan") {
    // Dosen withdraws their own cancellation request
    if (modRecord.batalStatus !== "menunggu") {
      return { error: "Tidak ada pengajuan yang aktif", status: 400 };
    }
    await ex.update(moderator)
      .set({ batalStatus: null, batalReason: null })
      .where(eq(moderator.id, modRecord.id));
    return { message: "Pengajuan batal dibatalkan." };
  }

  return { error: "Action tidak valid", status: 400 };
}

export type HasilResponBatalModerasi = { message: string; batalReason: string | null } | { error: string; status: number };

/** Admin approves ("setujui") or rejects ("tolak") a dosen's pending request to be released from a moderation. */
export async function responBatalModerasi(
  input: { pendaftaranId: number; action: unknown },
  ex: Executor = db,
): Promise<HasilResponBatalModerasi> {
  if (input.action !== "setujui" && input.action !== "tolak") {
    return { error: "Action harus 'setujui' atau 'tolak'", status: 400 };
  }

  const [modRecord] = await ex.select().from(moderator)
    .where(eq(moderator.pendaftaranId, input.pendaftaranId))
    .limit(1);
  if (!modRecord) {
    return { error: "Data moderator tidak ditemukan", status: 404 };
  }
  if (modRecord.batalStatus !== "menunggu") {
    return { error: "Tidak ada pengajuan batal yang menunggu", status: 400 };
  }

  if (input.action === "setujui") {
    // Same rule as the dosen's request: once the seminar has started the moderation is history and stays
    const waktuMulai = await getWaktuMulaiPendaftaran(input.pendaftaranId, ex);
    if (waktuMulai && waktuMulai.getTime() <= Date.now()) {
      return { error: "Seminar ini sudah berlangsung, pembatalan moderator tidak dapat disetujui. Tolak pengajuannya.", status: 400 };
    }
    // Delete moderator record → slot opens up again.
    // Only while the request is still pending: the dosen may have withdrawn it in the meantime.
    const deleted = await ex.delete(moderator)
      .where(and(eq(moderator.id, modRecord.id), eq(moderator.batalStatus, "menunggu")))
      .returning({ id: moderator.id });
    if (deleted.length === 0) {
      return { error: "Pengajuan batal sudah tidak menunggu (mungkin baru saja ditarik dosen).", status: 409 };
    }
    return { message: "Pembatalan moderator disetujui. Slot moderator kini kosong kembali.", batalReason: modRecord.batalReason };
  }

  // Reset batal request, keep moderator assignment intact
  const updated = await ex.update(moderator)
    .set({ batalStatus: "ditolak", batalReason: modRecord.batalReason })
    .where(and(eq(moderator.id, modRecord.id), eq(moderator.batalStatus, "menunggu")))
    .returning({ id: moderator.id });
  if (updated.length === 0) {
    return { error: "Pengajuan batal sudah tidak menunggu (mungkin baru saja ditarik dosen).", status: 409 };
  }
  return { message: "Pengajuan batal ditolak. Dosen tetap menjadi moderator.", batalReason: modRecord.batalReason };
}
