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

    const updated = await db
      .update(pendaftaran)
      .set({ isFinalized: true, isReleased: true })
      .where(eq(pendaftaran.id, id))
      .returning();

    if (!updated.length) {
      return NextResponse.json({ error: "Pendaftaran tidak ditemukan." }, { status: 404 });
    }

    return NextResponse.json({
      message: "Pendaftaran berhasil difinalisasi.",
      data: updated[0],
    }, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Gagal memfinalisasi pendaftaran." }, { status: 500 });
  }
}
