// Shared markers for the test-data scripts (uji-buat.ts / uji-hapus.ts).
// Everything created for testing is recognisable by these markers, so cleanup never touches real data.

/** Angkatan of the test periodes and test students. Not a number, so `angkatan.includes(...)` never matches real students. */
export const ANGKATAN_UJI = "UJICOBA";
/** Prefix of NIM/NIP of every test account. */
export const NIP_NIM_PREFIX = "UJICOBA-";
/** Email domain of every test account (.invalid is reserved and can never receive mail). */
export const EMAIL_DOMAIN = "uji-coba.invalid";

export const MAHASISWA_UJI = [1, 2, 3].map(i => ({
  username: `uji_mhs${i}`,
  nama: `Mahasiswa Uji ${i}`,
  nipNim: `${NIP_NIM_PREFIX}M${i}`,
}));

export const DOSEN_UJI = [1, 2, 3].map(i => ({
  username: `uji_dosen${i}`,
  nama: `Dosen Uji ${i}`,
  nipNim: `${NIP_NIM_PREFIX}D${i}`,
}));

export const JALANKAN = process.argv.includes("--jalankan");

/** Host of the target database, for the confirmation banner (no credentials). */
export function targetDatabase() {
  const url = process.env.DATABASE_URL || "file:./sqlite.db";
  return url.replace(/\/\/[^@/]*@/, "//").split("?")[0];
}

/** YYYY-MM-DD of the given date in WIB. */
export const isoWIB = (d: Date) => d.toLocaleDateString("sv-SE", { timeZone: "Asia/Jakarta" });

/**
 * Test week: Monday–Saturday about one year from now, far away from any real periode,
 * so test registrations never block or clash with real slots.
 */
export function mingguUji() {
  const d = new Date(`${isoWIB(new Date())}T00:00:00Z`);
  d.setUTCFullYear(d.getUTCFullYear() + 1);
  while (d.getUTCDay() !== 1) d.setUTCDate(d.getUTCDate() + 1);
  const start = d.toISOString().slice(0, 10);
  d.setUTCDate(d.getUTCDate() + 5);
  const end = d.toISOString().slice(0, 10);
  return { start, end };
}
