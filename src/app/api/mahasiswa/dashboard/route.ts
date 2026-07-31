import { NextResponse } from "next/server";
import { db } from "@/db";
import { pendaftaran, periode, slotWaktu, users, moderator, kelasSeminar } from "@/db/schema";
import { eq, inArray, and } from "drizzle-orm";
import { alias } from "drizzle-orm/sqlite-core";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

export async function GET(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const mhsId = session.user.id;
    const { searchParams } = new URL(request.url);
    const jenis = searchParams.get("jenis") || "hasil_penelitian";

    const data = await db
      .select({
        id: pendaftaran.id,
        status: pendaftaran.statusVerifikasi,
        room: pendaftaran.ruanganDisetujui,
        ruanganDiajukan: pendaftaran.ruanganDiajukan,
        statusRuangan: pendaftaran.statusRuangan,
        note: pendaftaran.catatanAdmin,
        title: pendaftaran.judulPenelitian,
        dospem1: pendaftaran.dospem1,
        dospem2: pendaftaran.dospem2,
        periodeId: pendaftaran.periodeId,
        slotWaktuId: pendaftaran.slotWaktuId,
        konsentrasi: pendaftaran.konsentrasi,
        isFinalized: pendaftaran.isFinalized,
        isReleased: pendaftaran.isReleased,
        pembahas: pendaftaran.pembahas,
        fileBuktiKolokium: pendaftaran.fileBuktiKolokium,
        fileApprovalDospem: pendaftaran.fileApprovalDospem,
        tanggalKolokium: pendaftaran.tanggalKolokium,
      })
      .from(pendaftaran)
      .where(and(eq(pendaftaran.userId, mhsId), eq(pendaftaran.jenisSeminar, jenis as "kolokium" | "hasil_penelitian")));

    // Check for active period matching student angkatan
    const mhsData = await db.select({ angkatan: users.angkatan }).from(users).where(eq(users.id, mhsId));
    const mhsAngkatan = mhsData[0]?.angkatan || "";
    const allOpenPeriodes = await db.select().from(periode).where(eq(periode.isOpen, true));
    const periodes = mhsAngkatan ? allOpenPeriodes.filter(p => p.angkatan.includes(mhsAngkatan) && p.jenisSeminar === jenis) : [];

    // Fetch Pengumuman (all released seminars) with full joins
    const dosenUsers = alias(users, "dosenUsers");
    const rawPengumuman = await db
      .select({
        id: pendaftaran.id,
        mahasiswaId: pendaftaran.userId,
        mahasiswa: users.nama,
        nim: users.nipNim,
        dospem: pendaftaran.dospem1,
        ruangan: pendaftaran.ruanganDisetujui,
        pembahas: pendaftaran.pembahas,
        moderator: dosenUsers.nama,
        kelas: kelasSeminar.namaKelas,
        waktuMulai: slotWaktu.waktuMulai,
        waktuSelesai: slotWaktu.waktuSelesai,
      })
      .from(pendaftaran)
      .leftJoin(users, eq(pendaftaran.userId, users.id))
      .leftJoin(slotWaktu, eq(pendaftaran.slotWaktuId, slotWaktu.id))
      .leftJoin(kelasSeminar, eq(pendaftaran.kelasSeminarId, kelasSeminar.id))
      .leftJoin(moderator, eq(pendaftaran.id, moderator.pendaftaranId))
      .leftJoin(dosenUsers, eq(moderator.dosenId, dosenUsers.id))
      .where(and(eq(pendaftaran.isReleased, true), eq(pendaftaran.jenisSeminar, jenis as "kolokium" | "hasil_penelitian")));

    // Format Pengumuman
    const pengumuman = rawPengumuman.map(r => {
      let dateStr = "-";
      let timeStr = "-";
      if (r.waktuMulai && r.waktuSelesai) {
        const d = new Date(r.waktuMulai);
        const endD = new Date(r.waktuSelesai);
        const months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agt", "Sep", "Okt", "Nov", "Des"];
        dateStr = `${d.getDate().toString().padStart(2, '0')} ${months[d.getMonth()]} ${d.getFullYear()}`;
        timeStr = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')} - ${endD.getHours().toString().padStart(2, '0')}:${endD.getMinutes().toString().padStart(2, '0')}`;
      }
      
      return {
        id: r.id,
        mahasiswa: r.mahasiswa || "Unknown",
        nim: r.nim || "-",
        dospem: r.dospem,
        tanggal: dateStr,
        waktu: timeStr,
        ruangan: r.ruangan || "-",
        pembahas: r.pembahas ?? "-",
        moderator: r.moderator ?? "-",
        isSelf: r.mahasiswaId === mhsId,
        kelas: r.kelas ?? "-",
        waktuMulai: r.waktuMulai
      };
    });

    // Fetch Master Dosen
    const dosenData = await db.select({ nama: users.nama }).from(users).where(eq(users.role, "dosen"));
    const masterDosen = dosenData.map(d => d.nama).filter(Boolean) as string[];

    // Fetch completed kolokium date
    let riwayatTanggalKolokium = null;
    const riwayatKolokium = await db.select({
      waktuMulai: slotWaktu.waktuMulai,
      tanggalKolokium: pendaftaran.tanggalKolokium
    }).from(pendaftaran)
    .leftJoin(slotWaktu, eq(pendaftaran.slotWaktuId, slotWaktu.id))
    .where(and(
      eq(pendaftaran.userId, mhsId),
      eq(pendaftaran.jenisSeminar, "kolokium"),
      eq(pendaftaran.statusVerifikasi, "disetujui")
    )).limit(1);

    if (riwayatKolokium.length > 0) {
      if (riwayatKolokium[0].waktuMulai) {
         const d = new Date(riwayatKolokium[0].waktuMulai);
         const months = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
         riwayatTanggalKolokium = `${d.getDate().toString().padStart(2, '0')} ${months[d.getMonth()]} ${d.getFullYear()}`;
      } else if (riwayatKolokium[0].tanggalKolokium) {
         riwayatTanggalKolokium = riwayatKolokium[0].tanggalKolokium;
      }
    }

    if (!data.length) {
      return NextResponse.json({
        pendaftaranStatus: null,
        activePeriode: periodes.length > 0 ? periodes[0].id : null,
        activePeriodeData: periodes.length > 0 ? periodes[0] : null,
        pengumuman: pengumuman,
        masterDosen: masterDosen,
        riwayatTanggalKolokium: riwayatTanggalKolokium
      }, { status: 200 });
    }

    const reg = data[0];

    // Fetch slot waktu details if exists
    let slotDetail = null;
    if (reg.slotWaktuId) {
      const slots = await db.select().from(slotWaktu).where(eq(slotWaktu.id, reg.slotWaktuId));
      if (slots.length > 0) {
        const s = slots[0];
        const d = new Date(s.waktuMulai);
        const endD = new Date(s.waktuSelesai);
        const months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agt", "Sep", "Okt", "Nov", "Des"];
        slotDetail = {
          id: s.id,
          date: `${d.getDate().toString().padStart(2, '0')} ${months[d.getMonth()]} ${d.getFullYear()}`,
          time: `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')} - ${endD.getHours().toString().padStart(2, '0')}:${endD.getMinutes().toString().padStart(2, '0')}`,
        };
      }
    }

    return NextResponse.json({
      pendaftaranStatus: reg.status,
      catatanPenolakan: reg.note,
      ruanganStatus: reg.statusRuangan === "disetujui" ? "disetujui" : (reg.ruanganDiajukan ? "menunggu" : (reg.room ? "disetujui" : "menunggu")),
      activePeriode: periodes.length > 0 ? periodes[0].id : reg.periodeId,
      activePeriodeData: periodes.length > 0 ? periodes[0] : null,
      slot: slotDetail,
      details: reg,
      pengumuman: pengumuman,
      masterDosen: masterDosen,
      riwayatTanggalKolokium: riwayatTanggalKolokium
    }, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch data" }, { status: 500 });
  }
}
