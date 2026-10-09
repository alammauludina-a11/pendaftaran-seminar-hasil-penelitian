// Pemantauan: which students of an angkatan have / have not registered for Seminar Hasil Penelitian.
// The student list of an angkatan is taken from the kolokium registrations of that angkatan.

// "ditolak" (registered, then rejected) counts as not registered yet; it is only marked as such.
export type StatusHasil = "belum" | "ditolak" | "menunggu" | "disetujui" | "final" | "dirilis";

type Periode = { id: number; jenisSeminar: string; angkatan: string };

type Pendaftaran = {
  id: number;
  userId: string;
  periodeId: number | null;
  jenisSeminar: string;
  name: string;
  nim: string;
  title?: string | null;
  dospem?: string | null;
  dospem2?: string | null;
  status: "menunggu" | "disetujui" | "ditolak";
  isFinalized?: boolean;
  isReleased?: boolean;
  date?: string | null;
};

export type BarisPemantauan = {
  userId: string;
  nim: string;
  nama: string;
  judul: string | null;
  dospem: string | null;
  dospem2: string | null;
  /** Verification status of the kolokium registration, null when the student is not in the kolokium list */
  statusKolokium: Pendaftaran["status"] | null;
  tanggalKolokium: string | null;
  statusHasil: StatusHasil;
  /** True when the seminar hasil registration is in another periode of the same angkatan */
  diPeriodeLain: boolean;
};

export type RingkasanPemantauan = {
  total: number;
  sudah: number;
  /** Includes the students whose registration was rejected */
  belum: number;
  /** Registered, then rejected (part of `belum`) */
  ditolak: number;
  tanpaKolokium: number;
};

const URUTAN_STATUS: StatusHasil[] = ["belum", "ditolak", "menunggu", "disetujui", "final", "dirilis"];

/** Higher is further along; used to pick one registration when a student has several. */
const rankVerifikasi = (p: Pendaftaran) =>
  p.isReleased ? 5 : p.isFinalized ? 4 : p.status === "disetujui" ? 3 : p.status === "menunggu" ? 2 : 1;

export function statusHasil(p: Pendaftaran | undefined): StatusHasil {
  if (!p) return "belum";
  if (p.isReleased) return "dirilis";
  if (p.isFinalized) return "final";
  return p.status;
}

/**
 * One row per student of the angkatan of `periodeHasil`: every student registered for kolokium in that
 * angkatan, plus students registered for seminar hasil in that angkatan who are not in the kolokium list.
 * Sorted with students that need attention (belum daftar, ditolak) first, then by name.
 */
export function buatPemantauan(
  periodeHasil: Periode,
  periodes: Periode[],
  pendaftaran: Pendaftaran[],
): BarisPemantauan[] {
  const periodeAngkatan = periodes.filter(p => p.angkatan === periodeHasil.angkatan);
  const idKolokium = new Set(periodeAngkatan.filter(p => p.jenisSeminar === "kolokium").map(p => p.id));
  const idHasil = new Set(periodeAngkatan.filter(p => p.jenisSeminar === "hasil_penelitian").map(p => p.id));

  // Keep the most advanced registration per student; prefer the active periode for seminar hasil
  const pilih = (ids: Set<number>, utamakanPeriode?: number) => {
    const map = new Map<string, Pendaftaran>();
    for (const p of pendaftaran) {
      if (p.periodeId == null || !ids.has(p.periodeId)) continue;
      const lama = map.get(p.userId);
      const skor = (x: Pendaftaran) => (x.periodeId === utamakanPeriode ? 10 : 0) + rankVerifikasi(x);
      if (!lama || skor(p) > skor(lama)) map.set(p.userId, p);
    }
    return map;
  };
  const kolokium = pilih(idKolokium);
  const hasil = pilih(idHasil, periodeHasil.id);

  const userIds = new Set([...kolokium.keys(), ...hasil.keys()]);
  const baris: BarisPemantauan[] = [];
  for (const userId of userIds) {
    const k = kolokium.get(userId);
    const h = hasil.get(userId);
    const sumber = (h ?? k)!;
    baris.push({
      userId,
      nim: sumber.nim,
      nama: sumber.name,
      judul: h?.title || k?.title || null,
      dospem: h?.dospem || k?.dospem || null,
      dospem2: h?.dospem2 || k?.dospem2 || null,
      statusKolokium: k?.status ?? null,
      tanggalKolokium: k?.date && k.date !== "-" ? k.date : null,
      statusHasil: statusHasil(h),
      diPeriodeLain: !!h && h.periodeId !== periodeHasil.id,
    });
  }

  return baris.sort((a, b) =>
    URUTAN_STATUS.indexOf(a.statusHasil) - URUTAN_STATUS.indexOf(b.statusHasil) ||
    a.nama.localeCompare(b.nama, "id"),
  );
}

export const belumDaftar = (b: BarisPemantauan) => b.statusHasil === "belum" || b.statusHasil === "ditolak";

export function ringkasPemantauan(baris: BarisPemantauan[]): RingkasanPemantauan {
  const belum = baris.filter(belumDaftar).length;
  return {
    total: baris.length,
    sudah: baris.length - belum,
    belum,
    ditolak: baris.filter(b => b.statusHasil === "ditolak").length,
    tanpaKolokium: baris.filter(b => b.statusKolokium === null).length,
  };
}

export type KunciUrutPemantauan = "nama" | "nim" | "judul" | "dospem" | "kolokium" | "status";

const BULAN = ["januari", "februari", "maret", "april", "mei", "juni", "juli", "agustus", "september", "oktober", "november", "desember"];
const BULAN_SINGKAT = ["jan", "feb", "mar", "apr", "mei", "jun", "jul", "agt", "sep", "okt", "nov", "des"];

/** "05 Agt 2026" (or a full month name) → sortable number; null when it cannot be read. */
function nilaiTanggal(t: string | null): number | null {
  const m = t?.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/);
  if (!m) return null;
  const nama = m[2].toLowerCase();
  const bulan = Math.max(BULAN_SINGKAT.indexOf(nama), BULAN.indexOf(nama));
  return bulan < 0 ? null : Number(m[3]) * 10000 + bulan * 100 + Number(m[1]);
}

const URUTAN_KOLOKIUM = [null, "ditolak", "menunggu", "disetujui"] as const;

/**
 * Sorts by one column. Empty values always go last; ties fall back to the name.
 * Kolokium sorts by status (tidak tercatat, ditolak, menunggu, disetujui), then by date;
 * status follows the progress order (belum daftar → jadwal dirilis).
 */
export function urutkanPemantauan(baris: BarisPemantauan[], kunci: KunciUrutPemantauan, arah: "asc" | "desc"): BarisPemantauan[] {
  const tanda = arah === "asc" ? 1 : -1;
  const teks = (b: BarisPemantauan) =>
    kunci === "nama" ? b.nama : kunci === "nim" ? b.nim : kunci === "judul" ? b.judul : b.dospem;
  const banding = (a: BarisPemantauan, b: BarisPemantauan): number => {
    if (kunci === "status") return (URUTAN_STATUS.indexOf(a.statusHasil) - URUTAN_STATUS.indexOf(b.statusHasil)) * tanda;
    if (kunci === "kolokium") {
      const s = URUTAN_KOLOKIUM.indexOf(a.statusKolokium) - URUTAN_KOLOKIUM.indexOf(b.statusKolokium);
      if (s) return s * tanda;
      const ta = nilaiTanggal(a.tanggalKolokium), tb = nilaiTanggal(b.tanggalKolokium);
      if (ta === tb) return 0;
      if (ta === null) return 1;
      if (tb === null) return -1;
      return (ta - tb) * tanda;
    }
    const va = teks(a)?.trim() || "", vb = teks(b)?.trim() || "";
    if (!va || !vb) return va === vb ? 0 : va ? -1 : 1;
    return va.localeCompare(vb, "id", { numeric: true, sensitivity: "base" }) * tanda;
  };
  return [...baris].sort((a, b) => banding(a, b) || a.nama.localeCompare(b.nama, "id"));
}
