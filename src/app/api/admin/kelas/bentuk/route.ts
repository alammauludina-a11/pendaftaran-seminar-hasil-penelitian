import { NextResponse } from "next/server";
import { db } from "@/db";
import { periode } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/admin-auth";
import { formClassFromQueue } from "@/lib/jadwal";

export async function POST(request: Request) {
  try {
    const denied = await requireAdmin();
    if (denied) return denied;

    const body = await request.json();
    const { periodeId } = body;

    if (!periodeId) {
      return NextResponse.json({ error: "Periode ID required" }, { status: 400 });
    }

    const periodes = await db.select({ id: periode.id }).from(periode).where(eq(periode.id, periodeId));
    if (periodes.length === 0) {
      return NextResponse.json({ error: "Periode tidak ditemukan" }, { status: 404 });
    }

    // Even if the queue is smaller than batas kelas, admin can force-create a class
    const result = await formClassFromQueue(periodeId);
    if (!result) {
      return NextResponse.json({ error: "Tidak ada mahasiswa dalam antrean" }, { status: 400 });
    }

    return NextResponse.json({
      message: `Berhasil membentuk Kelas ${result.className} dengan ${result.count} mahasiswa.`,
      kelas: result.kelas
    }, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Gagal membentuk kelas" }, { status: 500 });
  }
}
