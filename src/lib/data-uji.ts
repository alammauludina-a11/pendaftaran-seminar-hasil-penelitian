// Test data (scripts/uji-buat.ts) lives in the real database, separated by markers: test accounts have a
// NIP/NIM starting with NIP_NIM_PREFIX and test periodes have an angkatan starting with ANGKATAN_UJI
// ("UJICOBA" for the participants, "UJICOBA-ADMIN" for the admin tasks). Dosen and mahasiswa only see
// their own "world": real accounts never see test periodes, schedules or dosen, and test accounts only see
// test data. The admin sees everything, but can't mix the worlds (a real dosen as moderator of a test
// seminar, a test student as pembahas of a real one, ...). Safe to import from client components.

/** Angkatan of the participants' test periode and students. Not a number, so `angkatan.includes(...)` never matches real students. */
export const ANGKATAN_UJI = "UJICOBA";
/** Angkatan of the test periode with the data for the admin tasks. */
export const ANGKATAN_UJI_ADMIN = `${ANGKATAN_UJI}-ADMIN`;
/** Prefix of NIM/NIP of every test account. */
export const NIP_NIM_PREFIX = "UJICOBA-";

export const isAkunUji = (u: { nipNim?: string | null }) => !!u.nipNim?.startsWith(NIP_NIM_PREFIX);

export const isPeriodeUji = (p: { angkatan: string | null }) => !!p.angkatan?.startsWith(ANGKATAN_UJI);

/** True when a periode belongs to the same world as the account. */
export const periodeSeDunia = (akun: { nipNim?: string | null }, p: { angkatan: string | null }) =>
  isPeriodeUji(p) === isAkunUji(akun);

/** True when two accounts (e.g. a student and a dosen) belong to the same world. */
export const akunSeDunia = (a: { nipNim?: string | null }, b: { nipNim?: string | null }) =>
  isAkunUji(a) === isAkunUji(b);

/** Message for an admin who tries to give a seminar of one world a dosen of the other one. */
export const pesanDosenLainDunia = (dosen: { nipNim?: string | null }) =>
  isAkunUji(dosen)
    ? "Dosen uji coba tidak dapat ditetapkan pada seminar mahasiswa asli."
    : "Dosen asli tidak dapat ditetapkan pada seminar data uji coba.";

/**
 * Pembahas entries ("Nama (NIM)", comma separated) whose NIM belongs to the other world than the presenter.
 * Entries without a NIM in parentheses (old free text) can't be checked and are accepted.
 */
export function pembahasLainDunia(pembahas: string | null | undefined, nimPenyaji: string): string[] {
  return (pembahas ?? "").split(",").map(s => s.trim()).filter(Boolean).filter(entri => {
    const nim = /\(([^()]+)\)\s*$/.exec(entri)?.[1];
    return nim !== undefined && !akunSeDunia({ nipNim: nim }, { nipNim: nimPenyaji });
  });
}
