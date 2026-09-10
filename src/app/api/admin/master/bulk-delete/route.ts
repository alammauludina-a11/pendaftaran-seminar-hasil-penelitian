import { NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq, inArray, and } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export async function POST(request: Request) {
  try {
    const authSession = await auth.api.getSession({ headers: await headers() });
    if (!authSession?.user || authSession.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { type, ids } = await request.json();

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "Tidak ada data yang dipilih." }, { status: 400 });
    }

    if (!["mahasiswa", "dosen", "admin"].includes(type)) {
      return NextResponse.json({ error: "Tipe data tidak valid." }, { status: 400 });
    }

    // Delete users matching the IDs and role (cascades to account, session via schema FK)
    await db.delete(users).where(
      and(
        inArray(users.id, ids),
        eq(users.role, type)
      )
    );

    return NextResponse.json({ message: "Data berhasil dihapus secara massal." }, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Gagal menghapus data secara massal." }, { status: 500 });
  }
}
