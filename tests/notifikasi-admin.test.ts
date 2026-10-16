import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buatNotifikasiAdmin } from "../src/lib/notifikasi-admin";

const daftar = (periodeId: number, extra: Record<string, unknown> = {}) => ({
  periodeId,
  status: "disetujui",
  room: null as string | null,
  ruanganDiajukan: null as string | null,
  statusRuangan: "menunggu",
  isFinalized: false,
  moderatorBatalStatus: null as string | null,
  ...extra,
});

describe("buatNotifikasiAdmin", () => {
  it("menghitung tiap jenis per periode dan melewati yang kosong", () => {
    const hasil = buatNotifikasiAdmin([1, 2], [
      daftar(1, { status: "menunggu" }),
      daftar(1, { status: "menunggu", ruanganDiajukan: "R1" }),
      daftar(1, { room: "R2", statusRuangan: "disetujui" }),
      daftar(2, { room: "R1", statusRuangan: "disetujui", isFinalized: true, moderatorBatalStatus: "menunggu" }),
    ]);
    assert.deepEqual(hasil, [
      { periodeId: 1, jenis: "verifikasi", tab: "verifikasi", jumlah: 2 },
      { periodeId: 1, jenis: "ruangan", tab: "verifikasi", jumlah: 1 },
      { periodeId: 1, jenis: "finalisasi", tab: "finalisasi", jumlah: 1 },
      { periodeId: 2, jenis: "batal_moderator_dirilis", tab: "pengumuman", jumlah: 1 },
    ]);
  });

  it("mengarahkan pengajuan batal jadwal yang belum final ke Finalisasi", () => {
    const hasil = buatNotifikasiAdmin([1], [daftar(1, { moderatorBatalStatus: "menunggu" })]);
    assert.deepEqual(hasil, [{ periodeId: 1, jenis: "batal_moderator", tab: "finalisasi", jumlah: 1 }]);
  });

  it("mengabaikan pendaftaran ditolak, ruangan yang sudah disetujui, dan periode lain", () => {
    const hasil = buatNotifikasiAdmin([1], [
      daftar(1, { status: "ditolak", ruanganDiajukan: "R1" }),
      daftar(1, { ruanganDiajukan: "R1", room: "R1", statusRuangan: "disetujui", isFinalized: true }),
      daftar(1, { moderatorBatalStatus: "ditolak" }),
      daftar(3, { status: "menunggu" }),
    ]);
    assert.deepEqual(hasil, []);
  });
});
