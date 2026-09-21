import { NextResponse } from "next/server";
import { db } from "@/db";
import { users, account } from "@/db/schema";
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
      .select({
         id: users.id,
         name: users.nama,
         username: users.username,
         accountCreatedAt: account.createdAt,
         accountUpdatedAt: account.updatedAt,
      })
      .from(users)
      .leftJoin(account, eq(users.id, account.userId))
      .where(eq(users.role, "admin"));

    const formattedData = adminData.map((a) => {
      let isPasswordChanged = false;
      if (a.accountCreatedAt && a.accountUpdatedAt) {
        const diff = Math.abs(a.accountUpdatedAt.getTime() - a.accountCreatedAt.getTime());
        isPasswordChanged = diff > 5000;
      }
      
      return {
        id: a.id,
        name: a.name,
        account: a.username ? { 
            username: a.username, 
            password: isPasswordChanged ? null : "password123",
            isPasswordChanged
        } : null,
      };
    });

    return NextResponse.json({ admin: formattedData }, { status: 200 });
  } catch (error) {
    console.error(error);
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
