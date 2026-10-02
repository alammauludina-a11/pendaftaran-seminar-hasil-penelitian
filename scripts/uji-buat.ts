// Creates an isolated test setup for trying the full Seminar Hasil flow on the real database:
// 3 test dosen, 3 test mahasiswa (angkatan UJICOBA, kolokium already done), an open Seminar Hasil periode
// for angkatan UJICOBA about one year ahead, and its slots. Real users can't see the test periode.
//
//   npx tsx --env-file=.env.local scripts/uji-buat.ts              → only shows what would be created
//   npx tsx --env-file=.env.local scripts/uji-buat.ts --jalankan   → creates it
//
// Remove everything again with scripts/uji-hapus.ts.
import crypto from "crypto";
import { like } from "drizzle-orm";
import { auth } from "../src/lib/auth";
import { db, transaksi } from "../src/db";
import { users, account, periode, pendaftaran } from "../src/db/schema";
import { autoGenerateSlots } from "../src/lib/slot-generator";
import {
  ANGKATAN_UJI, NIP_NIM_PREFIX, EMAIL_DOMAIN, MAHASISWA_UJI, DOSEN_UJI, JALANKAN, targetDatabase, mingguUji,
} from "./uji-shared";

async function main() {
  const { start, end } = mingguUji();

  console.log(`Database tujuan : ${targetDatabase()}`);
  console.log(`Akan dibuat     :`);
  console.log(`  - ${DOSEN_UJI.length} dosen uji     : ${DOSEN_UJI.map(d => d.username).join(", ")}`);
  console.log(`  - ${MAHASISWA_UJI.length} mahasiswa uji : ${MAHASISWA_UJI.map(m => m.username).join(", ")} (angkatan ${ANGKATAN_UJI}, kolokium dianggap selesai)`);
  console.log(`  - Periode Seminar Hasil angkatan ${ANGKATAN_UJI}: ${start} s/d ${end}, dibuka, batas kelas 3`);
  console.log(`  - Periode Kolokium angkatan ${ANGKATAN_UJI} (tertutup, hanya sebagai riwayat kolokium)`);
  console.log(`  - Slot waktu untuk tanggal ${start} s/d ${end}`);

  const existing = await db.select({ id: users.id }).from(users).where(like(users.nipNim, `${NIP_NIM_PREFIX}%`));
  if (existing.length > 0) {
    console.log(`\nData uji sudah ada (${existing.length} akun). Jalankan scripts/uji-hapus.ts dulu sebelum membuat ulang.`);
    return;
  }

  if (!JALANKAN) {
    console.log(`\nIni hanya pratinjau, belum ada yang ditulis. Tambahkan --jalankan untuk membuat data uji.`);
    return;
  }

  // One shared random password for all test accounts, shown once at the end
  const password = crypto.randomBytes(9).toString("base64url");
  const ctx = await auth.$context;
  const passwordHash = await ctx.password.hash(password);

  // Kolokium "already done" one month ago, so the students may register for Seminar Hasil
  const bulanLalu = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const months = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
  const tanggalKolokium = `${bulanLalu.getDate().toString().padStart(2, "0")} ${months[bulanLalu.getMonth()]} ${bulanLalu.getFullYear()}`;
  const isoBulanLalu = bulanLalu.toISOString().slice(0, 10);

  // Old createdAt: lists that default to the newest periode (e.g. the dosen dashboard) keep showing the real one
  const createdAt = new Date("2000-01-01T00:00:00Z");

  await transaksi(async (tx) => {
    const akun = [
      ...DOSEN_UJI.map(d => ({ ...d, role: "dosen" as const, angkatan: null, statusAktif: null })),
      ...MAHASISWA_UJI.map(m => ({ ...m, role: "mahasiswa" as const, angkatan: ANGKATAN_UJI, statusAktif: "Aktif" })),
    ];
    const ids = new Map<string, string>();
    for (const a of akun) {
      const id = crypto.randomUUID();
      ids.set(a.username, id);
      await tx.insert(users).values({
        id,
        email: `${a.username}@${EMAIL_DOMAIN}`,
        username: a.username,
        displayUsername: a.username,
        role: a.role,
        name: a.nama,
        nama: a.nama,
        nipNim: a.nipNim,
        prodi: "Akuntansi",
        angkatan: a.angkatan,
        statusAktif: a.statusAktif,
      });
      await tx.insert(account).values({
        id: crypto.randomUUID(),
        accountId: id,
        providerId: "credential",
        userId: id,
        password: passwordHash,
      });
    }

    const [kolokium] = await tx.insert(periode).values({
      jenisSeminar: "kolokium",
      angkatan: ANGKATAN_UJI,
      startDate: isoBulanLalu,
      endDate: isoBulanLalu,
      registrationEndDate: isoBulanLalu,
      isOpen: false,
      isDraft: false,
      batasKelas: 3,
      createdAt,
    }).returning();

    for (const [i, m] of MAHASISWA_UJI.entries()) {
      await tx.insert(pendaftaran).values({
        jenisSeminar: "kolokium",
        userId: ids.get(m.username)!,
        periodeId: kolokium.id,
        judulPenelitian: `Penelitian Uji ${i + 1}`,
        dospem1: DOSEN_UJI[0].nama,
        tanggalKolokium,
        statusVerifikasi: "disetujui",
      });
    }

    await tx.insert(periode).values({
      jenisSeminar: "hasil_penelitian",
      angkatan: ANGKATAN_UJI,
      startDate: start,
      endDate: end,
      registrationEndDate: start,
      isOpen: true,
      isDraft: false,
      batasKelas: 3,
      createdAt,
    });
  });

  await autoGenerateSlots(start, end);

  console.log(`\nData uji berhasil dibuat.`);
  console.log(`Password semua akun uji: ${password}`);
  console.log(`(Simpan sekarang; password ini tidak disimpan di mana pun. Kalau hilang, jalankan uji-hapus lalu uji-buat lagi.)`);
  console.log(`\nLogin mahasiswa : ${MAHASISWA_UJI.map(m => m.username).join(", ")}`);
  console.log(`Login dosen     : ${DOSEN_UJI.map(d => d.username).join(", ")}`);
  console.log(`Pilih "${DOSEN_UJI[0].nama}"/"${DOSEN_UJI[1].nama}" sebagai pembimbing; "${DOSEN_UJI[2].nama}" bisa jadi moderator.`);
  console.log(`\nSelesai menguji? Hapus semuanya dengan: npx tsx --env-file=.env.local scripts/uji-hapus.ts --jalankan`);
}

main().then(() => process.exit(0), (e) => { console.error(e); process.exit(1); });
