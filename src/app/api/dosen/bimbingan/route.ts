import { NextResponse } from "next/server";
import { db } from "@/db";
import { pendaftaran, users, slotWaktu, periode, kelasSeminar, moderator } from "@/db/schema";
import { alias } from "drizzle-orm/sqlite-core";
import { eq, or, and, desc } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

// Progress of every student supervised by the logged-in dosen in the chosen periode (all statuses)
export async function GET(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user || session.user.role !== "dosen") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const reqPeriodeId = new URL(request.url).searchParams.get("periodeId");

    const allPeriodeData = await db.select().from(periode).orderBy(desc(periode.createdAt));
    let activePeriodeData = reqPeriodeId
      ? allPeriodeData.find(p => p.id === parseInt(reqPeriodeId)) || null
      : null;
    if (!activePeriodeData) {
      activePeriodeData = allPeriodeData.find(p => p.isOpen) || allPeriodeData[0] || null;
    }
    if (!activePeriodeData) {
      return NextResponse.json({ mahasiswa: [] }, { status: 200 });
    }

    const moderatorUser = alias(users, "moderator_user");
    const rows = await db
      .select({
        id: pendaftaran.id,
        nama: users.nama,
        nim: users.nipNim,
        judul: pendaftaran.judulPenelitian,
        dospem1Id: pendaftaran.dospem1Id,
        dospem1: pendaftaran.dospem1,
        dospem2: pendaftaran.dospem2,
        tanggalDaftar: pendaftaran.createdAt,
        statusVerifikasi: pendaftaran.statusVerifikasi,
        catatanAdmin: pendaftaran.catatanAdmin,
        kelasSeminarId: pendaftaran.kelasSeminarId,
        namaKelas: kelasSeminar.namaKelas,
        waktuMulai: slotWaktu.waktuMulai,
        waktuSelesai: slotWaktu.waktuSelesai,
        pembahas: pendaftaran.pembahas,
        ruanganDisetujui: pendaftaran.ruanganDisetujui,
        ruanganDiajukan: pendaftaran.ruanganDiajukan,
        statusRuangan: pendaftaran.statusRuangan,
        moderator: moderatorUser.nama,
        moderatorBatalStatus: moderator.batalStatus,
        isFinalized: pendaftaran.isFinalized,
        isReleased: pendaftaran.isReleased,
      })
      .from(pendaftaran)
      .leftJoin(users, eq(pendaftaran.userId, users.id))
      .leftJoin(slotWaktu, eq(pendaftaran.slotWaktuId, slotWaktu.id))
      .leftJoin(kelasSeminar, eq(pendaftaran.kelasSeminarId, kelasSeminar.id))
      .leftJoin(moderator, eq(moderator.pendaftaranId, pendaftaran.id))
      .leftJoin(moderatorUser, eq(moderator.dosenId, moderatorUser.id))
      .where(
        and(
          eq(pendaftaran.periodeId, activePeriodeData.id),
          or(
            eq(pendaftaran.dospem1Id, session.user.id),
            eq(pendaftaran.dospem2Id, session.user.id)
          )
        )
      );

    const mahasiswa = rows.map(r => ({
      ...r,
      peran: r.dospem1Id === session.user.id ? "Dospem 1" : "Dospem 2",
      // A kelasSeminarId pointing to a deleted class counts as no class yet
      namaKelas: r.kelasSeminarId ? r.namaKelas : null,
    }));

    return NextResponse.json({ mahasiswa }, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch data" }, { status: 500 });
  }
}
