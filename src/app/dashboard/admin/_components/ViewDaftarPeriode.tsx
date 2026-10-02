"use client";

import { FileCheck, Clock, Users, Calendar, Settings, ArrowLeft, Plus } from "lucide-react";
import { useAdmin } from "../AdminContext";

export default function ViewDaftarPeriode() {
  const {
    periodes, pendaftaran, setCurrentView, selectedSeminarType, setSelectedSeminarType, setActivePeriodeId,
    setActiveTab, handleCreateNewPeriode,
  } = useAdmin();

  return (
    <div className="animate-in fade-in duration-500 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => { setSelectedSeminarType(null); setCurrentView("visual_awal"); }}
            className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600 transition-colors shrink-0"
            title="Kembali ke Pilihan Seminar"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-extrabold text-[#06125C]">
              Daftar Periode {selectedSeminarType === "kolokium" ? "Seminar Kolokium" : selectedSeminarType === "hasil_penelitian" ? "Seminar Hasil Penelitian" : "Seminar"}
            </h1>
            <p className="text-sm text-slate-500 mt-1">Pilih periode untuk mengelola pendaftaran, atau buat periode baru.</p>
          </div>
        </div>
        <button
          onClick={handleCreateNewPeriode}
          className="bg-[#06125C] hover:bg-[#06125C]/90 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-md transition-colors flex items-center gap-2"
        >
          <Plus size={18} /> Buat Periode {selectedSeminarType === "kolokium" ? "Kolokium" : "Hasil Penelitian"}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {periodes.filter(p => !p.isDraft && p.jenisSeminar === selectedSeminarType).map(p => {
          const pendaftarCount = pendaftaran.filter(pend => pend.periodeId === p.id).length;
          return (
            <div key={p.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col">
              <div className="p-6 flex-grow">
                <div className="flex justify-between items-start mb-4">
                  <div className="w-12 h-12 rounded-xl bg-blue-50 text-[#06125C] flex items-center justify-center">
                    <Calendar size={24} />
                  </div>
                  {p.isOpen ? (
                    <span className="bg-emerald-100 text-emerald-700 text-[10px] font-bold px-2.5 py-1 rounded-md uppercase tracking-wider">Dibuka</span>
                  ) : (
                    <span className="bg-red-100 text-red-700 text-[10px] font-bold px-2.5 py-1 rounded-md uppercase tracking-wider">Ditutup</span>
                  )}
                </div>
                <h3 className="text-lg font-extrabold text-slate-800 mb-1">Angkatan {p.angkatan}</h3>
                <p className="text-sm text-slate-500 mb-4 flex items-center gap-1.5">
                  <Clock size={14} /> {p.startDate || "-"} s/d {p.endDate || "-"}
                </p>

                <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <Users size={18} className="text-slate-400" />
                  <div>
                    <p className="text-xs text-slate-500 font-medium">Total Pendaftar</p>
                    <p className="text-sm font-bold text-slate-700">{pendaftarCount} Mahasiswa</p>
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-100 p-4 bg-slate-50/50 flex gap-3">
                <button
                  onClick={() => { setActivePeriodeId(p.id); setCurrentView("pengaturan"); }}
                  className="flex-1 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 px-3 py-2 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-2"
                >
                  <Settings size={14} /> Pengaturan
                </button>
                <button
                  onClick={() => { setActivePeriodeId(p.id); setActiveTab("verifikasi"); setCurrentView("manajemen"); }}
                  className="flex-1 bg-[#06125C] hover:bg-[#06125C]/90 text-white px-3 py-2 rounded-lg text-xs font-semibold shadow-sm transition-colors flex items-center justify-center gap-2"
                >
                  <FileCheck size={14} /> Kelola Pendaftaran
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  );
}
