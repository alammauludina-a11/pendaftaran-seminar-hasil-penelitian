import { NextResponse } from "next/server";
import { transaksi } from "@/db";
import { pendaftaran } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { catatAktivitas } from "@/lib/audit";
import { pembahasDitolak } from "@/lib/jadwal";

export const dynamic = "force-dynamic";

// Saves the generated pembahas for a whole class in one atomic batch:
// either every student gets their pembahas or nothing is changed.
export async function PUT(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const assignments: { id: number; pembahas: string }[] = body.assignments;

    if (
      !Array.isArray(assignments) ||
      assignments.length === 0 ||
      assignments.some(a => !Number.isInteger(a?.id) || typeof a?.pembahas !== "string")
    ) {
      return NextResponse.json({ error: "Data pembahas tidak valid." }, { status: 400 });
    }

    const ids = assignments.map(a => a.id);
    const hasil = await transaksi(async (tx) => {
      const existing = await tx
        .select({ id: pendaftaran.id, isReleased: pendaftaran.isReleased, pembahas: pendaftaran.pembahas })
        .from(pendaftaran)
        .where(inArray(pendaftaran.id, ids));

      if (existing.length !== new Set(ids).size) {
        return { error: "Sebagian pendaftaran tidak ditemukan.", status: 404 };
      }
      if (existing.some(p => p.isReleased)) {
        return { error: "Kelas sudah dirilis, pembahas tidak dapat diubah.", status: 400 };
      }
      const ditolak = await pembahasDitolak(assignments, tx);
      if (ditolak) {
        return { error: ditolak, status: 400 };
      }

      // Only rows whose pembahas really changes are written (and logged)
      const lama = new Map(existing.map(p => [p.id, p.pembahas ?? null]));
      const berubah = assignments.filter(a => (a.pembahas || null) !== lama.get(a.id));
      for (const a of berubah) {
        await tx.update(pendaftaran).set({ pembahas: a.pembahas || null }).where(eq(pendaftaran.id, a.id));
      }
      return { berubah };
    });
    if ("error" in hasil) {
      return NextResponse.json({ error: hasil.error }, { status: hasil.status });
    }
    const { berubah } = hasil;
    if (berubah.length === 0) {
      return NextResponse.json({ message: "Tidak ada perubahan pembahas.", unchanged: true }, { status: 200 });
    }

    catatAktivitas({
      kategori: "jadwal",
      aksi: "pembahas.massal",
      deskripsi: `Menyimpan pembahas untuk ${berubah.length} mahasiswa: {mahasiswa}`,
      targetTipe: "pendaftaran",
      pendaftaranIds: berubah.map(a => a.id),
      detail: { assignments: berubah },
    });

    return NextResponse.json({ message: `${berubah.length} pembahas berhasil disimpan.` }, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Gagal menyimpan pembahas." }, { status: 500 });
  }
}
