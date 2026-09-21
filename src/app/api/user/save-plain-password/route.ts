import { NextResponse } from "next/server";
import { db } from "@/db";
import { account } from "@/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export async function POST(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { plainPassword } = await request.json();
    if (!plainPassword) {
      return NextResponse.json({ error: "Missing plainPassword" }, { status: 400 });
    }

    // Update the plainPassword in the account table for the current user
    // Assumes the user has one credential account
    await db.update(account)
      .set({ plainPassword })
      .where(eq(account.userId, session.user.id));

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: "Failed to save plain password" }, { status: 500 });
  }
}
