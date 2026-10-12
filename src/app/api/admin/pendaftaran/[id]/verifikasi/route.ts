import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { transaksi } from "@/db";
import { catatAktivitas } from "@/lib/audit";
import { ubahVerifikasi } from "@/lib/verifikasi";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const denied = await requireAdmin();
    if (denied) return denied;

    const { id: idStr } = await params;
    const id = parseInt(idStr);
    const body = await request.json();

    // Status change, leaving the class and auto-forming a class happen in one transaction:
    // either all of it is saved or nothing (no rejected student left behind with a moderator or class).
    const hasil = await transaksi(tx => ubahVerifikasi(tx, id, { status: body?.status, note: body?.note }));
    if ("error" in hasil) {
      return NextResponse.json({ error: hasil.error }, { status: hasil.status });
    }
    // Nothing changed (e.g. a double click): no write and no log entry
    if ("unchanged" in hasil) {
      return NextResponse.json({ message: "Tidak ada perubahan.", unchanged: true }, { status: 200 });
    }

    catatAktivitas(hasil.log);

    return NextResponse.json({
      message: "Status verifikasi berhasil diperbarui.",
      data: hasil.reg
    }, { status: 200 });

  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Gagal memproses permintaan." },
      { status: 500 }
    );
  }
}
