import { NextResponse } from "next/server";
import { db } from "@/db";
import { pendaftaran, kelasSeminar, moderator } from "@/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

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
    const body = await request.json();
    const { dosenId } = body;

    // Get pendaftaran
    const pendList = await db.select().from(pendaftaran).where(eq(pendaftaran.id, id));
    if (pendList.length === 0) return NextResponse.json({ error: "Pendaftaran tidak ditemukan" }, { status: 404 });
    const pend = pendList[0];

    if (!pend.kelasSeminarId) {
      return NextResponse.json({ error: "Pendaftaran belum memiliki jadwal kelas" }, { status: 400 });
    }

    if (!dosenId) {
      // Remove moderator
      await db.delete(moderator).where(eq(moderator.pendaftaranId, pend.id));
    } else {
      // Update or insert moderator
      const existing = await db.select().from(moderator).where(eq(moderator.pendaftaranId, pend.id));
      if (existing.length > 0) {
        await db.update(moderator).set({ dosenId, assignedByRole: 'admin' }).where(eq(moderator.pendaftaranId, pend.id));
      } else {
        await db.insert(moderator).values({ pendaftaranId: pend.id, dosenId, assignedByRole: 'admin' });
      }
    }

    return NextResponse.json({ message: "Moderator berhasil diperbarui" }, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Gagal memperbarui moderator" }, { status: 500 });
  }
}
