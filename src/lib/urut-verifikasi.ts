// Sorting of the admin "Verifikasi Pendaftaran" table (kolokium and seminar hasil).

export type KunciUrutVerifikasi = "name" | "nim" | "kelas" | "dospem" | "title" | "konsentrasi" | "date" | "room" | "status";

type BarisVerifikasi = {
  name?: string | null;
  nim?: string | null;
  kelas?: string | null;
  dospem?: string | null;
  title?: string | null;
  konsentrasi?: string | null;
  waktuMulai?: string | number | Date | null;
  room?: string | null;
  ruanganDiajukan?: string | null;
  statusRuangan?: string | null;
  status?: string | null;
};

const URUTAN_STATUS = ["menunggu", "disetujui", "ditolak"];

/** The room the table shows: the approved one, otherwise the requested one. */
export const ruanganTampil = (b: BarisVerifikasi) =>
  (b.statusRuangan === "disetujui" ? b.room : b.ruanganDiajukan || b.room) || "";

const waktu = (v: BarisVerifikasi["waktuMulai"]) => {
  if (v == null || v === "") return null;
  const t = new Date(v).getTime();
  return isNaN(t) ? null : t;
};

/**
 * Sorts by one column; empty values always go last and ties fall back to the name.
 * Text compares naturally ("Kelas 2" before "Kelas 10") and ignores case, the schedule by its real
 * time, and status in the order menunggu → disetujui → ditolak.
 */
export function urutkanVerifikasi<T extends BarisVerifikasi>(list: T[], kunci: KunciUrutVerifikasi, arah: "asc" | "desc"): T[] {
  const tanda = arah === "asc" ? 1 : -1;
  const kosongDiAkhir = (a: unknown, b: unknown) => (a === b ? 0 : a == null || a === "" ? 1 : -1);
  const banding = (a: T, b: T): number => {
    if (kunci === "status") {
      const ia = URUTAN_STATUS.indexOf(a.status ?? ""), ib = URUTAN_STATUS.indexOf(b.status ?? "");
      if (ia < 0 || ib < 0) return kosongDiAkhir(ia < 0 ? null : 1, ib < 0 ? null : 1);
      return (ia - ib) * tanda;
    }
    if (kunci === "date") {
      const ta = waktu(a.waktuMulai), tb = waktu(b.waktuMulai);
      if (ta === null || tb === null) return kosongDiAkhir(ta, tb);
      return (ta - tb) * tanda;
    }
    const teks = (x: T) => (kunci === "room" ? ruanganTampil(x) : x[kunci]) || "";
    const va = teks(a).trim(), vb = teks(b).trim();
    if (!va || !vb) return kosongDiAkhir(va, vb);
    return va.localeCompare(vb, "id", { numeric: true, sensitivity: "base" }) * tanda;
  };
  return [...list].sort((a, b) => banding(a, b) || (a.name ?? "").localeCompare(b.name ?? "", "id"));
}
