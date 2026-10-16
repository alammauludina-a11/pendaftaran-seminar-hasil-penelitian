// Items waiting for the admin (the bell in the admin navigation), computed from the registrations the admin
// dashboard already loads. Each item points to the periode and tab of Kelola Pendaftaran where it is handled.
// Safe to import from client components.

export type JenisNotifikasiAdmin = "verifikasi" | "ruangan" | "batal_moderator" | "batal_moderator_dirilis" | "finalisasi";

export type NotifikasiAdmin = {
  periodeId: number;
  jenis: JenisNotifikasiAdmin;
  tab: "verifikasi" | "finalisasi" | "pengumuman";
  jumlah: number;
};

type PendaftaranNotif = {
  periodeId: number | null;
  status: string;
  room?: string | null;
  ruanganDiajukan?: string | null;
  statusRuangan?: string | null;
  isFinalized?: boolean | null;
  moderatorBatalStatus?: string | null;
};

/** Order of the items within a periode, and the tab where each one is handled. */
const URUTAN: { jenis: JenisNotifikasiAdmin; tab: NotifikasiAdmin["tab"]; cocok: (p: PendaftaranNotif) => boolean }[] = [
  { jenis: "verifikasi", tab: "verifikasi", cocok: p => p.status === "menunggu" },
  // Same condition as the "Setujui Ruangan" button of Verifikasi Pendaftaran (lib/ruangan needs ruanganDiajukan)
  { jenis: "ruangan", tab: "verifikasi", cocok: p => p.status !== "ditolak" && !!p.ruanganDiajukan && p.statusRuangan === "menunggu" },
  // Finalisasi (the only place with Setujui/Tolak) lists schedules that are not final yet; a request on a final
  // (released) schedule points to Pengumuman Jadwal, where that schedule is listed
  { jenis: "batal_moderator", tab: "finalisasi", cocok: p => p.moderatorBatalStatus === "menunggu" && !p.isFinalized },
  { jenis: "batal_moderator_dirilis", tab: "pengumuman", cocok: p => p.moderatorBatalStatus === "menunggu" && !!p.isFinalized },
  // Same count as the "Siap Finalisasi" card
  { jenis: "finalisasi", tab: "finalisasi", cocok: p => p.status === "disetujui" && !!p.room && !p.isFinalized },
];

/** Items with at least one registration, per periode in the order of `periodeIds`. */
export function buatNotifikasiAdmin(periodeIds: number[], pendaftaran: PendaftaranNotif[]): NotifikasiAdmin[] {
  return periodeIds.flatMap(periodeId => {
    const milikPeriode = pendaftaran.filter(p => p.periodeId === periodeId);
    return URUTAN
      .map(({ jenis, tab, cocok }) => ({ periodeId, jenis, tab, jumlah: milikPeriode.filter(cocok).length }))
      .filter(n => n.jumlah > 0);
  });
}
