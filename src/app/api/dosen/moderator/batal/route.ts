import { NextResponse } from "next/server";
import { db } from "@/db";
import { moderator, pendaftaran, users } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { getWaktuMulaiPendaftaran } from "@/lib/jadwal";

const MAX_REASON_LENGTH = 500;

// POST: Dosen mengajukan batal moderasi
export async function POST(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user || session.user.role !== "dosen") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { action } = body;
    const pendaftaranId = Number(body?.pendaftaranId);
    const reason = typeof body?.reason === "string" ? body.reason.trim() : "";

    if (!Number.isInteger(pendaftaranId) || pendaftaranId <= 0 || !action) {
      return NextResponse.json({ error: "pendaftaranId dan action diperlukan" }, { status: 400 });
    }
    if (reason.length > MAX_REASON_LENGTH) {
      return NextResponse.json({ error: `Alasan maksimal ${MAX_REASON_LENGTH} karakter` }, { status: 400 });
    }

    const currentUserId = session.user.id;

    // Verify dosen is the moderator for this pendaftaran
    const existing = await db
      .select()
      .from(moderator)
      .where(and(
        eq(moderator.pendaftaranId, pendaftaranId),
        eq(moderator.dosenId, currentUserId)
      ))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json({ error: "Anda bukan moderator untuk jadwal ini" }, { status: 403 });
    }

    const modRecord = existing[0];

    if (action === "ajukan") {
      // Prevent re-applying if already pending
      if (modRecord.batalStatus === "menunggu") {
        return NextResponse.json({ error: "Pengajuan batal sudah dalam proses" }, { status: 400 });
      }

      // A seminar that already took place can no longer be cancelled (it would erase the moderation history)
      const waktuMulai = await getWaktuMulaiPendaftaran(pendaftaranId);
      if (waktuMulai && waktuMulai.getTime() <= Date.now()) {
        return NextResponse.json({ error: "Seminar ini sudah berlangsung, moderasi tidak dapat dibatalkan." }, { status: 400 });
      }

      await db.update(moderator)
        .set({ batalStatus: "menunggu", batalReason: reason || null })
        .where(eq(moderator.id, modRecord.id));

      return NextResponse.json({ message: "Pengajuan batal berhasil diajukan. Menunggu persetujuan admin." }, { status: 200 });

    } else if (action === "batalkan_pengajuan") {
      // Dosen cancels their own cancellation request
      if (modRecord.batalStatus !== "menunggu") {
        return NextResponse.json({ error: "Tidak ada pengajuan yang aktif" }, { status: 400 });
      }

      await db.update(moderator)
        .set({ batalStatus: null, batalReason: null })
        .where(eq(moderator.id, modRecord.id));

      return NextResponse.json({ message: "Pengajuan batal dibatalkan." }, { status: 200 });

    } else {
      return NextResponse.json({ error: "Action tidak valid" }, { status: 400 });
    }
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Gagal memproses pengajuan" }, { status: 500 });
  }
}
