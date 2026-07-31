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
    const { dosenList } = body;

    if (!Array.isArray(dosenList) || dosenList.length === 0) {
      return NextResponse.json({ error: "Format data tidak valid atau kosong." }, { status: 400 });
    }

    const newUsers = [];
    for (const dosen of dosenList) {
      const nip = dosen.nip || dosen.NIP || dosen["NIP/NPI"] || dosen["Nip/Npi"];
      const name = dosen.nama || dosen.Nama || dosen["Nama Dosen"] || dosen["nama dosen"] || dosen["nama"];

      if (!nip || !name) {
        continue;
      }

      const placeholderEmail = `${String(nip).toLowerCase()}@dosen.ipb.ac.id`;

      newUsers.push({
        id: crypto.randomUUID(),
        email: placeholderEmail,
        role: "dosen" as const,
        name: String(name),
        nama: String(name),
        nipNim: String(nip),
        prodi: "Informatika",
        jabatan: "Pengajar",
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
    
    const existingNips = new Set(existingUsers.map(u => u.nipNim));
    const toInsert = newUsers.filter(u => !existingNips.has(u.nipNim));

    if (toInsert.length === 0) {
      return NextResponse.json({ error: "Semua data dosen di file tersebut sudah terdaftar." }, { status: 409 });
    }

    const insertedUsers = await db.insert(users).values(toInsert).returning();

    const formattedData = insertedUsers.map((d) => ({
      id: d.id,
      nip: d.nipNim,
      name: d.nama,
      prodi: d.prodi || "Informatika",
      jabatan: d.jabatan || "Pengajar",
      account: null,
    }));

    return NextResponse.json({
      message: `Berhasil import ${insertedUsers.length} data dosen.`,
      dosen: formattedData,
    }, { status: 201 });

  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: "Gagal memproses import data." }, { status: 500 });
  }
}
