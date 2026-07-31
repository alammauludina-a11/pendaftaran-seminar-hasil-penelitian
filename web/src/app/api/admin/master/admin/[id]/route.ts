import { NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authSession = await auth.api.getSession({ headers: await headers() });
    if (!authSession?.user || authSession.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    await db.delete(users).where(eq(users.id, id));

    return NextResponse.json({ message: "Data admin berhasil dihapus." }, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Gagal menghapus data admin." }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authSession = await auth.api.getSession({ headers: await headers() });
    if (!authSession?.user || authSession.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { name } = body;

    if (!name) {
      return NextResponse.json({ error: "Nama wajib diisi." }, { status: 400 });
    }

    const updated = await db
      .update(users)
      .set({
        nama: name,
        name: name,
      })
      .where(eq(users.id, id))
      .returning();

    if (updated.length === 0) {
      return NextResponse.json({ error: "Data admin tidak ditemukan." }, { status: 404 });
    }

    return NextResponse.json({
      message: "Data admin berhasil diubah.",
      admin: {
        id: updated[0].id,
        name: updated[0].nama,
      }
    }, { status: 200 });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: "Gagal mengubah data admin." }, { status: 500 });
  }
}
