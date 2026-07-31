import { db } from "@/db";
import { pendaftaran, users, slotWaktu, kelasSeminar, moderator as moderatorTable, periode } from "@/db/schema";
import { eq } from "drizzle-orm";
import { alias } from "drizzle-orm/sqlite-core";
import JadwalClient from "./JadwalClient";

export const dynamic = "force-dynamic";

export default async function JadwalPage() {
  const dosenUsers = alias(users, "dosenUsers");
  
  const schedules = await db.select({
    id: pendaftaran.id,
    name: users.nama,
    nim: users.nipNim,
    prodi: users.prodi,
    dospem: pendaftaran.dospem1,
    title: pendaftaran.judulPenelitian,
    room: pendaftaran.ruanganDisetujui,
    moderator: dosenUsers.nama,
    pembahas: pendaftaran.pembahas,
    waktuMulai: slotWaktu.waktuMulai,
    waktuSelesai: slotWaktu.waktuSelesai,
    kelas: kelasSeminar.namaKelas,
    angkatan: periode.angkatan,
    jenisSeminar: periode.jenisSeminar,
  })
  .from(pendaftaran)
  .leftJoin(users, eq(pendaftaran.userId, users.id))
  .leftJoin(slotWaktu, eq(pendaftaran.slotWaktuId, slotWaktu.id))
  .leftJoin(kelasSeminar, eq(pendaftaran.kelasSeminarId, kelasSeminar.id))
  .leftJoin(moderatorTable, eq(pendaftaran.id, moderatorTable.pendaftaranId))
  .leftJoin(dosenUsers, eq(moderatorTable.dosenId, dosenUsers.id))
  .leftJoin(periode, eq(pendaftaran.periodeId, periode.id))
  .where(eq(pendaftaran.isReleased, true));

  // Format the data
  const formattedSchedules = schedules.map(item => {
    let date = "-";
    let time = "-";
    let sortValue = 0;
    let isPast = false;
    
    if (item.waktuMulai && item.waktuSelesai) {
      const d = new Date(item.waktuMulai);
      const endD = new Date(item.waktuSelesai);
      sortValue = d.getTime();
      
      const day = d.getDate().toString().padStart(2, '0');
      const months = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
      const month = months[d.getMonth()];
      const year = d.getFullYear();
      
      const days = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
      const dayName = days[d.getDay()];
      
      date = `${dayName}, ${day} ${month} ${year}`;
      
      const startHours = d.getHours().toString().padStart(2, '0');
      const startMinutes = d.getMinutes().toString().padStart(2, '0');
      const endHours = endD.getHours().toString().padStart(2, '0');
      const endMinutes = endD.getMinutes().toString().padStart(2, '0');
      time = `${startHours}:${startMinutes} - ${endHours}:${endMinutes}`;
      isPast = endD.getTime() < Date.now();
    }
    
    return {
      ...item,
      date,
      time,
      sortValue,
      isPast
    };
  });
  
  // Sort by time
  formattedSchedules.sort((a, b) => a.sortValue - b.sortValue);

  return <JadwalClient schedules={formattedSchedules} />;
}
