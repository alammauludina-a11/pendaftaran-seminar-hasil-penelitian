"use client";

import { X, Users, Settings, Plus } from "lucide-react";
import { useAdmin } from "../AdminContext";

export default function TabPembahas() {
  const {
    setPendaftaran, savePembahas, handleGeneratePembahas, activePendaftaran, uniqueKelas, activePeriode,
    globalKelasFilter, setGlobalKelasFilter, globalSearch, setGlobalSearch,
  } = useAdmin();
  if (!activePeriode) return null;
  // Global kelas filter and search (above the tabs). The search only narrows the rows shown: a class keeps
  // all its students so pembahas generation and the duplicate check stay complete.
  const cari = globalSearch.trim().toLowerCase();
  const cocok = (p: { name: string; nim: string; dospem?: string | null; dospem2?: string | null }) =>
    !cari || [p.name, p.nim, p.dospem, p.dospem2].some(v => v?.toLowerCase().includes(cari));
  const kelasTampil = (globalKelasFilter === "Semua Kelas" ? uniqueKelas : uniqueKelas.filter(k => k === globalKelasFilter))
    .filter(k => activePendaftaran.some(p => p.kelas === k && cocok(p)));

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 flex flex-col gap-6">
      {uniqueKelas.length === 0 ? (
        <div className="bg-white rounded-3xl p-10 border border-slate-200 shadow-sm text-center flex flex-col items-center">
          <Users size={48} className="text-slate-300 mb-4" />
          <h3 className="text-lg font-bold text-slate-800 mb-2">Belum Ada Kelas Terbentuk</h3>
          <p className="text-slate-500">Silakan pastikan terdapat kelas yang sudah terbentuk (mencapai kuota atau dipaksa terbentuk) untuk dapat mengatur pembahas.</p>
        </div>
      ) : kelasTampil.length === 0 ? (
        <div className="bg-white rounded-3xl p-10 border border-slate-200 shadow-sm text-center flex flex-col items-center">
          <Users size={48} className="text-slate-300 mb-4" />
          <p className="text-slate-500 mb-4">Tidak ada mahasiswa yang cocok dengan pencarian/filter kelas.</p>
          <button onClick={() => { setGlobalKelasFilter("Semua Kelas"); setGlobalSearch(""); }} className="px-4 py-2 rounded-xl text-sm font-semibold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition-colors">
            Reset Pencarian & Filter
          </button>
        </div>
      ) : (
        kelasTampil.map(k => {
          const classPendaftaran = activePendaftaran.filter(p => p.kelas === k);

          return (
            <div key={k} className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm relative overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                  <h2 className="text-xl font-bold text-[#06125C] flex items-center gap-2">
                    <Users className="text-indigo-500" /> Kelas {k}
                  </h2>
                  <p className="text-sm text-slate-500 mt-1">Daftar mahasiswa dan plotting pembahas.</p>
                </div>
                <button
                  onClick={() => handleGeneratePembahas(classPendaftaran)}
                  disabled={classPendaftaran.some(p => p.isReleased)}
                  className={`px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors shrink-0 ${classPendaftaran.some(p => p.isReleased) ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed' : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200'}`}
                >
                  <Settings size={16} /> Generate Pembahas Kelas Ini
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                    <tr>
                      <th className="px-4 py-3">Penyaji (Mahasiswa)</th>
                      <th className="px-4 py-3">Dosen Pembimbing</th>
                      <th className="px-4 py-3">Pembahas Ter-assign</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {classPendaftaran.filter(cocok).map(p => {
                      const assignedPembahasList = classPendaftaran
                        .map(x => x.pembahas)
                        .filter(Boolean)
                        .flatMap(pStr => pStr!.split(',').map((s: string) => s.trim()))
                        .filter(Boolean);

                      const currentPembahas = p.pembahas ? p.pembahas.split(',').map((s: string) => s.trim()) : [""];
                      if (currentPembahas.length === 0) currentPembahas.push("");

                      return (
                        <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-4">
                            <div className="font-semibold text-slate-800">{p.name}</div>
                            <div className="text-xs text-slate-500">{p.nim}</div>
                          </td>
                          <td className="px-4 py-4 text-slate-600">
                            <div className="flex flex-col gap-1 text-xs">
                              <span>1. {p.dospem}</span>
                              {p.dospem2 && <span>2. {p.dospem2}</span>}
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex flex-col gap-2">
                              {currentPembahas.map((pembVal: string, idx: number) => (
                                <div key={idx} className="flex items-center gap-2">
                                  <select
                                    value={pembVal || ""}
                                    disabled={p.isReleased}
                                    onChange={async (e) => {
                                      const newValue = e.target.value;
                                      const newArr = [...currentPembahas];
                                      newArr[idx] = newValue;
                                      const newPembahasStr = newArr.filter(Boolean).join(',');

                                      // Optimistic update
                                      setPendaftaran(prev => prev.map(item => item.id === p.id ? { ...item, pembahas: newPembahasStr } : item));

                                      // Persist to DB
                                      try {
                                        await savePembahas(p.id, newPembahasStr);
                                      } catch (err) {
                                        console.error("Gagal menyimpan pembahas:", err);
                                      }
                                    }}
                                    className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#06125C]/20 w-full font-medium text-[#06125C] disabled:opacity-50 disabled:cursor-not-allowed"
                                  >
                                    <option value="">-- Pilih Pembahas --</option>
                                    {classPendaftaran.filter(c => c.id !== p.id).map(c => {
                                      const value = `${c.name} (${c.nim})`;
                                      const isSameDospem = [c.dospem1Id, c.dospem2Id].some(d => d && (d === p.dospem1Id || d === p.dospem2Id));
                                      const isAlreadyAssigned = assignedPembahasList.filter(x => x === value).length >= 2 && pembVal !== value;

                                      return (
                                        <option key={c.id} value={value} disabled={isAlreadyAssigned}>
                                          {value} {isAlreadyAssigned ? '(🔒 Limit 2)' : isSameDospem ? '(⚠️ Dospem Sama)' : ''}
                                        </option>
                                      );
                                    })}
                                  </select>
                                  {idx > 0 && !p.isReleased && (
                                    <button 
                                      onClick={async () => {
                                        const newArr = [...currentPembahas];
                                        newArr.splice(idx, 1);
                                        const newPembahasStr = newArr.filter(Boolean).join(',');
                                        setPendaftaran(prev => prev.map(item => item.id === p.id ? { ...item, pembahas: newPembahasStr } : item));
                                        try {
                                          await savePembahas(p.id, newPembahasStr);
                                        } catch (err) {
                                          console.error("Gagal menyimpan pembahas:", err);
                                        }
                                      }}
                                      className="text-red-500 hover:bg-red-50 p-1.5 rounded-lg shrink-0"
                                      title="Hapus pembahas ini"
                                    >
                                      <X size={16} />
                                    </button>
                                  )}
                                </div>
                              ))}
                              {!p.isReleased && (
                                <button 
                                  onClick={async () => {
                                    const newPembahasStr = [...currentPembahas, ""].join(',');
                                    setPendaftaran(prev => prev.map(item => item.id === p.id ? { ...item, pembahas: newPembahasStr } : item));
                                    try {
                                      await savePembahas(p.id, newPembahasStr);
                                    } catch (err) {
                                      console.error("Gagal menyimpan pembahas:", err);
                                    }
                                  }}
                                  className="text-xs text-[#06125C] font-semibold flex items-center gap-1 hover:bg-[#06125C]/5 px-2 py-1 rounded-lg w-fit transition-colors"
                                >
                                  <Plus size={14}/> Tambah Pembahas
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
