"use client";

import { LogOut, X, Users, Sparkles, Menu } from "lucide-react";
import DashboardAnalisis from "./DashboardAnalisis";
import AnalisisLog from "./AnalisisLog";
import ViewPilihSeminar from "./_components/ViewPilihSeminar";
import ViewSegeraHadir from "./_components/ViewSegeraHadir";
import ViewDaftarPeriode from "./_components/ViewDaftarPeriode";
import ViewPengaturanPeriode from "./_components/ViewPengaturanPeriode";
import ViewMasterData from "./_components/ViewMasterData";
import ViewManajemen from "./_components/ViewManajemen";
import ModalVerifikasi from "./_components/ModalVerifikasi";
import ModalHapusPeriode from "./_components/ModalHapusPeriode";
import ModalTambahData from "./_components/ModalTambahData";
import { AdminContext } from "./AdminContext";
import { useAdminDashboard } from "./useAdminDashboard";

export default function AdminDashboard() {
  const admin = useAdminDashboard();
  const {
    handleLogout, currentView, setCurrentView, setActivePeriodeId, isMobileMenuOpen, setIsMobileMenuOpen,
    selectedPendaftar, isVerifikasiModalOpen, showDeleteModal, showAddDataModal, activePeriode,
  } = admin;

  return (
    <AdminContext.Provider value={admin}>
      <div className="min-h-screen bg-slate-50 text-slate-800 font-sans selection:bg-[#06125C]/20 flex flex-col">
        {/* Navigation */}
        <nav className="w-full z-50 bg-[#06125C] text-white shadow-md sticky top-0">
          <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-12 bg-white rounded-lg p-1 shadow-inner flex items-center justify-center cursor-pointer" onClick={() => setCurrentView("visual_awal")}>
                <img
                  src="/logo.png"
                  alt="Logo SV IPB"
                  className="h-full w-auto object-contain"
                  onError={(e) => { e.currentTarget.style.display = 'none' }}
                />
              </div>
              <span className="font-semibold text-xl tracking-tight hidden sm:block">Seminar Hub - Portal Admin</span>
              <span className="font-semibold text-xl tracking-tight sm:hidden">Portal Admin</span>
            </div>
            <div className="flex items-center gap-1 sm:gap-4">
              <div className="hidden sm:flex items-center gap-4">
                <button
                  onClick={() => { setCurrentView("master"); setActivePeriodeId(null); }}
                  className="flex items-center gap-2 px-3 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-medium transition-colors"
                  title="Data Master Pengguna"
                >
                  <Users className="w-5 h-5 text-white/90" />
                  <span className="text-white font-medium">Master</span>
                </button>
                <button
                  onClick={() => { setCurrentView("analisis"); setActivePeriodeId(null); }}
                  className="flex items-center gap-2 px-3 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-medium transition-colors"
                  title="Dashboard Analisis"
                >
                  <Sparkles className="w-5 h-5 text-white/90" />
                  <span className="text-white font-medium">Analisis</span>
                </button>
                <button
                  onClick={() => { setCurrentView("analisis_log"); setActivePeriodeId(null); }}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors border border-white/20 ${currentView === "analisis_log" ? 'bg-white/20 shadow-inner' : 'hover:bg-white/10'}`}
                  title="Analisis Log"
                >
                  <Sparkles size={16} className="text-blue-200" />
                  <span className="text-white font-medium">Analisis Log</span>
                </button>
              </div>
            
              {/* Mobile Menu Toggle */}
              <button 
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} 
                className="sm:hidden p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors ml-1"
              >
                {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
              </button>

              <div className="hidden md:flex flex-col text-right mr-2 ml-2">
                <span className="text-sm font-semibold">Administrator Seminar</span>
              </div>
              <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold border-2 border-white ml-1 sm:ml-0 text-sm sm:text-base">
                AD
              </div>
              <button onClick={handleLogout} className="p-1.5 sm:p-2 hover:bg-white/10 rounded-lg transition-colors" title="Keluar">
                <LogOut size={20} className="text-red-300" />
              </button>
            </div>
          </div>
        
          {/* Mobile Dropdown Menu */}
          {isMobileMenuOpen && (
            <div className="sm:hidden bg-[#06125C] border-t border-white/10 px-6 py-4 flex flex-col gap-3 shadow-lg absolute w-full left-0 animate-in fade-in slide-in-from-top-2">
              <button
                onClick={() => { setCurrentView("master"); setActivePeriodeId(null); setIsMobileMenuOpen(false); }}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-medium transition-colors w-full"
              >
                <Users className="w-5 h-5 text-white/90" />
                <span className="text-white font-medium">Data Master</span>
              </button>
              <button
                onClick={() => { setCurrentView("analisis"); setActivePeriodeId(null); setIsMobileMenuOpen(false); }}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-medium transition-colors w-full"
              >
                <Sparkles className="w-5 h-5 text-white/90" />
                <span className="text-white font-medium">Analisis</span>
              </button>
              <button
                onClick={() => { setCurrentView("analisis_log"); setActivePeriodeId(null); setIsMobileMenuOpen(false); }}
                className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-medium transition-colors w-full border ${currentView === "analisis_log" ? 'border-white/20 bg-white/20' : 'border-transparent bg-white/10 hover:bg-white/20'}`}
              >
                <Sparkles size={16} className="text-blue-200" />
                <span className="text-white font-medium">Analisis Log</span>
              </button>
            </div>
          )}
        </nav>

        {/* Main Content */}
        <main className="flex-grow flex flex-col max-w-7xl mx-auto w-full px-6 py-8 gap-8">

          {/* =======================================================
              VIEW 5: ANALISIS
              ======================================================= */}
          {currentView === "analisis" && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <DashboardAnalisis onBack={() => setCurrentView("visual_awal")} />
            </div>
          )}

          {/* VIEW 6: ANALISIS LOG */}
          {currentView === "analisis_log" && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <AnalisisLog onBack={() => setCurrentView("visual_awal")} />
            </div>
          )}

          {/* =======================================================
              VIEW 0: VISUAL AWAL (SEMINAR TYPE SELECTION)
              ======================================================= */}
          {currentView === "visual_awal" && <ViewPilihSeminar />}

          {/* =======================================================
              VIEW 0.5: COMING SOON
              ======================================================= */}
          {currentView === "coming_soon" && <ViewSegeraHadir />}

          {/* =======================================================
              VIEW 1: LANDING PAGE (DAFTAR PERIODE)
              ======================================================= */}
          {currentView === "landing" && <ViewDaftarPeriode />}

          {/* =======================================================
              VIEW 2: PENGATURAN PERIODE
              ======================================================= */}
          {currentView === "pengaturan" && activePeriode && <ViewPengaturanPeriode />}

          {/* =======================================================
            VIEW 4: DATA PENGGUNA (MASTER)
            ======================================================= */}
          {currentView === "master" && <ViewMasterData />}

          {/* =======================================================
              VIEW 3: MANAJEMEN MAHASISWA
              ======================================================= */}
          {currentView === "manajemen" && activePeriode && <ViewManajemen />}

        {/* Modal Verifikasi Pendaftaran */}
        {isVerifikasiModalOpen && selectedPendaftar && <ModalVerifikasi />}

        {/* Modal Hapus Periode */}
        {showDeleteModal && activePeriode && <ModalHapusPeriode />}

        {/* Modal Input Data (Mahasiswa / Dosen) */}
        {showAddDataModal && <ModalTambahData />}
        </main>

        {/* Footer */}
        <footer className="bg-slate-100 border-t border-slate-200 py-6 mt-auto z-10 relative">
          <div className="max-w-7xl mx-auto px-6 flex justify-center items-center">
            <p className="text-slate-600 text-sm text-center">
              © {new Date().getFullYear()} Seminar Hub AKN SV IPB University. All rights reserved.
            </p>
          </div>
        </footer>
      </div>
    </AdminContext.Provider>
  );
}
