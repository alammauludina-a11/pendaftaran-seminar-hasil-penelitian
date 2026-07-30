import { NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { inArray } from "drizzle-orm";

export async function POST(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { students } = body;

    if (!Array.isArray(students) || students.length === 0) {
      return NextResponse.json({ error: "Format data tidak valid atau kosong." }, { status: 400 });
    }

    const newUsers = [];
    for (const student of students) {
      const nim = student.nim || student.NIM || student.Nim;
      const name = student.nama || student.Nama || student.name || student.Name;
      const angkatan = student.angkatan || student.Angkatan;

      if (!nim || !name) {
        continue;
      }

      const placeholderEmail = `${String(nim).toLowerCase()}@student.ipb.ac.id`;

      newUsers.push({
        id: crypto.randomUUID(),
        email: placeholderEmail,
        role: "mahasiswa" as const,
        name: String(name),
        nama: String(name),
        nipNim: String(nim),
        angkatan: angkatan ? String(angkatan) : null,
        prodi: "Akuntansi",
        statusAktif: "Aktif",
        emailVerified: false,
      });
    }

    if (newUsers.length === 0) {
      return NextResponse.json({ error: "Tidak ada data valid yang bisa diimport." }, { status: 400 });
    }
    
    const existingUsers = await db.query.users.findMany({
      where: inArray(users.nipNim, newUsers.map(u => u.nipNim))
    });
    
    const existingNims = new Set(existingUsers.map(u => u.nipNim));
    const toInsert = newUsers.filter(u => !existingNims.has(u.nipNim));

    if (toInsert.length === 0) {
      return NextResponse.json({ error: "Semua data mahasiswa di file tersebut sudah terdaftar." }, { status: 409 });
    }

    const insertedUsers = await db.insert(users).values(toInsert).returning();

    const formattedData = insertedUsers.map((m) => ({
      id: m.id,
      nim: m.nipNim,
      name: m.nama,
      angkatan: m.angkatan || "",
      prodi: m.prodi || "Akuntansi",
      status: m.statusAktif || "Aktif",
      account: null,
    }));

    return NextResponse.json({
      message: `Berhasil import ${insertedUsers.length} data mahasiswa.`,
      mahasiswa: formattedData,
    }, { status: 201 });

  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: "Gagal memproses import data." }, { status: 500 });
  }
}
