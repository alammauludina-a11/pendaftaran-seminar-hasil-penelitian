"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authClient, changePassword } from "../../../lib/auth-client";
import { useSession } from "../../../lib/auth-client";
import { 
  LogOut, 
  FileText, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  CalendarPlus, 
  UploadCloud, 
  Calendar, 
  MapPin, 
  UserCircle,
  Search,
  Filter,
  Users,
  UserCheck,
  Lock,
  Megaphone,
  FileCheck,
  ArrowLeft
} from "lucide-react";

export default function MahasiswaDashboard() {
  const router = useRouter();
  const handleLogout = async () => {
    await authClient.signOut();
    router.push("/");
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 4) {
      setPasswordStatus("error");
      setPasswordError("Password baru minimal 4 karakter.");
      return;
    }
    setPasswordStatus("loading");
    try {
      const res = await changePassword({
        currentPassword: currentPassword,
        newPassword: newPassword,
        revokeOtherSessions: true,
      });

      if (res.error) {
        setPasswordStatus("error");
        setPasswordError(res.error.message || "Gagal mengubah password.");
      } else {
        setPasswordStatus("success");
        setTimeout(() => {
          setShowPasswordModal(false);
          setPasswordStatus("idle");
          setCurrentPassword("");
          setNewPassword("");
        }, 2000);
      }
    } catch (err: any) {
      setPasswordStatus("error");
      setPasswordError(err.message || "Gagal mengubah password.");
    }
  };

  const [currentView, setCurrentView] = useState<"visual_awal" | "coming_soon" | "main">("visual_awal");
  const [selectedSeminarType, setSelectedSeminarType] = useState<"kolokium" | "hasil_penelitian" | null>(null);

  const [activeTab, setActiveTab] = useState<"pengajuan" | "status" | "ruangan" | "pengumuman">("pengajuan");
  const [formStatus, setFormStatus] = useState<"idle" | "submitting" | "success">("idle");
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const [selectedDateFilter, setSelectedDateFilter] = useState<string | null>(null);
  
  // State for Ruangan
  const [showRuanganModal, setShowRuanganModal] = useState(false);
  const [ruanganStatus, setRuanganStatus] = useState<"idle" | "submitted" | "requesting_change" | "waiting_approval" | "change_approved">("idle");
  const [inputRuangan, setInputRuangan] = useState("");
  const [ruanganName, setRuanganName] = useState("");
  const [inputRuanganBaru, setInputRuanganBaru] = useState("");
  const [alasanPindah, setAlasanPindah] = useState("");
  
  const [fileKolokiumName, setFileKolokiumName] = useState<string | null>(null);
  const [fileDospemName, setFileDospemName] = useState<string | null>(null);

  const [masterDosen, setMasterDosen] = useState<string[]>([]);

  // States for Pengumuman Filter
  const [pengumumanSearch, setPengumumanSearch] = useState("");
  const [pengumumanKelasFilter, setPengumumanKelasFilter] = useState("Semua Kelas");

  // State for Ubah Password
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordStatus, setPasswordStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [passwordError, setPasswordError] = useState("");

  // Integration States
  const [pendaftaranStatus, setPendaftaranStatus] = useState<"menunggu" | "disetujui" | "ditolak" | null>(null);
  const [catatanPenolakan, setCatatanPenolakan] = useState<string>("");
  const [pendaftaranId, setPendaftaranId] = useState<number | null>(null);
  const [pendaftaranDetails, setPendaftaranDetails] = useState<any>(null);
  const [pendaftaranSlot, setPendaftaranSlot] = useState<any>(null);
  const [availableSlots, setAvailableSlots] = useState<any[]>([]);
  const [calendarDates, setCalendarDates] = useState<any[]>([]);
  const [pengumuman, setPengumuman] = useState<any[]>([]); // For now empty as we haven't implemented full class assignments in dummy data
  const [activePeriodeData, setActivePeriodeData] = useState<any>(null);
  const [riwayatTanggalKolokium, setRiwayatTanggalKolokium] = useState<string | null>(null);
  
  const { data: sessionData } = useSession();
  const user = {
    id: sessionData?.user?.id || "",
    nama: (sessionData?.user as any)?.nama || sessionData?.user?.name || "Mahasiswa",
    nim: (sessionData?.user as any)?.nipNim || "-",
  };

  useEffect(() => {
    fetchRuanganData();
  }, []);

  const fetchDashboardData = async (jenis?: string) => {
    try {
      const seminarType = jenis || selectedSeminarType || "hasil_penelitian";
      const res = await fetch(`/api/mahasiswa/dashboard?jenis=${seminarType}`, { cache: "no-store" });
      const data = await res.json();
      
      setPengumuman(data.pengumuman || []);
      setMasterDosen(data.masterDosen || []);
      setActivePeriodeData(data.activePeriodeData || null);
      setRiwayatTanggalKolokium(data.riwayatTanggalKolokium || null);
      
      if (data.pendaftaranStatus) {
        setPendaftaranStatus(data.pendaftaranStatus);
        setCatatanPenolakan(data.catatanPenolakan || "");
        if (data.details) {
          setPendaftaranId(data.details.id);
          setPendaftaranDetails(data.details);
          if (data.slot) {
            setPendaftaranSlot(data.slot);
          }
          if (data.details.ruanganDiajukan || data.details.room) {
            if (data.ruanganStatus === "menunggu") {
              setRuanganStatus("waiting_approval");
              setRuanganName(data.details.ruanganDiajukan || data.details.room || "");
            } else if (data.ruanganStatus === "disetujui") {
              setRuanganStatus("submitted");
              setRuanganName(data.details.room || data.details.ruanganDiajukan || "");
            } else {
              setRuanganStatus("ditolak");
              setRuanganName("");
            }
          }
        }
      } else {
        setPendaftaranStatus(null);
        setCatatanPenolakan("");
        setPendaftaranId(null);
        setPendaftaranDetails(null);
        setPendaftaranSlot(null);
        setRuanganStatus("idle");
        setRuanganName("");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchRuanganData = async () => {
    try {
      const res = await fetch("/api/mahasiswa/slot");
      const data = await res.json();
      if (data.availableSlots) {
        setAvailableSlots(data.availableSlots);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (activePeriodeData && activePeriodeData.startDate && activePeriodeData.endDate) {
      const start = new Date(activePeriodeData.startDate);
      const end = new Date(activePeriodeData.endDate);
      const dates = [];
      const uniqueAvailableDates = new Set(availableSlots.map(s => s.isoDate));
      
      let current = new Date(start);
      let limit = 0;
      while (current <= end && limit < 200) {
        const dateStr = current.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
        const hariStr = current.toLocaleDateString('id-ID', { weekday: 'long' });
        const currentIso = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}-${String(current.getDate()).padStart(2, '0')}`;
        
        dates.push({
          tanggal: dateStr,
          hari: hariStr,
          isoDate: currentIso,
          isAvailable: true // Make all dates in the active period selectable
        });
        
        current.setDate(current.getDate() + 1);
        limit++;
      }
      
      if (dates.length > 0) {
        setCalendarDates(dates);
        if (!selectedDateFilter || !dates.some(d => d.isoDate === selectedDateFilter)) {
          // Find first available date or just first date
          const firstAvail = dates.find(d => d.isAvailable) || dates[0];
          setSelectedDateFilter(firstAvail.isoDate);
        }
      }
    } else if (availableSlots.length > 0) {
      // Fallback
      const uniqueDatesMap = new Map();
      availableSlots.forEach((s: any) => {
        if (!uniqueDatesMap.has(s.date)) {
          uniqueDatesMap.set(s.isoDate, {
            tanggal: s.date,
            hari: s.hari,
            isoDate: s.isoDate,
            isAvailable: true
          });
        }
      });
      const dates = Array.from(uniqueDatesMap.values());
      if(dates.length > 0) {
         setCalendarDates(dates);
         if (!selectedDateFilter || !dates.some((d:any) => d.isoDate === selectedDateFilter)) {
            setSelectedDateFilter(dates[0].isoDate as string);
         }
      }
    }
  }, [activePeriodeData, availableSlots]);

  const filteredSlots = selectedDateFilter 
    ? availableSlots.filter(s => s.isoDate === selectedDateFilter) 
    : availableSlots;

  const filteredPengumuman = pengumuman.filter(item => {
    const matchSearch = item.mahasiswa.toLowerCase().includes(pengumumanSearch.toLowerCase()) || 
                        item.pembahas.toLowerCase().includes(pengumumanSearch.toLowerCase());
    const matchKelas = pengumumanKelasFilter === "Semua Kelas" || item.kelas === pengumumanKelasFilter;
    return matchSearch && matchKelas;
  });

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormStatus("submitting");
    
    const formData = new FormData(e.currentTarget);
    formData.append("slot_id", selectedSlot?.toString() || "");
    formData.append("jenisSeminar", selectedSeminarType || "hasil_penelitian");
    if (activePeriodeData) {
      formData.append("periodeId", activePeriodeData.id.toString());
    }

    try {
      const res = await fetch("/api/mahasiswa/pendaftaran", {
        method: "POST",
        body: formData
      });
      
      if(res.ok) {
        setFormStatus("success");
        fetchDashboardData(); // refresh status
        setTimeout(() => {
          setActiveTab("status");
        }, 1500);
      } else {
        alert("Gagal mengajukan.");
        setFormStatus("idle");
      }
    } catch (e) {
      setFormStatus("idle");
    }
  };

  const handleSimpanRuangan = async () => {
    if (!inputRuangan.trim() || !pendaftaranId) return;
    
    try {
      const res = await fetch("/api/mahasiswa/pendaftaran", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "simpan_ruangan_awal",
          pendaftaranId,
          ruanganName: inputRuangan
        })
      });
      
      if(res.ok) {
        setRuanganName(inputRuangan);
        setRuanganStatus("submitted");
        setShowRuanganModal(false);
      }
    } catch(e) {
      console.error(e);
    }
  }

  const handleAjukanPindahRuangan = async () => {
    if (!inputRuanganBaru.trim() || !pendaftaranId) return;
    
    try {
      const res = await fetch("/api/mahasiswa/pendaftaran", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "pengajuan_ruangan",
          pendaftaranId,
          ruanganName: inputRuanganBaru
        })
      });
      
      if(res.ok) {
        setRuanganName(inputRuanganBaru);
        setRuanganStatus("waiting_approval");
      }
    } catch(e) {
      console.error(e);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans selection:bg-[#06125C]/20 flex flex-col">
      {/* Navigation */}
      <nav className="w-full z-50 bg-[#06125C] text-white shadow-md sticky top-0">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-12 bg-white rounded-lg p-1 shadow-inner flex items-center justify-center">
              <img
                src="/logo.png"
                alt="Logo SV IPB"
                className="h-full w-auto object-contain"
                onError={(e) => { e.currentTarget.style.display = 'none' }}
              />
            </div>
            <span className="font-semibold text-xl tracking-tight hidden sm:block">Seminar Hub AKN SV IPB</span>
            <span className="font-semibold text-xl tracking-tight sm:hidden">Seminar Hub</span>
          </div>

          <div className="flex items-center gap-6">
            <div className="hidden md:flex flex-col items-end">
              <span className="text-sm font-semibold">{user.nama}</span>
              <span className="text-xs text-blue-200">{user.nim} • Mahasiswa</span>
            </div>
            <button
              onClick={() => setShowPasswordModal(true)}
              className="flex items-center gap-2 bg-white/10 hover:bg-white/20 transition px-4 py-2 rounded-xl text-sm font-medium"
            >
              <Lock size={16} />
              <span className="hidden sm:inline">Ubah Password</span>
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 bg-white/10 hover:bg-white/20 transition px-4 py-2 rounded-xl text-sm font-medium"
            >
              <LogOut size={16} />
              <span className="hidden sm:inline">Keluar</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-grow w-full max-w-5xl mx-auto px-6 py-8 relative">
        {currentView === "visual_awal" && (
          <div className="animate-in fade-in duration-500 min-h-[60vh] flex flex-col items-center justify-center">
            <div className="text-center mb-10">
              <h1 className="text-4xl font-extrabold text-[#06125C] mb-4">Pilih Kategori Seminar</h1>
              <p className="text-slate-500 text-lg">Silakan pilih jenis seminar yang ingin Anda kelola untuk melanjutkan.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl">
              <button 
                onClick={() => {
                  setSelectedSeminarType("kolokium");
                  fetchDashboardData("kolokium");
                  setCurrentView("main");
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
                <p className="text-slate-500">Kelola pendaftaran, lihat jadwal, dan unggah berkas untuk Seminar Kolokium Anda.</p>
              </button>

              <button 
                onClick={() => {
                  setSelectedSeminarType("hasil_penelitian");
                  fetchDashboardData("hasil_penelitian");
                  setCurrentView("main");
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
                <p className="text-slate-500">Kelola pendaftaran, lihat jadwal, dan unggah berkas untuk Seminar Hasil Penelitian Anda.</p>
              </button>
            </div>
          </div>
        )}

        {currentView === "coming_soon" && (
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
        )}

        {currentView === "main" && (
          <>
            <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold text-[#06125C] mb-2">Dashboard Mahasiswa</h1>
                <p className="text-slate-600">Selamat datang, kelola pendaftaran {selectedSeminarType === "kolokium" ? "seminar kolokium" : "seminar hasil penelitian"} Anda di sini.</p>
              </div>
              <button
                onClick={() => {
                  setSelectedSeminarType(null);
                  setCurrentView("visual_awal");
                }}
                className="bg-white text-[#06125C] border border-[#06125C] hover:bg-slate-50 px-4 py-2 rounded-xl font-bold shadow-sm transition-colors flex items-center gap-2 w-fit"
              >
                <ArrowLeft size={18} /> Menu Utama
              </button>
            </div>

        {activePeriodeData && (
          <div className="mb-8 bg-blue-50/50 border border-blue-100 rounded-2xl p-5 flex items-start sm:items-center gap-4">
            <div className="bg-blue-100 text-blue-600 p-3 rounded-xl shrink-0">
              <Calendar size={24} />
            </div>
            <div>
              <h3 className="font-bold text-blue-900 mb-1">Periode Seminar Aktif: Angkatan {activePeriodeData.angkatan}</h3>
              <p className="text-sm text-blue-700">
                Pendaftaran ditutup pada: <strong>{new Date(activePeriodeData.registrationEndDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</strong>. 
                Pelaksanaan seminar: {new Date(activePeriodeData.startDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })} - {new Date(activePeriodeData.endDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            </div>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex flex-wrap gap-2 mb-8 bg-white p-2 rounded-2xl shadow-sm border border-slate-200">
          <button
            onClick={() => setActiveTab("pengajuan")}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-medium transition-all ${
              activeTab === "pengajuan" 
                ? "bg-[#06125C] text-white shadow-md" 
                : "text-slate-600 hover:bg-slate-100 hover:text-[#06125C]"
            }`}
          >
            <CalendarPlus size={18} />
            Pengajuan Jadwal
          </button>
          <button
            onClick={() => setActiveTab("status")}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-medium transition-all ${
              activeTab === "status" 
                ? "bg-[#06125C] text-white shadow-md" 
                : "text-slate-600 hover:bg-slate-100 hover:text-[#06125C]"
            }`}
          >
            <FileText size={18} />
            Status Pendaftaran
          </button>
          <button
            onClick={() => setActiveTab("ruangan")}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-medium transition-all ${
              activeTab === "ruangan" 
                ? "bg-[#06125C] text-white shadow-md" 
                : "text-slate-600 hover:bg-slate-100 hover:text-[#06125C]"
            }`}
          >
            <MapPin size={18} />
            Ruangan Seminar
          </button>
          <button
            onClick={() => setActiveTab("pengumuman")}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-medium transition-all ${
              activeTab === "pengumuman" 
                ? "bg-[#06125C] text-white shadow-md" 
                : "text-slate-600 hover:bg-slate-100 hover:text-[#06125C]"
            }`}
          >
            <Calendar size={18} />
            Pengumuman Jadwal
          </button>
        </div>

        {/* Tab Content: Status */}
        {activeTab === "status" && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#06125C]/5 rounded-bl-[100px] pointer-events-none" />
              
              <h2 className="text-xl font-bold text-[#06125C] mb-6 flex items-center gap-2">
                <FileText className="text-amber-500" /> Status Pengajuan Saat Ini
              </h2>

              {formStatus === "success" && (
                 <div className="mb-6 p-4 bg-green-50 border border-green-200 text-green-700 rounded-xl flex items-start gap-3">
                    <CheckCircle2 className="shrink-0 mt-0.5" size={20} />
                    <div>
                      <h4 className="font-semibold">Berhasil Diajukan!</h4>
                      <p className="text-sm">Pengajuan jadwal Anda telah kami terima dan saat ini sedang menunggu verifikasi admin.</p>
                    </div>
                 </div>
              )}

              <div className="flex flex-col md:flex-row gap-6">
                <div className="flex-1 bg-slate-50 p-6 rounded-2xl border border-slate-100">
                  <h3 className="text-sm font-medium text-slate-500 mb-1">Status Verifikasi</h3>
                  <div className="flex items-center gap-3">
                    {!pendaftaranStatus && (
                      <>
                        <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center">
                          <XCircle size={20} />
                        </div>
                        <div>
                          <p className="text-lg font-bold text-slate-500">Belum Mengajukan</p>
                          <p className="text-xs text-slate-500">Silakan ajukan jadwal di tab Pengajuan Jadwal.</p>
                        </div>
                      </>
                    )}
                    {pendaftaranStatus === "menunggu" && (
                      <>
                        <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center">
                          <Clock size={20} />
                        </div>
                        <div>
                          <p className="text-lg font-bold text-amber-600">Menunggu Verifikasi</p>
                          <p className="text-xs text-slate-500">Admin sedang memeriksa berkas Anda.</p>
                        </div>
                      </>
                    )}
                    {pendaftaranStatus === "disetujui" && (
                      <>
                        <div className="w-10 h-10 rounded-full bg-green-100 text-green-600 flex items-center justify-center">
                          <CheckCircle2 size={20} />
                        </div>
                        <div>
                          <p className="text-lg font-bold text-green-600">Disetujui</p>
                          <p className="text-xs text-slate-500">Jadwal Anda telah disetujui admin.</p>
                        </div>
                      </>
                    )}
                    {pendaftaranStatus === "ditolak" && (
                      <>
                        <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center">
                          <XCircle size={20} />
                        </div>
                        <div>
                          <p className="text-lg font-bold text-red-600">Ditolak</p>
                          <p className="text-xs text-slate-500">Berkas Anda ditolak, silakan ajukan ulang.</p>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex-1 bg-slate-50 p-6 rounded-2xl border border-slate-100">
                  <h3 className="text-sm font-medium text-slate-500 mb-1">Catatan Admin</h3>
                  {!pendaftaranStatus || pendaftaranStatus === "menunggu" ? (
                    <p className="text-slate-400 italic text-sm mt-2">- Belum ada catatan -</p>
                  ) : pendaftaranStatus === "ditolak" ? (
                    <p className="text-slate-700 text-sm mt-2 font-medium">"{catatanPenolakan}"</p>
                  ) : (
                    <p className="text-slate-700 text-sm mt-2 font-medium">"{catatanPenolakan || "Semua berkas valid."}"</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab Content: Pengajuan */}
        {activeTab === "pengajuan" && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            {!activePeriodeData ? (
              <div className="bg-white rounded-3xl p-10 border border-slate-200 shadow-sm text-center flex flex-col items-center justify-center min-h-[400px]">
                <div className="w-20 h-20 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center mb-6 shadow-sm border border-slate-100">
                  <Calendar size={40} />
                </div>
                <h2 className="text-2xl font-bold text-slate-700 mb-3">Periode Belum Dibuka</h2>
                <p className="text-slate-500 max-w-md mx-auto mb-8 leading-relaxed">
                  Belum ada periode pendaftaran seminar yang dibuka untuk angkatan Anda. Silakan tunggu informasi lebih lanjut dari admin.
                </p>
              </div>
            ) : pendaftaranStatus && pendaftaranStatus !== "ditolak" ? (
              <div className="bg-white rounded-3xl p-10 border border-slate-200 shadow-sm text-center">
                <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle2 size={40} className="text-green-500" />
                </div>
                <h2 className="text-2xl font-bold text-[#06125C] mb-3">Anda Telah Mengajukan Jadwal</h2>
                <p className="text-slate-600 mb-8 max-w-md mx-auto leading-relaxed">
                  Pengajuan jadwal seminar hasil penelitian Anda telah berhasil tercatat dalam sistem kami.
                </p>
                
                {pendaftaranDetails && (
                  <div className="text-left bg-slate-50 border border-slate-200 rounded-2xl p-6 mb-8 max-w-2xl mx-auto">
                    <h3 className="font-bold text-slate-800 mb-4 border-b pb-2">Detail Pengajuan Anda</h3>
                    <div className="space-y-4 text-sm">
                      <div>
                        <p className="text-slate-500 mb-1">Judul Penelitian</p>
                        <p className="font-semibold text-slate-800">{pendaftaranDetails.title}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        {selectedSeminarType !== "kolokium" && (
                          <div>
                            <p className="text-slate-500 mb-1">Konsentrasi Penelitian</p>
                            <p className="font-semibold text-slate-800">{pendaftaranDetails.konsentrasi || "-"}</p>
                          </div>
                        )}
                        {selectedSeminarType !== "kolokium" && (
                          <div>
                            <p className="text-slate-500 mb-1">Tanggal Kolokium</p>
                            <p className="font-semibold text-slate-800">
                              {pendaftaranDetails.tanggalKolokium 
                                ? new Date(pendaftaranDetails.tanggalKolokium).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
                                : "-"}
                            </p>
                          </div>
                        )}
                        <div>
                          <p className="text-slate-500 mb-1">Dosen Pembimbing 1</p>
                          <p className="font-semibold text-slate-800">{pendaftaranDetails.dospem1}</p>
                        </div>
                        <div>
                          <p className="text-slate-500 mb-1">Dosen Pembimbing 2</p>
                          <p className="font-semibold text-slate-800">{pendaftaranDetails.dospem2 || "-"}</p>
                        </div>
                        <div className="col-span-2 mt-1">
                          <p className="text-slate-500 mb-1 font-semibold">Jadwal Seminar (Diajukan)</p>
                          {pendaftaranSlot ? (
                            <div className="flex items-center gap-2 p-3 bg-indigo-50 border border-indigo-100 rounded-lg text-indigo-900">
                              <Calendar size={16} className="text-indigo-500" />
                              <span className="font-semibold">{pendaftaranSlot.date}</span>
                              <span className="text-indigo-400 mx-1">•</span>
                              <Clock size={16} className="text-indigo-500" />
                              <span className="font-medium">{pendaftaranSlot.time} WIB</span>
                            </div>
                          ) : (
                            <p className="italic text-slate-400">Belum ada slot yang dipilih</p>
                          )}
                        </div>
                        <div className="col-span-2 mt-2">
                          <p className="text-slate-500 mb-2 font-semibold">Dokumen Terlampir</p>
                          <div className="flex flex-col gap-2">
                            <div className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-lg">
                              <div className="flex items-center gap-2">
                                <FileText size={16} className={pendaftaranDetails.fileBuktiKolokium ? "text-blue-500" : "text-slate-400"} />
                                <span className={pendaftaranDetails.fileBuktiKolokium ? "text-slate-700 font-medium" : "text-slate-400 italic"}>Bukti Forum Kolokium</span>
                              </div>
                              {pendaftaranDetails.fileBuktiKolokium ? (
                                <a href={pendaftaranDetails.fileBuktiKolokium} target="_blank" rel="noreferrer" className="text-xs bg-blue-50 text-blue-600 px-3 py-1.5 rounded-md hover:bg-blue-100 font-semibold transition-colors">Lihat Berkas</a>
                              ) : (
                                <span className="text-xs text-slate-400">Tidak ada</span>
                              )}
                            </div>
                            <div className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-lg">
                              <div className="flex items-center gap-2">
                                <FileText size={16} className={pendaftaranDetails.fileApprovalDospem ? "text-blue-500" : "text-slate-400"} />
                                <span className={pendaftaranDetails.fileApprovalDospem ? "text-slate-700 font-medium" : "text-slate-400 italic"}>Persetujuan Dospem</span>
                              </div>
                              {pendaftaranDetails.fileApprovalDospem ? (
                                <a href={pendaftaranDetails.fileApprovalDospem} target="_blank" rel="noreferrer" className="text-xs bg-blue-50 text-blue-600 px-3 py-1.5 rounded-md hover:bg-blue-100 font-semibold transition-colors">Lihat Berkas</a>
                              ) : (
                                <span className="text-xs text-slate-400">Tidak ada</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                <button 
                  onClick={() => setActiveTab("status")}
                  className="bg-[#06125C] hover:bg-[#06125C]/90 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-sm flex items-center gap-2 mx-auto"
                >
                  <FileText size={18} /> Cek Status Pendaftaran
                </button>
              </div>
            ) : selectedSeminarType === "hasil_penelitian" && !riwayatTanggalKolokium ? (
              <div className="bg-white rounded-3xl p-10 border border-slate-200 shadow-sm text-center flex flex-col items-center justify-center min-h-[400px]">
                <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-6 shadow-sm border border-red-100">
                  <XCircle size={40} />
                </div>
                <h2 className="text-2xl font-bold text-slate-700 mb-3">Persyaratan Belum Terpenuhi</h2>
                <p className="text-slate-500 max-w-md mx-auto mb-8 leading-relaxed">
                  Anda belum menyelesaikan Seminar Kolokium. Seminar Hasil Penelitian baru dapat diajukan setelah Seminar Kolokium Anda selesai dan disetujui.
                </p>
              </div>
            ) : (
            <form onSubmit={handleSubmit} className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-bl-[100px] pointer-events-none" />
              
              <h2 className="text-xl font-bold text-[#06125C] mb-2 flex items-center gap-2">
                <CalendarPlus className="text-amber-500" /> Form Pengajuan Jadwal
              </h2>
              <p className="text-slate-500 text-sm mb-6">Pilih slot jadwal dan lengkapi berkas persyaratan seminar hasil penelitian.</p>

              {pendaftaranStatus === "ditolak" && (
                <div className="mb-8 bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-start gap-3">
                  <XCircle className="shrink-0 mt-0.5" size={20} />
                  <div>
                    <h4 className="font-semibold text-red-800">Pengajuan Sebelumnya Ditolak</h4>
                    <p className="text-sm mt-1">{catatanPenolakan || "Silakan periksa kembali data dan berkas Anda, lalu ajukan ulang."}</p>
                  </div>
                </div>
              )}

              <div className="space-y-5 mb-8">
                <h3 className="font-semibold text-slate-800 border-b pb-2">Identitas Penelitian</h3>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Judul Penelitian <span className="text-red-500">*</span></label>
                  <textarea 
                    name="judul_penelitian"
                    required
                    rows={2}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-[#06125C]/20 focus:border-[#06125C] transition-all outline-none text-slate-700 resize-none"
                    placeholder="Masukkan judul penelitian/skripsi Anda"
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Dosen Pembimbing 1 <span className="text-red-500">*</span></label>
                    <div className="relative">
                      <select 
                        name="dospem1_nama"
                        required
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-[#06125C]/20 focus:border-[#06125C] transition-all outline-none text-slate-700 appearance-none"
                      >
                        <option value="">Pilih Dosen Pembimbing 1</option>
                        {masterDosen.map((dosen, i) => <option key={i} value={dosen}>{dosen}</option>)}
                      </select>
                      <div className="absolute right-4 top-3.5 text-slate-400 pointer-events-none">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Dosen Pembimbing 2 <span className="text-slate-400 font-normal">(Opsional)</span></label>
                    <div className="relative">
                      <select 
                        name="dospem2_nama"
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-[#06125C]/20 focus:border-[#06125C] transition-all outline-none text-slate-700 appearance-none"
                      >
                        <option value="">Pilih Dosen Pembimbing 2 (opsional)</option>
                        {masterDosen.map((dosen, i) => <option key={i} value={dosen}>{dosen}</option>)}
                      </select>
                      <div className="absolute right-4 top-3.5 text-slate-400 pointer-events-none">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  {selectedSeminarType !== "kolokium" && (
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Konsentrasi Penelitian <span className="text-red-500">*</span></label>
                      <div className="relative">
                        <select 
                          name="konsentrasi_penelitian"
                          required
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-[#06125C]/20 focus:border-[#06125C] transition-all outline-none text-slate-700 appearance-none"
                        >
                          <option value="">Pilih Konsentrasi</option>
                          <option value="Akuntansi Keuangan">Akuntansi Keuangan</option>
                          <option value="Akuntansi Manajemen">Akuntansi Manajemen</option>
                          <option value="Akuntansi Pajak">Akuntansi Pajak</option>
                          <option value="Sistem Informasi Akuntansi">Sistem Informasi Akuntansi</option>
                          <option value="Akuntansi Pemerintahan">Akuntansi Pemerintahan</option>
                          <option value="Audit">Audit</option>
                        </select>
                        <div className="absolute right-4 top-3.5 text-slate-400 pointer-events-none">
                          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                        </div>
                      </div>
                    </div>
                  )}
                  {selectedSeminarType !== "kolokium" && (
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Tanggal Seminar Kolokium</label>
                      <div className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-100 text-slate-800 font-medium text-sm">
                        {riwayatTanggalKolokium ? riwayatTanggalKolokium : <span className="text-slate-500 font-normal">Diisi otomatis dari riwayat Seminar Kolokium</span>}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-8">
                {/* Bagian Waktu & Ruangan */}
                <div className="space-y-5">
                  <h3 className="font-semibold text-slate-800 border-b pb-2">Pilih Slot Jadwal <span className="text-red-500">*</span></h3>
                  
                  {/* Calendar Filter */}
                  <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                    {calendarDates.map((date, idx) => (
                      <div 
                        key={idx}
                        onClick={() => {
                          if (date.isAvailable) {
                            setSelectedDateFilter(date.isoDate);
                            setSelectedSlot(null);
                          }
                        }}
                        className={`flex-shrink-0 flex flex-col items-center justify-center w-[4.5rem] h-20 rounded-2xl border transition-all ${
                          !date.isAvailable 
                            ? "opacity-40 cursor-not-allowed bg-slate-50 border-slate-200" 
                            : selectedDateFilter === date.isoDate 
                              ? "bg-[#06125C] text-white border-[#06125C] shadow-md cursor-pointer" 
                              : "bg-white border-slate-200 hover:border-[#06125C]/30 text-slate-700 cursor-pointer"
                        }`}
                      >
                        <span className="text-xs font-medium opacity-80">{date.hari}</span>
                        <span className="text-lg font-bold my-0.5">{date.tanggal.split(" ")[0]}</span>
                        <span className="text-[10px] uppercase tracking-wider">{date.tanggal.split(" ")[1] || ""}</span>
                      </div>
                    ))}
                    {calendarDates.length === 0 && <div className="text-sm text-slate-400">Tidak ada slot tersedia dari Admin.</div>}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[300px] overflow-y-auto pr-2 pb-2">
                    {filteredSlots.length > 0 ? (
                      filteredSlots.map((slot) => (
                        <div 
                          key={slot.id}
                          onClick={() => setSelectedSlot(slot.id)}
                          className={`cursor-pointer rounded-xl border p-4 transition-all flex flex-col gap-2 ${
                            selectedSlot === slot.id 
                              ? "border-[#06125C] bg-[#06125C]/5 ring-1 ring-[#06125C]" 
                              : "border-slate-200 bg-slate-50 hover:border-[#06125C]/30 hover:bg-slate-100"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-bold text-slate-800 flex items-center gap-1.5"><Calendar size={14} className="text-amber-500"/> {slot.date}</span>
                          </div>
                          <div className="text-xs text-slate-600 flex items-center gap-1.5">
                            <Clock size={14} className="text-slate-400"/> {slot.time} WIB
                          </div>

                        </div>
                      ))
                    ) : (
                      <div className="col-span-1 sm:col-span-2 text-center py-8 text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                        Tidak ada slot jadwal yang tersedia pada tanggal ini.
                      </div>
                    )}
                  </div>
                  {/* Hidden input to ensure form validation triggers if slot is not selected */}
                  {!selectedSlot && <input type="text" required className="opacity-0 w-0 h-0 absolute pointer-events-none" />}
                  <p className="text-xs text-slate-500 mt-2">Slot jadwal yang ditampilkan adalah jadwal yang telah disiapkan oleh Admin.</p>
                </div>

                {/* Bagian Berkas */}
                <div className="space-y-5">
                  <h3 className="font-semibold text-slate-800 border-b pb-2">Unggah Berkas</h3>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Bukti Forum Kolokium <span className="text-red-500">*</span></label>
                    <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-slate-200 border-dashed rounded-xl hover:bg-slate-50 hover:border-[#06125C]/30 transition-all group relative">
                      <input 
                        id="file-kolokium" 
                        name="file-kolokium" 
                        type="file" 
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                        required 
                        accept=".pdf,image/*" 
                        onChange={(e) => setFileKolokiumName(e.target.files?.[0]?.name || null)}
                      />
                      <div className="space-y-1 text-center pointer-events-none">
                        <UploadCloud className={`mx-auto h-8 w-8 ${fileKolokiumName ? 'text-[#06125C]' : 'text-slate-400 group-hover:text-[#06125C]'}`} />
                        <div className="flex text-sm text-slate-600 justify-center">
                          <span className="font-medium text-[#06125C]">{fileKolokiumName || "Upload a file"}</span>
                          {!fileKolokiumName && <p className="pl-1">or drag and drop</p>}
                        </div>
                        <p className="text-xs text-slate-500">{fileKolokiumName ? "Berhasil dipilih" : "PDF, PNG, JPG up to 5MB"}</p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Persetujuan Dosen Pembimbing <span className="text-red-500">*</span></label>
                    <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-slate-200 border-dashed rounded-xl hover:bg-slate-50 hover:border-[#06125C]/30 transition-all group relative">
                      <input 
                        id="file-dospem" 
                        name="file-dospem" 
                        type="file" 
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                        required 
                        accept=".pdf,image/*" 
                        onChange={(e) => setFileDospemName(e.target.files?.[0]?.name || null)}
                      />
                      <div className="space-y-1 text-center pointer-events-none">
                        <UploadCloud className={`mx-auto h-8 w-8 ${fileDospemName ? 'text-[#06125C]' : 'text-slate-400 group-hover:text-[#06125C]'}`} />
                        <div className="flex text-sm text-slate-600 justify-center">
                          <span className="font-medium text-[#06125C]">{fileDospemName || "Upload a file"}</span>
                          {!fileDospemName && <p className="pl-1">or drag and drop</p>}
                        </div>
                        <p className="text-xs text-slate-500">{fileDospemName ? "Berhasil dipilih" : "PDF, PNG, JPG up to 5MB"}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-slate-100 flex justify-end">
                <button 
                  type="submit" 
                  disabled={formStatus === "submitting"}
                  className="bg-[#06125C] hover:bg-[#06125C]/90 text-white px-8 py-3 rounded-xl font-medium shadow-md shadow-[#06125C]/20 transition-all flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {formStatus === "submitting" ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Memproses...
                    </>
                  ) : (
                    "Ajukan Jadwal"
                  )}
                </button>
              </div>
            </form>
            )}
          </div>
        )}

        {/* Tab Content: Ruangan Seminar */}
        {activeTab === "ruangan" && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-bl-[100px] pointer-events-none" />
              
              <h2 className="text-xl font-bold text-[#06125C] mb-2 flex items-center gap-2">
                <MapPin className="text-amber-500" /> Pengajuan Ruangan Seminar
              </h2>
              <p className="text-slate-500 text-sm mb-8">Masukkan ruangan yang telah Anda booking untuk jadwal seminar Anda.</p>

              {(!pendaftaranStatus) && (
                <div className="p-6 bg-slate-50 border border-slate-200 rounded-xl text-slate-600">
                  Anda harus mengajukan jadwal terlebih dahulu sebelum dapat mengajukan ruangan.
                </div>
              )}

              {(pendaftaranStatus && ruanganStatus === "idle") && (
                <div className="space-y-5 max-w-lg">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Nama Ruangan <span className="text-red-500">*</span></label>
                    <input 
                      type="text" 
                      value={inputRuangan}
                      onChange={(e) => setInputRuangan(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-[#06125C]/20 focus:border-[#06125C] transition-all outline-none text-slate-700"
                      placeholder="Contoh: R. Sidang 1"
                    />
                  </div>
                  <button 
                    onClick={() => {
                      if(inputRuangan.trim()) setShowRuanganModal(true);
                    }}
                    className="bg-[#06125C] hover:bg-[#06125C]/90 text-white px-6 py-2.5 rounded-xl font-medium shadow-md transition-all flex items-center gap-2"
                  >
                    Simpan Ruangan
                  </button>
                </div>
              )}

              {ruanganStatus === "submitted" && (
                <div className="p-6 bg-slate-50 border border-slate-200 rounded-xl flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-[#06125C]/10 flex items-center justify-center text-[#06125C] shrink-0">
                    <CheckCircle2 size={24} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-800 mb-1">Ruangan Telah Disimpan</h3>
                    <p className="text-sm text-slate-600 mb-2">Anda telah menginputkan ruangan <span className="font-bold text-[#06125C]">{ruanganName}</span>.</p>
                    <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded-lg border border-amber-100 inline-block mb-4">Ruangan tidak dapat diubah secara langsung.</p>
                    <div>
                      <button 
                        onClick={() => setRuanganStatus("requesting_change")}
                        className="text-sm font-medium text-slate-700 bg-slate-200 hover:bg-slate-300 px-4 py-2 rounded-lg transition-colors border border-slate-300"
                      >
                        Ajukan Pindah Ruangan
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {ruanganStatus === "requesting_change" && (
                <div className="space-y-5 max-w-lg bg-slate-50 p-6 rounded-2xl border border-slate-200">
                  <h3 className="font-semibold text-slate-800">Form Pengajuan Pindah Ruangan</h3>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Nama Ruangan Baru <span className="text-red-500">*</span></label>
                    <input 
                      type="text" 
                      value={inputRuanganBaru}
                      onChange={(e) => setInputRuanganBaru(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:bg-white focus:ring-2 focus:ring-[#06125C]/20 focus:border-[#06125C] transition-all outline-none text-slate-700"
                      placeholder="Contoh: R. Sidang 2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Alasan Pindah <span className="text-red-500">*</span></label>
                    <textarea 
                      value={alasanPindah}
                      onChange={(e) => setAlasanPindah(e.target.value)}
                      rows={3}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:bg-white focus:ring-2 focus:ring-[#06125C]/20 focus:border-[#06125C] transition-all outline-none text-slate-700 resize-none"
                      placeholder="Jelaskan alasan pemindahan ruangan"
                    />
                  </div>
                  <div className="flex gap-3">
                    <button 
                      onClick={() => setRuanganStatus("submitted")}
                      className="px-6 py-2.5 rounded-xl font-medium transition-all flex items-center gap-2 bg-slate-200 text-slate-700 hover:bg-slate-300"
                    >
                      Batal
                    </button>
                    <button 
                      onClick={() => {
                        if(inputRuanganBaru.trim() && alasanPindah.trim()) handleAjukanPindahRuangan();
                      }}
                      className="bg-[#06125C] hover:bg-[#06125C]/90 text-white px-6 py-2.5 rounded-xl font-medium shadow-md transition-all flex items-center gap-2"
                    >
                      Kirim Pengajuan
                    </button>
                  </div>
                </div>
              )}

              {ruanganStatus === "waiting_approval" && (
                <div className="p-6 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-amber-200/50 flex items-center justify-center text-amber-600 shrink-0">
                    <Clock size={24} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-800 mb-1">Sedang Menunggu Diverifikasi</h3>
                    <p className="text-sm text-slate-600 mb-2">Pengajuan pindah ruangan ke <span className="font-bold">{inputRuanganBaru}</span> sedang ditinjau oleh Admin.</p>
                    <button 
                      onClick={() => {
                        setRuanganName(inputRuanganBaru);
                        setRuanganStatus("change_approved");
                      }}
                      className="text-xs bg-slate-200 hover:bg-slate-300 text-slate-600 px-3 py-1 rounded mt-2 border border-slate-300 transition-colors"
                      title="Klik untuk mensimulasikan Admin menyetujui"
                    >
                      [Simulasi] Setujui Pengajuan
                    </button>
                  </div>
                </div>
              )}

              {ruanganStatus === "change_approved" && (
                <div className="p-6 bg-green-50 border border-green-200 rounded-xl flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-green-200/50 flex items-center justify-center text-green-600 shrink-0">
                    <CheckCircle2 size={24} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-800 mb-1">Pindah Ruangan Disetujui</h3>
                    <p className="text-sm text-slate-600">Telah diubah oleh admin. Ruangan Anda sekarang adalah <span className="font-bold text-green-700">{ruanganName}</span>.</p>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Konfirmasi Ruangan */}
            {showRuanganModal && (
              <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
                <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                  <div className="p-6">
                    <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mb-4">
                      <MapPin size={24} />
                    </div>
                    <h3 className="text-lg font-bold text-slate-800 mb-2">Konfirmasi Simpan Ruangan</h3>
                    <p className="text-slate-600 text-sm mb-4">
                      Apakah Anda yakin ingin menyimpan ruangan <strong>{inputRuangan}</strong>? Ruangan yang diinputkan <span className="text-red-500 font-medium">tidak dapat diubah setelah disimpan</span>.
                    </p>
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-xs leading-relaxed mb-6">
                      <strong>Perhatian:</strong> Jika di kemudian hari ternyata ruangan tersebut tidak tersedia atau digunakan pihak lain, Anda harus mengajukan permohonan pindah ruangan kepada Admin.
                    </div>
                    
                    <div className="flex gap-3 justify-end">
                      <button 
                        onClick={() => setShowRuanganModal(false)}
                        className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                      >
                        Batal
                      </button>
                      <button 
                        onClick={handleSimpanRuangan}
                        className="px-4 py-2 text-sm font-medium text-white bg-[#06125C] hover:bg-[#06125C]/90 rounded-lg shadow transition-colors"
                      >
                        Ya, Simpan Ruangan
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab Content: Pengumuman */}
        {activeTab === "pengumuman" && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#06125C]/5 rounded-bl-[100px] pointer-events-none" />
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <h2 className="text-xl font-bold text-[#06125C] flex items-center gap-2">
                  <Calendar className="text-amber-500" /> Jadwal Seminar Final
                </h2>
                <div className="bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg text-sm font-medium border border-blue-100 flex items-center gap-2">
                  <CheckCircle2 size={16} /> Jadwal Resmi Dirilis
                </div>
              </div>

              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200 mb-6">
                <div className="flex-1 flex items-center gap-3 bg-white px-4 py-2.5 rounded-xl border border-slate-200 focus-within:ring-2 focus-within:ring-[#06125C]/20 transition-all">
                  <Search size={18} className="text-slate-400" />
                  <input 
                    type="text" 
                    placeholder="Cari nama penyaji atau pembahas..." 
                    value={pengumumanSearch}
                    onChange={(e) => setPengumumanSearch(e.target.value)}
                    className="bg-transparent text-sm outline-none w-full text-slate-700"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <Filter size={18} className="text-slate-400" />
                  <select 
                    value={pengumumanKelasFilter}
                    onChange={(e) => setPengumumanKelasFilter(e.target.value)}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-[#06125C]/20 outline-none text-sm font-medium min-w-[150px]"
                  >
                    <option value="Semua Kelas">Semua Kelas</option>
                    {Array.from(new Set(pengumuman.map(p => p.kelas))).filter(k => k !== "-").sort().map(k => (
                      <option key={k} value={k}>{k}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-slate-200">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-sm text-slate-500 whitespace-nowrap">
                      <th className="p-4 font-semibold">Penyaji</th>
                      <th className="p-4 font-semibold">Kelas</th>
                      <th className="p-4 font-semibold">Pembimbing</th>
                      <th className="p-4 font-semibold">Jadwal & Ruangan</th>
                      <th className="p-4 font-semibold">Pembahas</th>
                      <th className="p-4 font-semibold">Moderator</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    {filteredPengumuman.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-slate-500">
                          Tidak ada jadwal pengumuman saat ini. (Admin belum mengatur kelas & pengumuman di dummy data).
                        </td>
                      </tr>
                    ) : (
                      filteredPengumuman.map((item, index) => {
                        const isTugasPembahas = item.pembahas.includes(user.nama);
                        const isPast = item.waktuMulai ? new Date(item.waktuMulai) < new Date() : false;
                        return (
                        <tr 
                          key={item.id} 
                          className={`border-b border-slate-100 transition-colors ${index === filteredPengumuman.length - 1 ? 'border-b-0' : ''} ${isPast ? 'bg-slate-50/70 opacity-70 grayscale-[20%]' : item.isSelf ? 'bg-amber-50 hover:bg-amber-100/50' : isTugasPembahas ? 'bg-indigo-50 hover:bg-indigo-100/50' : 'hover:bg-slate-50/50'}`}
                        >
                        <td className="p-4 align-top">
                           <div className="font-bold text-[#06125C] text-base flex flex-wrap items-center gap-2">
                             {item.mahasiswa}
                             {isPast && <span className="bg-indigo-100 text-indigo-700 text-[10px] px-2 py-0.5 rounded uppercase tracking-wider font-bold shadow-sm">Selesai</span>}
                           </div>
                           <div className="text-xs text-slate-500 mt-0.5">{item.nim}</div>
                           {item.isSelf && (
                             <span className="mt-2 inline-flex items-center gap-1 bg-amber-500 text-white text-[10px] px-2.5 py-1 rounded-md uppercase tracking-wider font-bold shadow-sm">
                               Jadwal Anda
                             </span>
                           )}
                        </td>
                        <td className="p-4 align-top text-slate-700 font-medium whitespace-nowrap">
                          {item.kelas && item.kelas !== '-' ? `Kelas ${item.kelas.replace('Kelas ', '')}` : <span className="text-slate-400 italic font-normal">Belum diatur</span>}
                        </td>
                        <td className="p-4 align-top">
                           <div className="text-sm text-slate-700 flex items-center gap-2 font-medium">
                             <UserCircle size={14} className="text-slate-400 shrink-0" /> <span className="line-clamp-2">{item.dospem || <span className="text-slate-400 italic font-normal">Belum diatur</span>}</span>
                           </div>
                        </td>
                        <td className="p-4 align-top whitespace-nowrap">
                          <div className="flex flex-col gap-1.5">
                            <div className="flex items-center gap-2 font-medium text-slate-800 text-sm">
                               <Calendar size={14} className="text-[#06125C]" /> {item.tanggal}
                            </div>
                            <div className="flex items-center gap-2 text-sm text-slate-600 font-medium">
                               <Clock size={14} className="text-amber-500" /> {item.waktu}
                            </div>
                            <div className="flex items-center gap-2 text-sm text-slate-500 font-medium">
                               <MapPin size={14} className="text-slate-400" /> {item.ruangan}
                            </div>
                          </div>
                        </td>
                        <td className="p-4 align-top">
                          <div className="flex flex-col items-start gap-1.5">
                            <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                              <UserCircle size={14} className={isTugasPembahas ? "text-indigo-600 shrink-0" : "text-slate-400 shrink-0"} /> 
                              <span className="line-clamp-2">{item.pembahas !== '-' ? item.pembahas : <span className="text-slate-400 italic font-normal">Belum diatur</span>}</span>
                            </div>
                            {isTugasPembahas && <span className="bg-indigo-500 text-white text-[9px] px-2 py-0.5 rounded uppercase tracking-wider font-bold shadow-sm mt-0.5">Tugas Anda</span>}
                          </div>
                        </td>
                        <td className="p-4 align-top">
                          <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                            <UserCheck size={14} className="text-[#06125C] shrink-0" /> <span className="line-clamp-2">{item.moderator !== '-' ? item.moderator : <span className="text-slate-400 italic font-normal">Belum diatur</span>}</span>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
          </>
        )}
      </main>

      {/* Modal Ubah Password */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => !['loading', 'success'].includes(passwordStatus) && setShowPasswordModal(false)}></div>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden relative z-10 animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-[#06125C] px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Lock size={20} />
                Ubah Password
              </h3>
              <button 
                onClick={() => setShowPasswordModal(false)}
                disabled={['loading', 'success'].includes(passwordStatus)}
                className="text-white/70 hover:text-white transition-colors"
              >
                <XCircle size={24} />
              </button>
            </div>
            
            {passwordStatus === "success" ? (
              <div className="p-8 text-center">
                <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 size={32} />
                </div>
                <h4 className="text-lg font-bold text-slate-800 mb-2">Berhasil!</h4>
                <p className="text-slate-600">Password Anda berhasil diperbarui.</p>
              </div>
            ) : (
              <form onSubmit={handleUpdatePassword} className="p-6 space-y-4">
                {passwordStatus === "error" && (
                  <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm border border-red-100 flex items-start gap-3">
                    <XCircle size={18} className="shrink-0 mt-0.5" />
                    <span>{passwordError}</span>
                  </div>
                )}
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Password Saat Ini</label>
                  <input
                    type="password"
                    required
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#06125C]/20 outline-none transition-all"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Password Baru</label>
                  <input
                    type="password"
                    required
                    minLength={4}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimal 4 karakter"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#06125C]/20 outline-none transition-all"
                  />
                </div>

                <div className="pt-4 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowPasswordModal(false)}
                    disabled={passwordStatus === "loading"}
                    className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-bold transition-colors"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={passwordStatus === "loading"}
                    className="flex-1 px-4 py-2.5 bg-[#06125C] hover:bg-[#06125C]/90 text-white rounded-xl text-sm font-bold transition-colors disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {passwordStatus === "loading" ? (
                      <>Menyimpan...</>
                    ) : (
                      <>Simpan Password</>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-slate-100 border-t border-slate-200 py-6 mt-auto">
        <div className="max-w-7xl mx-auto px-6 flex justify-center items-center">
          <p className="text-slate-600 text-sm text-center">
            © {new Date().getFullYear()} Seminar Hub AKN SV IPB University. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
