// Test data (scripts/uji-buat.ts) lives in the real database, separated by markers: test accounts have a
// NIP/NIM starting with NIP_NIM_PREFIX and test periodes have angkatan ANGKATAN_UJI. Dosen and mahasiswa
// only see their own "world": real accounts never see test periodes, schedules or dosen, and test accounts
// only see test data. The admin sees everything (the admin tasks are tested on the test periodes).

/** Angkatan of the test periodes and test students. Not a number, so `angkatan.includes(...)` never matches real students. */
export const ANGKATAN_UJI = "UJICOBA";
/** Prefix of NIM/NIP of every test account. */
export const NIP_NIM_PREFIX = "UJICOBA-";

export const isAkunUji = (u: { nipNim?: string | null }) => !!u.nipNim?.startsWith(NIP_NIM_PREFIX);

export const isPeriodeUji = (p: { angkatan: string | null }) => p.angkatan === ANGKATAN_UJI;

/** True when a periode belongs to the same world as the account. */
export const periodeSeDunia = (akun: { nipNim?: string | null }, p: { angkatan: string | null }) =>
  isPeriodeUji(p) === isAkunUji(akun);

/** True when two accounts (e.g. a student and a dosen) belong to the same world. */
export const akunSeDunia = (a: { nipNim?: string | null }, b: { nipNim?: string | null }) =>
  isAkunUji(a) === isAkunUji(b);
