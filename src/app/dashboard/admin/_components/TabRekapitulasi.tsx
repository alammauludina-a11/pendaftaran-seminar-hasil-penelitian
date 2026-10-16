"use client";

import { useEffect, useState } from "react";
import { Search, UserCheck, ArrowUp, ArrowDown, ArrowUpDown, ShieldAlert } from "lucide-react";
import { useAdmin } from "../AdminContext";
import type { KunciUrutRekap } from "../useAdminDashboard";

type SortState = { key: KunciUrutRekap; order: "asc" | "desc" } | null;

function SortHeader({ kunci, label, sort, onSort }: { kunci: KunciUrutRekap; label: string; sort: SortState; onSort: (k: KunciUrutRekap) => void }) {
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

type BatasModerator = { batas: number | null; pengecualian: Record<string, number> };

/** The periode's moderator limit and the dosen allowed to go over it, saved right away. */
function useBatasModerator(periodeId: number | undefined) {
  const [data, setData] = useState<BatasModerator | null>(null);
  const [menyimpan, setMenyimpan] = useState(false);

  useEffect(() => {
    if (!periodeId) return;
    let batal = false;
    fetch(`/api/admin/periode/${periodeId}/batas-moderator`)
      .then(res => res.json())
      .then(d => { if (!batal && !d.error) setData(d); })
      .catch(e => console.error(e));
    return () => { batal = true; };
  }, [periodeId]);

  const simpan = async (body: { batas: number | null } | { dosenId: string; tambahan: number | null }) => {
    if (!periodeId) return;
    setMenyimpan(true);
    try {
      const res = await fetch(`/api/admin/periode/${periodeId}/batas-moderator`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const d = await res.json();
      if (res.ok) setData(d);
      else alert(d.error || "Gagal menyimpan batas moderator.");
    } catch (e) {
      console.error(e);
      alert("Terjadi kesalahan sistem.");
    } finally {
      setMenyimpan(false);
    }
  };

  return { data, menyimpan, simpan };
}

/** Text field for a whole number; calls `onSimpan` on blur / Enter when the value changed. */
function IsianAngka({ nilai, onSimpan, min, disabled, className, ...rest }: {
  nilai: number | null; onSimpan: (n: number | null) => void; min: number; disabled?: boolean; className: string;
  placeholder?: string; "aria-label": string; title?: string;
}) {
  const [draf, setDraf] = useState<string | null>(null);
  const tampil = draf ?? (nilai === null ? "" : String(nilai));
  const kirim = () => {
    if (draf === null) return;
    setDraf(null);
    const angka = draf.trim() === "" ? null : Number(draf);
    if (angka !== nilai) onSimpan(angka);
  };
  return (
    <input
      type="number"
      inputMode="numeric"
      min={min}
      value={tampil}
      disabled={disabled}
      onChange={(e) => setDraf(e.target.value)}
      onBlur={kirim}
      onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); if (e.key === "Escape") setDraf(null); }}
      className={className}
      {...rest}
    />
  );
}

export default function TabRekapitulasi() {
  const {
    rekapSort, rekapSearch, setRekapSearch, activePeriode, rekapitulasiData, handleSortRekap,
    handleExportRekapExcel, handleExportRekapPDF,
  } = useAdmin();
  const { data: batasModerator, menyimpan, simpan } = useBatasModerator(activePeriode?.id);
  if (!activePeriode) return null;

  const batas = batasModerator?.batas ?? null;
  const pengecualian = batasModerator?.pengecualian ?? {};
  const sortProps = { sort: rekapSort, onSort: handleSortRekap };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 flex flex-col gap-6">
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-xl font-bold text-[#06125C] flex items-center gap-2 mb-2">
              <UserCheck className="text-amber-500" /> Rekapitulasi Dosen
            </h2>
            <p className="text-slate-500 text-sm">Rekapitulasi beban tugas dosen (sebagai moderator dan pembimbing) pada periode {activePeriode?.angkatan || '-'}.</p>
          </div>
          <div className="flex gap-2">
            <button onClick={handleExportRekapExcel} className="px-4 py-2.5 rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-medium text-sm transition-colors whitespace-nowrap">Download Excel</button>
            <button onClick={handleExportRekapPDF} className="px-4 py-2.5 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 font-medium text-sm transition-colors whitespace-nowrap">Download PDF</button>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
          {/* Search Bar for Rekapitulasi */}
          <div className="flex items-center gap-3 bg-slate-50 px-4 py-2.5 rounded-xl border border-slate-200 focus-within:ring-2 focus-within:ring-[#06125C]/20 transition-all w-full sm:max-w-md">
            <Search size={18} className="text-slate-400" />
            <input
              type="text"
              placeholder="Cari nama dosen..."
              value={rekapSearch}
              onChange={(e) => setRekapSearch(e.target.value)}
              className="bg-transparent text-sm outline-none w-full text-slate-700"
            />
          </div>

          {/* Moderator limit for this periode */}
          <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5">
            <ShieldAlert size={18} className="text-amber-600 shrink-0" />
            <label htmlFor="batas-moderator" className="text-sm text-slate-700 font-medium whitespace-nowrap">Batas maksimal moderator</label>
            <IsianAngka
              key={`batas-${batas}`}
              nilai={batas}
              min={0}
              disabled={!batasModerator || menyimpan}
              onSimpan={(n) => simpan({ batas: n })}
              placeholder="Tanpa batas"
              aria-label="Batas maksimal moderator per dosen"
              className="w-28 px-3 py-1.5 rounded-lg border border-amber-200 bg-white text-sm text-slate-700 outline-none focus:ring-2 focus:ring-amber-300 disabled:opacity-60"
            />
            <span className="text-sm text-slate-500 whitespace-nowrap">kali / dosen</span>
          </div>
        </div>
        <p className="text-xs text-slate-500 -mt-3 mb-6">
          Dosen yang sudah mencapai batas tidak bisa memilih jadwal moderasi lagi. Kosongkan isian untuk menghapus batas.
          Centang <span className="font-semibold">Boleh lebih</span> di samping nama dosen untuk mengizinkan dosen tertentu melebihi batas.
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap border-collapse">
            <thead className="bg-slate-50 border-y border-slate-200 text-slate-600 font-semibold select-none">
              <tr>
                <th className="px-6 py-4 w-16 text-center">No</th>
                <th className="px-6 py-4 w-1/2"><SortHeader kunci="name" label="Nama Dosen" {...sortProps} /></th>
                <th className="px-6 py-4 text-center w-1/4"><SortHeader kunci="moderatorCount" label="Sebagai Moderator" {...sortProps} /></th>
                <th className="px-6 py-4 text-center w-1/4"><SortHeader kunci="pembimbingCount" label="Sebagai Pembimbing" {...sortProps} /></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rekapitulasiData.map((dosen, i) => (
                  <tr key={dosen.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-6 py-4 text-center text-slate-500 font-medium">{i + 1}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-[#06125C] text-white flex items-center justify-center font-bold text-xs shadow-sm shrink-0">
                          {dosen.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="font-semibold text-slate-800 group-hover:text-[#06125C] transition-colors">{dosen.name}</div>
                        <div className="ml-auto flex items-center gap-2 pl-4 w-52">
                          <label
                            className={`flex items-center gap-1.5 text-xs font-medium ${batas === null ? "text-slate-300 cursor-not-allowed" : "text-slate-600 cursor-pointer"}`}
                            title={batas === null ? "Atur batas maksimal moderator terlebih dahulu" : "Izinkan dosen ini melebihi batas maksimal"}
                          >
                            <input
                              type="checkbox"
                              checked={dosen.id in pengecualian}
                              disabled={batas === null || menyimpan}
                              onChange={(e) => simpan({ dosenId: String(dosen.id), tambahan: e.target.checked ? 1 : null })}
                              className="w-4 h-4 accent-amber-500"
                            />
                            Boleh lebih
                          </label>
                          {dosen.id in pengecualian && (
                            <div className="flex items-center gap-1 text-xs text-slate-500">
                              +
                              <IsianAngka
                                key={`tambahan-${dosen.id}-${pengecualian[dosen.id]}`}
                                nilai={pengecualian[dosen.id]}
                                min={1}
                                disabled={batas === null || menyimpan}
                                onSimpan={(n) => simpan({ dosenId: String(dosen.id), tambahan: n ?? 1 })}
                                aria-label={`Berapa kali ${dosen.name} boleh melebihi batas`}
                                title="Berapa kali boleh melebihi batas maksimal"
                                className="w-14 px-2 py-1 rounded-md border border-amber-200 bg-amber-50 text-xs text-slate-700 text-center outline-none focus:ring-2 focus:ring-amber-300"
                              />
                              kali
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center">
                        <span className={`px-4 py-1.5 rounded-full font-bold text-xs flex items-center justify-center min-w-[3rem] ${dosen.moderatorCount > 0 ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' : 'bg-slate-50 text-slate-400 border border-slate-100'}`}>
                          {dosen.moderatorCount} x
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center">
                        <span className={`px-4 py-1.5 rounded-full font-bold text-xs flex items-center justify-center min-w-[3rem] ${dosen.pembimbingCount > 0 ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-slate-50 text-slate-400 border border-slate-100'}`}>
                          {dosen.pembimbingCount} x
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              {rekapitulasiData.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-12">
                    <div className="flex flex-col items-center justify-center gap-2 text-slate-500">
                      <UserCheck className="w-10 h-10 text-slate-300" />
                      <span>Belum ada data dosen.</span>
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
