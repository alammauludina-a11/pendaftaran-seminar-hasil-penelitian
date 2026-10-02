// Types and formatting helpers shared by the Analisis Log tabs.

export type RiwayatLogin = { waktu: string; ip: string | null; perangkat: string };

export type UserLogin = {
  id: string;
  nama: string;
  nipNim: string;
  role: string;
  loginCount: number;
  lastLogin: string | null;
  history: RiwayatLogin[];
};

export type KeamananData = {
  batasGagalBeruntun: number;
  gagalBeruntun: { identifier: string; nama: string | null; role: string | null; akunDitemukan: boolean; jumlah: number; jumlahIp: number; terakhir: string | null }[];
  loginGagalTerbaru: { identifier: string; nama: string | null; alasan: string | null; ip: string | null; perangkat: string; waktu: string }[];
  adminPerangkatBaru: { nama: string; waktu: string; ip: string | null; perangkat: string; alasan: string[] }[];
};

export type LogData = {
  pencatatanSejak: string;
  kpi: { aktif7Hari: number; loginHariIni: number; belumPernahLogin: number; totalMahasiswa: number; loginGagal24Jam: number };
  daily: { date: string; mahasiswa: number; dosen: number }[];
  markers: { date: string; label: string }[];
  adopsi: { angkatan: string; total: number; sudahLogin: number }[];
  belumLogin: { nama: string; nipNim: string; angkatan: string | null }[];
  userLogins: UserLogin[];
  keamanan: KeamananData;
};

/** "2 Okt" style label for a WIB calendar day (YYYY-MM-DD). */
export const formatTanggal = (isoDay: string, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" }) =>
  new Date(`${isoDay}T00:00:00+07:00`).toLocaleDateString("id-ID", { ...opts, timeZone: "Asia/Jakarta" });

/** "02 Okt 2026, 15.39" in WIB. */
export const formatWaktu = (value: string | Date) =>
  new Date(value).toLocaleString("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" });

/** "baru saja", "5 menit lalu", "3 hari lalu"; falls back to a date after 30 days. */
export function waktuRelatif(value: string | Date | null): string {
  if (!value) return "-";
  const diffMs = Date.now() - new Date(value).getTime();
  const menit = Math.floor(diffMs / 60000);
  if (menit < 1) return "baru saja";
  if (menit < 60) return `${menit} menit lalu`;
  const jam = Math.floor(menit / 60);
  if (jam < 24) return `${jam} jam lalu`;
  const hari = Math.floor(jam / 24);
  if (hari < 30) return `${hari} hari lalu`;
  return new Date(value).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Jakarta" });
}

/** WIB calendar day (YYYY-MM-DD) of a timestamp, for comparing against <input type="date"> values. */
export const hariWib = (value: string | Date) =>
  new Date(new Date(value).getTime() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10);
