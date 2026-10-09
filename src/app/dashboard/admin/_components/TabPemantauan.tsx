"use client";

import { Search, Eye, UserX, UserCheck, Users, XCircle, AlertTriangle, ArrowUp, ArrowDown, ArrowUpDown, Info } from "lucide-react";
import { useAdmin } from "../AdminContext";
import type { StatusPendaftaran, KunciUrutPemantauan } from "@/lib/pemantauan";

const STATUS: Record<StatusPendaftaran, { label: string; className: string }> = {
  belum: { label: "Belum Daftar", className: "bg-slate-100 text-slate-600 border-slate-200" },
  ditolak: { label: "Belum Daftar", className: "bg-slate-100 text-slate-600 border-slate-200" },
  menunggu: { label: "Menunggu Verifikasi", className: "bg-amber-50 text-amber-700 border-amber-200" },
  disetujui: { label: "Disetujui", className: "bg-blue-50 text-blue-700 border-blue-200" },
  final: { label: "Terfinalisasi", className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  dirilis: { label: "Jadwal Dirilis", className: "bg-indigo-50 text-indigo-700 border-indigo-200" },
};

const FILTERS = [
  { key: "semua", label: "Semua" },
  { key: "belum", label: "Belum Daftar" },
  { key: "sudah", label: "Sudah Daftar" },
  { key: "ditolak", label: "Pernah Ditolak" },
  { key: "tidak_di_acuan", label: "" }, // label depends on the seminar, see labelFilter
] as const;

type SortState = { key: KunciUrutPemantauan; order: "asc" | "desc" } | null;

function SortHeader({ kunci, label, sort, onSort }: { kunci: KunciUrutPemantauan; label: string; sort: SortState; onSort: (k: KunciUrutPemantauan) => void }) {
  const aktif = sort?.key === kunci;
  const Ikon = !aktif ? ArrowUpDown : sort.order === "asc" ? ArrowUp : ArrowDown;
  return (
    <button
      type="button"
      onClick={() => onSort(kunci)}
      className={`inline-flex items-center gap-1 hover:text-[#06125C] transition-colors ${aktif ? "text-[#06125C]" : ""}`}
      title={`Urutkan berdasarkan ${label.toLowerCase()}`}
    >
      {label}
      <Ikon size={13} className={aktif ? "" : "text-slate-300"} />
    </button>
  );
}

/** Marks a value taken from the kolokium registration; it may change when the student registers for Seminar Hasil. */
function KeteranganKolokium({ teks }: { teks: string }) {
  return (
    <div
      className="mt-1.5 inline-flex items-center gap-1 text-[10px] font-semibold text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-full whitespace-nowrap"
      title="Diambil dari pendaftaran kolokium. Bisa berubah saat mahasiswa mendaftar Seminar Hasil."
    >
      <Info size={10} /> {teks}
    </div>
  );
}

export default function TabPemantauan() {
  const {
    activePeriode, pemantauanFilter, setPemantauanFilter, pemantauanSearch, setPemantauanSearch,
    pemantauanData, ringkasanPemantauan: r, handleExportPemantauanExcel, pemantauanSort, handleSortPemantauan,
  } = useAdmin();
  if (!activePeriode) return null;

  const isKolokium = activePeriode.jenisSeminar === "kolokium";
  const namaSeminar = isKolokium ? "Seminar Kolokium" : "Seminar Hasil";
  const labelFilter = (f: (typeof FILTERS)[number]) =>
    f.key !== "tidak_di_acuan" ? f.label : isKolokium ? "Tidak Ada di Data Master" : "Tidak Tercatat di Kolokium";
  const sortProps = { sort: pemantauanSort, onSort: handleSortPemantauan };
  // Students that have not registered have no title or supervisor (kolokium), so these columns are
  // only shown when at least one listed student has a value
  const adaJudul = pemantauanData.some(b => b.judul);
  const adaDospem = pemantauanData.some(b => b.dospem || b.dospem2);
  // No, Mahasiswa, Prodi (kolokium) or Kolokium (seminar hasil), and the status column are always shown
  const jumlahKolom = 4 + (adaJudul ? 1 : 0) + (adaDospem ? 1 : 0);
  const persen = r.total > 0 ? Math.round((r.sudah / r.total) * 100) : 0;
  const hitung: Record<(typeof FILTERS)[number]["key"], number> = {
    semua: r.total, belum: r.belum, sudah: r.sudah, ditolak: r.ditolak, tidak_di_acuan: r.tidakDiAcuan,
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 flex flex-col gap-6">
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-xl font-bold text-[#06125C] flex items-center gap-2 mb-2">
              <Eye className="text-indigo-500" /> Pemantauan Mahasiswa
            </h2>
            <p className="text-slate-500 text-sm">
              {isKolokium
                ? <>Mahasiswa angkatan {activePeriode.angkatan} menurut data master mahasiswa, beserta status pendaftaran Seminar Kolokium mereka.</>
                : <>Mahasiswa angkatan {activePeriode.angkatan} yang mendaftar Seminar Kolokium, beserta status pendaftaran Seminar Hasil Penelitian mereka.</>}
            </p>
          </div>
          <button onClick={handleExportPemantauanExcel} className="px-4 py-2.5 rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-medium text-sm transition-colors whitespace-nowrap self-start sm:self-auto">
            Download Excel
          </button>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 flex items-center gap-3">
            <Users size={20} className="text-[#06125C] shrink-0" />
            <div><p className="text-xs text-slate-500 font-medium">Total Mahasiswa</p><p className="text-xl font-bold text-[#06125C]">{r.total}</p></div>
          </div>
          <div className="bg-emerald-50/60 rounded-2xl p-4 border border-emerald-100 flex items-center gap-3">
            <UserCheck size={20} className="text-emerald-600 shrink-0" />
            <div><p className="text-xs text-slate-500 font-medium">Sudah Daftar</p><p className="text-xl font-bold text-emerald-700">{r.sudah}</p></div>
          </div>
          <div className="bg-amber-50/60 rounded-2xl p-4 border border-amber-100 flex items-center gap-3">
            <UserX size={20} className="text-amber-600 shrink-0" />
            <div>
              <p className="text-xs text-slate-500 font-medium">Belum Daftar</p>
              <p className="text-xl font-bold text-amber-700">{r.belum}</p>
              {r.ditolak > 0 && <p className="text-[11px] text-slate-500">termasuk {r.ditolak} pernah ditolak</p>}
            </div>
          </div>
          <div className="bg-red-50/60 rounded-2xl p-4 border border-red-100 flex items-center gap-3">
            <XCircle size={20} className="text-red-500 shrink-0" />
            <div><p className="text-xs text-slate-500 font-medium">Pernah Daftar, Ditolak</p><p className="text-xl font-bold text-red-600">{r.ditolak}</p></div>
          </div>
        </div>

        <div className="mb-6">
          <div className="flex justify-between text-xs text-slate-500 font-medium mb-1.5">
            <span>Progres pendaftaran {namaSeminar}</span>
            <span className="font-bold text-[#06125C]">{persen}%</span>
          </div>
          <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
            <div className="h-full bg-[#06125C] rounded-full transition-all" style={{ width: `${persen}%` }} />
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col lg:flex-row gap-4 mb-6">
          <div className="flex items-center gap-3 bg-slate-50 px-4 py-2.5 rounded-xl border border-slate-200 focus-within:ring-2 focus-within:ring-[#06125C]/20 transition-all w-full lg:max-w-sm">
            <Search size={18} className="text-slate-400" />
            <input
              type="text"
              placeholder={isKolokium ? "Cari nama/NIM, prodi, atau dosen..." : "Cari nama/NIM mahasiswa atau dosen..."}
              value={pemantauanSearch}
              onChange={(e) => setPemantauanSearch(e.target.value)}
              className="bg-transparent text-sm outline-none w-full text-slate-700"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {FILTERS.filter(f => f.key !== "tidak_di_acuan" || r.tidakDiAcuan > 0).map(f => (
              <button
                key={f.key}
                onClick={() => setPemantauanFilter(f.key)}
                className={`px-3.5 py-2 rounded-xl text-sm font-medium border transition-colors ${pemantauanFilter === f.key
                  ? "bg-[#06125C] text-white border-[#06125C]"
                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"}`}
              >
                {labelFilter(f)} <span className={pemantauanFilter === f.key ? "text-blue-200" : "text-slate-400"}>({hitung[f.key]})</span>
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead className="bg-slate-50 border-y border-slate-200 text-slate-600 font-semibold whitespace-nowrap">
              <tr>
                <th className="px-4 py-4 w-12 text-center">No</th>
                <th className="px-4 py-4">
                  <div className="flex items-center gap-3">
                    <SortHeader kunci="nama" label="Nama" {...sortProps} />
                    <span className="text-slate-300">/</span>
                    <SortHeader kunci="nim" label="NIM" {...sortProps} />
                  </div>
                </th>
                {isKolokium && <th className="px-4 py-4"><SortHeader kunci="prodi" label="Prodi" {...sortProps} /></th>}
                {adaJudul && <th className="px-4 py-4 min-w-[260px]"><SortHeader kunci="judul" label="Judul" {...sortProps} /></th>}
                {adaDospem && <th className="px-4 py-4"><SortHeader kunci="dospem" label="Dosen Pembimbing" {...sortProps} /></th>}
                {!isKolokium && <th className="px-4 py-4"><SortHeader kunci="kolokium" label="Kolokium" {...sortProps} /></th>}
                <th className="px-4 py-4 text-center"><SortHeader kunci="status" label={namaSeminar} {...sortProps} /></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pemantauanData.map((b, i) => (
                <tr key={b.userId} className="hover:bg-slate-50 transition-colors align-top">
                  <td className="px-4 py-4 text-center text-slate-500 font-medium">{i + 1}</td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="font-semibold text-slate-800">{b.nama}</div>
                    <div className="text-xs text-slate-500">{b.nim}</div>
                    {isKolokium && !b.diAcuan && (
                      <div className="mt-1 inline-flex items-center gap-1 text-[10px] font-semibold text-orange-600">
                        <AlertTriangle size={10} /> Tidak ada di data master angkatan ini
                      </div>
                    )}
                    {b.statusMahasiswa && b.statusMahasiswa !== "Aktif" && (
                      <div className="mt-1 text-[10px] font-semibold text-slate-500">Status: {b.statusMahasiswa}</div>
                    )}
                  </td>
                  {isKolokium && <td className="px-4 py-4 text-xs text-slate-600 whitespace-nowrap">{b.prodi || "-"}</td>}
                  {adaJudul && (
                    <td className="px-4 py-4 text-slate-600 text-xs leading-relaxed">
                      {b.judul || "-"}
                      {b.dariKolokium && b.judul && <KeteranganKolokium teks="Judul saat kolokium" />}
                    </td>
                  )}
                  {adaDospem && (
                    <td className="px-4 py-4 text-xs text-slate-600 whitespace-nowrap">
                      <div>{b.dospem || "-"}</div>
                      {b.dospem2 && <div className="text-slate-400 mt-0.5">{b.dospem2}</div>}
                      {b.dariKolokium && (b.dospem || b.dospem2) && <KeteranganKolokium teks="Dosbing saat kolokium" />}
                    </td>
                  )}
                  {!isKolokium && <td className="px-4 py-4 text-xs whitespace-nowrap">
                    {b.statusKolokium === null ? (
                      <span className="inline-flex items-center gap-1 text-orange-600 font-medium"><AlertTriangle size={12} /> Tidak tercatat</span>
                    ) : b.statusKolokium === "disetujui" ? (
                      <span className="text-slate-600">{b.tanggalKolokium ?? "Disetujui"}</span>
                    ) : (
                      <span className={b.statusKolokium === "ditolak" ? "text-red-600 font-medium" : "text-amber-600 font-medium"}>
                        {b.statusKolokium === "ditolak" ? "Ditolak" : "Menunggu"}
                      </span>
                    )}
                  </td>}
                  <td className="px-4 py-4 text-center whitespace-nowrap">
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold border ${STATUS[b.status].className}`}>
                      {STATUS[b.status].label}
                    </span>
                    {b.status === "ditolak" && (
                      <div className="mt-1 inline-flex items-center gap-1 text-[10px] font-semibold text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
                        <XCircle size={10} /> Pernah daftar, ditolak
                      </div>
                    )}
                    {b.diPeriodeLain && <div className="text-[10px] text-slate-400 mt-1">di periode lain</div>}
                  </td>
                </tr>
              ))}
              {pemantauanData.length === 0 && (
                <tr>
                  <td colSpan={jumlahKolom} className="px-6 py-12">
                    <div className="flex flex-col items-center justify-center gap-2 text-slate-500 text-center">
                      <Eye className="w-10 h-10 text-slate-300" />
                      <span>
                        {r.total === 0
                          ? isKolokium
                            ? `Belum ada mahasiswa angkatan ${activePeriode.angkatan} di data master mahasiswa.`
                            : `Belum ada mahasiswa angkatan ${activePeriode.angkatan} yang mendaftar Seminar Kolokium.`
                          : "Tidak ada mahasiswa yang cocok dengan pencarian/filter."}
                      </span>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
