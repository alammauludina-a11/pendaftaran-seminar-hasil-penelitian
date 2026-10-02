"use client";

import { Search, UserCheck } from "lucide-react";
import { useAdmin } from "../AdminContext";

export default function TabRekapitulasi() {
  const {
    rekapSort, rekapSearch, setRekapSearch, activePeriode, rekapitulasiData, handleSortRekap,
    handleExportRekapExcel, handleExportRekapPDF,
  } = useAdmin();
  if (!activePeriode) return null;

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

        {/* Search Bar for Rekapitulasi */}
        <div className="flex items-center gap-3 bg-slate-50 px-4 py-2.5 rounded-xl border border-slate-200 focus-within:ring-2 focus-within:ring-[#06125C]/20 transition-all mb-6 w-full sm:max-w-md">
          <Search size={18} className="text-slate-400" />
          <input
            type="text"
            placeholder="Cari nama dosen..."
            value={rekapSearch}
            onChange={(e) => setRekapSearch(e.target.value)}
            className="bg-transparent text-sm outline-none w-full text-slate-700"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap border-collapse">
            <thead className="bg-slate-50 border-y border-slate-200 text-slate-600 font-semibold select-none">
              <tr>
                <th className="px-6 py-4 w-16 text-center">No</th>
                <th className="px-6 py-4 w-1/2 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSortRekap('name')}>
                  Nama Dosen {rekapSort.key === 'name' ? (rekapSort.order === 'asc' ? '↑' : '↓') : ''}
                </th>
                <th className="px-6 py-4 text-center w-1/4 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSortRekap('moderatorCount')}>
                  Sebagai Moderator {rekapSort.key === 'moderatorCount' ? (rekapSort.order === 'asc' ? '↑' : '↓') : ''}
                </th>
                <th className="px-6 py-4 text-center w-1/4 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSortRekap('pembimbingCount')}>
                  Sebagai Pembimbing {rekapSort.key === 'pembimbingCount' ? (rekapSort.order === 'asc' ? '↑' : '↓') : ''}
                </th>
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
