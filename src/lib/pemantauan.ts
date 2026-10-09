// Pemantauan: which students of an angkatan have / have not registered for a seminar.
// The student list of an angkatan (the "acuan") depends on the seminar:
// - Seminar Kolokium: the master data of mahasiswa of that angkatan
// - Seminar Hasil Penelitian: the kolokium registrations of that angkatan

// "ditolak" (registered, then rejected) counts as not registered yet; it is only marked as such.
export type StatusPendaftaran = "belum" | "ditolak" | "menunggu" | "disetujui" | "final" | "dirilis";

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

type Mahasiswa = { id: string | number; nim: string; name: string; angkatan?: string; prodi?: string | null; status?: string | null };

export type BarisPemantauan = {
  userId: string;
  nim: string;
  nama: string;
  prodi: string | null;
  /** Status of the student in the master data ("Aktif", ...), null when not in the master data */
  statusMahasiswa: string | null;
  judul: string | null;
  dospem: string | null;
  dospem2: string | null;
  /**
   * Seminar Hasil only: true when judul and dospem come from the kolokium registration because the
   * student has no Seminar Hasil registration yet (they may change when the student registers)
   */
  dariKolokium: boolean;
  /** Seminar Hasil only: verification status of the kolokium registration, null when there is none */
  statusKolokium: Pendaftaran["status"] | null;
  tanggalKolokium: string | null;
  /** Registration status for the seminar of the periode being monitored */
  status: StatusPendaftaran;
  /** True when the registration is in another periode of the same angkatan */
  diPeriodeLain: boolean;
  /** False when the student registered but is not in the acuan list of the angkatan */
  diAcuan: boolean;
};

export type RingkasanPemantauan = {
  total: number;
  sudah: number;
  /** Includes the students whose registration was rejected */
  belum: number;
  /** Registered, then rejected (part of `belum`) */
  ditolak: number;
  /** Registered without being in the acuan list */
  tidakDiAcuan: number;
};

const URUTAN_STATUS: StatusPendaftaran[] = ["belum", "ditolak", "menunggu", "disetujui", "final", "dirilis"];

/** Higher is further along; used to pick one registration when a student has several. */
const rankVerifikasi = (p: Pendaftaran) =>
  p.isReleased ? 5 : p.isFinalized ? 4 : p.status === "disetujui" ? 3 : p.status === "menunggu" ? 2 : 1;

export function statusPendaftaran(p: Pendaftaran | undefined): StatusPendaftaran {
  if (!p) return "belum";
  if (p.isReleased) return "dirilis";
  if (p.isFinalized) return "final";
  return p.status;
}

/** "AKN 60", "akn60" and "60" are the same angkatan (periode uses the first form, master data the last). */
export const normalAngkatan = (a: string | null | undefined) => (a ?? "").replace(/^\s*AKN\s*/i, "").trim().toLowerCase();

/**
 * One row per student of the angkatan of `periodeAktif`: every student in the acuan list (see the top of
 * this file), plus registered students who are not in it. Sorted with students that need attention
 * (belum daftar, ditolak) first, then by name.
 */
export function buatPemantauan(
  periodeAktif: Periode,
  periodes: Periode[],
  pendaftaran: Pendaftaran[],
  mahasiswa: Mahasiswa[],
): BarisPemantauan[] {
  const angkatan = normalAngkatan(periodeAktif.angkatan);
  const periodeAngkatan = periodes.filter(p => normalAngkatan(p.angkatan) === angkatan);
  const idPeriode = (jenis: string) => new Set(periodeAngkatan.filter(p => p.jenisSeminar === jenis).map(p => p.id));

  // Keep the most advanced registration per student; prefer the active periode
  const pilih = (ids: Set<number>) => {
    const map = new Map<string, Pendaftaran>();
    const skor = (x: Pendaftaran) => (x.periodeId === periodeAktif.id ? 10 : 0) + rankVerifikasi(x);
    for (const p of pendaftaran) {
      if (p.periodeId == null || !ids.has(p.periodeId)) continue;
      const lama = map.get(p.userId);
      if (!lama || skor(p) > skor(lama)) map.set(p.userId, p);
    }
    return map;
  };

  const isKolokium = periodeAktif.jenisSeminar === "kolokium";
  const daftar = pilih(idPeriode(periodeAktif.jenisSeminar));
  const kolokium = isKolokium ? daftar : pilih(idPeriode("kolokium"));
  const masterById = new Map(mahasiswa.map(m => [String(m.id), m]));
  const acuan = isKolokium
    ? new Set(mahasiswa.filter(m => normalAngkatan(m.angkatan) === angkatan).map(m => String(m.id)))
    : new Set(kolokium.keys());

  const baris: BarisPemantauan[] = [];
  for (const userId of new Set([...acuan, ...daftar.keys()])) {
    const d = daftar.get(userId);
    const k = isKolokium ? undefined : kolokium.get(userId);
    const m = masterById.get(userId);
    const sumber = d ?? k;
    baris.push({
      userId,
      nim: m?.nim || sumber?.nim || "-",
      nama: m?.name || sumber?.name || "-",
      prodi: m?.prodi || null,
      statusMahasiswa: m?.status || null,
      judul: d?.title || k?.title || null,
      dospem: d?.dospem || k?.dospem || null,
      dospem2: d?.dospem2 || k?.dospem2 || null,
      dariKolokium: !d && !!k,
      statusKolokium: k?.status ?? null,
      tanggalKolokium: k?.date && k.date !== "-" ? k.date : null,
      status: statusPendaftaran(d),
      diPeriodeLain: !!d && d.periodeId !== periodeAktif.id,
      diAcuan: acuan.has(userId),
    });
  }

  return baris.sort((a, b) =>
    URUTAN_STATUS.indexOf(a.status) - URUTAN_STATUS.indexOf(b.status) ||
    a.nama.localeCompare(b.nama, "id"),
  );
}

export const belumDaftar = (b: BarisPemantauan) => b.status === "belum" || b.status === "ditolak";

export function ringkasPemantauan(baris: BarisPemantauan[]): RingkasanPemantauan {
  const belum = baris.filter(belumDaftar).length;
  return {
    total: baris.length,
    sudah: baris.length - belum,
    belum,
    ditolak: baris.filter(b => b.status === "ditolak").length,
    tidakDiAcuan: baris.filter(b => !b.diAcuan).length,
  };
}

export type KunciUrutPemantauan = "nama" | "nim" | "prodi" | "judul" | "dospem" | "kolokium" | "status";

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
    kunci === "nama" ? b.nama : kunci === "nim" ? b.nim : kunci === "prodi" ? b.prodi : kunci === "judul" ? b.judul : b.dospem;
  const banding = (a: BarisPemantauan, b: BarisPemantauan): number => {
    if (kunci === "status") return (URUTAN_STATUS.indexOf(a.status) - URUTAN_STATUS.indexOf(b.status)) * tanda;
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

const LABEL_STATUS: Record<StatusPendaftaran, string> = {
  belum: "Belum daftar", ditolak: "Belum daftar (pernah daftar, ditolak)", menunggu: "Menunggu verifikasi",
  disetujui: "Disetujui", final: "Terfinalisasi", dirilis: "Jadwal dirilis",
};

/** Header row of the Pemantauan Excel export when no student is listed (the columns that are always present). */
export const kolomExcelPemantauanKosong = (isKolokium: boolean) =>
  isKolokium
    ? ["No", "NIM", "Nama", "Prodi", "Status Mahasiswa", "Status Seminar Kolokium"]
    : ["No", "NIM", "Nama", "Kolokium", "Status Seminar Hasil"];

/** Rows of the Pemantauan Excel export, in the listed order. Like the table, columns that are empty for every row are left out. */
export function barisExcelPemantauan(baris: BarisPemantauan[], isKolokium: boolean): Record<string, string | number>[] {
  const adaJudul = baris.some(b => b.judul);
  const adaDospem = baris.some(b => b.dospem || b.dospem2);
  const status = (b: BarisPemantauan) =>
    LABEL_STATUS[b.status] + (b.diPeriodeLain ? " (periode lain)" : "") +
    (!b.diAcuan ? (isKolokium ? " - tidak ada di data master angkatan" : " - tidak tercatat di kolokium") : "");
  return baris.map((b, i) => ({
    No: i + 1,
    NIM: b.nim,
    Nama: b.nama,
    ...(isKolokium ? { Prodi: b.prodi ?? "", "Status Mahasiswa": b.statusMahasiswa ?? "" } : {}),
    ...(adaJudul ? { Judul: b.judul ?? "" } : {}),
    ...(adaDospem ? { "Dosen Pembimbing 1": b.dospem ?? "", "Dosen Pembimbing 2": b.dospem2 ?? "" } : {}),
    ...(!isKolokium && (adaJudul || adaDospem) ? {
      "Sumber Judul & Dosbing": b.dariKolokium ? "Saat kolokium (bisa berubah)" : b.status === "belum" ? "" : "Pendaftaran Seminar Hasil",
    } : {}),
    ...(isKolokium ? {} : {
      Kolokium: b.statusKolokium === null ? "Tidak tercatat" : b.statusKolokium === "disetujui" ? (b.tanggalKolokium ?? "Disetujui") : b.statusKolokium,
    }),
    [isKolokium ? "Status Seminar Kolokium" : "Status Seminar Hasil"]: status(b),
  }));
}
