import { NextResponse } from "next/server";
import { db } from "@/db";
import { pendaftaran } from "@/db/schema";
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
    const { isReleased } = body;

    // First check the registration exists and has required fields
    const existing = await db.select().from(pendaftaran).where(eq(pendaftaran.id, id));
    if (!existing.length) {
      return NextResponse.json({ error: "Pendaftaran tidak ditemukan." }, { status: 404 });
    }

    const reg = existing[0];

    // To release, must have room and be finalized
    if (isReleased && (!reg.ruanganDisetujui || !reg.isFinalized)) {
      return NextResponse.json({
        error: "Pendaftaran harus difinalisasi dan memiliki ruangan sebelum dirilis.",
      }, { status: 400 });
    }

    const updated = await db
      .update(pendaftaran)
      .set({ isReleased: isReleased === true })
      .where(eq(pendaftaran.id, id))
      .returning();

    return NextResponse.json({
      message: `Pendaftaran berhasil ${isReleased ? "dirilis" : "ditarik"}.`,
      data: updated[0],
    }, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Gagal memproses release." }, { status: 500 });
  }
}
