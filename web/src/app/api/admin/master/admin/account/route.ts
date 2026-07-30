import { NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { generateSecurePassword } from "@/lib/password-generator";

export async function POST(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json({ error: "ID admin wajib diisi." }, { status: 400 });
    }

    const userData = await db.select().from(users).where(eq(users.id, id));
    if (userData.length === 0) {
      return NextResponse.json({ error: "Data admin tidak ditemukan." }, { status: 404 });
    }

    const user = userData[0];

    // 1. Delete existing user (Master Data only)
    await db.delete(users).where(eq(users.id, id));

    // Cek jika akun sudah di-generate
    if (user.username) {
      return NextResponse.json({ error: "Akun untuk admin ini sudah pernah di-generate." }, { status: 400 });
    }

    // Generate username default (contoh: admin_nama)
    const nameSlug = (user.nama || "admin").toLowerCase().replace(/[^a-z0-9]/g, "").substring(0, 10);
    const username = `admin_${nameSlug}_${Math.floor(Math.random() * 1000)}`;
    const password = generateSecurePassword();

    // Register into Better Auth
    const res = await auth.api.signUpEmail({
      body: {
        email: user.email,
        password: password,
        name: user.nama || "Admin",
        username: username,
        role: "admin",
        nama: user.nama,
        nipNim: user.nipNim,
      } as any,
      asResponse: false
    });



    // Update the username in our DB since signUpEmail doesn't take username for this schema config directly
    await db
      .update(users)
      .set({ username: username })
      .where(eq(users.email, user.email));

    return NextResponse.json({
      success: true,
      message: "Akun berhasil di-generate.",
      username: username,
      password: password,
    }, { status: 200 });

  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: "Gagal meng-generate akun admin." }, { status: 500 });
  }
}
