// What scripts/uji-buat.ts puts in the Seminar Hasil test periodes, as plain data, plus the code that checks,
// prints and creates it. Everything belongs to test accounts and UJICOBA periodes, so scripts/uji-hapus.ts
// removes all of it.
//
// Periode "peserta" (always, open for registration, test week):
//   - Kelas A: uji_mhs1b..5b, approved, room approved, schedule released with moderator and pembahas.
//     uji_mhs1b..3b are pembahas of another B account. Every B account can still request a room change.
//   - Kelas B: uji_mhs12..15 without moderator, for the dosen: picking a moderator, a clash, cancelling.
//   - uji_mhs1a..5a have no registration yet; they register themselves during the test.
// Periode "admin" (--skenario-admin, closed for registration, the week after): uji_mhs1..11 for the admin tasks.
// A separate periode keeps the participants' registrations out of the admin queue (and vice versa).
import { and, gte, lt } from "drizzle-orm";
import type { Tx } from "../src/db";
import { pendaftaran, kelasSeminar, moderator, slotWaktu } from "../src/db/schema";
import { DOSEN_UJI, PESERTA, mahasiswaUji, type AkunUji } from "./uji-shared";

type Dosen = 0 | 1 | 2; // index in DOSEN_UJI

export type RencanaPendaftaran = {
  mhs: AkunUji;
  status: "menunggu" | "disetujui";
  kelas?: string;
  /** [day after Monday of the periode week, hour WIB] */
  slot: [number, number];
  dospem: [Dosen] | [Dosen, Dosen];
  ruangan?: string;
  /** Pending room change request (the approved room stays until the admin approves it) */
  pindahKe?: string;
  /** Finalized and released */
  dirilis?: boolean;
  moderator?: Dosen;
  /** The moderator asked to cancel (waiting for the admin) */
  batalModerator?: boolean;
  pembahas?: AkunUji[];
};

export type RencanaPeriode = {
  kunci: "peserta" | "admin";
  judul: string;
  mingguKe: number;
  isOpen: boolean;
  batasKelas: number;
  pendaftaran: RencanaPendaftaran[];
};

const B = PESERTA.map(p => p.b);
const m = mahasiswaUji;
const D1 = 0, D2 = 1, D3 = 2;

const PERIODE_PESERTA: RencanaPeriode = {
  kunci: "peserta",
  judul: "Periode uji peserta (dibuka)",
  mingguKe: 0,
  isOpen: true,
  batasKelas: 5,
  pendaftaran: [
    // Kelas A: released schedules of the B accounts. Each dosen moderates at least one (to try cancelling).
    { mhs: B[0], status: "disetujui", kelas: "A", slot: [0, 8], dospem: [D1], ruangan: "Ruang Uji 1", dirilis: true, moderator: D2, pembahas: [B[1]] },
    { mhs: B[1], status: "disetujui", kelas: "A", slot: [0, 9], dospem: [D2], ruangan: "Ruang Uji 1", dirilis: true, moderator: D3, pembahas: [B[2]] },
    { mhs: B[2], status: "disetujui", kelas: "A", slot: [0, 10], dospem: [D3], ruangan: "Ruang Uji 1", dirilis: true, moderator: D1, pembahas: [B[0]] },
    { mhs: B[3], status: "disetujui", kelas: "A", slot: [0, 11], dospem: [D1, D2], ruangan: "Ruang Uji 1", dirilis: true, moderator: D3, pembahas: [m(12)] },
    { mhs: B[4], status: "disetujui", kelas: "A", slot: [0, 13], dospem: [D2], ruangan: "Ruang Uji 1", dirilis: true, moderator: D1, pembahas: [m(13)] },
    // Kelas B: no moderator yet. Slots 1-2 can be picked; slots 3-4 share a time with Kelas A, so some dosen clash there.
    { mhs: m(12), status: "disetujui", kelas: "B", slot: [1, 8], dospem: [D1], ruangan: "Ruang Uji 2" },
    { mhs: m(13), status: "disetujui", kelas: "B", slot: [1, 9], dospem: [D2], ruangan: "Ruang Uji 2" },
    { mhs: m(14), status: "disetujui", kelas: "B", slot: [0, 8], dospem: [D3], ruangan: "Ruang Uji 3" },
    { mhs: m(15), status: "disetujui", kelas: "B", slot: [0, 9], dospem: [D1], ruangan: "Ruang Uji 3" },
  ],
};

// Batas kelas 6: approving the 3 waiting registrations brings the queue to 5, so it never auto-forms a class
// and "Bentuk Kelas Sekarang" stays needed whatever order the admin works in.
const PERIODE_ADMIN: RencanaPeriode = {
  kunci: "admin",
  judul: "Periode uji skenario admin (ditutup)",
  mingguKe: 1,
  isOpen: false,
  batasKelas: 6,
  pendaftaran: [
    // (3) complete Kelas A with approved rooms and one final schedule; (4) two room change requests,
    // one on the final schedule; (5) a moderation with a pending cancel request
    { mhs: m(1), status: "disetujui", kelas: "A", slot: [0, 8], dospem: [D1, D2], ruangan: "Ruang Uji 1", pindahKe: "Ruang Uji 2", dirilis: true, moderator: D3 },
    { mhs: m(2), status: "disetujui", kelas: "A", slot: [0, 9], dospem: [D1, D2], ruangan: "Ruang Uji 1", pindahKe: "Ruang Uji 3" },
    { mhs: m(3), status: "disetujui", kelas: "A", slot: [0, 10], dospem: [D1, D2], ruangan: "Ruang Uji 1", moderator: D3, batalModerator: true },
    { mhs: m(4), status: "disetujui", kelas: "A", slot: [0, 11], dospem: [D1, D2], ruangan: "Ruang Uji 1" },
    { mhs: m(5), status: "disetujui", kelas: "A", slot: [0, 13], dospem: [D1, D2], ruangan: "Ruang Uji 1" },
    { mhs: m(6), status: "disetujui", kelas: "A", slot: [0, 14], dospem: [D1, D2], ruangan: "Ruang Uji 1" },
    // (2) approved, no class, fewer than batas kelas
    { mhs: m(7), status: "disetujui", slot: [1, 8], dospem: [D1, D2] },
    { mhs: m(8), status: "disetujui", slot: [1, 9], dospem: [D1, D2] },
    // (1) waiting for verification
    { mhs: m(9), status: "menunggu", slot: [2, 8], dospem: [D1, D2] },
    { mhs: m(10), status: "menunggu", slot: [2, 9], dospem: [D1, D2] },
    { mhs: m(11), status: "menunggu", slot: [2, 10], dospem: [D1, D2] },
  ],
};

export const rencanaPeriode = (skenarioAdmin: boolean) =>
  skenarioAdmin ? [PERIODE_PESERTA, PERIODE_ADMIN] : [PERIODE_PESERTA];

/** All student accounts to create: participants first, then the other test students by number. */
export function mahasiswaRencana(skenarioAdmin: boolean): AkunUji[] {
  const lain = rencanaPeriode(skenarioAdmin).flatMap(p => p.pendaftaran.map(r => r.mhs))
    .filter(a => !PESERTA.some(p => p.b.username === a.username))
    .sort((x, y) => Number(x.username.slice(7)) - Number(y.username.slice(7)));
  return [...PESERTA.flatMap(p => [p.a, p.b]), ...lain];
}

/**
 * Checks the plan against the app's rules, so the created data is something the app itself could have produced:
 * no dosen twice at the same time (pembimbing or moderator), no moderator of their own student, pembahas are
 * test students other than the student, classes not over batas kelas, final schedules complete.
 */
export function periksaRencana(periodes: RencanaPeriode[]): string[] {
  const salah: string[] = [];
  const terjadwal = new Map<string, string>(); // "dosen|minggu|hari|jam" → who
  for (const p of periodes) {
    const perKelas = new Map<string, number>();
    for (const r of p.pendaftaran) {
      const siapa = `${p.kunci}/${r.mhs.username}`;
      const tugas: [Dosen, string][] = [...r.dospem.map(d => [d, "pembimbing"] as [Dosen, string]), ...(r.moderator !== undefined ? [[r.moderator, "moderator"] as [Dosen, string]] : [])];
      for (const [d, peran] of tugas) {
        const kunci = `${d}|${p.mingguKe}|${r.slot[0]}|${r.slot[1]}`;
        if (terjadwal.has(kunci)) salah.push(`${DOSEN_UJI[d].nama} bentrok: ${terjadwal.get(kunci)} dan ${peran} ${siapa}`);
        terjadwal.set(kunci, `${peran} ${siapa}`);
      }
      if (r.moderator !== undefined && r.dospem.includes(r.moderator)) salah.push(`${siapa}: moderator adalah pembimbingnya sendiri`);
      if ((r.kelas || r.moderator !== undefined || r.ruangan) && r.status !== "disetujui") salah.push(`${siapa}: belum disetujui tetapi punya kelas/ruangan/moderator`);
      if (r.moderator !== undefined && !r.kelas) salah.push(`${siapa}: moderator tanpa kelas`);
      if (r.dirilis && (!r.kelas || !r.ruangan || r.moderator === undefined)) salah.push(`${siapa}: dirilis tanpa kelas, ruangan atau moderator`);
      if (r.pindahKe && !r.ruangan) salah.push(`${siapa}: pindah ruangan tanpa ruangan yang disetujui`);
      if (r.pembahas?.some(a => a.username === r.mhs.username)) salah.push(`${siapa}: menjadi pembahas dirinya sendiri`);
      if (r.slot[1] === 12 || r.slot[1] < 8 || r.slot[1] > 16 || r.slot[0] < 0 || r.slot[0] > 5) salah.push(`${siapa}: slot tidak valid`);
      if (r.kelas) perKelas.set(r.kelas, (perKelas.get(r.kelas) ?? 0) + 1);
    }
    for (const [k, n] of perKelas) if (n > p.batasKelas) salah.push(`${p.kunci}: kelas ${k} berisi ${n}, melebihi batas ${p.batasKelas}`);
  }
  return salah;
}

const HARI = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
const tanggalSlot = (mulaiMinggu: string, hari: number) => {
  const [y, mo, d] = mulaiMinggu.split("-").map(Number);
  return new Date(Date.UTC(y, mo - 1, d + hari)).toISOString().slice(0, 10);
};

/** Start of a slot as stored in slot_waktu (same construction as autoGenerateSlots). */
function waktuSlot(mulaiMinggu: string, [hari, jam]: [number, number]) {
  const [y, mo, d] = mulaiMinggu.split("-").map(Number);
  return new Date(Date.UTC(y, mo - 1, d + hari, jam - 7, 0, 0, 0));
}

/** One preview line per registration. */
export function barisPendaftaran(r: RencanaPendaftaran, mulaiMinggu: string) {
  const dosen = (d: Dosen) => DOSEN_UJI[d].nama.replace("Dosen Uji ", "D");
  return [
    `${r.mhs.username.padEnd(10)} ${HARI[r.slot[0]]} ${tanggalSlot(mulaiMinggu, r.slot[0])} ${String(r.slot[1]).padStart(2, "0")}.00`,
    `pembimbing ${r.dospem.map(dosen).join("+")}`,
    r.status === "menunggu" ? "MENUNGGU verifikasi" : r.kelas ? `kelas ${r.kelas}` : "disetujui, ANTREAN (tanpa kelas)",
    r.ruangan && `ruangan ${r.ruangan}`,
    r.pindahKe && `minta pindah ke ${r.pindahKe}`,
    r.moderator !== undefined && `moderator ${dosen(r.moderator)}${r.batalModerator ? " (minta BATAL)" : ""}`,
    r.moderator === undefined && r.kelas && "tanpa moderator",
    r.pembahas && `pembahas ${r.pembahas.map(a => a.nama).join(", ")}`,
    r.dirilis && "FINAL & DIRILIS",
  ].filter(Boolean).join(" | ");
}

/**
 * Creates the registrations, classes and moderators of one periode inside the caller's transaction.
 * Needs the accounts (ids by username), the periode and its slots (autoGenerateSlots) to exist already.
 */
export async function buatPendaftaranRencana(tx: Tx, rencana: RencanaPeriode, opts: {
  ids: Map<string, string>;
  periodeId: number;
  mulaiMinggu: string;
  tanggalKolokium: string;
}) {
  const { ids, periodeId, mulaiMinggu, tanggalKolokium } = opts;

  // Slot ids by start time; slot_waktu may contain several rows for one time, any of them will do
  const dari = waktuSlot(mulaiMinggu, [0, 0]);
  const sampai = new Date(dari.getTime() + 7 * 24 * 60 * 60 * 1000);
  const slotPerWaktu = new Map<number, number>();
  for (const s of await tx.select({ id: slotWaktu.id, waktuMulai: slotWaktu.waktuMulai }).from(slotWaktu)
    .where(and(gte(slotWaktu.waktuMulai, dari), lt(slotWaktu.waktuMulai, sampai)))) {
    if (!slotPerWaktu.has(s.waktuMulai.getTime())) slotPerWaktu.set(s.waktuMulai.getTime(), s.id);
  }

  const kelasIds = new Map<string, number>();
  for (const nama of [...new Set(rencana.pendaftaran.map(r => r.kelas).filter((k): k is string => !!k))]) {
    const [k] = await tx.insert(kelasSeminar).values({
      namaKelas: nama,
      periodeId,
      kuotaTerisi: rencana.pendaftaran.filter(r => r.kelas === nama).length,
      kapasitasMax: rencana.batasKelas,
    }).returning();
    kelasIds.set(nama, k.id);
  }

  for (const r of rencana.pendaftaran) {
    const slotId = slotPerWaktu.get(waktuSlot(mulaiMinggu, r.slot).getTime());
    if (!slotId) throw new Error(`Slot ${HARI[r.slot[0]]} ${r.slot[1]}.00 minggu ${mulaiMinggu} tidak ditemukan.`);
    const [d1, d2] = r.dospem.map(d => DOSEN_UJI[d]);

    const [p] = await tx.insert(pendaftaran).values({
      jenisSeminar: "hasil_penelitian",
      userId: ids.get(r.mhs.username)!,
      periodeId,
      slotWaktuId: slotId,
      judulPenelitian: `Penelitian ${r.mhs.nama}`,
      konsentrasi: r.slot[1] % 2 ? "Akuntansi Manajemen" : "Akuntansi Keuangan",
      dospem1Id: ids.get(d1.username)!,
      dospem1: d1.nama,
      dospem2Id: d2 ? ids.get(d2.username)! : null,
      dospem2: d2 ? d2.nama : "",
      tanggalKolokium,
      statusVerifikasi: r.status,
      catatanAdmin: r.status === "menunggu" ? null : "",
      kelasSeminarId: r.kelas ? kelasIds.get(r.kelas)! : null,
      // As in /api/mahasiswa/pendaftaran: a change request keeps the approved room until the admin approves it
      ruanganDisetujui: r.ruangan ?? null,
      ruanganDiajukan: r.pindahKe ?? null,
      statusRuangan: r.ruangan && !r.pindahKe ? "disetujui" : "menunggu",
      pembahas: r.pembahas ? r.pembahas.map(a => a.nama).join(",") : null,
      isFinalized: !!r.dirilis,
      isReleased: !!r.dirilis,
    }).returning({ id: pendaftaran.id });

    if (r.moderator !== undefined) {
      await tx.insert(moderator).values({
        pendaftaranId: p.id,
        dosenId: ids.get(DOSEN_UJI[r.moderator].username)!,
        assignedByRole: "dosen",
        batalStatus: r.batalModerator ? "menunggu" : null,
        batalReason: r.batalModerator ? "Data uji: ada tugas lain di jam yang sama." : null,
      });
    }
  }
}
