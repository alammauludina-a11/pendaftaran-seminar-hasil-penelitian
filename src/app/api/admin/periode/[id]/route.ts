import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { db } from "@/db";
import { periode, pendaftaran } from "@/db/schema";
import { eq } from "drizzle-orm";
import { autoGenerateSlots } from "@/lib/slot-generator";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const denied = await requireAdmin();
    if (denied) return denied;

    const { id: idStr } = await params;
    const id = parseInt(idStr);
    const data = await db.select().from(periode).where(eq(periode.id, id));
    if (!data.length) {
      return NextResponse.json({ error: "Periode tidak ditemukan" }, { status: 404 });
    }
    const p = { ...data[0], forcedClasses: [], cancelledClasses: [] };
    return NextResponse.json({ periode: p }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch periode" }, { status: 500 });
  }
}

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

    // Map body to DB schema
    const updateData: any = {};
    if (body.angkatan !== undefined) updateData.angkatan = body.angkatan;
    if (body.jenisSeminar !== undefined) updateData.jenisSeminar = body.jenisSeminar;
    if (body.startDate !== undefined) updateData.startDate = body.startDate;
    if (body.endDate !== undefined) updateData.endDate = body.endDate;
    if (body.registrationEndDate !== undefined) updateData.registrationEndDate = body.registrationEndDate;
    if (body.isOpen !== undefined) updateData.isOpen = body.isOpen;
    if (body.batasKelas !== undefined) updateData.batasKelas = body.batasKelas;
    if (body.isDraft !== undefined) updateData.isDraft = body.isDraft;

    if (updateData.startDate && updateData.endDate && new Date(updateData.startDate) > new Date(updateData.endDate)) {
      const temp = updateData.startDate;
      updateData.startDate = updateData.endDate;
      updateData.endDate = temp;
    }

    const updatedPeriode = await db.update(periode)
      .set(updateData)
      .where(eq(periode.id, id))
      .returning();

    // Auto generate slots if the period is open
    if (updatedPeriode.length > 0 && updatedPeriode[0].isOpen && updatedPeriode[0].startDate && updatedPeriode[0].endDate) {
      await autoGenerateSlots(updatedPeriode[0].startDate, updatedPeriode[0].endDate);
    }

    if (!updatedPeriode.length) {
      return NextResponse.json({ error: "Periode tidak ditemukan" }, { status: 404 });
    }

    return NextResponse.json({
      message: "Periode berhasil diupdate.",
      periode: { ...updatedPeriode[0], forcedClasses: [], cancelledClasses: [] }
    }, { status: 200 });

  } catch (error) {
    return NextResponse.json(
      { error: "Gagal memproses permintaan." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const denied = await requireAdmin();
    if (denied) return denied;

    const { id: idStr } = await params;
    const id = parseInt(idStr);
    // Deleting a periode cascades to its registrations, so only allow it when it has none
    const hasPendaftaran = await db.select({ id: pendaftaran.id }).from(pendaftaran).where(eq(pendaftaran.periodeId, id)).limit(1);
    if (hasPendaftaran.length > 0) {
      return NextResponse.json({ error: "Periode tidak dapat dihapus karena sudah memiliki pendaftar." }, { status: 400 });
    }

    await db.delete(periode).where(eq(periode.id, id));

    return NextResponse.json({
      message: "Periode berhasil dihapus."
    }, { status: 200 });

  } catch (error) {
    return NextResponse.json(
      { error: "Gagal menghapus periode." },
      { status: 500 }
    );
  }
}
