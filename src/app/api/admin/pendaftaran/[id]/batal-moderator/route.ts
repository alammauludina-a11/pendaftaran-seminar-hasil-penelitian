import { NextResponse } from "next/server";
import { db } from "@/db";
import { moderator, pendaftaran } from "@/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

// POST: Admin merespon pengajuan batal moderasi
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: idStr } = await params;
    const pendaftaranId = parseInt(idStr);
    const body = await request.json();
    const { action } = body; // "setujui" | "tolak"

    if (!action || !["setujui", "tolak"].includes(action)) {
      return NextResponse.json({ error: "Action harus 'setujui' atau 'tolak'" }, { status: 400 });
    }

    // Find the moderator record for this pendaftaran
    const modRecords = await db
      .select()
      .from(moderator)
      .where(eq(moderator.pendaftaranId, pendaftaranId))
      .limit(1);

    if (modRecords.length === 0) {
      return NextResponse.json({ error: "Data moderator tidak ditemukan" }, { status: 404 });
    }

    const modRecord = modRecords[0];

    if (modRecord.batalStatus !== "menunggu") {
      return NextResponse.json({ error: "Tidak ada pengajuan batal yang menunggu" }, { status: 400 });
    }

    if (action === "setujui") {
      // Delete moderator record → slot opens up again
      await db.delete(moderator).where(eq(moderator.id, modRecord.id));
      return NextResponse.json({ message: "Pembatalan moderator disetujui. Slot moderator kini kosong kembali." }, { status: 200 });

    } else if (action === "tolak") {
      // Reset batal request, keep moderator assignment intact
      await db.update(moderator)
        .set({ batalStatus: "ditolak", batalReason: modRecord.batalReason })
        .where(eq(moderator.id, modRecord.id));
      return NextResponse.json({ message: "Pengajuan batal ditolak. Dosen tetap menjadi moderator." }, { status: 200 });
    }

  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Gagal memproses pengajuan" }, { status: 500 });
  }
}
