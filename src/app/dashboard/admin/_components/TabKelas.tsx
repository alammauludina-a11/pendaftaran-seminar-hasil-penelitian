"use client";

import { CheckCircle2, Clock, Filter, Users, ChevronUp, ChevronDown, FileDown } from "lucide-react";
import { useAdmin } from "../AdminContext";

export default function TabKelas() {
  const {
    kelasData, fetchData, activePeriodeId, manajemenKelasFilter, setManajemenKelasFilter, manajemenKelasSort,
    setManajemenKelasSort, handlePindahKelas, activePeriode, activePendaftaran, filteredPendaftaran,
    handleVerifikasiClick, handleExportKelasPDF,
  } = useAdmin();
  if (!activePeriode) return null;

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 flex flex-col gap-6">
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm relative overflow-hidden flex flex-col md:flex-row gap-6 items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-[#06125C] flex items-center gap-2 mb-2">
            <Users className="text-indigo-500" /> Antrean & Pembentukan Kelas
          </h2>
          <p className="text-slate-500 text-sm max-w-xl">
            Mahasiswa yang telah diverifikasi namun belum tergabung dalam kelas akan masuk ke antrean. Sistem otomatis membentuk kelas jika antrean mencapai batas ({activePeriode.batasKelas || 31} orang). Anda juga dapat memaksa pembentukan kelas sekarang.
          </p>
        </div>
        <div className="flex flex-col items-center p-4 bg-slate-50 rounded-2xl border border-slate-100 min-w-[200px]">
          <span className="text-3xl font-black text-[#06125C]">
            {filteredPendaftaran.filter(p => !p.kelas && p.status !== 'ditolak').length}
          </span>
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest mt-1">Dalam Antrean</span>
          <button
            onClick={async () => {
              const count = filteredPendaftaran.filter(p => p.status === 'disetujui' && !p.kelas).length;
              if (count === 0) {
                alert("Belum ada mahasiswa yang berstatus 'Disetujui' di dalam antrean untuk dibentuk kelas.");
                return;
              }
              if (confirm(`Apakah Anda yakin ingin membentuk kelas baru dengan ${count} mahasiswa dari antrean?`)) {
                try {
                  const res = await fetch("/api/admin/kelas/bentuk", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ periodeId: activePeriode.id })
                  });
                  const data = await res.json();
                  if (res.ok) {
                    alert(data.message);
                    fetchData();
                  } else {
                    alert(data.error);
                  }
                } catch (e) {
                  alert("Terjadi kesalahan.");
                }
              }
            }}
            disabled={filteredPendaftaran.filter(p => p.status === 'disetujui' && !p.kelas).length === 0}
            className="mt-4 w-full bg-[#06125C] hover:bg-[#06125C]/90 disabled:bg-slate-200 disabled:text-slate-400 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-sm transition-colors"
          >
            Bentuk Kelas Sekarang
          </button>
        </div>
      </div>

      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
        <h3 className="text-lg font-bold text-slate-800 mb-4">Mahasiswa dalam Antrean</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
              <tr>
                <th className="px-4 py-3 text-center w-[5%]">No</th>
                <th className="px-4 py-3 w-[15%]">Nama</th>
                <th className="px-4 py-3 w-[15%]">NIM</th>
                <th className="px-4 py-3 w-[30%]">Judul Penelitian</th>
                <th className="px-4 py-3 text-center w-[20%]">Status</th>
                <th className="px-4 py-3 text-center w-[15%]">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredPendaftaran.filter(p => !p.kelas && p.status !== 'ditolak').length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                    Antrean kosong. Semua pendaftar sudah mendapatkan kelas.
                  </td>
                </tr>
              ) : (
                filteredPendaftaran.filter(p => !p.kelas && p.status !== 'ditolak').map((item, idx) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 text-slate-500 text-center">{idx + 1}</td>
                    <td className="px-4 py-3 font-medium text-[#06125C]">{item.name}</td>
                    <td className="px-4 py-3 text-slate-500">{item.nim}</td>
                    <td className="px-4 py-3 text-slate-600 leading-snug break-words">{item.title}</td>
                    <td className="px-4 py-3 text-center">
                      {item.status === 'menunggu' && (
                        <span className="bg-amber-100 text-amber-700 text-[11px] font-bold px-2 py-0.5 rounded-md inline-flex items-center gap-1">
                          <Clock size={10} /> Menunggu Verifikasi
                        </span>
                      )}
                      {item.status === 'disetujui' && (
                        <span className="bg-green-100 text-green-700 text-[11px] font-bold px-2 py-0.5 rounded-md inline-flex items-center gap-1">
                          <CheckCircle2 size={10} /> Siap Dibentuk Kelas
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => handleVerifikasiClick(item)}
                        className="bg-[#06125C] hover:bg-[#06125C]/90 text-white px-3 py-1.5 rounded-lg text-xs font-semibold shadow-sm transition-colors"
                      >
                        Periksa & Verifikasi
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 mt-2">
        {kelasData.filter(k => k.periodeId === activePeriodeId).sort((a,b) => a.namaKelas.localeCompare(b.namaKelas)).map(c => {
          const count = activePendaftaran.filter(p => p.kelasSeminarId === c.id).length;
          const isFull = count >= (activePeriode?.batasKelas || 31);
          return (
            <div key={c.id} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center">
              <span className="text-sm font-bold text-slate-500 mb-1">Kelas {c.namaKelas}</span>
              <div className="flex items-end gap-1">
                <span className={`text-2xl font-black ${count === 0 ? 'text-slate-300' : isFull ? 'text-red-500' : 'text-[#06125C]'}`}>{count}</span>
                <span className="text-xs text-slate-400 font-medium mb-1">/ {activePeriode?.batasKelas || 31}</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm mt-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <h3 className="text-lg font-bold text-[#06125C] flex items-center gap-2">
            Daftar Kelas Terbentuk & Mahasiswa
          </h3>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportKelasPDF}
              className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 px-3 py-1.5 rounded-lg text-sm font-semibold flex items-center gap-2 transition-colors"
            >
              <FileDown size={16} /> Export PDF
            </button>
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg text-sm">
              <Filter size={16} className="text-slate-400" />
              <select
                value={manajemenKelasFilter}
                onChange={(e) => setManajemenKelasFilter(e.target.value)}
                className="bg-transparent border-none focus:ring-0 outline-none text-slate-700 font-medium cursor-pointer"
              >
                <option value="Semua Kelas">Semua Kelas</option>
                {kelasData.filter(k => k.periodeId === activePeriodeId).sort((a,b) => a.namaKelas.localeCompare(b.namaKelas)).map(c => (
                  <option key={c.id} value={c.id.toString()}>Kelas {c.namaKelas}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
              <tr>
                <th className="px-4 py-3 text-center">No</th>
                {([
                  { label: "Nama Mahasiswa", key: "name" },
                  { label: "NIM", key: "nim" }
                ] as const).map(col => (
                  <th key={col.key} className="px-4 py-3 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => {
                    if (manajemenKelasSort?.key === col.key) {
                      setManajemenKelasSort({ key: col.key, order: manajemenKelasSort.order === 'asc' ? 'desc' : 'asc' });
                    } else {
                      setManajemenKelasSort({ key: col.key, order: 'asc' });
                    }
                  }}>
                    <div className="flex items-center gap-1">
                      {col.label}
                      <div className="flex flex-col opacity-50">
                        <ChevronUp size={10} className={manajemenKelasSort?.key === col.key && manajemenKelasSort.order === 'asc' ? 'text-indigo-600 opacity-100' : ''} />
                        <ChevronDown size={10} className={manajemenKelasSort?.key === col.key && manajemenKelasSort.order === 'desc' ? 'text-indigo-600 opacity-100' : '-mt-1'} />
                      </div>
                    </div>
                  </th>
                ))}
                <th className="px-4 py-3">Kelas Saat Ini</th>
                <th className="px-4 py-3 text-center">Pindah Ke</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {kelasData.filter(k => k.periodeId === activePeriodeId).length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                    Belum ada kelas yang terbentuk di periode ini.
                  </td>
                </tr>
              ) : (
                activePendaftaran.filter(p => p.kelasSeminarId && (manajemenKelasFilter === "Semua Kelas" || p.kelasSeminarId?.toString() === manajemenKelasFilter)).sort((a, b) => {
                  if (manajemenKelasSort) {
                    const valA = a[manajemenKelasSort.key] || "";
                    const valB = b[manajemenKelasSort.key] || "";
                    if (valA < valB) return manajemenKelasSort.order === 'asc' ? -1 : 1;
                    if (valA > valB) return manajemenKelasSort.order === 'asc' ? 1 : -1;
                  }
                  const aKelas = kelasData.find(k => k.id === a.kelasSeminarId)?.namaKelas || "";
                  const bKelas = kelasData.find(k => k.id === b.kelasSeminarId)?.namaKelas || "";
                  return aKelas.localeCompare(bKelas);
                }).map((item, idx) => {
                  const currentClass = kelasData.find(k => k.id === item.kelasSeminarId);
                  return (
                    <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 text-slate-500 text-center">{idx + 1}</td>
                      <td className="px-4 py-3 font-medium text-[#06125C]">{item.name}</td>
                      <td className="px-4 py-3 text-slate-500">{item.nim}</td>
                      <td className="px-4 py-3 font-bold text-slate-700">Kelas {currentClass?.namaKelas || "-"}</td>
                      <td className="px-4 py-3 text-center">
                        <select
                          value={item.kelasSeminarId || ""}
                          onChange={(e) => handlePindahKelas(item.id, parseInt(e.target.value))}
                          className="bg-slate-50 border border-slate-200 focus:border-[#06125C] focus:ring-1 focus:ring-[#06125C]/20 text-xs px-3 py-1.5 rounded-lg outline-none font-medium text-slate-700 cursor-pointer"
                        >
                          {kelasData.filter(c => c.periodeId === activePeriodeId).map(c => {
                            const count = activePendaftaran.filter(p => p.kelasSeminarId === c.id).length;
                            const isTargetFull = count >= activePeriode.batasKelas;
                            const isEmpty = count === 0;
                            return (
                              <option key={c.id} value={c.id}>
                                Kelas {c.namaKelas}{isEmpty ? ' (Kosong)' : isTargetFull && c.id !== currentClass?.id ? ' (Penuh)' : ''}
                              </option>
                            );
                          })}
                        </select>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
