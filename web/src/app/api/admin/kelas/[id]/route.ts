import { NextResponse } from "next/server";
import { db } from "@/db";
import { pendaftaran, kelasSeminar } from "@/db/schema";
import { eq } from "drizzle-orm";
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
