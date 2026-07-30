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

    // Delete user (cascades to account, session via schema FK)
    await db.delete(users).where(eq(users.id, id));

    return NextResponse.json({ message: "Data mahasiswa berhasil dihapus." }, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Gagal menghapus data mahasiswa." }, { status: 500 });
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
    const { nim, name, prodi, status, angkatan } = body;

    if (!nim || !name) {
      return NextResponse.json({ error: "NIM dan Nama wajib diisi." }, { status: 400 });
    }

    const updated = await db
      .update(users)
      .set({
        nipNim: nim,
        nama: name,
        angkatan: angkatan,
        prodi: prodi,
        statusAktif: status,
      })
      .where(eq(users.id, id))
      .returning();

    if (updated.length === 0) {
      return NextResponse.json({ error: "Data mahasiswa tidak ditemukan." }, { status: 404 });
    }

    return NextResponse.json({
      message: "Data mahasiswa berhasil diubah.",
      mahasiswa: {
        id: updated[0].id,
        nim: updated[0].nipNim,
        name: updated[0].nama,
        prodi: updated[0].prodi,
        status: updated[0].statusAktif,
      }
    }, { status: 200 });
  } catch (error: any) {
    console.error(error);
    if (error.message?.includes("UNIQUE")) {
      return NextResponse.json({ error: "NIM sudah terdaftar untuk pengguna lain." }, { status: 409 });
    }
    return NextResponse.json({ error: "Gagal mengubah data mahasiswa." }, { status: 500 });
  }
}

