import { NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export async function GET() {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const dosenData = await db.select().from(users).where(eq(users.role, "dosen"));

    const formattedData = dosenData.map((d) => ({
      id: d.id,
      nip: d.nipNim,
      name: d.nama,
      prodi: d.prodi || "Informatika",
      jabatan: d.jabatan || "Dosen",
      statusDosen: d.statusDosen || "Dosen Tetap",
      account: d.username ? { username: d.username, password: "password123" } : null,
    }));

    return NextResponse.json({ dosen: formattedData }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch data" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { nip, name, prodi, jabatan, statusDosen } = body;

    if (!nip || !name) {
      return NextResponse.json({ error: "NIP dan Nama wajib diisi." }, { status: 400 });
    }

    const placeholderEmail = `${nip.toLowerCase()}@staff.ipb.ac.id`;

    const newUser = await db
      .insert(users)
      .values({
        id: crypto.randomUUID(),
        email: placeholderEmail,
        role: "dosen",
        name: name,
        nama: name,
        nipNim: nip,
        prodi: prodi || "Informatika",
        jabatan: jabatan || "Dosen",
        statusDosen: statusDosen || "Dosen Tetap",
        emailVerified: false,
      })
      .returning();

    return NextResponse.json({
      message: "Data dosen berhasil ditambahkan.",
      dosen: {
        id: newUser[0].id,
        nip: newUser[0].nipNim,
        name: newUser[0].nama,
        prodi: newUser[0].prodi || "Informatika",
        jabatan: newUser[0].jabatan || "Dosen",
        account: null,
      },
    }, { status: 201 });
  } catch (error: any) {
    console.error(error);
    const errorString = String(error) + " " + String(error.cause);
    if (errorString.includes("UNIQUE") || errorString.includes("unique")) {
      return NextResponse.json({ error: "NIP sudah terdaftar." }, { status: 409 });
    }
    return NextResponse.json({ error: "Gagal menambahkan data dosen." }, { status: 500 });
  }
}
