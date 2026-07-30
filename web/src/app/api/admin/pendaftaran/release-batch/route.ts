import { NextResponse } from "next/server";
import { db } from "@/db";
import { pendaftaran } from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export async function PUT(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { ids, isReleased } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "IDs wajib diisi." }, { status: 400 });
    }

    await db
      .update(pendaftaran)
      .set({ isReleased: isReleased === true })
      .where(inArray(pendaftaran.id, ids));

    return NextResponse.json({
      message: `${ids.length} pendaftaran berhasil ${isReleased ? "dirilis" : "ditarik"}.`,
    }, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Gagal memproses release batch." }, { status: 500 });
  }
}
