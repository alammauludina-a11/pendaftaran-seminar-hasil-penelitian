// Shapes of the admin dashboard data as returned by the admin API.
export type PeriodeData = {
  id: number;
  jenisSeminar: "kolokium" | "hasil_penelitian";
  angkatan: string;
  startDate: string;
  endDate: string;
  registrationEndDate: string;
  isOpen: boolean;
  batasKelas: number;
  forcedClasses: string[];
  cancelledClasses: string[];
  isDraft?: boolean;
};

export type Account = { username: string; password: string | null; isPasswordChanged?: boolean; } | null;

export type MahasiswaData = {
  id: string | number;
  nim: string;
  name: string;
  angkatan?: string;
  prodi: string;
  status: string;
  account: Account;
};

export type DosenData = {
  id: string | number;
  nip: string;
  name: string;
  prodi: string;
  jabatan: string;
  statusDosen?: string;
  account: Account;
};

