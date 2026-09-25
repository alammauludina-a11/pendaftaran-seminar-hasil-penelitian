import { NextResponse } from "next/server";
import { db } from "@/db";
import { pendaftaran, kelasSeminar } from "@/db/schema";
import { and, eq, or } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export async function DELETE(
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

    // A class with finalized/released students can't be cancelled (their schedule is already published)
    const locked = await db.select({ id: pendaftaran.id }).from(pendaftaran)
      .where(and(eq(pendaftaran.kelasSeminarId, id), or(eq(pendaftaran.isFinalized, true), eq(pendaftaran.isReleased, true))))
      .limit(1);
    if (locked.length > 0) {
      return NextResponse.json({ error: "Kelas tidak dapat dibatalkan karena ada mahasiswa yang sudah difinalisasi. Batalkan finalisasinya terlebih dahulu." }, { status: 400 });
    }

    // Unassign students from this class
    await db.update(pendaftaran)
      .set({ kelasSeminarId: null })
      .where(eq(pendaftaran.kelasSeminarId, id));

    // Delete the class
    await db.delete(kelasSeminar)
      .where(eq(kelasSeminar.id, id));

    return NextResponse.json({
      message: "Kelas berhasil dibatalkan."
    }, { status: 200 });

  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Gagal membatalkan kelas." },
      { status: 500 }
    );
  }
}
