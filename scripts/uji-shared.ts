// Shared markers for the test-data scripts (uji-buat.ts / uji-hapus.ts).
// Everything created for testing is recognisable by these markers, so cleanup never touches real data.
// The app uses the same markers (src/lib/data-uji.ts) to keep test data invisible to real users.
import { ANGKATAN_UJI, NIP_NIM_PREFIX } from "../src/lib/data-uji";

export { ANGKATAN_UJI, NIP_NIM_PREFIX };
/** Email domain of every test account (.invalid is reserved and can never receive mail). */
export const EMAIL_DOMAIN = "uji-coba.invalid";

export type AkunUji = { username: string; nama: string; nipNim: string };

export const DOSEN_UJI: AkunUji[] = [1, 2, 3].map(i => ({
  username: `uji_dosen${i}`,
  nama: `Dosen Uji ${i}`,
  nipNim: `${NIP_NIM_PREFIX}D${i}`,
}));

/**
 * Test participants: one pair of student accounts per person. Account A is empty (kolokium done, no
 * Seminar Hasil registration yet), account B already has a released schedule (see uji-rencana.ts).
 * Names are "Peserta Uji 1B" etc.: the student dashboard marks pembahas duties with `pembahas.includes(nama)`,
 * so no name may be a substring of another one ("Mahasiswa Uji 1" would match "Mahasiswa Uji 12").
 */
export const PESERTA = [1, 2, 3, 4, 5].map(i => ({
  a: { username: `uji_mhs${i}a`, nama: `Peserta Uji ${i}A`, nipNim: `${NIP_NIM_PREFIX}M${i}A` },
  b: { username: `uji_mhs${i}b`, nama: `Peserta Uji ${i}B`, nipNim: `${NIP_NIM_PREFIX}M${i}B` },
}));

/** Extra test students that are not participants (dosen class, admin scenario): uji_mhsN / "Mahasiswa Uji N". */
export const mahasiswaUji = (n: number): AkunUji => ({
  username: `uji_mhs${n}`,
  nama: `Mahasiswa Uji ${n}`,
  nipNim: `${NIP_NIM_PREFIX}M${n}`,
});

export const JALANKAN = process.argv.includes("--jalankan");
/** uji-buat.ts only: also create the admin scenario (see uji-rencana.ts). */
export const SKENARIO_ADMIN = process.argv.includes("--skenario-admin");

/** Host of the target database, for the confirmation banner (no credentials). */
export function targetDatabase() {
  const url = process.env.DATABASE_URL || "file:./sqlite.db";
  return url.replace(/\/\/[^@/]*@/, "//").split("?")[0];
}

/** YYYY-MM-DD of the given date in WIB. */
export const isoWIB = (d: Date) => d.toLocaleDateString("sv-SE", { timeZone: "Asia/Jakarta" });

/**
 * Test week: Monday–Saturday about one year from now, far away from any real periode,
 * so test registrations never block or clash with real slots. `mingguKe` shifts it by whole weeks.
 */
export function mingguUji(mingguKe = 0) {
  const d = new Date(`${isoWIB(new Date())}T00:00:00Z`);
  d.setUTCFullYear(d.getUTCFullYear() + 1);
  while (d.getUTCDay() !== 1) d.setUTCDate(d.getUTCDate() + 1);
  d.setUTCDate(d.getUTCDate() + 7 * mingguKe);
  const start = d.toISOString().slice(0, 10);
  d.setUTCDate(d.getUTCDate() + 5);
  const end = d.toISOString().slice(0, 10);
  return { start, end };
}
