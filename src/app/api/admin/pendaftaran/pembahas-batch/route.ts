import { NextResponse } from "next/server";
import { db } from "@/db";
import { pendaftaran } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

// Saves the generated pembahas for a whole class in one atomic batch:
// either every student gets their pembahas or nothing is changed.
export async function PUT(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const assignments: { id: number; pembahas: string }[] = body.assignments;

    if (
      !Array.isArray(assignments) ||
      assignments.length === 0 ||
      assignments.some(a => !Number.isInteger(a?.id) || typeof a?.pembahas !== "string")
    ) {
      return NextResponse.json({ error: "Data pembahas tidak valid." }, { status: 400 });
    }

    const ids = assignments.map(a => a.id);
    const existing = await db
      .select({ id: pendaftaran.id, isReleased: pendaftaran.isReleased })
      .from(pendaftaran)
      .where(inArray(pendaftaran.id, ids));

    if (existing.length !== new Set(ids).size) {
      return NextResponse.json({ error: "Sebagian pendaftaran tidak ditemukan." }, { status: 404 });
    }
    if (existing.some(p => p.isReleased)) {
      return NextResponse.json({ error: "Kelas sudah dirilis, pembahas tidak dapat diubah." }, { status: 400 });
    }

    const [first, ...rest] = assignments.map(a =>
      db.update(pendaftaran).set({ pembahas: a.pembahas || null }).where(eq(pendaftaran.id, a.id))
    );
    await db.batch([first, ...rest]);

    return NextResponse.json({ message: `${assignments.length} pembahas berhasil disimpan.` }, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Gagal menyimpan pembahas." }, { status: 500 });
  }
}
