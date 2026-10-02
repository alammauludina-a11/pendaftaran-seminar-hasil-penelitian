// Removes everything created by scripts/uji-buat.ts (and everything done with it while testing):
// test accounts, their registrations, uploaded files, moderators, classes, the UJICOBA periodes and their unused slots.
// Only rows recognisable by the markers in uji-shared.ts are touched. The admin audit log is kept on purpose.
//
//   npx tsx --env-file=.env.local scripts/uji-hapus.ts              → only shows what would be removed
//   npx tsx --env-file=.env.local scripts/uji-hapus.ts --jalankan   → removes it
import { and, eq, gte, inArray, like, lt, lte, ne, notInArray, or } from "drizzle-orm";
import { db, transaksi } from "../src/db";
import {
  users, account, session, loginLog, loginGagal, periode, pendaftaran, moderator, kelasSeminar, files, slotWaktu,
} from "../src/db/schema";
import { ANGKATAN_UJI, NIP_NIM_PREFIX, EMAIL_DOMAIN, JALANKAN, targetDatabase } from "./uji-shared";

const fileId = (url: string | null) => (url?.startsWith("/api/files/") ? url.slice("/api/files/".length) : null);

async function main() {
  console.log(`Database tujuan : ${targetDatabase()}`);

  const akunUji = await db.select({ id: users.id, username: users.username, role: users.role }).from(users)
    .where(and(like(users.nipNim, `${NIP_NIM_PREFIX}%`), like(users.email, `%@${EMAIL_DOMAIN}`)));
  const userIds = akunUji.map(u => u.id);
  const dosenIds = akunUji.filter(u => u.role === "dosen").map(u => u.id);

  const periodeUji = await db.select().from(periode).where(eq(periode.angkatan, ANGKATAN_UJI));
  const periodeIds = periodeUji.map(p => p.id);

  const pendUji = userIds.length || periodeIds.length
    ? await db.select().from(pendaftaran).where(or(
        userIds.length ? inArray(pendaftaran.userId, userIds) : undefined,
        periodeIds.length ? inArray(pendaftaran.periodeId, periodeIds) : undefined,
      ))
    : [];
  const pendIds = pendUji.map(p => p.id);

  // Safety: a registration of a real student inside a test periode should be impossible; stop if there is one
  const asing = pendUji.filter(p => !userIds.includes(p.userId));
  if (asing.length > 0) {
    console.log(`\nDIBATALKAN: ada ${asing.length} pendaftaran milik akun non-uji di periode ${ANGKATAN_UJI} (id: ${asing.map(p => p.id).join(", ")}).`);
    console.log(`Periksa dulu secara manual; skrip tidak menghapus data milik pengguna asli.`);
    return;
  }

  const modUji = pendIds.length || dosenIds.length
    ? await db.select({ id: moderator.id, pendaftaranId: moderator.pendaftaranId }).from(moderator).where(or(
        pendIds.length ? inArray(moderator.pendaftaranId, pendIds) : undefined,
        dosenIds.length ? inArray(moderator.dosenId, dosenIds) : undefined,
      ))
    : [];
  // Test dosen set as moderator on a real registration (only possible if done by hand): removed, but reported
  const modDiPendaftaranAsli = modUji.filter(m => !pendIds.includes(m.pendaftaranId));

  const kelasUji = periodeIds.length
    ? await db.select({ id: kelasSeminar.id }).from(kelasSeminar).where(inArray(kelasSeminar.periodeId, periodeIds))
    : [];
  const kelasIds = kelasUji.map(k => k.id);

  // Non-test registrations, used below to never remove a file or slot that real data still points to
  const bukanUji = pendIds.length ? notInArray(pendaftaran.id, pendIds) : undefined;

  // Uploaded files of test registrations, unless a real registration points to the same file
  const fileIdsUji = [...new Set(pendUji.flatMap(p => [fileId(p.fileBuktiKolokium), fileId(p.fileApprovalDospem)]).filter((f): f is string => !!f))];
  const urlsUji = fileIdsUji.map(f => `/api/files/${f}`);
  const dipakaiAsli = new Set(
    urlsUji.length
      ? (await db.select({ a: pendaftaran.fileBuktiKolokium, b: pendaftaran.fileApprovalDospem }).from(pendaftaran)
          .where(and(bukanUji, or(inArray(pendaftaran.fileBuktiKolokium, urlsUji), inArray(pendaftaran.fileApprovalDospem, urlsUji)))))
          .flatMap(r => [fileId(r.a), fileId(r.b)])
      : []
  );
  const fileHapus = fileIdsUji.filter(f => !dipakaiAsli.has(f));

  // Slots of the test week that no real registration/class uses, unless a real periode also covers those dates
  let slotHapus: number[] = [];
  const hasil = periodeUji.find(p => p.jenisSeminar === "hasil_penelitian");
  if (hasil?.startDate && hasil.endDate) {
    const tumpang = await db.select({ id: periode.id }).from(periode).where(and(
      ne(periode.angkatan, ANGKATAN_UJI),
      lte(periode.startDate, hasil.endDate),
      gte(periode.endDate, hasil.startDate),
    )).limit(1);
    if (tumpang.length === 0) {
      const dari = new Date(`${hasil.startDate}T00:00:00+07:00`);
      const sampai = new Date(new Date(`${hasil.endDate}T00:00:00+07:00`).getTime() + 24 * 60 * 60 * 1000);
      const ids = (await db.select({ id: slotWaktu.id }).from(slotWaktu)
        .where(and(gte(slotWaktu.waktuMulai, dari), lt(slotWaktu.waktuMulai, sampai)))).map(s => s.id);
      if (ids.length) {
        const dipakai = new Set([
          ...(await db.select({ s: pendaftaran.slotWaktuId }).from(pendaftaran).where(and(bukanUji, inArray(pendaftaran.slotWaktuId, ids)))).map(r => r.s),
          ...(await db.select({ s: kelasSeminar.slotWaktuId }).from(kelasSeminar)
            .where(and(kelasIds.length ? notInArray(kelasSeminar.id, kelasIds) : undefined, inArray(kelasSeminar.slotWaktuId, ids)))).map(r => r.s),
        ]);
        slotHapus = ids.filter(id => !dipakai.has(id));
      }
    }
  }

  // Real registrations that picked a test dosen as pembimbing can't be fixed automatically
  const dospemAsli = dosenIds.length
    ? await db.select({ id: pendaftaran.id }).from(pendaftaran).where(and(
        or(inArray(pendaftaran.dospem1Id, dosenIds), inArray(pendaftaran.dospem2Id, dosenIds)),
        bukanUji,
      ))
    : [];

  console.log(`Akan dihapus    :`);
  console.log(`  - Akun uji       : ${akunUji.length}${akunUji.length ? ` (${akunUji.map(u => u.username).join(", ")})` : ""}`);
  console.log(`  - Periode uji    : ${periodeUji.length}`);
  console.log(`  - Pendaftaran    : ${pendUji.length}`);
  console.log(`  - Moderator      : ${modUji.length}`);
  console.log(`  - Kelas          : ${kelasIds.length}`);
  console.log(`  - File unggahan  : ${fileHapus.length}`);
  console.log(`  - Slot waktu     : ${slotHapus.length}`);
  if (modDiPendaftaranAsli.length) {
    console.log(`\nPerhatian: dosen uji tercatat sebagai moderator di ${modDiPendaftaranAsli.length} pendaftaran ASLI (id: ${modDiPendaftaranAsli.map(m => m.pendaftaranId).join(", ")}).`);
    console.log(`Moderator tersebut ikut dihapus, jadi pendaftaran itu kembali tanpa moderator.`);
  }
  if (dospemAsli.length) {
    console.log(`\nPerhatian: ${dospemAsli.length} pendaftaran ASLI memilih dosen uji sebagai pembimbing (id: ${dospemAsli.map(p => p.id).join(", ")}).`);
    console.log(`Itu tidak diubah oleh skrip ini; perbaiki pembimbingnya secara manual.`);
  }

  if (!akunUji.length && !periodeUji.length) {
    console.log(`\nTidak ada data uji. Tidak ada yang perlu dihapus.`);
    return;
  }
  if (!JALANKAN) {
    console.log(`\nIni hanya pratinjau, belum ada yang dihapus. Tambahkan --jalankan untuk menghapus.`);
    return;
  }

  await transaksi(async (tx) => {
    if (modUji.length) await tx.delete(moderator).where(inArray(moderator.id, modUji.map(m => m.id)));
    if (pendIds.length) await tx.delete(pendaftaran).where(inArray(pendaftaran.id, pendIds));
    if (kelasIds.length) {
      await tx.update(pendaftaran).set({ kelasSeminarId: null }).where(inArray(pendaftaran.kelasSeminarId, kelasIds));
      await tx.delete(kelasSeminar).where(inArray(kelasSeminar.id, kelasIds));
    }
    if (periodeIds.length) await tx.delete(periode).where(inArray(periode.id, periodeIds));
    if (fileHapus.length) await tx.delete(files).where(inArray(files.id, fileHapus));
    if (slotHapus.length) await tx.delete(slotWaktu).where(inArray(slotWaktu.id, slotHapus));
    if (userIds.length) {
      await tx.delete(session).where(inArray(session.userId, userIds));
      await tx.delete(account).where(inArray(account.userId, userIds));
      await tx.delete(loginLog).where(inArray(loginLog.userId, userIds));
      await tx.delete(loginGagal).where(inArray(loginGagal.userId, userIds));
      await tx.delete(users).where(inArray(users.id, userIds));
    }
  });

  console.log(`\nData uji berhasil dihapus. (Riwayat di Log Aktivitas Admin sengaja tidak dihapus.)`);
}

main().then(() => process.exit(0), (e) => { console.error(e); process.exit(1); });
