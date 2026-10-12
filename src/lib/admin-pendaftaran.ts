// Rows of the admin registration list (all periodes); the route adds the display fields (dates, tanggal kolokium).
import { eq } from "drizzle-orm";
import { alias } from "drizzle-orm/sqlite-core";
import { db, type Executor } from "@/db";
import { pendaftaran, users, slotWaktu, kelasSeminar, moderator as moderatorTable } from "@/db/schema";

const dosenUsers = alias(users, "dosenUsers");

export function ambilPendaftaranAdmin(ex: Executor = db) {
  return ex.select({
    id: pendaftaran.id,
    userId: pendaftaran.userId,
    periodeId: pendaftaran.periodeId,
    name: users.nama,
    nim: users.nipNim,
    prodi: users.prodi,
    dospem: pendaftaran.dospem1,
    dospem2: pendaftaran.dospem2,
    dospem1Id: pendaftaran.dospem1Id,
    dospem2Id: pendaftaran.dospem2Id,
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
    moderatorBatalStatus: moderatorTable.batalStatus,
    moderatorBatalReason: moderatorTable.batalReason,
    pembahas: pendaftaran.pembahas,
    waktuMulai: slotWaktu.waktuMulai,
    waktuSelesai: slotWaktu.waktuSelesai,
    kelas: kelasSeminar.namaKelas,
    kelasSeminarId: pendaftaran.kelasSeminarId,
    fileBuktiKolokium: pendaftaran.fileBuktiKolokium,
    fileApprovalDospem: pendaftaran.fileApprovalDospem,
    konsentrasi: pendaftaran.konsentrasi,
    tanggalKolokium: pendaftaran.tanggalKolokium,
    jenisSeminar: pendaftaran.jenisSeminar,
  })
  .from(pendaftaran)
  .leftJoin(users, eq(pendaftaran.userId, users.id))
  .leftJoin(slotWaktu, eq(pendaftaran.slotWaktuId, slotWaktu.id))
  .leftJoin(kelasSeminar, eq(pendaftaran.kelasSeminarId, kelasSeminar.id))
  .leftJoin(moderatorTable, eq(pendaftaran.id, moderatorTable.pendaftaranId))
  .leftJoin(dosenUsers, eq(moderatorTable.dosenId, dosenUsers.id));
}
