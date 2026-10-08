"use client";

import { FileCheck, CheckCircle2, XCircle, Clock, Calendar, ChevronUp, ChevronDown, BookOpen } from "lucide-react";
import { useAdmin } from "../AdminContext";

export default function TabVerifikasi() {
  const {
    selectedDateFilter, setSelectedDateFilter, selectedKonsentrasiFilter, setSelectedKonsentrasiFilter,
    verifikasiSort, setVerifikasiSort, uniqueKonsentrasi, verifikasiList, uniqueAllDates,
    handleVerifikasiClick, handleSetujuiRuangan, activePeriode,
  } = useAdmin();
  if (!activePeriode) return null;

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 flex flex-col gap-4">
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <h2 className="text-xl font-bold text-[#06125C] flex items-center gap-2">
            <FileCheck className="text-amber-500" /> Daftar Verifikasi Berkas
          </h2>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg text-sm">
              <BookOpen size={16} className="text-slate-400" />
              <select
                value={selectedKonsentrasiFilter}
                onChange={(e) => setSelectedKonsentrasiFilter(e.target.value)}
                className="bg-transparent border-none focus:ring-0 outline-none text-slate-700 font-medium cursor-pointer"
              >
                <option value="Semua Konsentrasi">Semua Konsentrasi</option>
                {uniqueKonsentrasi.map((kons) => (
                  <option key={kons} value={kons}>{kons}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg text-sm">
              <Calendar size={16} className="text-slate-400" />
              <select
                value={selectedDateFilter}
                onChange={(e) => setSelectedDateFilter(e.target.value)}
                className="bg-transparent border-none focus:ring-0 outline-none text-slate-700 font-medium cursor-pointer"
              >
                <option value="Semua Tanggal">Semua Tanggal</option>
                {uniqueAllDates.map((date, idx) => (
                  <option key={idx} value={date}>{date}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
              <tr>
                <th className="px-3 py-3 text-center w-px whitespace-nowrap">No</th>
                {([
                  { label: "Mahasiswa", key: "name", width: "w-[14%]" },
                  { label: "Kelas", key: "kelas", width: "w-px whitespace-nowrap" },
                  { label: "Dosen Pembimbing", key: "dospem", width: "w-[20%]" },
                  { label: "Judul Penelitian", key: "title", width: "w-[28%]" },
                  { label: "Konsentrasi", key: "konsentrasi", width: "w-[11%]" },
                  { label: "Jadwal Diajukan", key: "date", width: "w-[10%]" }
                ] as const).map(col => (
                  <th key={col.key} className={`px-3 py-3 cursor-pointer hover:bg-slate-100 transition-colors ${col.width}`} onClick={() => {
                    if (verifikasiSort?.key === col.key) {
                      setVerifikasiSort({ key: col.key, order: verifikasiSort.order === 'asc' ? 'desc' : 'asc' });
                    } else {
                      setVerifikasiSort({ key: col.key, order: 'asc' });
                    }
                  }}>
                    <div className="flex items-center gap-1">
                      {col.label}
                      <div className="flex flex-col opacity-50">
                        <ChevronUp size={10} className={verifikasiSort?.key === col.key && verifikasiSort.order === 'asc' ? 'text-indigo-600 opacity-100' : ''} />
                        <ChevronDown size={10} className={verifikasiSort?.key === col.key && verifikasiSort.order === 'desc' ? 'text-indigo-600 opacity-100' : '-mt-1'} />
                      </div>
                    </div>
                  </th>
                ))}
                <th className="px-3 py-3 w-[9%]">Ruangan</th>
                <th className="px-3 py-3 text-center w-px whitespace-nowrap">Status</th>
                <th className="px-3 py-3 text-center w-px whitespace-nowrap">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {verifikasiList.map((item, idx) => (
                <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-3 py-4 text-center text-slate-500 font-medium">{idx + 1}</td>
                  <td className="px-3 py-4">
                    <div className="font-semibold text-slate-800">{item.name}</div>
                    <div className="text-xs text-slate-500">{item.nim}</div>
                  </td>
                  <td className="px-3 py-4 text-slate-700 font-medium whitespace-nowrap">
                    {item.kelas ? `Kelas ${item.kelas.replace('Kelas ', '')}` : '-'}
                  </td>
                  <td className="px-3 py-4 text-slate-700 font-medium">
                    <div className="flex flex-col gap-1 text-sm">
                      <span>1. {item.dospem}</span>
                      {item.dospem2 && <span>2. {item.dospem2}</span>}
                    </div>
                  </td>
                  <td className="px-3 py-4">
                    <div className="font-medium text-slate-800 leading-snug break-words">{item.title}</div>
                  </td>
                  <td className="px-3 py-4 text-slate-700 font-medium">
                    {item.konsentrasi || '-'}
                  </td>
                  <td className="px-3 py-4 text-slate-600 whitespace-nowrap">
                    <div className="flex items-center gap-1.5"><Calendar size={14} /> {item.date}</div>
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1"><Clock size={12} /> {item.time}</div>
                  </td>
                  <td className="px-3 py-4 max-w-[140px]">
                    {item.statusRuangan === 'disetujui' && item.room && (
                      <span className="text-sm font-medium text-slate-800">{item.room}</span>
                    )}
                    {item.statusRuangan === 'menunggu' && (item.ruanganDiajukan || item.room) && (
                      <div className="flex flex-col gap-2 items-start">
                        {item.room && item.ruanganDiajukan && item.room !== item.ruanganDiajukan && (
                          <span className="text-xs text-slate-500 break-words">Sekarang: {item.room}</span>
                        )}
                        <span className="text-xs text-amber-600 font-medium bg-amber-50 px-2 py-1 rounded break-words">Minta: {item.ruanganDiajukan || item.room}</span>
                        {(item.isFinalized || item.isReleased) && (
                          <span className="text-[10px] text-red-600 font-semibold bg-red-50 border border-red-100 px-2 py-0.5 rounded">
                            Jadwal final{item.isReleased ? " & dirilis" : ""}
                          </span>
                        )}
                        <button
                          onClick={() => handleSetujuiRuangan(item.id)}
                          className="bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] px-2 py-1 rounded shadow-sm font-semibold transition-colors whitespace-nowrap"
                        >
                          Setujui Ruangan
                        </button>
                      </div>
                    )}
                    {!item.room && !item.ruanganDiajukan && (
                      <span className="text-slate-400 italic text-xs">Belum di set</span>
                    )}
                  </td>
                  <td className="px-3 py-4 text-center whitespace-nowrap">
                    {item.status === 'menunggu' && (
                      <span className="bg-amber-100 text-amber-700 text-xs font-bold px-2.5 py-1 rounded-md inline-flex items-center gap-1">
                        <Clock size={12} /> Menunggu
                      </span>
                    )}
                    {item.status === 'disetujui' && (
                      <span className="bg-green-100 text-green-700 text-xs font-bold px-2.5 py-1 rounded-md inline-flex items-center gap-1">
                        <CheckCircle2 size={12} /> Disetujui
                      </span>
                    )}
                    {item.status === 'ditolak' && (
                      <span className="bg-red-100 text-red-700 text-xs font-bold px-2.5 py-1 rounded-md inline-flex items-center gap-1">
                        <XCircle size={12} /> Ditolak
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-4 text-center whitespace-nowrap">
                    <button
                      onClick={() => handleVerifikasiClick(item)}
                      disabled={item.isFinalized || item.status === 'ditolak'}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold shadow-sm transition-colors ${(item.isFinalized || item.status === 'ditolak') ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200' : 'bg-[#06125C] hover:bg-[#06125C]/90 text-white'}`}
                    >
                      Periksa
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
