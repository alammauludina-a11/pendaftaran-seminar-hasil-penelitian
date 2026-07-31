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

    const adminData = await db
      .select()
      .from(users)
      .where(eq(users.role, "admin"));

    const formattedData = adminData.map((a) => ({
      id: a.id,
      name: a.nama,
      account: a.username ? { username: a.username, password: "password123" } : null,
    }));

    return NextResponse.json({ admin: formattedData }, { status: 200 });
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
    const { name } = body;

    if (!name) {
      return NextResponse.json({ error: "Nama wajib diisi." }, { status: 400 });
    }

    const placeholderEmail = `admin_${Date.now()}@ipb.ac.id`;

    const newUser = await db
      .insert(users)
      .values({
        id: crypto.randomUUID(),
        email: placeholderEmail,
        role: "admin",
        name: name,
        nama: name,
        nipNim: `admin_${Date.now()}`,
        emailVerified: false,
      })
      .returning();

    return NextResponse.json({
      message: "Data admin berhasil ditambahkan.",
      admin: {
        id: newUser[0].id,
        name: newUser[0].nama,
        account: null,
      },
    }, { status: 201 });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: "Gagal menambahkan data admin." }, { status: 500 });
  }
}
