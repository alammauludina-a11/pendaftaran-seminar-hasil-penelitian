import { NextResponse } from "next/server";
import { db } from "@/db";
import { users, account } from "@/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";

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

    // Generate a unique username
    const firstName = (userRecord.name || userRecord.nama || "").split(" ")[0].toLowerCase().replace(/[^a-z0-9]/g, "");
    let baseUsername = firstName || "user";
    let counter = 123;
    let generatedUsername = `${baseUsername}_${counter}`;

    while (await db.query.users.findFirst({ where: eq(users.username, generatedUsername) })) {
      counter++;
      generatedUsername = `${baseUsername}_${counter}`;
    }

    const password = "password123";

    // Hash password using Better Auth's internal context (same algorithm as signUpEmail)
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
      accountId: userRecord.id,
      providerId: "credential",
      userId: userRecord.id,
      password: hashedPassword,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return NextResponse.json({ success: true, username: generatedUsername, password }, { status: 200 });
  } catch (error: any) {
    console.error("Account Generation Error:", error);
    return NextResponse.json({ error: error.message || "Failed to generate account" }, { status: 500 });
  }
}
