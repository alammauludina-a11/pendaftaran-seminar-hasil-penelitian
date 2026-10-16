import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/admin-auth";
import { db } from "@/db";
import { periode, users } from "@/db/schema";
import { catatAktivitas } from "@/lib/audit";
import { ambilBatasModerator, bacaAngkaIsian, simpanPengecualian, MAKS_ISIAN_BATAS } from "@/lib/batas-moderator";

const labelJenis = (jenis?: string | null) => (jenis === "kolokium" ? "Kolokium" : "Seminar Hasil");

async function bacaId(params: Promise<{ id: string }>) {
  const id = Number((await params).id);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const denied = await requireAdmin();
    if (denied) return denied;

    const id = await bacaId(params);
    const data = id ? await ambilBatasModerator(id) : null;
    if (!data) return NextResponse.json({ error: "Periode tidak ditemukan" }, { status: 404 });
    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Gagal mengambil batas moderator." }, { status: 500 });
  }
}

/**
 * Body `{ batas }` sets the periode's limit (null = no limit);
 * body `{ dosenId, tambahan }` sets a dosen's pengecualian (null = remove it).
 */
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const denied = await requireAdmin();
    if (denied) return denied;

    const id = await bacaId(params);
    const [p] = id ? await db.select().from(periode).where(eq(periode.id, id)).limit(1) : [];
    if (!id || !p) return NextResponse.json({ error: "Periode tidak ditemukan" }, { status: 404 });
    const body = await request.json();
    const namaPeriode = `${labelJenis(p.jenisSeminar)} ${p.angkatan}`;

    if ("batas" in body) {
      const isian = bacaAngkaIsian(body.batas);
      if (!isian.ok) {
        return NextResponse.json({ error: `Batas moderator harus angka 0–${MAKS_ISIAN_BATAS}, atau dikosongkan.` }, { status: 400 });
      }
      await db.update(periode).set({ batasModerator: isian.angka }).where(eq(periode.id, id));
      catatAktivitas({
        kategori: "periode",
        aksi: "periode.batas_moderator",
        deskripsi: isian.angka === null
          ? `Menghapus batas moderator periode ${namaPeriode}`
          : `Mengatur batas moderator periode ${namaPeriode} menjadi ${isian.angka} kali`,
        targetTipe: "periode",
        targetId: id,
        detail: { batasModerator: isian.angka },
      });
    } else if (typeof body.dosenId === "string") {
      const isian = bacaAngkaIsian(body.tambahan, 1);
      if (!isian.ok) {
        return NextResponse.json({ error: `Tambahan harus angka 1–${MAKS_ISIAN_BATAS}.` }, { status: 400 });
      }
      const [dosen] = await db.select({ nama: users.nama }).from(users)
        .where(and(eq(users.id, body.dosenId), eq(users.role, "dosen"))).limit(1);
      if (!dosen) return NextResponse.json({ error: "Dosen tidak ditemukan" }, { status: 404 });
      await simpanPengecualian(id, body.dosenId, isian.angka);
      catatAktivitas({
        kategori: "periode",
        aksi: "periode.pengecualian_moderator",
        deskripsi: isian.angka === null
          ? `Menghapus pengecualian batas moderator ${dosen.nama} pada periode ${namaPeriode}`
          : `Mengizinkan ${dosen.nama} melebihi batas moderator ${isian.angka} kali pada periode ${namaPeriode}`,
        targetTipe: "periode",
        targetId: id,
        detail: { dosenId: body.dosenId, tambahan: isian.angka },
      });
    } else {
      return NextResponse.json({ error: "Permintaan tidak valid" }, { status: 400 });
    }

    return NextResponse.json(await ambilBatasModerator(id), { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Gagal menyimpan batas moderator." }, { status: 500 });
  }
}
