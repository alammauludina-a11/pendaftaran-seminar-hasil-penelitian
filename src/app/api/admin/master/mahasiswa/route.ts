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

    const mahasiswaData = await db
      .select()
      .from(users)
      .where(eq(users.role, "mahasiswa"));

    const formattedData = mahasiswaData.map((m) => ({
      id: m.id,
      nim: m.nipNim,
      name: m.nama,
      angkatan: m.angkatan || "",
      prodi: m.prodi || "Akuntansi",
      status: m.statusAktif || "Aktif",
      account: m.username ? { username: m.username, password: "password123" } : null,
    }));

    return NextResponse.json({ mahasiswa: formattedData }, { status: 200 });
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
    const { nim, name, prodi, status, angkatan } = body;

    if (!nim || !name) {
      return NextResponse.json({ error: "NIM dan Nama wajib diisi." }, { status: 400 });
    }

    // Generate a unique email placeholder since it's required
    const placeholderEmail = `${nim.toLowerCase()}@student.ipb.ac.id`;

    const newUser = await db
      .insert(users)
      .values({
        id: crypto.randomUUID(),
        email: placeholderEmail,
        role: "mahasiswa",
        name: name,
        nama: name,
        nipNim: nim,
        angkatan: angkatan || null,
        prodi: prodi || "Akuntansi",
        statusAktif: status || "Aktif",
        emailVerified: false,
      })
      .returning();

    return NextResponse.json({
      message: "Data mahasiswa berhasil ditambahkan.",
      mahasiswa: {
        id: newUser[0].id,
        nim: newUser[0].nipNim,
        name: newUser[0].nama,
        angkatan: newUser[0].angkatan || "",
        prodi: newUser[0].prodi || "Akuntansi",
        status: newUser[0].statusAktif || "Aktif",
        account: null,
      },
    }, { status: 201 });
  } catch (error: any) {
    console.error(error);
    const errorString = String(error) + " " + String(error.cause);
    if (errorString.includes("UNIQUE") || errorString.includes("unique")) {
      return NextResponse.json({ error: "NIM sudah terdaftar." }, { status: 409 });
    }
    return NextResponse.json({ error: "Gagal menambahkan data mahasiswa." }, { status: 500 });
  }
}
