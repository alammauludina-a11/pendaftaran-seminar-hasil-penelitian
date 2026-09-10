import { NextResponse } from "next/server";
import { db } from "@/db";
import { users, account } from "@/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

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

    if (user.username) {
      return NextResponse.json({ error: "Akun untuk admin ini sudah pernah di-generate." }, { status: 400 });
    }

    // Generate a unique username
    const nameSlug = (user.nama || "admin").toLowerCase().replace(/[^a-z0-9]/g, "").substring(0, 10);
    let generatedUsername = `admin_${nameSlug}`;
    let counter = 1;
    while (await db.query.users.findFirst({ where: eq(users.username, generatedUsername) })) {
      generatedUsername = `admin_${nameSlug}_${counter++}`;
    }

    const password = "password123";

    // Hash password using Better Auth's internal context
    const ctx = await auth.$context;
    const hashedPassword = await ctx.password.hash(password);

    // Update the user record in-place (no delete needed)
    await db.update(users).set({
      username: generatedUsername,
      displayUsername: generatedUsername,
    }).where(eq(users.id, id));

    // Insert an account row for credential login
    await db.insert(account).values({
      id: crypto.randomUUID(),
      accountId: user.id,
      providerId: "credential",
      userId: user.id,
      password: hashedPassword,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      message: "Akun berhasil di-generate.",
      username: generatedUsername,
      password: password,
    }, { status: 200 });

  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: "Gagal meng-generate akun admin." }, { status: 500 });
  }
}
