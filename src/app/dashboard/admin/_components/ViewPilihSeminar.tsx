"use client";

import { FileCheck, Megaphone } from "lucide-react";
import { useAdmin } from "../AdminContext";

export default function ViewPilihSeminar() {
  const { fetchData, setCurrentView, setSelectedSeminarType } = useAdmin();

  return (
    <div className="animate-in fade-in duration-500 min-h-[60vh] flex flex-col items-center justify-center">
      <div className="text-center mb-10">
        <h1 className="text-4xl font-extrabold text-[#06125C] mb-4">Pilih Kategori Seminar</h1>
        <p className="text-slate-500 text-lg">Silakan pilih jenis seminar yang ingin Anda kelola untuk melanjutkan.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl">
        <button 
          onClick={() => {
            setSelectedSeminarType("kolokium");
            fetchData();
            setCurrentView("landing");
          }}
          className="group relative bg-white rounded-3xl p-10 border-2 border-transparent hover:border-indigo-500 shadow-lg hover:shadow-xl hover:shadow-indigo-500/20 transition-all duration-300 text-left overflow-hidden flex flex-col items-center text-center"
        >
          <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity transform group-hover:scale-110">
            <Megaphone size={120} />
          </div>
          <div className="w-20 h-20 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
            <Megaphone size={40} />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-3 group-hover:text-indigo-600 transition-colors">Seminar Kolokium</h2>
          <p className="text-slate-500">Kelola pendaftaran, plotting jadwal, dan verifikasi berkas untuk Seminar Kolokium mahasiswa.</p>
        </button>

        <button 
          onClick={() => {
            setSelectedSeminarType("hasil_penelitian");
            fetchData();
            setCurrentView("landing");
          }}
          className="group relative bg-white rounded-3xl p-10 border-2 border-transparent hover:border-[#06125C] shadow-lg hover:shadow-xl hover:shadow-[#06125C]/20 transition-all duration-300 text-left overflow-hidden flex flex-col items-center text-center"
        >
          <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity transform group-hover:scale-110">
            <FileCheck size={120} />
          </div>
          <div className="w-20 h-20 rounded-2xl bg-blue-50 text-[#06125C] flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
            <FileCheck size={40} />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-3 group-hover:text-[#06125C] transition-colors">Seminar Hasil Penelitian</h2>
          <p className="text-slate-500">Kelola pendaftaran, plotting jadwal, dan verifikasi berkas untuk Seminar Hasil Penelitian mahasiswa.</p>
        </button>
      </div>
    </div>
  );
}
