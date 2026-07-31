"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { ArrowLeft, Calendar, MapPin, Clock, User, Users, Search, Filter, X } from "lucide-react";

type ScheduleData = {
  id: number;
  name: string | null;
  nim: string | null;
  prodi: string | null;
  dospem: string | null;
  title: string | null;
  room: string | null;
  moderator: string | null;
  pembahas: string | null;
  kelas: string | null;
  date: string;
  time: string;
  sortValue: number;
  isPast: boolean;
  angkatan: string | null;
  jenisSeminar: string | null;
};

interface JadwalClientProps {
  schedules: ScheduleData[];
}

export default function JadwalClient({ schedules }: JadwalClientProps) {
  const [selectedAngkatan, setSelectedAngkatan] = useState<string | null>(null);
  const [selectedJenisSeminar, setSelectedJenisSeminar] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState("time_asc");

  // Filter states
  const [filterTanggal, setFilterTanggal] = useState("");
  const [filterNama, setFilterNama] = useState("");
  const [filterNim, setFilterNim] = useState("");
  const [filterKelas, setFilterKelas] = useState("");
  const [filterPembimbing, setFilterPembimbing] = useState("");
  const [filterModerator, setFilterModerator] = useState("");
  const [filterPembahas, setFilterPembahas] = useState("");

  // Unique values for dropdowns
  const uniqueDates = useMemo(() => Array.from(new Set(schedules.map(s => s.date).filter(Boolean))) as string[], [schedules]);
  const uniqueKelas = useMemo(() => Array.from(new Set(schedules.map(s => s.kelas).filter(Boolean))) as string[], [schedules]);
  const uniquePembimbing = useMemo(() => Array.from(new Set(schedules.map(s => s.dospem).filter(Boolean))) as string[], [schedules]);
  const uniqueModerator = useMemo(() => Array.from(new Set(schedules.map(s => s.moderator).filter(Boolean))) as string[], [schedules]);
  
  const uniqueAngkatan = useMemo(() => Array.from(new Set(schedules.map(s => s.angkatan).filter(Boolean))) as string[], [schedules]);

  const filteredSchedules = useMemo(() => {
    return schedules.filter((s) => {
      if (selectedAngkatan && s.angkatan !== selectedAngkatan) return false;
      if (selectedJenisSeminar && s.jenisSeminar !== selectedJenisSeminar) return false;

      const matchTanggal = filterTanggal ? s.date === filterTanggal : true;
      const matchNama = filterNama ? (s.name || "").toLowerCase().includes(filterNama.toLowerCase()) : true;
      const matchNim = filterNim ? (s.nim || "").toLowerCase().includes(filterNim.toLowerCase()) : true;
      const matchKelas = filterKelas ? s.kelas === filterKelas : true;
      const matchPembimbing = filterPembimbing ? (s.dospem || "").toLowerCase().includes(filterPembimbing.toLowerCase()) : true;
      const matchModerator = filterModerator ? (s.moderator || "").toLowerCase().includes(filterModerator.toLowerCase()) : true;
      const matchPembahas = filterPembahas ? (s.pembahas || "").toLowerCase().includes(filterPembahas.toLowerCase()) : true;

      return matchTanggal && matchNama && matchNim && matchKelas && matchPembimbing && matchModerator && matchPembahas;
    });
  }, [schedules, filterTanggal, filterNama, filterNim, filterKelas, filterPembimbing, filterModerator, filterPembahas, selectedAngkatan, selectedJenisSeminar]);

  const sortedSchedules = useMemo(() => {
    return [...filteredSchedules].sort((a, b) => {
      // 1. Past schedules always go to bottom
      if (a.isPast && !b.isPast) return 1;
      if (!a.isPast && b.isPast) return -1;
      
      // 2. Sort according to selection
      if (sortBy === "time_asc") return a.sortValue - b.sortValue;
      if (sortBy === "time_desc") return b.sortValue - a.sortValue;
      if (sortBy === "name_asc") return (a.name || "").localeCompare(b.name || "");
      if (sortBy === "name_desc") return (b.name || "").localeCompare(a.name || "");
      return 0;
    });
  }, [filteredSchedules, sortBy]);

  const resetFilters = () => {
    setFilterTanggal("");
    setFilterNama("");
    setFilterNim("");
    setFilterKelas("");
    setFilterPembimbing("");
    setFilterModerator("");
    setFilterPembahas("");
  };

  const hasActiveFilters = filterTanggal || filterNama || filterNim || filterKelas || filterPembimbing || filterModerator || filterPembahas;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans flex flex-col">
      {/* Navigation */}
      <nav className="w-full z-50 bg-[#06125C] text-white shadow-md sticky top-0">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-3 hover:opacity-90 transition-opacity">
              <div className="h-12 bg-white rounded-lg p-1 shadow-inner flex items-center justify-center">
                <img
                  src="/logo.png"
                  alt="Logo SV IPB"
                  className="h-full w-auto object-contain"
                  onError={(e) => { e.currentTarget.style.display = 'none' }}
                />
              </div>
              <span className="font-semibold text-xl tracking-tight hidden sm:block">Seminar Hub AKN SV IPB</span>
            </Link>
          </div>
          <Link href="/" className="flex items-center gap-2 text-blue-200 hover:text-white transition-colors bg-white/10 px-4 py-2 rounded-full text-sm font-medium">
            <ArrowLeft size={16} />
            <span>Kembali</span>
          </Link>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-grow max-w-7xl w-full mx-auto px-6 py-8">
        {!selectedAngkatan ? (
          <div className="flex flex-col items-center justify-center py-12 animate-in fade-in zoom-in-95 duration-300">
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-3 text-[#06125C]">Pilih Angkatan</h1>
            <p className="text-slate-500 mb-8 max-w-lg text-center">
              Silakan pilih angkatan untuk melihat jadwal seminar.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 w-full max-w-4xl">
              {uniqueAngkatan.map((angkatan) => (
                <button
                  key={angkatan}
                  onClick={() => setSelectedAngkatan(angkatan)}
                  className="bg-white border border-slate-200 hover:border-[#06125C]/30 hover:shadow-md p-6 rounded-2xl flex flex-col items-center justify-center gap-3 transition-all text-slate-700 hover:text-[#06125C]"
                >
                  <Users className="text-amber-500" size={32} />
                  <span className="font-bold text-lg">{angkatan}</span>
                </button>
              ))}
              {uniqueAngkatan.length === 0 && (
                <div className="col-span-full text-center text-slate-500 py-8 bg-white rounded-2xl border border-slate-200">
                  Belum ada jadwal yang dirilis.
                </div>
              )}
            </div>
          </div>
        ) : !selectedJenisSeminar ? (
          <div className="flex flex-col items-center justify-center py-12 animate-in fade-in zoom-in-95 duration-300">
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-3 text-[#06125C]">Pilih Jenis Seminar</h1>
            <p className="text-slate-500 mb-8 max-w-lg text-center">
              Silakan pilih jenis seminar untuk {selectedAngkatan}.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-3xl">
              <button
                onClick={() => setSelectedJenisSeminar("kolokium")}
                className="bg-white border border-slate-200 hover:border-[#06125C]/30 hover:shadow-md p-8 rounded-2xl flex flex-col items-center justify-center gap-4 transition-all text-slate-700 hover:text-[#06125C]"
              >
                <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center text-blue-600 mb-2">
                  <User size={32} />
                </div>
                <span className="font-bold text-xl">Seminar Kolokium</span>
              </button>
              <button
                onClick={() => setSelectedJenisSeminar("hasil_penelitian")}
                className="bg-white border border-slate-200 hover:border-[#06125C]/30 hover:shadow-md p-8 rounded-2xl flex flex-col items-center justify-center gap-4 transition-all text-slate-700 hover:text-[#06125C]"
              >
                <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center text-amber-500 mb-2">
                  <Users size={32} />
                </div>
                <span className="font-bold text-xl">Seminar Hasil Penelitian</span>
              </button>
            </div>
            <button 
              onClick={() => setSelectedAngkatan(null)}
              className="mt-8 text-slate-500 hover:text-slate-800 flex items-center gap-2 font-medium transition-colors"
            >
              <ArrowLeft size={16} /> Kembali pilih angkatan
            </button>
          </div>
        ) : (
          <div className="animate-in fade-in duration-300">
            <div className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div>
                <button 
                  onClick={() => setSelectedJenisSeminar(null)}
                  className="text-[#06125C] hover:underline flex items-center gap-1 text-sm font-semibold mb-3 transition-colors"
                >
                  <ArrowLeft size={14} /> Kembali pilih jenis seminar
                </button>
                <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-3 text-[#06125C] flex items-center gap-3">
                  <Calendar className="text-amber-500" size={36} />
                  {selectedJenisSeminar === "kolokium" ? "Jadwal Seminar Kolokium" : "Jadwal Seminar Hasil"}
                </h1>
                <p className="text-slate-600 text-base max-w-2xl">
                  Daftar jadwal {selectedJenisSeminar === "kolokium" ? "seminar kolokium" : "seminar hasil penelitian"} untuk {selectedAngkatan} yang telah disetujui dan dirilis.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <select 
                  value={sortBy} 
                  onChange={(e) => setSortBy(e.target.value)}
                  className="bg-white border border-slate-200 text-slate-700 text-sm font-semibold rounded-xl px-3 py-2.5 outline-none focus:border-[#06125C] focus:ring-1 focus:ring-[#06125C]/20 shadow-sm"
                >
                  <option value="time_asc">Waktu (Terdekat)</option>
                  <option value="time_desc">Waktu (Terjauh)</option>
                  <option value="name_asc">Nama (A-Z)</option>
                  <option value="name_desc">Nama (Z-A)</option>
                </select>
                <button 
                  onClick={() => setShowFilters(!showFilters)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-colors ${showFilters ? 'bg-[#06125C] text-white' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 shadow-sm'}`}
                >
                  <Filter size={18} />
                  {showFilters ? 'Sembunyikan Filter' : 'Tampilkan Filter'}
                  {hasActiveFilters && !showFilters && (
                    <span className="flex h-2.5 w-2.5 relative ml-1">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
                    </span>
                  )}
                </button>
              </div>
            </div>

        {/* Filter Section */}
        {showFilters && (
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 mb-6 animate-in slide-in-from-top-4 fade-in duration-300">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <Search size={16} className="text-[#06125C]"/> Filter Pencarian
              </h3>
              {hasActiveFilters && (
                <button 
                  onClick={resetFilters}
                  className="text-xs font-semibold text-red-500 hover:text-red-700 hover:bg-red-50 px-2 py-1 rounded transition-colors flex items-center gap-1"
                >
                  <X size={12} /> Reset Semua
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {/* Tanggal */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">Tanggal</label>
                <select 
                  value={filterTanggal} 
                  onChange={(e) => setFilterTanggal(e.target.value)}
                  className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-[#06125C] focus:ring-1 focus:ring-[#06125C]/20"
                >
                  <option value="">Semua Tanggal</option>
                  {uniqueDates.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              
              {/* Kelas */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">Kelas</label>
                <select 
                  value={filterKelas} 
                  onChange={(e) => setFilterKelas(e.target.value)}
                  className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-[#06125C] focus:ring-1 focus:ring-[#06125C]/20"
                >
                  <option value="">Semua Kelas</option>
                  {uniqueKelas.map(k => <option key={k} value={k}>{k}</option>)}
                </select>
              </div>

              {/* Nama Mahasiswa */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">Nama Mahasiswa</label>
                <input 
                  type="text" 
                  placeholder="Cari nama..." 
                  value={filterNama} 
                  onChange={(e) => setFilterNama(e.target.value)}
                  className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-[#06125C] focus:ring-1 focus:ring-[#06125C]/20"
                />
              </div>

              {/* NIM */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">NIM</label>
                <input 
                  type="text" 
                  placeholder="Cari NIM..." 
                  value={filterNim} 
                  onChange={(e) => setFilterNim(e.target.value)}
                  className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-[#06125C] focus:ring-1 focus:ring-[#06125C]/20"
                />
              </div>

              {/* Pembimbing */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">Dosen Pembimbing</label>
                <input 
                  type="text" 
                  placeholder="Cari pembimbing..." 
                  value={filterPembimbing} 
                  onChange={(e) => setFilterPembimbing(e.target.value)}
                  className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-[#06125C] focus:ring-1 focus:ring-[#06125C]/20"
                />
              </div>

              {/* Moderator */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">Dosen Moderator</label>
                <input 
                  type="text" 
                  placeholder="Cari moderator..." 
                  value={filterModerator} 
                  onChange={(e) => setFilterModerator(e.target.value)}
                  className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-[#06125C] focus:ring-1 focus:ring-[#06125C]/20"
                />
              </div>

              {/* Pembahas */}
              <div className="sm:col-span-2 md:col-span-1 lg:col-span-2">
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">Mahasiswa Pembahas</label>
                <input 
                  type="text" 
                  placeholder="Cari nama atau NIM pembahas..." 
                  value={filterPembahas} 
                  onChange={(e) => setFilterPembahas(e.target.value)}
                  className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-[#06125C] focus:ring-1 focus:ring-[#06125C]/20"
                />
              </div>
            </div>
          </div>
        )}

        {sortedSchedules.length === 0 ? (
          <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-16 text-center flex flex-col items-center justify-center animate-in fade-in">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 mb-6 border border-slate-100">
              <Search size={32} />
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">Jadwal Tidak Ditemukan</h3>
            <p className="text-slate-500 max-w-md mx-auto text-sm">
              {schedules.length === 0 
                ? "Saat ini belum ada jadwal seminar yang dirilis oleh admin."
                : "Tidak ada jadwal yang sesuai dengan filter pencarian Anda. Coba ubah atau reset filter."}
            </p>
            {hasActiveFilters && (
              <button 
                onClick={resetFilters}
                className="mt-6 text-[#06125C] font-semibold bg-blue-50 px-5 py-2.5 rounded-xl hover:bg-blue-100 transition-colors text-sm"
              >
                Reset Filter Pencarian
              </button>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm overflow-hidden animate-in fade-in">
            <div className="flex justify-between items-center mb-4">
              <p className="text-sm font-semibold text-slate-500">
                Menampilkan <span className="text-[#06125C]">{sortedSchedules.length}</span> jadwal
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                  <tr>
                    <th className="px-4 py-3 w-[16%]">Mahasiswa</th>
                    <th className="px-4 py-3 w-[8%] whitespace-nowrap">Kelas</th>
                    <th className="px-4 py-3 w-[22%] whitespace-nowrap">Jadwal & Ruangan</th>
                    <th className="px-4 py-3 w-[18%]">Judul Penelitian</th>
                    <th className="px-4 py-3 w-[12%] whitespace-nowrap">Dosen Pembimbing</th>
                    <th className="px-4 py-3 w-[12%] whitespace-nowrap">Dosen Moderator</th>
                    <th className="px-4 py-3 w-[12%]">Pembahas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sortedSchedules.map((schedule, idx) => (
                    <tr key={schedule.id || idx} className={`transition-colors ${schedule.isPast ? 'bg-slate-50/70 opacity-70 grayscale-[20%]' : 'hover:bg-slate-50'}`}>
                      <td className="px-4 py-4">
                        <div className="font-semibold text-slate-800 flex flex-wrap items-center gap-2">
                          {schedule.name}
                          {schedule.isPast && <span className="bg-indigo-100 text-indigo-700 text-[10px] px-2 py-0.5 rounded uppercase tracking-wider font-bold shadow-sm">Selesai</span>}
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">{schedule.nim}</div>
                        {schedule.prodi && (
                          <div className="text-xs text-slate-400 mt-1">{schedule.prodi}</div>
                        )}
                      </td>
                      <td className="px-4 py-4 text-slate-700 font-medium whitespace-nowrap">
                        {schedule.kelas ? `Kelas ${schedule.kelas.replace('Kelas ', '')}` : '-'}
                      </td>
                      <td className="px-4 py-4 text-slate-600 whitespace-nowrap">
                        <div className="flex items-center gap-1.5"><Calendar size={14} /> {schedule.date} • {schedule.time}</div>
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1">
                          <MapPin size={12} /> {schedule.room || <span className="italic text-slate-400">Belum diisi</span>}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="font-medium text-slate-800 line-clamp-3" title={schedule.title || ""}>
                          {schedule.title || "-"}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-slate-700 font-medium text-sm">
                        {schedule.dospem || "-"}
                      </td>
                      <td className="px-4 py-4 text-slate-700 font-medium text-sm">
                        {schedule.moderator || "-"}
                      </td>
                      <td className="px-4 py-4 text-slate-700 font-medium text-sm">
                        {schedule.pembahas ? (
                          <div className="flex flex-col gap-1.5">
                            {schedule.pembahas.split(',').map((pStr: string, pIdx: number) => (
                              <div key={pIdx} className="flex items-center gap-1.5">
                                <Users size={14} className="text-[#06125C] shrink-0" />
                                <span className="line-clamp-2" title={pStr.trim()}>{pStr.trim()}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="italic text-slate-400 flex items-center gap-1.5">
                            <Clock size={14} /> Belum diatur
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-slate-100 border-t border-slate-200 py-8 mt-auto">
        <div className="max-w-7xl mx-auto px-6 flex justify-center items-center">
          <p className="text-slate-600 text-sm text-center">
            © {new Date().getFullYear()} Seminar Hub AKN SV IPB University. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
