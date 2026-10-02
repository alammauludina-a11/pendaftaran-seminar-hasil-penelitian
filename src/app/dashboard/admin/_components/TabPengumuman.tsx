"use client";

import { MapPin, Megaphone, Clock, ChevronUp, ChevronDown } from "lucide-react";
import { useAdmin } from "../AdminContext";

export default function TabPengumuman() {
  const {
    pendaftaran, selectedDateFilter, setSelectedDateFilter, pengumumanSort, setPengumumanSort, uniqueDates,
    displayFinalized, sortedPengumuman, handleExportExcel, handleExportPDF, handleBatalRilis, activePeriode,
  } = useAdmin();
  if (!activePeriode) return null;

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 flex flex-col gap-6">
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-xl font-bold text-[#06125C] flex items-center gap-2">
              <Megaphone className="text-amber-500" /> Atur Pengumuman Jadwal Final
            </h2>
            <p className="text-sm text-slate-500 mt-1">Publikasikan jadwal yang sudah lengkap (termasuk moderator) ke mahasiswa dan dosen.</p>
          </div>

          <div className="flex flex-col sm:flex-row items-end sm:items-center gap-3">
            <button 
              onClick={handleExportExcel}
              className="px-4 py-2.5 rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-medium text-sm transition-colors"
            >
              Download Excel
            </button>
            <button 
              onClick={handleExportPDF}
              className="px-4 py-2.5 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 font-medium text-sm transition-colors"
            >
              Download PDF
            </button>
            <select
              value={selectedDateFilter}
              onChange={(e) => setSelectedDateFilter(e.target.value)}
              className="px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-[#06125C]/20 outline-none text-sm font-medium"
            >
              <option value="Semua Tanggal">Semua Tanggal</option>
              {uniqueDates.map(date => (
                <option key={date} value={date}>{date}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-200">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-sm text-slate-500">
                <th className="px-3 py-3 font-semibold text-center w-px whitespace-nowrap">No</th>
                {([
                  { label: "Mahasiswa", key: "name", width: "w-[22%]" },
                  { label: "Kelas", key: "kelas", width: "w-px whitespace-nowrap" },
                  { label: "Dosen Pembimbing", key: "dospem", width: "w-[17%]" },
                  { label: "Waktu & Ruangan", key: "waktu", width: "w-[14%]" },
                  { label: "Moderator", key: "moderator", width: "w-[13%]" },
                  { label: "Pembahas", key: "pembahas", width: "w-[17%]" },
                  { label: "Status", key: "status", width: "w-px whitespace-nowrap" }
                ] as const).map(col => (
                  <th
                    key={col.key}
                    className={`px-3 py-3 font-semibold cursor-pointer select-none hover:bg-slate-100 transition-colors ${col.width}`}
                    onClick={() => setPengumumanSort(prev => ({
                      key: col.key,
                      order: prev.key === col.key && prev.order === 'asc' ? 'desc' : 'asc'
                    }))}
                  >
                    <div className="flex items-center gap-1">
                      {col.label}
                      <div className="flex flex-col opacity-50">
                        <ChevronUp size={10} className={pengumumanSort.key === col.key && pengumumanSort.order === 'asc' ? 'text-indigo-600 opacity-100' : ''} />
                        <ChevronDown size={10} className={pengumumanSort.key === col.key && pengumumanSort.order === 'desc' ? 'text-indigo-600 opacity-100' : '-mt-1'} />
                      </div>
                    </div>
                  </th>
                ))}
                <th className="px-3 py-3 font-semibold text-center w-px whitespace-nowrap">Aksi</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {sortedPengumuman.map((item, index, arr) => {
                const isReady = item.room && item.moderator;
                const isJugaPembahas = pendaftaran.some(p => p.pembahas && p.pembahas.includes(`${item.name} (${item.nim})`));
                const isFinished = item.waktuMulai ? new Date(item.waktuMulai) < new Date() : false;
                return (
                  <tr
                    key={item.id}
                    className={`border-b border-slate-100 transition-colors hover:bg-slate-50/50 ${index === arr.length - 1 ? 'border-b-0' : ''}`}
                  >
                    <td className="px-3 py-4 text-center text-slate-500 font-medium">{index + 1}</td>
                    <td className="px-3 py-4">
                      <div className="font-bold text-[#06125C] flex flex-col gap-1 items-start">
                        {item.name}
                        {isJugaPembahas && (
                          <span className="bg-indigo-100 text-indigo-700 text-[9px] px-2 py-0.5 rounded-full uppercase tracking-wider font-bold border border-indigo-200">
                            Juga Pembahas
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500 mt-1">{item.nim}</div>
                      <div className="text-xs text-slate-500 mt-1 leading-snug break-words">Judul: <span className="italic">{item.title}</span></div>
                    </td>
                    <td className="px-3 py-4 text-slate-700 font-medium whitespace-nowrap">
                      {item.kelas ? `Kelas ${item.kelas.replace('Kelas ', '')}` : '-'}
                    </td>
                    <td className="px-3 py-4 text-slate-700 font-medium text-sm">
                      <div className="flex flex-col gap-1">
                        <span>1. {item.dospem}</span>
                        {item.dospem2 && <span>2. {item.dospem2}</span>}
                      </div>
                    </td>
                    <td className="px-3 py-4">
                      <div className="text-sm font-medium text-slate-800 whitespace-nowrap">{item.date}</div>
                      <div className="text-xs text-slate-600 mt-0.5 whitespace-nowrap"><Clock size={12} className="inline mr-1 text-slate-400" />{item.time}</div>
                      <div className="text-xs text-slate-500 mt-0.5"><MapPin size={12} className="inline mr-1 text-amber-500" />{item.room}</div>
                    </td>
                    <td className="px-3 py-4 text-slate-700 font-medium">
                      {item.moderator ? item.moderator : <span className="italic text-slate-500">Menunggu Dosen</span>}
                    </td>
                    <td className="px-3 py-4 text-slate-700 font-medium">
                      {item.pembahas ? item.pembahas.split(',').map((pStr: string, idx: number) => (
                        <span key={idx} className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md text-xs font-medium leading-snug block mb-1 last:mb-0">
                          {pStr}
                        </span>
                      )) : <span className="italic text-slate-500">Belum ada</span>}
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap">
                      {item.isReleased ? (
                        isFinished ? (
                          <span className="bg-indigo-100 text-indigo-700 text-[11px] font-bold px-2.5 py-1 rounded-md uppercase tracking-wider">
                            Selesai
                          </span>
                        ) : (
                          <span className="bg-green-100 text-green-700 text-[11px] font-bold px-2.5 py-1 rounded-md uppercase tracking-wider">
                            Dirilis
                          </span>
                        )
                      ) : (
                        <span className="bg-slate-100 text-slate-600 text-[11px] font-bold px-2.5 py-1 rounded-md uppercase tracking-wider">
                          Draft
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-4 text-center whitespace-nowrap">
                      <button
                        onClick={() => handleBatalRilis(item.id)}
                        className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 px-3 py-1.5 rounded-lg text-xs font-semibold shadow-sm transition-colors"
                      >
                        Batal Rilis
                      </button>
                    </td>
                  </tr>
                );
              })}
              {displayFinalized.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-slate-500">
                    Tidak ada jadwal yang sesuai dengan filter.
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
