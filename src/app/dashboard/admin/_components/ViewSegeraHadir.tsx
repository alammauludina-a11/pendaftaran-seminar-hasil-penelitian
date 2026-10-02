"use client";

import { Megaphone, ArrowLeft } from "lucide-react";
import { useAdmin } from "../AdminContext";

export default function ViewSegeraHadir() {
  const { setCurrentView, setSelectedSeminarType } = useAdmin();

  return (
    <div className="animate-in fade-in duration-500 min-h-[60vh] flex flex-col items-center justify-center text-center">
      <div className="w-24 h-24 bg-indigo-50 text-indigo-500 rounded-full flex items-center justify-center mb-6 shadow-sm">
        <Megaphone size={48} />
      </div>
      <h1 className="text-3xl font-extrabold text-[#06125C] mb-3">Modul Seminar Kolokium</h1>
      <p className="text-slate-500 text-lg max-w-lg mb-8">
        Fitur pengelolaan Seminar Kolokium saat ini sedang dalam tahap pengembangan dan belum dapat digunakan.
      </p>
      <button
        onClick={() => {
          setSelectedSeminarType(null);
          setCurrentView("visual_awal");
        }}
        className="bg-[#06125C] hover:bg-[#06125C]/90 text-white px-6 py-3 rounded-xl font-bold shadow-md transition-colors flex items-center gap-2"
      >
        <ArrowLeft size={18} /> Kembali ke Menu Utama
      </button>
    </div>
  );
}
