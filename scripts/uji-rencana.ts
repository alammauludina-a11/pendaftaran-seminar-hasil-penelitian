// What scripts/uji-buat.ts puts in the Seminar Hasil test periodes, as plain data, plus the code that checks,
// analyses, prints and creates it. Everything belongs to test accounts and test periodes (angkatan UJICOBA*),
// so scripts/uji-hapus.ts removes all of it.
//
// Periode "peserta" (angkatan UJICOBA, always, open for registration, test week):
//   - Kelas A: uji_mhs1b..5b, schedule released with moderator (Dosen Uji 1-3, to try cancelling) and pembahas.
//     uji_mhs1b..3b are pembahas of another B account. Every B account can still request a room change.
//   - Kelas B and C: uji_mhs15..22 without moderator, supervised by the supporting dosen (4-8). Each participant
//     dosen supervises one seminar in the periode, can pick six seminars to moderate, and clashes on the one at
//     the same time as their own bimbingan (and on one at the same time as their moderation).
//   - uji_mhs1a..5a have no registration yet; they register themselves during the test.
// Periode "admin" (angkatan UJICOBA-ADMIN, --skenario-admin, closed, the week after): uji_mhs1..14 and only
// the supporting dosen, for the admin tasks A1-A6:
//   A1 three registrations to verify, A2 a queue below batas kelas ("Bentuk Kelas Sekarang"),
//   A3 Kelas B without pembahas (three pembimbing pairs, one pair of students triggers "Dospem Sama"),
//   A4 two room change requests, one on a final schedule, A5 a moderation cancel request by uji_dosen4,
//   A6 Kelas A complete (moderator, pembahas, room) apart from the seminar of A5: only finalisasi and rilis left.
import { and, gte, lt } from "drizzle-orm";
import type { Tx } from "../src/db";
import { pendaftaran, kelasSeminar, moderator, slotWaktu } from "../src/db/schema";
import { ANGKATAN_UJI, ANGKATAN_UJI_ADMIN, DOSEN_SEMUA, DOSEN_UJI, PESERTA, mahasiswaUji, type AkunUji } from "./uji-shared";

/** Index in DOSEN_SEMUA: 0-2 are the participants' dosen, 3-7 the supporting dosen. */
type Dosen = number;

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
  /** Classmates, stored as "Nama (NIM)" like Kelola Pembahas does */
  pembahas?: AkunUji[];
};

export type RencanaPeriode = {
  kunci: "peserta" | "admin";
  judul: string;
  angkatan: string;
  mingguKe: number;
  isOpen: boolean;
  batasKelas: number;
  pendaftaran: RencanaPendaftaran[];
};

const B = PESERTA.map(p => p.b);
const m = mahasiswaUji;
const [D1, D2, D3, D4, D5, D6, D7, D8] = [0, 1, 2, 3, 4, 5, 6, 7];
const DOSEN_PESERTA = [D1, D2, D3];

const PERIODE_PESERTA: RencanaPeriode = {
  kunci: "peserta",
  judul: "Periode uji peserta (dibuka)",
  angkatan: ANGKATAN_UJI,
  mingguKe: 0,
  isOpen: true,
  batasKelas: 5,
  pendaftaran: [
    // Kelas A: released schedules of the B accounts; Dosen Uji 1-3 each supervise one and moderate one or two
    { mhs: B[0], status: "disetujui", kelas: "A", slot: [0, 8], dospem: [D1, D4], ruangan: "Ruang Uji 1", dirilis: true, moderator: D2, pembahas: [B[1]] },
    { mhs: B[1], status: "disetujui", kelas: "A", slot: [0, 9], dospem: [D2, D5], ruangan: "Ruang Uji 1", dirilis: true, moderator: D3, pembahas: [B[2]] },
    { mhs: B[2], status: "disetujui", kelas: "A", slot: [0, 10], dospem: [D3, D6], ruangan: "Ruang Uji 1", dirilis: true, moderator: D1, pembahas: [B[0]] },
    { mhs: B[3], status: "disetujui", kelas: "A", slot: [0, 11], dospem: [D4, D5], ruangan: "Ruang Uji 1", dirilis: true, moderator: D1, pembahas: [B[2]] },
    { mhs: B[4], status: "disetujui", kelas: "A", slot: [0, 13], dospem: [D5, D6], ruangan: "Ruang Uji 1", dirilis: true, moderator: D2, pembahas: [B[0]] },
    // Kelas B: no moderator. The Monday ones share a time with Kelas A (clashes), Tuesday is free for everyone.
    { mhs: m(15), status: "disetujui", kelas: "B", slot: [0, 8], dospem: [D5, D6], ruangan: "Ruang Uji 2" },
    { mhs: m(16), status: "disetujui", kelas: "B", slot: [0, 9], dospem: [D4, D6], ruangan: "Ruang Uji 2" },
    { mhs: m(17), status: "disetujui", kelas: "B", slot: [0, 10], dospem: [D4, D5], ruangan: "Ruang Uji 2" },
    { mhs: m(18), status: "disetujui", kelas: "B", slot: [1, 8], dospem: [D4, D5], ruangan: "Ruang Uji 2" },
    // Kelas C: no moderator, free for everyone
    { mhs: m(19), status: "disetujui", kelas: "C", slot: [1, 9], dospem: [D5, D6], ruangan: "Ruang Uji 3" },
    { mhs: m(20), status: "disetujui", kelas: "C", slot: [1, 10], dospem: [D4, D6], ruangan: "Ruang Uji 3" },
    { mhs: m(21), status: "disetujui", kelas: "C", slot: [1, 11], dospem: [D4, D5], ruangan: "Ruang Uji 3" },
    { mhs: m(22), status: "disetujui", kelas: "C", slot: [1, 13], dospem: [D5, D6], ruangan: "Ruang Uji 3" },
  ],
};

// Batas kelas 6: approving the 3 waiting registrations brings the queue to 5, so it never auto-forms a class
// and "Bentuk Kelas Sekarang" stays needed whatever order the admin works in.
const a = (n: number) => m(n);
const PERIODE_ADMIN: RencanaPeriode = {
  kunci: "admin",
  judul: "Periode uji skenario admin (ditutup)",
  angkatan: ANGKATAN_UJI_ADMIN,
  mingguKe: 1,
  isOpen: false,
  batasKelas: 6,
  pendaftaran: [
    // A6 (+A4, A5): complete Kelas A. uji_mhs1 is already final with a room change request (A4);
    // uji_dosen4 asks to cancel the moderation of uji_mhs3 (A5), so that seminar can't be finalized afterwards.
    { mhs: a(1), status: "disetujui", kelas: "A", slot: [0, 8], dospem: [D4, D5], ruangan: "Ruang Uji 1", pindahKe: "Ruang Uji 2", dirilis: true, moderator: D6, pembahas: [a(2)] },
    { mhs: a(2), status: "disetujui", kelas: "A", slot: [0, 9], dospem: [D6, D7], ruangan: "Ruang Uji 1", moderator: D8, pembahas: [a(3)] },
    { mhs: a(3), status: "disetujui", kelas: "A", slot: [0, 10], dospem: [D5, D8], ruangan: "Ruang Uji 1", moderator: D4, batalModerator: true, pembahas: [a(5)] },
    { mhs: a(4), status: "disetujui", kelas: "A", slot: [0, 11], dospem: [D7, D8], ruangan: "Ruang Uji 1", moderator: D5, pembahas: [a(1)] },
    { mhs: a(5), status: "disetujui", kelas: "A", slot: [0, 13], dospem: [D4, D6], ruangan: "Ruang Uji 1", moderator: D8, pembahas: [a(4)] },
    { mhs: a(6), status: "disetujui", kelas: "A", slot: [0, 14], dospem: [D5, D7], ruangan: "Ruang Uji 1", moderator: D4, pembahas: [a(5)] },
    // A3: Kelas B without pembahas; three different pembimbing pairs, uji_mhs7 and uji_mhs9 share Dosen Uji 4.
    // A4: the second room change request (not final).
    { mhs: a(7), status: "disetujui", kelas: "B", slot: [1, 8], dospem: [D4, D5], ruangan: "Ruang Uji 4", pindahKe: "Ruang Uji 5" },
    { mhs: a(8), status: "disetujui", kelas: "B", slot: [1, 9], dospem: [D6, D7], ruangan: "Ruang Uji 4" },
    { mhs: a(9), status: "disetujui", kelas: "B", slot: [1, 10], dospem: [D4, D8], ruangan: "Ruang Uji 4" },
    // A2: approved, no class, fewer than batas kelas
    { mhs: a(10), status: "disetujui", slot: [2, 8], dospem: [D6, D7] },
    { mhs: a(11), status: "disetujui", slot: [2, 9], dospem: [D5, D8] },
    // A1: waiting for verification
    { mhs: a(12), status: "menunggu", slot: [2, 10], dospem: [D4, D5] },
    { mhs: a(13), status: "menunggu", slot: [2, 11], dospem: [D6, D8] },
    { mhs: a(14), status: "menunggu", slot: [2, 13], dospem: [D7, D4] },
  ],
};

export const rencanaPeriode = (skenarioAdmin: boolean) =>
  skenarioAdmin ? [PERIODE_PESERTA, PERIODE_ADMIN] : [PERIODE_PESERTA];

export type MahasiswaRencana = AkunUji & { angkatan: string; peserta: boolean };

/** All student accounts to create: participants first (angkatan UJICOBA), then the other test students by number. */
export function mahasiswaRencana(skenarioAdmin: boolean): MahasiswaRencana[] {
  const peserta = PESERTA.flatMap(p => [p.a, p.b]).map(x => ({ ...x, angkatan: ANGKATAN_UJI, peserta: true }));
  const lain = rencanaPeriode(skenarioAdmin)
    .flatMap(p => p.pendaftaran.map(r => ({ ...r.mhs, angkatan: p.angkatan, peserta: false })))
    .filter(x => !peserta.some(p => p.username === x.username))
    .sort((x, y) => Number(x.username.slice(7)) - Number(y.username.slice(7)));
  return [...peserta, ...lain];
}

/** Pembahas value as Kelola Pembahas stores it. */
export const labelPembahas = (x: AkunUji) => `${x.nama} (${x.nipNim})`;

const samaDospem = (x: RencanaPendaftaran, y: RencanaPendaftaran) => x.dospem.some(d => y.dospem.includes(d));
const tugas = (r: RencanaPendaftaran): [Dosen, "pembimbing" | "moderator"][] =>
  [...r.dospem.map(d => [d, "pembimbing"] as [Dosen, "pembimbing"]), ...(r.moderator !== undefined ? [[r.moderator, "moderator"] as [Dosen, "moderator"]] : [])];
const sejam = (x: RencanaPendaftaran, y: RencanaPendaftaran) => x.slot[0] === y.slot[0] && x.slot[1] === y.slot[1];

/**
 * Checks the plan against the app's rules, so the created data is something the app itself could have produced:
 * no dosen twice at the same time, no moderator of their own student, pembahas are classmates (at most twice
 * each, as Kelola Pembahas allows), classes not over batas kelas, final schedules complete, and the admin
 * periode never uses the participants' dosen.
 */
export function periksaRencana(periodes: RencanaPeriode[]): string[] {
  const salah: string[] = [];
  const terjadwal = new Map<string, string>(); // "dosen|minggu|hari|jam" → who
  for (const p of periodes) {
    const perKelas = new Map<string, number>();
    for (const r of p.pendaftaran) {
      const siapa = `${p.kunci}/${r.mhs.username}`;
      for (const [d, peran] of tugas(r)) {
        const kunci = `${d}|${p.mingguKe}|${r.slot[0]}|${r.slot[1]}`;
        if (terjadwal.has(kunci)) salah.push(`${DOSEN_SEMUA[d].nama} bentrok: ${terjadwal.get(kunci)} dan ${peran} ${siapa}`);
        terjadwal.set(kunci, `${peran} ${siapa}`);
        if (p.kunci === "admin" && DOSEN_PESERTA.includes(d)) salah.push(`${siapa}: memakai ${DOSEN_SEMUA[d].nama}, dosen peserta`);
      }
      if (r.moderator !== undefined && r.dospem.includes(r.moderator)) salah.push(`${siapa}: moderator adalah pembimbingnya sendiri`);
      if ((r.kelas || r.moderator !== undefined || r.ruangan) && r.status !== "disetujui") salah.push(`${siapa}: belum disetujui tetapi punya kelas/ruangan/moderator`);
      if (r.moderator !== undefined && !r.kelas) salah.push(`${siapa}: moderator tanpa kelas`);
      if (r.dirilis && (!r.kelas || !r.ruangan || r.moderator === undefined || r.batalModerator)) salah.push(`${siapa}: dirilis tanpa kelas, ruangan atau moderator tetap`);
      if (r.pindahKe && !r.ruangan) salah.push(`${siapa}: pindah ruangan tanpa ruangan yang disetujui`);
      for (const x of r.pembahas ?? []) {
        const teman = p.pendaftaran.find(y => y.mhs.username === x.username);
        if (x.username === r.mhs.username) salah.push(`${siapa}: menjadi pembahas dirinya sendiri`);
        else if (!teman || teman.kelas !== r.kelas) salah.push(`${siapa}: pembahas ${x.username} bukan teman sekelas`);
      }
      if (r.slot[1] === 12 || r.slot[1] < 8 || r.slot[1] > 16 || r.slot[0] < 0 || r.slot[0] > 5) salah.push(`${siapa}: slot tidak valid`);
      if (r.kelas) perKelas.set(r.kelas, (perKelas.get(r.kelas) ?? 0) + 1);
    }
    for (const [k, n] of perKelas) if (n > p.batasKelas) salah.push(`${p.kunci}: kelas ${k} berisi ${n}, melebihi batas ${p.batasKelas}`);
    const kaliPembahas = new Map<string, number>();
    for (const r of p.pendaftaran) for (const x of r.pembahas ?? []) kaliPembahas.set(x.username, (kaliPembahas.get(x.username) ?? 0) + 1);
    for (const [u, n] of kaliPembahas) if (n > 2) salah.push(`${p.kunci}: ${u} menjadi pembahas ${n} kali (maksimal 2)`);
  }
  return salah;
}

/**
 * What a dosen can do in the "moderator" screen of a periode: the seminars they supervise, the seminars without
 * moderator they can pick, and the ones the app refuses because of a clash with their bimbingan or moderation.
 */
export function opsiModerasi(p: RencanaPeriode, d: Dosen) {
  const tanpaModerator = p.pendaftaran.filter(r => r.kelas && r.moderator === undefined);
  const bentrok = (r: RencanaPendaftaran, peran: "pembimbing" | "moderator") =>
    p.pendaftaran.some(x => x !== r && sejam(x, r) && tugas(x).some(([y, q]) => y === d && q === peran));
  return {
    membimbing: p.pendaftaran.filter(r => r.dospem.includes(d)).map(r => r.mhs.username),
    memoderatori: p.pendaftaran.filter(r => r.moderator === d).map(r => r.mhs.username),
    bisaDipilih: tanpaModerator.filter(r => !r.dospem.includes(d) && !bentrok(r, "pembimbing") && !bentrok(r, "moderator")).map(r => r.mhs.username),
    bentrokBimbingan: tanpaModerator.filter(r => !r.dospem.includes(d) && bentrok(r, "pembimbing")).map(r => r.mhs.username),
    bentrokModerasi: tanpaModerator.filter(r => !r.dospem.includes(d) && !bentrok(r, "pembimbing") && bentrok(r, "moderator")).map(r => r.mhs.username),
  };
}

/**
 * Kelola Pembahas of one class: the different pembimbing pairs, the student pairs the dropdown marks
 * "Dospem Sama", and whether every student can get a pembahas without such a warning (max. twice each).
 */
export function analisisPembahas(p: RencanaPeriode, kelas: string) {
  const siswa = p.pendaftaran.filter(r => r.kelas === kelas);
  const pasangan = new Set(siswa.map(r => [...r.dospem].sort().join("+")));
  const pemicu: [string, string][] = [];
  for (let i = 0; i < siswa.length; i++) for (let j = i + 1; j < siswa.length; j++) {
    if (samaDospem(siswa[i], siswa[j])) pemicu.push([siswa[i].mhs.username, siswa[j].mhs.username]);
  }
  const pakai = new Map<number, number>();
  const susun = (i: number): boolean => {
    if (i === siswa.length) return true;
    for (let j = 0; j < siswa.length; j++) {
      if (j === i || samaDospem(siswa[i], siswa[j]) || (pakai.get(j) ?? 0) >= 2) continue;
      pakai.set(j, (pakai.get(j) ?? 0) + 1);
      if (susun(i + 1)) return true;
      pakai.set(j, pakai.get(j)! - 1);
    }
    return false;
  };
  return { jumlahPasangan: pasangan.size, pemicu, susunanTanpaPeringatan: susun(0) };
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

const singkat = (d: Dosen) => `D${d + 1}`;

/** One preview line per registration. */
export function barisPendaftaran(r: RencanaPendaftaran, mulaiMinggu: string) {
  return [
    `${r.mhs.username.padEnd(10)} ${HARI[r.slot[0]]} ${tanggalSlot(mulaiMinggu, r.slot[0])} ${String(r.slot[1]).padStart(2, "0")}.00`,
    `pembimbing ${r.dospem.map(singkat).join("+")}`,
    r.status === "menunggu" ? "MENUNGGU verifikasi" : r.kelas ? `kelas ${r.kelas}` : "disetujui, ANTREAN (tanpa kelas)",
    r.ruangan && `ruangan ${r.ruangan}`,
    r.pindahKe && `minta pindah ke ${r.pindahKe}`,
    r.moderator !== undefined && `moderator ${singkat(r.moderator)}${r.batalModerator ? " (minta BATAL)" : ""}`,
    r.moderator === undefined && r.kelas && "tanpa moderator",
    r.pembahas && `pembahas ${r.pembahas.map(x => x.username).join(", ")}`,
    r.kelas && !r.pembahas && "tanpa pembahas",
    r.dirilis && "FINAL & DIRILIS",
  ].filter(Boolean).join(" | ");
}

/** Summary lines of what the plan makes possible, for the preview. */
export function ringkasanRencana(p: RencanaPeriode): string[] {
  if (p.kunci === "peserta") {
    return DOSEN_UJI.map((dosen, d) => {
      const o = opsiModerasi(p, d);
      return `${dosen.username}: membimbing ${o.membimbing.length} dari ${p.pendaftaran.length} (${o.membimbing.join(", ")}), ` +
        `moderator ${o.memoderatori.join(", ")} (bisa ajukan batal), bisa dipilih ${o.bisaDipilih.length}, ` +
        `bentrok dgn bimbingan: ${o.bentrokBimbingan.join(", ") || "-"}, bentrok dgn moderasi: ${o.bentrokModerasi.join(", ") || "-"}`;
    });
  }
  const b = analisisPembahas(p, "B");
  const kelasA = p.pendaftaran.filter(r => r.kelas === "A");
  return [
    `A3 Kelas B: ${b.jumlahPasangan} pasangan pembimbing berbeda, "Dospem Sama" pada ${b.pemicu.map(x => x.join("–")).join(", ") || "-"}, ` +
      `susunan tanpa peringatan ${b.susunanTanpaPeringatan ? "ada" : "TIDAK ada"}`,
    `A6 Kelas A: ${kelasA.length}/${p.batasKelas}, semua punya ruangan & pembahas; moderator tetap: ` +
      `${kelasA.filter(r => r.moderator !== undefined && !r.batalModerator).length}, minta batal (A5): ${kelasA.filter(r => r.batalModerator).map(r => r.mhs.username).join(", ")}; ` +
      `sudah final: ${kelasA.filter(r => r.dirilis).map(r => r.mhs.username).join(", ")}`,
    `Dosen yang dipakai: ${[...new Set(p.pendaftaran.flatMap(r => tugas(r).map(([d]) => d)))].sort().map(d => DOSEN_SEMUA[d].username).join(", ")}`,
  ];
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
    const [d1, d2] = r.dospem.map(d => DOSEN_SEMUA[d]);

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
      pembahas: r.pembahas ? r.pembahas.map(labelPembahas).join(",") : null,
      isFinalized: !!r.dirilis,
      isReleased: !!r.dirilis,
    }).returning({ id: pendaftaran.id });

    if (r.moderator !== undefined) {
      await tx.insert(moderator).values({
        pendaftaranId: p.id,
        dosenId: ids.get(DOSEN_SEMUA[r.moderator].username)!,
        assignedByRole: "dosen",
        batalStatus: r.batalModerator ? "menunggu" : null,
        batalReason: r.batalModerator ? "Data uji: ada tugas lain di jam yang sama." : null,
      });
    }
  }
}
