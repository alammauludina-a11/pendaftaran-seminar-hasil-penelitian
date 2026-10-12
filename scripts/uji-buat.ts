// Creates an isolated test setup for trying the Seminar Hasil flow on the real database (angkatan UJICOBA,
// about one year ahead): 3 test dosen, 5 participants with two student accounts each (A: still has to register,
// B: schedule already released), a class for the dosen tasks, and with --skenario-admin a separate periode with
// data for the admin tasks. What exactly is created is described in uji-rencana.ts.
// Real users can't see any of it (src/lib/data-uji.ts); test accounts only see test data.
//
//   npx tsx --env-file=.env.local scripts/uji-buat.ts [--skenario-admin]              → only shows what would be created
//   npx tsx --env-file=.env.local scripts/uji-buat.ts [--skenario-admin] --jalankan   → creates it
//
// Remove everything again with scripts/uji-hapus.ts.
import crypto from "crypto";
import { like } from "drizzle-orm";
import { auth } from "../src/lib/auth";
import { db, transaksi } from "../src/db";
import { users, account, periode, pendaftaran } from "../src/db/schema";
import { autoGenerateSlots } from "../src/lib/slot-generator";
import {
  ANGKATAN_UJI, NIP_NIM_PREFIX, EMAIL_DOMAIN, PESERTA, DOSEN_UJI, JALANKAN, SKENARIO_ADMIN, targetDatabase, mingguUji,
} from "./uji-shared";
import { barisPendaftaran, buatPendaftaranRencana, mahasiswaRencana, periksaRencana, rencanaPeriode } from "./uji-rencana";

function cetakPeserta() {
  console.log(`\nDaftar akun per peserta:`);
  for (const [i, p] of PESERTA.entries()) {
    console.log(`  Mahasiswa ${i + 1} : ${p.a.username} (akun A, mengajukan jadwal) + ${p.b.username} (akun B, jadwal sudah dirilis)`);
  }
  for (const [i, d] of DOSEN_UJI.entries()) console.log(`  Dosen ${i + 1}     : ${d.username}`);
  console.log(`  Admin kedua : memakai akun admin miliknya sendiri`);
}

async function main() {
  const periodes = rencanaPeriode(SKENARIO_ADMIN);
  const mahasiswa = mahasiswaRencana(SKENARIO_ADMIN);
  const lain = mahasiswa.filter(a => !PESERTA.some(p => p.a.username === a.username || p.b.username === a.username));

  console.log(`Database tujuan : ${targetDatabase()}`);
  console.log(`Akan dibuat     :`);
  console.log(`  - ${DOSEN_UJI.length} dosen uji: ${DOSEN_UJI.map(d => d.username).join(", ")}`);
  console.log(`  - ${PESERTA.length * 2} akun peserta: ${PESERTA.map(p => `${p.a.username}/${p.b.username}`).join(", ")}`);
  console.log(`  - ${lain.length} mahasiswa uji pendukung: ${lain.map(a => a.username).join(", ")}`);
  console.log(`    (semua mahasiswa angkatan ${ANGKATAN_UJI}, kolokium dianggap selesai)`);
  console.log(`  - Periode Kolokium angkatan ${ANGKATAN_UJI} (tertutup, hanya sebagai riwayat kolokium)`);
  for (const p of periodes) {
    const { start, end } = mingguUji(p.mingguKe);
    console.log(`  - ${p.judul}: Seminar Hasil angkatan ${ANGKATAN_UJI}, ${start} s/d ${end}, batas kelas ${p.batasKelas}, beserta slot waktunya`);
    for (const r of p.pendaftaran) console.log(`      ${barisPendaftaran(r, start)}`);
  }
  console.log(`    Peserta akun A (${PESERTA.map(p => p.a.username).join(", ")}): belum ada pendaftaran Seminar Hasil.`);

  const salah = periksaRencana(periodes);
  if (salah.length > 0) {
    console.log(`\nRencana data tidak konsisten dengan aturan aplikasi:`);
    for (const s of salah) console.log(`  - ${s}`);
    process.exitCode = 1;
    return;
  }

  const existing = await db.select({ id: users.id }).from(users).where(like(users.nipNim, `${NIP_NIM_PREFIX}%`));
  if (existing.length > 0) {
    console.log(`\nData uji sudah ada (${existing.length} akun). Jalankan scripts/uji-hapus.ts dulu sebelum membuat ulang.`);
    return;
  }

  if (!JALANKAN) {
    cetakPeserta();
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

  // Old createdAt: lists that default to the newest periode keep showing the real one (the admin's, for instance)
  const createdAt = new Date("2000-01-01T00:00:00Z");

  const dibuat = await transaksi(async (tx) => {
    const akun = [
      ...DOSEN_UJI.map(d => ({ ...d, role: "dosen" as const, angkatan: null, statusAktif: null })),
      ...mahasiswa.map(m => ({ ...m, role: "mahasiswa" as const, angkatan: ANGKATAN_UJI, statusAktif: "Aktif" })),
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

    for (const m of mahasiswa) {
      await tx.insert(pendaftaran).values({
        jenisSeminar: "kolokium",
        userId: ids.get(m.username)!,
        periodeId: kolokium.id,
        judulPenelitian: `Penelitian ${m.nama}`,
        dospem1Id: ids.get(DOSEN_UJI[0].username)!,
        dospem1: DOSEN_UJI[0].nama,
        tanggalKolokium,
        statusVerifikasi: "disetujui",
      });
    }

    const periodeIds = new Map<string, number>();
    for (const p of periodes) {
      const { start, end } = mingguUji(p.mingguKe);
      const [hasil] = await tx.insert(periode).values({
        jenisSeminar: "hasil_penelitian",
        angkatan: ANGKATAN_UJI,
        startDate: start,
        endDate: end,
        registrationEndDate: start,
        isOpen: p.isOpen,
        isDraft: false,
        batasKelas: p.batasKelas,
        createdAt,
      }).returning();
      periodeIds.set(p.kunci, hasil.id);
    }
    return { ids, periodeIds };
  });

  for (const p of periodes) {
    const { start, end } = mingguUji(p.mingguKe);
    await autoGenerateSlots(start, end);
  }

  // Separate transaction because it needs the slots; if it fails, uji-hapus.ts still removes the rest
  await transaksi(async (tx) => {
    for (const p of periodes) {
      await buatPendaftaranRencana(tx, p, {
        ids: dibuat.ids,
        periodeId: dibuat.periodeIds.get(p.kunci)!,
        mulaiMinggu: mingguUji(p.mingguKe).start,
        tanggalKolokium,
      });
    }
  });

  console.log(`\nData uji berhasil dibuat.`);
  console.log(`Password semua akun uji: ${password}`);
  console.log(`(Simpan sekarang; password ini tidak disimpan di mana pun. Kalau hilang, jalankan uji-hapus lalu uji-buat lagi.)`);
  cetakPeserta();
  console.log(`\nAkun A memilih "${DOSEN_UJI[0].nama}", "${DOSEN_UJI[1].nama}" atau "${DOSEN_UJI[2].nama}" sebagai pembimbing.`);
  if (SKENARIO_ADMIN) {
    const { start } = mingguUji(1);
    console.log(`Tugas admin: di dashboard admin pilih periode Seminar Hasil ${ANGKATAN_UJI} yang mulai ${start} (ditutup).`);
  }
  console.log(`\nSelesai menguji? Hapus semuanya dengan: npx tsx --env-file=.env.local scripts/uji-hapus.ts --jalankan`);
}

main().then(() => process.exit(process.exitCode ?? 0), (e) => { console.error(e); process.exit(1); });
