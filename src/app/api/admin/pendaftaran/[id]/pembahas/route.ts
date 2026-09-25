import { NextResponse } from "next/server";
import { db } from "@/db";
import { pendaftaran } from "@/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

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
    const { pembahas } = body;

    console.log(`[PEMBAHAS API] Updating id=${id} with pembahas="${pembahas}"`);

    const updated = await db
      .update(pendaftaran)
      .set({ pembahas: pembahas || null })
      .where(eq(pendaftaran.id, id))
      .returning({ id: pendaftaran.id, pembahas: pendaftaran.pembahas });

    console.log(`[PEMBAHAS API] Updated result:`, updated);

    if (!updated.length) {
      return NextResponse.json({ error: "Pendaftaran tidak ditemukan." }, { status: 404 });
    }

    return NextResponse.json({
      message: "Pembahas berhasil diperbarui.",
      data: updated[0],
    }, { status: 200 });
  } catch (error) {
    console.error("[PEMBAHAS API] Error:", error);
    return NextResponse.json({ error: "Gagal memperbarui pembahas." }, { status: 500 });
  }
}
