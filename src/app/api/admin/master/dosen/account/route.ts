import { NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { generateSecurePassword } from "@/lib/password-generator";

export async function POST(request: Request) {
  try {
    const { id } = await request.json();
    if (!id) return NextResponse.json({ error: "Missing ID" }, { status: 400 });

    const userRecord = await db.query.users.findFirst({
      where: eq(users.id, id)
    });

    if (!userRecord) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (userRecord.username) {
      return NextResponse.json({ error: "User already has an account" }, { status: 400 });
    }

    // Generate a username based on Nama
    const firstName = (userRecord.name || userRecord.nama || "").split(" ")[0].toLowerCase().replace(/[^a-z0-9]/g, "");
    const generatedUsername = firstName ? `${firstName}_123` : "user_123";
    const emailToUse = userRecord.email; 
    const password = "password123";
    
    // 1. Delete existing user (Master Data only)
    await db.delete(users).where(eq(users.id, id));

    // 2. Sign up to create account and properly hash password, including all required fields
    await auth.api.signUpEmail({
      body: {
        email: emailToUse,
        password: password,
        name: userRecord.name || userRecord.nama,
        username: generatedUsername,
        role: "dosen",
        nama: userRecord.nama,
        nipNim: userRecord.nipNim,
        prodi: userRecord.prodi,
        jabatan: userRecord.jabatan,
      } as any,
      asResponse: false
    });

    // 3. Update the rest of the fields (role, nama, nipNim, dll)
    await db.update(users).set({
      role: "dosen",
      nama: userRecord.nama,
      nipNim: userRecord.nipNim,
      prodi: userRecord.prodi,
      jabatan: userRecord.jabatan
    }).where(eq(users.email, emailToUse));

    return NextResponse.json({ success: true, username: generatedUsername, password: password }, { status: 200 });
  } catch (error: any) {
    console.error("Account Generation Error:", error);
    return NextResponse.json({ error: error.message || "Failed to generate account" }, { status: 500 });
  }
}
