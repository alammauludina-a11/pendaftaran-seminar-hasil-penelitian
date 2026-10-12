// Shared markers for the test-data scripts (uji-buat.ts / uji-hapus.ts).
// Everything created for testing is recognisable by these markers, so cleanup never touches real data.
// The app uses the same markers (src/lib/data-uji.ts) to keep test data invisible to real users.
import { ANGKATAN_UJI, ANGKATAN_UJI_ADMIN, NIP_NIM_PREFIX } from "../src/lib/data-uji";

export { ANGKATAN_UJI, ANGKATAN_UJI_ADMIN, NIP_NIM_PREFIX };
/** Email domain of every test account (.invalid is reserved and can never receive mail). */
export const EMAIL_DOMAIN = "uji-coba.invalid";

export type AkunUji = { username: string; nama: string; nipNim: string };

const dosenUji = (i: number): AkunUji => ({ username: `uji_dosen${i}`, nama: `Dosen Uji ${i}`, nipNim: `${NIP_NIM_PREFIX}D${i}` });

/** Dosen accounts given to the participants. */
export const DOSEN_UJI: AkunUji[] = [1, 2, 3].map(dosenUji);
/** Supporting dosen (pembimbing of most test students, all dosen of the admin periode); never given to participants. */
export const DOSEN_PENDUKUNG: AkunUji[] = [4, 5, 6, 7, 8].map(dosenUji);
/** All test dosen; the plans in uji-rencana.ts refer to them by index. */
export const DOSEN_SEMUA: AkunUji[] = [...DOSEN_UJI, ...DOSEN_PENDUKUNG];

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

/** Extra test students that are not participants (dosen classes, admin scenario): uji_mhsN / "Mahasiswa Uji N". Never given to participants. */
export const mahasiswaUji = (n: number): AkunUji => ({
  username: `uji_mhs${n}`,
  nama: `Mahasiswa Uji ${n}`,
  nipNim: `${NIP_NIM_PREFIX}M${n}`,
});

/** Ids of the test data, to recognise admin audit log rows about it (see isLogUji). */
export type IdUji = { pendaftaran: Set<number>; periode: Set<number>; kelas: Set<number>; user: Set<string> };

/**
 * True when an admin audit log row (log_aktivitas) is about test data: its target is a test row, the
 * registrations in its detail are all test registrations, the class it cancelled was in a test periode,
 * or its description names test students ("Nama (UJICOBA-...)") or a test periode (angkatan UJICOBA...).
 * A batch row that also touched real registrations is never treated as test data.
 */
export function isLogUji(
  log: { targetTipe: string | null; targetId: string | null; deskripsi: string; detail: string | null },
  id: IdUji,
): boolean {
  const t = log.targetId;
  if (t !== null) {
    if (log.targetTipe === "pendaftaran" && id.pendaftaran.has(Number(t))) return true;
    if (log.targetTipe === "periode" && id.periode.has(Number(t))) return true;
    if (log.targetTipe === "kelas" && id.kelas.has(Number(t))) return true;
    if (["mahasiswa", "dosen", "admin"].includes(log.targetTipe ?? "") && id.user.has(t)) return true;
  }
  let detail: { ids?: unknown; assignments?: unknown; periodeId?: unknown } | null = null;
  try {
    detail = log.detail ? JSON.parse(log.detail) : null;
  } catch {
    detail = null;
  }
  const idsDetail = [
    ...(Array.isArray(detail?.ids) ? detail.ids : []),
    ...(Array.isArray(detail?.assignments) ? detail.assignments.map((a: { id?: unknown }) => a?.id) : []),
  ].filter((x): x is number => Number.isInteger(x));
  if (idsDetail.length > 0) return idsDetail.every(x => id.pendaftaran.has(x));
  if (typeof detail?.periodeId === "number" && id.periode.has(detail.periodeId)) return true;
  return log.deskripsi.includes(ANGKATAN_UJI);
}

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
