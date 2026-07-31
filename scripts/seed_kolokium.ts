import { db } from "../src/db";
import { users, pendaftaran, periode } from "../src/db/schema";
import { eq } from "drizzle-orm";

async function run() {
  const allUsers = await db.select().from(users).where(eq(users.role, 'mahasiswa'));
  if (allUsers.length === 0) {
    console.log('No mahasiswa found');
    process.exit(0);
  }
  const mhs1 = allUsers[0];

  const per = await db.select().from(periode).limit(1);
  const periodeId = per.length > 0 ? per[0].id : 1;

  // Cek apakah sudah ada kolokium
  const existing = await db.select().from(pendaftaran).where(eq(pendaftaran.userId, mhs1.id));
  
  if (!existing.some(e => e.jenisSeminar === 'kolokium')) {
    await db.insert(pendaftaran).values({ 
      userId: mhs1.id, 
      periodeId, 
      jenisSeminar: 'kolokium', 
      statusVerifikasi: 'disetujui', 
      judulPenelitian: 'Pengaruh AI dalam Akuntansi', 
      tanggalKolokium: '2026-08-01',
      dospem1: 'Budi Santoso',
      konsentrasi: 'Akuntansi Keuangan'
    });
    console.log('Seeded completed kolokium for ' + mhs1.nipNim);
  } else {
    console.log('Kolokium already exists for ' + mhs1.nipNim);
    // ensure it is approved
    const k = existing.find(e => e.jenisSeminar === 'kolokium');
    if (k && k.statusVerifikasi !== 'disetujui') {
      await db.update(pendaftaran).set({ statusVerifikasi: 'disetujui' }).where(eq(pendaftaran.id, k.id));
      console.log('Updated kolokium to disetujui');
    }
  }

  console.log('Login email untuk tes: ' + mhs1.email);
  process.exit(0);
}

run().catch(console.error);
