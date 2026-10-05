/** Duration from a number of days: "12 hari" under 30 days, otherwise "2,4 bulan" (30 days = 1 month). */
export function formatDurasi(hari: number): string {
  if (hari < 30) return `${Math.max(1, Math.round(hari))} hari`;
  return `${(hari / 30).toLocaleString("id-ID", { maximumFractionDigits: 1 })} bulan`;
}
