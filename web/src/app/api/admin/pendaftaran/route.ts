import { NextResponse } from "next/server";
import { db } from "@/db";
import { pendaftaran, users, slotWaktu, kelasSeminar, moderator as moderatorTable } from "@/db/schema";
import { eq } from "drizzle-orm";
import { alias } from "drizzle-orm/sqlite-core";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const dosenUsers = alias(users, "dosenUsers");
    const data = await db.select({
      id: pendaftaran.id,
      periodeId: pendaftaran.periodeId,
      name: users.nama,
      nim: users.nipNim,
      prodi: users.prodi,
      dospem: pendaftaran.dospem1,
      title: pendaftaran.judulPenelitian,
      status: pendaftaran.statusVerifikasi,
      note: pendaftaran.catatanAdmin,
      isFinalized: pendaftaran.isFinalized,
      isReleased: pendaftaran.isReleased,
      room: pendaftaran.ruanganDisetujui,
      ruanganDiajukan: pendaftaran.ruanganDiajukan,
      statusRuangan: pendaftaran.statusRuangan,
      moderator: dosenUsers.nama,
      moderatorId: dosenUsers.id,
      moderatorAssignedByRole: moderatorTable.assignedByRole,
      pembahas: pendaftaran.pembahas,
      waktuMulai: slotWaktu.waktuMulai,
      waktuSelesai: slotWaktu.waktuSelesai,
      kelas: kelasSeminar.namaKelas,
      kelasSeminarId: pendaftaran.kelasSeminarId,
      fileBuktiKolokium: pendaftaran.fileBuktiKolokium,
      fileApprovalDospem: pendaftaran.fileApprovalDospem,
      konsentrasi: pendaftaran.konsentrasi,
      tanggalKolokium: pendaftaran.tanggalKolokium,
    })
    .from(pendaftaran)
    .leftJoin(users, eq(pendaftaran.userId, users.id))
    .leftJoin(slotWaktu, eq(pendaftaran.slotWaktuId, slotWaktu.id))
    .leftJoin(kelasSeminar, eq(pendaftaran.kelasSeminarId, kelasSeminar.id))
    .leftJoin(moderatorTable, eq(pendaftaran.id, moderatorTable.pendaftaranId))
    .leftJoin(dosenUsers, eq(moderatorTable.dosenId, dosenUsers.id));

    // Format date and time
    const formattedData = data.map(item => {
      let date = "-";
      let time = "-";
      if (item.waktuMulai && item.waktuSelesai) {
        const d = new Date(item.waktuMulai);
        const endD = new Date(item.waktuSelesai);
        const day = d.getDate().toString().padStart(2, '0');
        const months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agt", "Sep", "Okt", "Nov", "Des"];
        const month = months[d.getMonth()];
        const year = d.getFullYear();
        date = `${day} ${month} ${year}`;
        
        const startHours = d.getHours().toString().padStart(2, '0');
        const startMinutes = d.getMinutes().toString().padStart(2, '0');
        const endHours = endD.getHours().toString().padStart(2, '0');
        const endMinutes = endD.getMinutes().toString().padStart(2, '0');
        time = `${startHours}:${startMinutes} - ${endHours}:${endMinutes}`;
      }
      return {
        ...item,
        date,
        time
      };
    });

    return NextResponse.json({ pendaftaran: formattedData }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch pendaftaran" }, { status: 500 });
  }
}
