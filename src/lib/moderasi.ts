// A dosen asking to be released from a moderation (and withdrawing that request), shared by the API route and the tests.
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
