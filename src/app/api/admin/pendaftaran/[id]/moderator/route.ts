import { NextResponse } from "next/server";
import { db, transaksi } from "@/db";
import { pendaftaran, kelasSeminar, moderator, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { findDosenClash, getWaktuMulaiPendaftaran } from "@/lib/jadwal";
import { catatAktivitas } from "@/lib/audit";


export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: idStr } = await params;
    const id = parseInt(idStr);
    const body = await request.json();
    const { dosenId } = body;

    // Get pendaftaran
    const pendList = await db.select().from(pendaftaran).where(eq(pendaftaran.id, id));
    if (pendList.length === 0) return NextResponse.json({ error: "Pendaftaran tidak ditemukan" }, { status: 404 });
    const pend = pendList[0];

    if (!pend.kelasSeminarId) {
      return NextResponse.json({ error: "Pendaftaran belum memiliki jadwal kelas" }, { status: 400 });
    }

    let namaModerator: string | null = null;
    if (!dosenId) {
      // Remove moderator
      await db.delete(moderator).where(eq(moderator.pendaftaranId, pend.id));
    } else {
      // Validate: the selected dosen must not be the supervisor of this student
      const dosenUser = await db.select({ nama: users.nama, role: users.role }).from(users).where(eq(users.id, dosenId)).limit(1);
      if (!dosenUser.length || dosenUser[0].role !== "dosen") {
        return NextResponse.json({ error: "Dosen tidak ditemukan." }, { status: 404 });
      }
      const dosenName = dosenUser[0].nama;
      namaModerator = dosenName;
      if (dosenName && (pend.dospem1 === dosenName || pend.dospem2 === dosenName)) {
        return NextResponse.json({ error: "Dosen pembimbing tidak dapat dijadikan moderator untuk mahasiswanya sendiri." }, { status: 400 });
      }

      // Clash check and write in one transaction, so the dosen can't be booked elsewhere at the same time in between
      const clash = await transaksi(async (tx) => {
        // Validate: the dosen must not have another duty (pembimbing / moderator) at the same time
        const waktuMulai = await getWaktuMulaiPendaftaran(pend.id, tx);
        if (waktuMulai && dosenName) {
          const clash = await findDosenClash({ dosenId, dosenName, waktuMulai, excludePendaftaranId: pend.id }, tx);
          if (clash) return clash;
        }

        // Update or insert moderator
        const existing = await tx.select().from(moderator).where(eq(moderator.pendaftaranId, pend.id));
        if (existing.length > 0) {
          await tx.update(moderator).set({ dosenId, assignedByRole: 'admin' }).where(eq(moderator.pendaftaranId, pend.id));
        } else {
          await tx.insert(moderator).values({ pendaftaranId: pend.id, dosenId, assignedByRole: 'admin' });
        }
        return null;
      });
      if (clash) {
        return NextResponse.json({ error: `Jadwal bentrok: ${clash}` }, { status: 409 });
      }
    }

    catatAktivitas({
      kategori: "jadwal",
      aksi: dosenId ? "moderator.tetapkan" : "moderator.hapus",
      deskripsi: dosenId ? `Menetapkan ${namaModerator} sebagai moderator {mahasiswa}` : "Menghapus moderator {mahasiswa}",
      targetTipe: "pendaftaran",
      targetId: pend.id,
      pendaftaranIds: [pend.id],
    });

    return NextResponse.json({ message: "Moderator berhasil diperbarui" }, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Gagal memperbarui moderator" }, { status: 500 });
  }
}
