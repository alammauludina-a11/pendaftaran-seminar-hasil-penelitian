"use client";

import { FileCheck, Megaphone, CheckCircle2, XCircle, Clock, CheckSquare, Search, Filter, Users, Calendar, ArrowLeft, UserCheck, Ban, Eye, UserX } from "lucide-react";
import TabKelas from "./TabKelas";
import TabVerifikasi from "./TabVerifikasi";
import TabFinalisasi from "./TabFinalisasi";
import TabPembahas from "./TabPembahas";
import TabPengumuman from "./TabPengumuman";
import TabRekapitulasi from "./TabRekapitulasi";
import TabPemantauan from "./TabPemantauan";
import { useAdmin } from "../AdminContext";

export default function ViewManajemen() {
  const {
    setCurrentView, setActivePeriodeId, activeTab, setActiveTab, globalSearch, setGlobalSearch,
    globalKelasFilter, setGlobalKelasFilter, activePeriode, uniqueKelas, filteredPendaftaran, finalizedList,
    ringkasanPemantauan, setPemantauanFilter,
  } = useAdmin();
  if (!activePeriode) return null;
  const namaSeminar = activePeriode.jenisSeminar === "kolokium" ? "Seminar Kolokium" : "Seminar Hasil";
  // A rejected registration does not count as registered
  const jumlahDitolak = filteredPendaftaran.filter(p => p.status === "ditolak").length;

  return (
        <div className="animate-in fade-in duration-500 flex flex-col gap-8">
          <div className="flex items-center gap-4 mb-2">
            <button
              onClick={() => { setCurrentView("landing"); setActivePeriodeId(null); }}
              className="w-10 h-10 bg-white border border-slate-200 text-slate-600 rounded-xl flex items-center justify-center hover:bg-slate-50 transition-colors"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-2xl font-extrabold text-[#06125C]">
                Kelola Pendaftaran Mahasiswa
                <span className="ml-2 text-sm font-semibold text-white bg-[#06125C] border border-[#06125C]/30 px-2.5 py-1 rounded-lg">
                  {activePeriode.jenisSeminar === "kolokium" ? "Seminar Kolokium" : "Seminar Hasil Penelitian"}
                </span>
              </h1>
              <p className="text-sm text-slate-500">Angkatan {activePeriode.angkatan}</p>
            </div>
          </div>

          {/* Active Period Context Header */}
          <div className="bg-[#06125C] rounded-2xl p-6 md:px-8 md:py-7 shadow-md text-white flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
            <div className="absolute -right-20 -top-20 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none"></div>

            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-2 text-blue-200">
                <Calendar size={16} />
                <span className="text-xs font-bold uppercase tracking-wider">Konteks Periode Saat Ini</span>
              </div>
              <h1 className="text-2xl md:text-3xl font-extrabold text-white mb-2">
                Seminar Angkatan {activePeriode.angkatan}
              </h1>
              <p className="text-blue-100 text-sm max-w-2xl leading-relaxed">
                Semua aksi verifikasi, finalisasi, dan pengumuman di bawah ini diatur secara eksklusif untuk periode pelaksanaan <strong className="text-white bg-white/10 px-1.5 py-0.5 rounded mx-0.5">{activePeriode.startDate || '-'}</strong> s/d <strong className="text-white bg-white/10 px-1.5 py-0.5 rounded mx-0.5">{activePeriode.endDate || '-'}</strong>.
              </p>
            </div>

            <div className="relative z-10 shrink-0 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl px-5 py-4 text-center min-w-[160px]">
              <p className="text-xs text-blue-200 font-semibold mb-2 uppercase tracking-wide">Pendaftaran Mahasiswa</p>
              {activePeriode.isOpen ? (
                <span className="inline-flex items-center justify-center gap-1.5 bg-emerald-500/20 text-emerald-300 font-bold px-4 py-1.5 rounded-lg text-sm border border-emerald-500/30 w-full">
                  <CheckCircle2 size={16} /> Dibuka
                </span>
              ) : (
                <span className="inline-flex items-center justify-center gap-1.5 bg-red-500/20 text-red-300 font-bold px-4 py-1.5 rounded-lg text-sm border border-red-500/30 w-full">
                  <XCircle size={16} /> Ditutup
                </span>
              )}
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center text-[#06125C]">
                <Users size={24} />
              </div>
              <div>
                <p className="text-sm text-slate-500 font-medium">Total Pendaftar</p>
                <p className="text-2xl font-bold text-[#06125C]">{filteredPendaftaran.length - jumlahDitolak}</p>
                {jumlahDitolak > 0 && <p className="text-xs text-slate-400">tidak termasuk {jumlahDitolak} ditolak</p>}
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600">
                <Clock size={24} />
              </div>
              <div>
                <p className="text-sm text-slate-500 font-medium">Menunggu Verifikasi</p>
                <p className="text-2xl font-bold text-slate-800">
                  {filteredPendaftaran.filter(p => p.status === 'menunggu').length}
                </p>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600">
                <CheckSquare size={24} />
              </div>
              <div>
                <p className="text-sm text-slate-500 font-medium">Siap Finalisasi</p>
                <p className="text-2xl font-bold text-slate-800">
                  {filteredPendaftaran.filter(p => p.status === 'disetujui' && p.room && !p.isFinalized).length}
                </p>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-600">
                <Megaphone size={24} />
              </div>
              <div>
                <p className="text-sm text-slate-500 font-medium">Jadwal Dirilis</p>
                <p className="text-2xl font-bold text-slate-800">
                  {filteredPendaftaran.filter(p => p.isReleased).length}
                  <span className="text-sm font-normal text-slate-500 ml-1">dari {finalizedList.length}</span>
                </p>
              </div>
            </div>

            <button
              onClick={() => { setPemantauanFilter("belum"); setActiveTab("pemantauan"); }}
              className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4 text-left hover:border-amber-300 hover:shadow-md transition-all group"
              title={`Lihat mahasiswa yang belum mendaftar ${namaSeminar}`}
            >
              <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600 shrink-0">
                <UserX size={24} />
              </div>
              <div>
                <p className="text-sm text-slate-500 font-medium group-hover:text-amber-700 transition-colors">Belum Daftar</p>
                <p className="text-2xl font-bold text-slate-800">
                  {ringkasanPemantauan.belum}
                  <span className="text-sm font-normal text-slate-500 ml-1">dari {ringkasanPemantauan.total}</span>
                </p>
              </div>
            </button>
          </div>

          {/* Global Filters (Pemantauan has its own search and filters) */}
          {activeTab !== "pemantauan" && (
          <div className="flex flex-col sm:flex-row gap-4 bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
            <div className="flex-1 flex items-center gap-3 bg-slate-50 px-4 py-2.5 rounded-xl border border-slate-200 focus-within:ring-2 focus-within:ring-[#06125C]/20 transition-all">
              <Search size={18} className="text-slate-400" />
              <input
                type="text"
                placeholder="Cari nama/NIM mahasiswa atau nama dosen..."
                value={globalSearch}
                onChange={(e) => setGlobalSearch(e.target.value)}
                className="bg-transparent text-sm outline-none w-full text-slate-700"
              />
            </div>
            <div className="flex items-center gap-3">
              <Filter size={18} className="text-slate-400" />
              <select
                value={globalKelasFilter}
                onChange={(e) => setGlobalKelasFilter(e.target.value)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-[#06125C]/20 outline-none text-sm font-medium min-w-[150px]"
              >
                <option value="Semua Kelas">Semua Kelas</option>
                {uniqueKelas.map(k => (
                  <option key={k} value={k}>Kelas {k.replace('Kelas ', '')}</option>
                ))}
              </select>
            </div>
          </div>
          )}

          {/* Tab Navigation (Only 3 tabs now) */}
          <div className="flex flex-nowrap overflow-x-auto gap-2 bg-white p-2 rounded-2xl shadow-sm border border-slate-200 hide-scrollbar scroll-smooth">
            <button
              onClick={() => setActiveTab("verifikasi")}
              className={`flex-none md:flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-medium transition-all ${activeTab === "verifikasi"
                ? "bg-[#06125C] text-white shadow-md"
                : "text-slate-600 hover:bg-slate-100 hover:text-[#06125C]"
                }`}
            >
              <FileCheck size={18} />
              Verifikasi Pendaftaran
              {filteredPendaftaran.filter(p => p.status === 'menunggu').length > 0 && (
                <span className="ml-1 bg-amber-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">
                  {filteredPendaftaran.filter(p => p.status === 'menunggu').length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab("pembahas")}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-medium transition-all ${activeTab === "pembahas"
                ? "bg-[#06125C] text-white shadow-md"
                : "text-slate-600 hover:bg-slate-100 hover:text-[#06125C]"
                }`}
            >
              <Users size={18} />
              Kelola Pembahas
            </button>
            <button
              onClick={() => setActiveTab("finalisasi")}
              className={`flex-none md:flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-medium transition-all ${activeTab === "finalisasi"
                ? "bg-[#06125C] text-white shadow-md"
                : "text-slate-600 hover:bg-slate-100 hover:text-[#06125C]"
                }`}
            >
              <CheckSquare size={18} />
              Finalisasi Pendaftaran
              {filteredPendaftaran.filter(p => p.status === 'disetujui' && p.room && !p.isFinalized).length > 0 && (
                <span className="ml-1 bg-amber-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">
                  {filteredPendaftaran.filter(p => p.status === 'disetujui' && p.room && !p.isFinalized).length}
                </span>
              )}
              {filteredPendaftaran.filter(p => (p as any).moderatorBatalStatus === 'menunggu').length > 0 && (
                <span className="ml-0.5 bg-orange-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold flex items-center gap-0.5">
                  <Ban size={8}/> {filteredPendaftaran.filter(p => (p as any).moderatorBatalStatus === 'menunggu').length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab("pengumuman")}
              className={`flex-none md:flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-medium transition-all ${activeTab === "pengumuman"
                ? "bg-[#06125C] text-white shadow-md"
                : "text-slate-600 hover:bg-slate-100 hover:text-[#06125C]"
                }`}
            >
              <Megaphone size={18} />
              Pengumuman Jadwal
            </button>
            <button
              onClick={() => setActiveTab("kelas")}
              className={`flex-none md:flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-medium transition-all ${activeTab === "kelas"
                ? "bg-[#06125C] text-white shadow-md"
                : "text-slate-600 hover:bg-slate-100 hover:text-[#06125C]"
                }`}
            >
              <Users size={18} />
              Manajemen Kelas
            </button>
            <button
              onClick={() => setActiveTab("rekapitulasi")}
              className={`flex-none md:flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-medium transition-all ${activeTab === "rekapitulasi"
                ? "bg-[#06125C] text-white shadow-md"
                : "text-slate-600 hover:bg-slate-100 hover:text-[#06125C]"
                }`}
            >
              <UserCheck size={18} />
              Rekapitulasi Dosen
            </button>
            <button
              onClick={() => setActiveTab("pemantauan")}
              className={`flex-none md:flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-medium transition-all ${activeTab === "pemantauan"
                ? "bg-[#06125C] text-white shadow-md"
                : "text-slate-600 hover:bg-slate-100 hover:text-[#06125C]"
                }`}
            >
              <Eye size={18} />
              Pemantauan
              {ringkasanPemantauan.belum > 0 && (
                <span className="ml-1 bg-amber-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">
                  {ringkasanPemantauan.belum}
                </span>
              )}
            </button>
          </div>

          {/* Tab Content: Verifikasi */}
          {activeTab === "kelas" && <TabKelas />}

          {/* Tab Content: Verifikasi */}
          {activeTab === "verifikasi" && <TabVerifikasi />}

          {/* Tab Content: Finalisasi */}
          {activeTab === "finalisasi" && <TabFinalisasi />}

          {/* Tab Content: Pembahas */}
          {activeTab === "pembahas" && <TabPembahas />}

          {/* Tab Content: Pengumuman */}
          {activeTab === "pengumuman" && <TabPengumuman />}

    {/* Tab Content: Rekapitulasi */}
          {activeTab === "rekapitulasi" && <TabRekapitulasi />}

          {/* Tab Content: Pemantauan */}
          {activeTab === "pemantauan" && <TabPemantauan />}
        </div>
  );
}
