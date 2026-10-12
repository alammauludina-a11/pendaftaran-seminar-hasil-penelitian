import { NextResponse } from "next/server";
import { db } from "@/db";
import { pendaftaran } from "@/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { catatAktivitas } from "@/lib/audit";

export async function PUT(
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

    const [lama] = await db.select().from(pendaftaran).where(eq(pendaftaran.id, id)).limit(1);
    if (!lama) {
      return NextResponse.json({ error: "Pendaftaran tidak ditemukan." }, { status: 404 });
    }
    // Not final and not published: nothing to do and nothing to log
    if (!lama.isFinalized && !lama.isReleased) {
      return NextResponse.json({ message: "Jadwal belum difinalisasi.", unchanged: true, data: lama }, { status: 200 });
    }

    const updated = await db
      .update(pendaftaran)
      .set({ isFinalized: false, isReleased: false })
      .where(eq(pendaftaran.id, id))
      .returning();

    catatAktivitas({
      kategori: "jadwal",
      aksi: "jadwal.batal_finalisasi",
      deskripsi: "Membatalkan finalisasi dan rilis jadwal {mahasiswa}",
      targetTipe: "pendaftaran",
      targetId: id,
      pendaftaranIds: [id],
    });

    return NextResponse.json({
      message: "Batal rilis berhasil.",
      data: updated[0],
    }, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Gagal membatalkan rilis." }, { status: 500 });
  }
}
