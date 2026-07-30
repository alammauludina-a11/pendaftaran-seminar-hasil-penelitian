"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { authClient, changePassword } from "../../../lib/auth-client";
import { useSession } from "../../../lib/auth-client";
import { useState, useEffect } from "react";
import { Users, Monitor, ShieldCheck, Calendar, ArrowRight, LogOut, CheckCircle2, Clock, MapPin, Search, UserCheck, AlertCircle, Filter, ChevronLeft, ChevronRight, X, BookOpen, Lock, ArrowUpDown } from "lucide-react";

export default function DosenDashboard() {
   const router = useRouter();
   const handleLogout = async () => {
      await authClient.signOut();
      router.push("/");
   };

   const [showPasswordModal, setShowPasswordModal] = useState(false);
   const [currentPassword, setCurrentPassword] = useState("");
   const [newPassword, setNewPassword] = useState("");
   const [passwordStatus, setPasswordStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
   const [passwordError, setPasswordError] = useState("");

   const [sortConfigModerasi, setSortConfigModerasi] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
   const [sortConfigBimbingan, setSortConfigBimbingan] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

   const handleSortModerasi = (key: string) => {
      let direction: 'asc' | 'desc' = 'asc';
      if (sortConfigModerasi && sortConfigModerasi.key === key && sortConfigModerasi.direction === 'asc') {
         direction = 'desc';
      }
      setSortConfigModerasi({ key, direction });
   };

   const handleSortBimbingan = (key: string) => {
      let direction: 'asc' | 'desc' = 'asc';
      if (sortConfigBimbingan && sortConfigBimbingan.key === key && sortConfigBimbingan.direction === 'asc') {
         direction = 'desc';
      }
      setSortConfigBimbingan({ key, direction });
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

   const { data: sessionData } = useSession();
   const dosenUser = {
      nama: (sessionData?.user as any)?.nama || sessionData?.user?.name || "Dosen",
      nip: (sessionData?.user as any)?.nipNim || "-",
   };

   const [selectedDate, setSelectedDate] = useState<string | null>(null);
   const [bimbingan, setBimbingan] = useState<any[]>([]);
   const [availableKelas, setAvailableKelas] = useState<any[]>([]);
   const [myModerasi, setMyModerasi] = useState<any[]>([]);
   const [activePeriode, setActivePeriode] = useState<any>(null);
   const [isLoading, setIsLoading] = useState(true);
   const [isSubmittingModerasi, setIsSubmittingModerasi] = useState(false);
   const [allPeriode, setAllPeriode] = useState<any[]>([]);
   const [selectedPeriodeId, setSelectedPeriodeId] = useState<string | null>(null);
   const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
   const [availableSlots, setAvailableSlots] = useState<any[]>([]);

   useEffect(() => {
      fetchData(selectedPeriodeId);
      fetchModerator(selectedPeriodeId);
   }, [selectedPeriodeId]);

   useEffect(() => {
      fetchAvailableSlots();
   }, []);

   const fetchData = async (periodeId?: string | null) => {
      try {
         setIsLoading(true);
         const url = periodeId ? `/api/dosen/dashboard?periodeId=${periodeId}` : "/api/dosen/dashboard";
         const res = await fetch(url);
         const data = await res.json();
         setBimbingan(data.bimbingan || []);
         setAllPeriode(data.allPeriode || []);
         if (data.activePeriodeData && !selectedPeriodeId && !periodeId) {
             setSelectedPeriodeId(data.activePeriodeData.id.toString());
         }
      } catch (e) {
         console.error(e);
      } finally {
         setIsLoading(false);
      }
   };

   const fetchModerator = async (periodeId?: string | null) => {
      try {
         const url = periodeId ? `/api/dosen/moderator?periodeId=${periodeId}` : "/api/dosen/moderator";
         const res = await fetch(url);
         const data = await res.json();
         setAvailableKelas(data.availableKelas || []);
         setMyModerasi(data.myModerasi || []);
         setActivePeriode(data.activePeriodeData || null);
      } catch (e) {
         console.error(e);
      }
   };

   const fetchAvailableSlots = async () => {
      try {
         const res = await fetch("/api/mahasiswa/slot");
         const data = await res.json();
         setAvailableSlots(data.availableSlots || []);
      } catch (e) {
         console.error(e);
      }
   };

   useEffect(() => {
      if (activePeriode?.startDate) {
         setCurrentMonth(new Date(activePeriode.startDate));
      }
   }, [activePeriode]);

   const handlePilihModerator = async (pendaftaranId: string | number) => {
      try {
         setIsSubmittingModerasi(true);
         const res = await fetch("/api/dosen/moderator", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ pendaftaranId })
         });
         const data = await res.json();
         if (res.ok) {
            alert(data.message);
            fetchData(selectedPeriodeId);
            fetchModerator(selectedPeriodeId);
         } else {
            alert(data.error);
         }
      } catch (e) {
         console.error(e);
         alert("Terjadi kesalahan.");
      } finally {
         setIsSubmittingModerasi(false);
      }
   };

   // Modal States
   const [isModalSelesaiOpen, setIsModalSelesaiOpen] = useState(false);
   const [isModalModerasiOpen, setIsModalModerasiOpen] = useState(false);
   const [isModalBimbinganOpen, setIsModalBimbinganOpen] = useState(false);
   const [isModalSelesaiBimbinganOpen, setIsModalSelesaiBimbinganOpen] = useState(false);

   // Pre-compute lists for Modals
   const futureModerasiStudentsRaw = myModerasi
      .filter(m => m.isFuture || m.isToday)
      .flatMap(m => (m.students || []).filter((s: any) => s.isMyModeration).map((s: any) => ({ ...s, classData: m })));

   const futureModerasiStudents = [...futureModerasiStudentsRaw].sort((a: any, b: any) => {
      if (!sortConfigModerasi) return 0;
      let aVal = a[sortConfigModerasi.key];
      let bVal = b[sortConfigModerasi.key];
      
      if (sortConfigModerasi.key === 'nama') {
          aVal = a.nama; bVal = b.nama;
      } else if (sortConfigModerasi.key === 'nim') {
          aVal = a.nim; bVal = b.nim;
      } else if (sortConfigModerasi.key === 'date') {
          aVal = new Date(a.waktuMulai || 0).getTime();
          bVal = new Date(b.waktuMulai || 0).getTime();
      }

      if (aVal < bVal) return sortConfigModerasi.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfigModerasi.direction === 'asc' ? 1 : -1;
      return 0;
   });

   const pastModerasiStudents = myModerasi
      .filter(m => m.isPast)
      .flatMap(m => (m.students || []).filter((s: any) => s.isMyModeration).map((s: any) => ({ ...s, classData: m })));

   const bimbinganMendatangRaw = bimbingan.filter(b => b.isFuture || b.isToday);
   const bimbinganMendatang = [...bimbinganMendatangRaw].sort((a: any, b: any) => {
      if (!sortConfigBimbingan) return 0;
      let aVal = a[sortConfigBimbingan.key];
      let bVal = b[sortConfigBimbingan.key];
      
      if (sortConfigBimbingan.key === 'nama') {
          aVal = a.name; bVal = b.name;
      } else if (sortConfigBimbingan.key === 'nim') {
          aVal = a.nim; bVal = b.nim;
      } else if (sortConfigBimbingan.key === 'date') {
          aVal = new Date(a.waktuMulai || 0).getTime();
          bVal = new Date(b.waktuMulai || 0).getTime();
      }

      if (aVal < bVal) return sortConfigBimbingan.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfigBimbingan.direction === 'asc' ? 1 : -1;
      return 0;
   });

   // Filter classes by selected date
   const filteredClasses = selectedDate
      ? availableKelas.filter(c => c.isoDates?.includes(selectedDate))
      : availableKelas;

   const getCalendarDates = () => {
      const year = currentMonth.getFullYear();
      const month = currentMonth.getMonth();
      const daysInMonth = new Date(year, month + 1, 0).getDate();

      const dates = [];
      for (let i = 1; i <= daysInMonth; i++) {
         dates.push(new Date(year, month, i));
      }
      return dates;
   }

   const calendarDates = getCalendarDates();
   const monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
   const displayMonth = `${monthNames[currentMonth.getMonth()]} ${currentMonth.getFullYear()}`;

   const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
   const firstDayOffset = firstDayOfMonth.getDay() === 0 ? 6 : firstDayOfMonth.getDay() - 1;

   const handlePrevMonth = () => {
      setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
   };

   const handleNextMonth = () => {
      setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
   };

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
                     />
                  </div>
                  <span className="font-semibold text-xl tracking-tight hidden sm:block">Seminar Hub - Portal Dosen</span>
                  <span className="font-semibold text-xl tracking-tight sm:hidden">Portal Dosen</span>
               </div>
               <div className="flex items-center gap-4">
                  {allPeriode.length > 0 && (
                     <select
                        value={selectedPeriodeId || ""}
                        onChange={(e) => setSelectedPeriodeId(e.target.value)}
                        className="bg-white/10 text-white text-sm rounded-lg px-3 py-2 outline-none border border-white/20 hover:bg-white/20 transition-colors focus:ring-2 focus:ring-white/50 cursor-pointer hidden md:block"
                     >
                        {allPeriode.filter(p => !p.isDraft).map(p => {
                           const sd = p.startDate ? new Date(p.startDate).toLocaleDateString('id-ID', {day: 'numeric', month: 'short'}) : '';
                           const ed = p.endDate ? new Date(p.endDate).toLocaleDateString('id-ID', {day: 'numeric', month: 'short'}) : '';
                           const dateRange = sd && ed ? ` (${sd} - ${ed})` : '';
                           const jenisStr = p.jenisSeminar === "kolokium" ? "Kolokium" : "Hasil";
                           return (
                              <option key={p.id} value={p.id} className="text-slate-800">
                                 {jenisStr} - Angkatan {p.angkatan}{dateRange} {p.isOpen ? "(Aktif)" : ""}
                              </option>
                           );
                        })}
                     </select>
                  )}
                  <div className="hidden md:flex flex-col text-right mr-2">
                     <span className="text-sm font-semibold">{dosenUser.nama}</span>
                     <span className="text-xs text-blue-200">NIP: {dosenUser.nip}</span>
                  </div>
                  <div className="h-10 w-10 rounded-full bg-amber-500 flex items-center justify-center text-white font-bold border-2 border-white">
                     {dosenUser.nama.split(' ').slice(0, 2).map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)}
                  </div>
                  <button onClick={() => setShowPasswordModal(true)} className="p-2 hover:bg-white/10 rounded-lg transition-colors ml-2 flex items-center gap-2" title="Ubah Password">
                     <Lock size={20} className="text-white" />
                     <span className="hidden sm:inline font-medium">Ubah Password</span>
                  </button>
                  <button onClick={handleLogout} className="p-2 hover:bg-white/10 rounded-lg transition-colors ml-2 flex items-center gap-2" title="Keluar">
                     <LogOut size={20} className="text-red-300" />
                     <span className="hidden sm:inline font-medium text-red-300">Keluar</span>
                  </button>
               </div>
            </div>
         </nav>

         {/* Main Content */}
         <main className="flex-grow flex flex-col max-w-7xl mx-auto w-full px-6 py-8 gap-8">



            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
               <div
                  onClick={() => setIsModalModerasiOpen(true)}
                  className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4 cursor-pointer hover:border-[#06125C]/30 hover:shadow-md transition-all group"
               >
                  <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center text-[#06125C] group-hover:scale-110 transition-transform">
                     <Monitor size={24} />
                  </div>
                  <div>
                     <p className="text-sm text-slate-500 font-medium group-hover:text-[#06125C] transition-colors">Jadwal Memoderatori Mendatang</p>
                     <p className="text-2xl font-bold text-[#06125C]">{futureModerasiStudents.length}</p>
                  </div>
               </div>

               <div
                  onClick={() => setIsModalBimbinganOpen(true)}
                  className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4 cursor-pointer hover:border-indigo-300 hover:shadow-md transition-all group"
               >
                  <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-600 group-hover:scale-110 transition-transform">
                     <UserCheck size={24} />
                  </div>
                  <div>
                     <p className="text-sm text-slate-500 font-medium group-hover:text-indigo-700 transition-colors">Jadwal Seminar Bimbingan Mendatang</p>
                     <p className="text-2xl font-bold text-slate-800">{bimbinganMendatang.length}</p>
                  </div>
               </div>

               <div
                  onClick={() => setIsModalSelesaiOpen(true)}
                  className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4 cursor-pointer hover:border-emerald-300 hover:shadow-md transition-all group"
               >
                  <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform">
                     <CheckCircle2 size={24} />
                  </div>
                  <div>
                     <p className="text-sm text-slate-500 font-medium group-hover:text-emerald-700 transition-colors">Selesai Memoderatori</p>
                     <p className="text-2xl font-bold text-slate-800">{pastModerasiStudents.length}</p>
                  </div>
               </div>

               <div
                  onClick={() => setIsModalSelesaiBimbinganOpen(true)}
                  className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4 cursor-pointer hover:border-teal-300 hover:shadow-md transition-all group"
               >
                  <div className="w-12 h-12 rounded-xl bg-teal-100 flex items-center justify-center text-teal-600 group-hover:scale-110 transition-transform">
                     <BookOpen size={24} />
                  </div>
                  <div>
                     <p className="text-sm text-slate-500 font-medium group-hover:text-teal-700 transition-colors">Selesai Membimbing Seminar</p>
                     <p className="text-2xl font-bold text-slate-800">{bimbingan.filter(b => b.isPast).length}</p>
                  </div>
               </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
               {/* Jadwal Saya (Left column, takes 1/3) */}
               <div className="lg:col-span-1 flex flex-col gap-8">

                  {/* Jadwal Bimbingan Hari Ini */}
                  <div className="flex flex-col gap-4">
                     <h2 className="text-xl font-bold text-[#06125C] flex items-center gap-2">
                        <UserCheck className="text-indigo-500" /> Seminar Bimbingan Hari Ini
                     </h2>
                     <div className="flex flex-col gap-4">
                        {bimbingan.filter(b => b.isToday).length === 0 ? (
                           <div className="bg-slate-50 border border-slate-200 border-dashed p-6 rounded-2xl text-center text-slate-500 flex flex-col items-center justify-center">
                              <Calendar size={32} className="text-slate-300 mb-2" />
                              <p className="text-sm">Tidak ada jadwal kehadiran bimbingan pada hari ini.</p>
                           </div>
                        ) : (
                           bimbingan.filter(b => b.isToday).map((item, idx) => (
                              <div key={idx} className="bg-indigo-600 text-white p-5 rounded-2xl shadow-md relative overflow-hidden group">
                                 <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/3 blur-xl pointer-events-none" />
                                 <div className="space-y-3 relative z-10">
                                    <div className="flex flex-col">
                                       <span className="font-bold text-lg">{item.name}</span>
                                       <span className="text-xs text-indigo-200">{item.nim}</span>
                                    </div>
                                    <hr className="border-white/20" />
                                    <div className="flex items-center gap-3">
                                       <Clock size={18} className="text-amber-400" />
                                       <span className="text-sm font-medium">Hari Ini • {item.time}</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                       <MapPin size={18} className="text-indigo-300" />
                                       <span className="text-sm font-medium">{item.room || "Ruangan belum ditentukan"}</span>
                                    </div>
                                 </div>
                              </div>
                           ))
                        )}
                     </div>
                  </div>

                  {/* Jadwal Moderasi Hari Ini */}
                  <div className="flex flex-col gap-4">
                     <h2 className="text-xl font-bold text-[#06125C] flex items-center gap-2">
                        <Monitor className="text-blue-500" /> Memoderatori Hari Ini
                     </h2>
                     <div className="flex flex-col gap-4">
                        {myModerasi.filter(m => m.isToday).length === 0 ? (
                           <div className="bg-slate-50 border border-slate-200 border-dashed p-6 rounded-2xl text-center text-slate-500 flex flex-col items-center justify-center">
                              <Calendar size={32} className="text-slate-300 mb-2" />
                              <p className="text-sm">Tidak ada kelas untuk dimoderatori pada hari ini.</p>
                           </div>
                        ) : (
                           myModerasi.filter(m => m.isToday).map((item, idx) => (
                              <div key={item.moderatorId} className="bg-[#06125C] text-white p-5 rounded-2xl shadow-md relative overflow-hidden group">
                                 <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/3 blur-xl pointer-events-none" />
                                 <div className="space-y-3 relative z-10">
                                    <div className="flex flex-col">
                                       <span className="font-bold text-lg">{item.namaKelas}</span>
                                    </div>
                                    <hr className="border-white/20" />
                                    <div className="flex items-center gap-3">
                                       <Clock size={18} className="text-amber-400" />
                                       <span className="text-sm font-medium">Hari Ini • {item.time}</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                       <MapPin size={18} className="text-blue-300" />
                                       <span className="text-sm font-medium">Lihat detail untuk ruangan</span>
                                    </div>
                                 </div>
                              </div>
                           ))
                        )}
                     </div>
                  </div>

               </div>

               {/* Pilih Kelas Moderator (Right column, takes 2/3) */}
               <div className="lg:col-span-2 flex flex-col gap-4">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end flex-wrap gap-4">
                     <div className="space-y-1">
                        <h2 className="text-xl font-bold text-[#06125C] flex items-center gap-2">
                           <Search className="text-amber-500" /> Kelas Tersedia untuk Dimoderatori
                        </h2>
                        <p className="text-sm text-slate-500 flex items-center gap-1.5">
                           <Clock size={14} /> Menampilkan jadwal yang belum memiliki moderator
                        </p>
                     </div>

                     <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-slate-200 shadow-sm">
                        <Filter size={16} className="text-slate-400" />
                        <label htmlFor="dateFilter" className="text-sm font-medium text-slate-600 mr-1">Tampilkan Semua:</label>
                        <button
                           onClick={() => setSelectedDate(null)}
                           className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${selectedDate === null ? 'bg-[#06125C] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                        >
                           Semua Tanggal
                        </button>
                     </div>
                  </div>

                  {/* Split Layout: Calendar (Left) & List (Right) */}
                  <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start mt-2">

                     {/* Interactive Calendar Overview */}
                     <div className="xl:col-span-5 bg-white rounded-2xl border border-slate-200 shadow-sm p-5 sticky top-28">
                        <div className="flex items-center justify-between mb-4">
                           <h3 className="font-bold text-sm text-[#06125C]">{displayMonth}</h3>
                           <div className="flex gap-1">
                              <button onClick={handlePrevMonth} className="p-1.5 hover:bg-slate-100 rounded-md transition-colors"><ChevronLeft size={16} className="text-slate-600" /></button>
                              <button onClick={handleNextMonth} className="p-1.5 hover:bg-slate-100 rounded-md transition-colors"><ChevronRight size={16} className="text-slate-600" /></button>
                           </div>
                        </div>
                        <div className="grid grid-cols-7 gap-2 text-center text-xs">
                           <div className="text-slate-400 font-medium pb-2">Sen</div>
                           <div className="text-slate-400 font-medium pb-2">Sel</div>
                           <div className="text-slate-400 font-medium pb-2">Rab</div>
                           <div className="text-slate-400 font-medium pb-2">Kam</div>
                           <div className="text-slate-400 font-medium pb-2">Jum</div>
                           <div className="text-slate-400 font-medium pb-2">Sab</div>
                           <div className="text-slate-400 font-medium pb-2">Min</div>

                           {/* Empty slots for offset */}
                           {Array.from({ length: firstDayOffset }).map((_, i) => (
                              <div key={`offset-${i}`}></div>
                           ))}

                           {/* Dynamic Dates */}
                           {calendarDates.map((d) => {
                              const isoDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                              const classesOnDate = availableKelas.filter(c => c.isoDates?.includes(isoDate));
                              const hasClasses = classesOnDate.length > 0;
                              const hasClash = classesOnDate.length > 1;
                              const isSelected = selectedDate === isoDate;
                              const dateNum = d.getDate();

                              let cellClass = "aspect-square flex items-center justify-center rounded-lg cursor-pointer transition-all relative ";

                              const isWithinPeriod = activePeriode && activePeriode.startDate && activePeriode.endDate
                                 ? isoDate >= activePeriode.startDate.split('T')[0] && isoDate <= activePeriode.endDate.split('T')[0]
                                 : false;

                              if (isSelected) {
                                 cellClass += "bg-[#06125C] text-white font-bold shadow-md scale-105";
                              } else if (hasClasses) {
                                 cellClass += "bg-blue-50 text-[#06125C] font-semibold border border-blue-200 hover:bg-blue-100 hover:scale-105";
                              } else if (!isWithinPeriod) {
                                 cellClass += "text-slate-300 font-medium cursor-not-allowed";
                              } else {
                                 cellClass += "hover:bg-slate-100 text-slate-500 font-medium";
                              }

                              return (
                                 <div
                                    key={isoDate}
                                    className={cellClass}
                                    onClick={() => {
                                       if (isWithinPeriod || hasClasses) {
                                          setSelectedDate(isoDate);
                                       }
                                    }}
                                 >
                                    {dateNum}
                                    {hasClasses && !isSelected && (
                                       <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-amber-500 rounded-full border border-white flex items-center justify-center text-[7px] text-white font-bold">
                                          {classesOnDate.length}
                                       </div>
                                    )}
                                    {hasClasses && isSelected && (
                                       <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-amber-500 rounded-full border border-[#06125C] flex items-center justify-center text-[7px] text-white font-bold">
                                          {classesOnDate.length}
                                       </div>
                                    )}
                                    {hasClash && (
                                       <div className={`absolute -bottom-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border ${isSelected ? 'border-[#06125C]' : 'border-white'}`}></div>
                                    )}
                                 </div>
                              );
                           })}
                        </div>
                        <div className="mt-5 flex flex-col gap-2.5 text-[11px] pt-4 border-t border-slate-100">
                           <div className="flex items-center gap-2"><div className="w-3 h-3 bg-[#06125C] rounded-sm"></div> <span className="text-slate-500">Tanggal Terpilih</span></div>
                           <div className="flex items-center gap-2"><div className="w-3 h-3 bg-blue-50 border border-blue-200 rounded-sm flex items-center justify-center"><div className="w-1.5 h-1.5 bg-amber-500 rounded-full"></div></div> <span className="text-slate-500">Ada Kelas (Angka = Jumlah)</span></div>
                           <div className="flex items-center gap-2"><div className="w-3 h-3 bg-red-500 rounded-full"></div> <span className="text-slate-500">Ada Jadwal Bentrok</span></div>
                        </div>
                     </div>

                     {/* List of Classes */}
                     <div className="xl:col-span-7 flex flex-col gap-4">
                        {filteredClasses.length === 0 ? (
                           <div className="bg-white p-10 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center gap-4 text-slate-500">
                              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-slate-400">
                                 <Calendar size={32} />
                              </div>
                              <div>
                                 <p className="font-semibold text-slate-700">Tidak ada kelas tersedia</p>
                                 <p className="text-sm mt-1">
                                    {selectedDate ? "Tidak ada kelas yang membutuhkan moderator pada tanggal ini." : "Semua kelas sudah memiliki moderator, atau belum ada kelas yang terbentuk."}
                                 </p>
                              </div>
                              {selectedDate && (
                                 <button
                                    onClick={() => setSelectedDate(null)}
                                    className="mt-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-medium transition-colors"
                                 >
                                    Lihat Semua Tanggal
                                 </button>
                              )}
                           </div>
                        ) : (
                           filteredClasses.map((cls) => (
                              <div key={cls.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-3 hover:border-[#06125C]/30 hover:shadow-md transition-all">
                                 <div className="flex items-center justify-between">
                                    <span className="bg-[#06125C]/10 text-[#06125C] text-[11px] font-bold px-2.5 py-1 rounded-full">Kelas {cls.name.replace('Kelas ', '')}</span>
                                 </div>
                                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-500 text-xs">
                                    <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                                       <Calendar size={14} />
                                       <span>{cls.fullDate || cls.date} • {cls.time}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                       <MapPin size={14} />
                                       <span>{(cls.students && cls.students[0]?.room) || "Belum ada ruangan"}</span>
                                    </div>
                                    <div className="flex flex-col gap-1.5 sm:col-span-2 mt-1">
                                       <div className="flex items-center gap-1.5 text-slate-700 font-medium mb-2">
                                          <Users size={14} />
                                          <span>Mahasiswa dalam kelas ini:</span>
                                       </div>
                                       <ul className="space-y-3">
                                          {cls.students && cls.students.map((m: any, i: number) => (
                                             <li key={i} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-3 bg-slate-50 rounded-xl border border-slate-100 gap-3">
                                                <div className="flex flex-col">
                                                   <span className="font-bold text-slate-800 text-sm">{m.nama} <span className="text-slate-500 font-normal">({m.nim})</span></span>
                                                   <span className="text-[11px] text-slate-600 mt-0.5 mb-0.5 flex items-center gap-1.5">
                                                      <UserCheck size={12} className="text-slate-400 shrink-0" />
                                                      <span className="font-medium">Pembimbing:</span> {m.dospem}{m.dospem2 ? `, ${m.dospem2}` : ""}
                                                   </span>
                                                   <span className="text-xs text-slate-500 mt-0.5 line-clamp-1" title={m.judul}>{m.judul}</span>
                                                   <div className="flex items-center gap-2 mt-1.5">
                                                      <span className="text-[10px] font-bold bg-[#06125C]/10 text-[#06125C] px-2 py-0.5 rounded-full">{m.time}</span>
                                                      {m.hasModerator && (
                                                         <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${m.isMyModeration ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"}`}>
                                                            {m.isMyModeration ? "Dimoderatori Anda" : "Sudah dipilih"}
                                                         </span>
                                                      )}
                                                   </div>
                                                </div>
                                                {!m.hasModerator && (
                                                   <button
                                                      onClick={() => handlePilihModerator(m.pendaftaranId)}
                                                      disabled={isSubmittingModerasi || (m.dospem === dosenUser.nama || m.dospem2 === dosenUser.nama)}
                                                      className={`shrink-0 px-3 py-1.5 rounded-lg font-semibold text-[11px] transition-colors flex items-center justify-center gap-1.5 ${(m.dospem === dosenUser.nama || m.dospem2 === dosenUser.nama) ? "bg-slate-200 text-slate-400 cursor-not-allowed" : "bg-[#06125C] hover:bg-[#06125C]/90 text-white disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"}`}
                                                   >
                                                      <ShieldCheck size={14} /> {(m.dospem === dosenUser.nama || m.dospem2 === dosenUser.nama) ? "Anda Pembimbing" : isSubmittingModerasi ? "..." : "Pilih"}
                                                   </button>
                                                )}
                                             </li>
                                          ))}
                                       </ul>
                                    </div>

                                 </div>
                              </div>
                           ))
                        )}
                        {/* List of Available Slots */}
                        {selectedDate && (
                           <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-4 mt-2">
                              <h3 className="font-bold text-[#06125C] flex items-center gap-2">
                                 <Calendar size={18} /> Slot Tersedia (Kosong) pada {new Date(selectedDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                              </h3>
                              <div className="flex flex-wrap gap-2">
                                 {availableSlots.filter(s => s.isoDate === selectedDate).length > 0 ? (
                                    availableSlots.filter(s => s.isoDate === selectedDate).map(slot => (
                                       <div key={slot.id} className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5">
                                          <CheckCircle2 size={14} /> {slot.time}
                                       </div>
                                    ))
                                 ) : (
                                    <p className="text-sm text-slate-500 italic">Tidak ada slot waktu kosong pada tanggal ini.</p>
                                 )}
                              </div>
                           </div>
                        )}
                     </div>

                  </div>
               </div>
            </div>

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
                   <X size={24} />
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
                       <AlertCircle size={18} className="shrink-0 mt-0.5" />
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


         {/* Modal: Total Jadwal Dimoderatori (Mendatang) */}
         {isModalModerasiOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
               <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsModalModerasiOpen(false)}></div>
               <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col relative z-10 overflow-hidden animate-in fade-in zoom-in duration-200">
                  <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                     <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-[#06125C]">
                           <Monitor size={20} />
                        </div>
                        <div>
                           <h3 className="text-lg font-bold text-[#06125C]">Jadwal Memoderatori Mendatang</h3>
                           <p className="text-sm text-slate-500">Daftar mahasiswa yang jadwal seminarnya akan Anda moderatori.</p>
                        </div>
                     </div>
                     <button onClick={() => setIsModalModerasiOpen(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-500">
                        <X size={20} />
                     </button>
                  </div>

                  <div className="p-6 overflow-y-auto">
                     <div className="border border-slate-200 rounded-xl overflow-hidden">
                        <div className="overflow-x-auto">
                           <table className="w-full text-left text-sm whitespace-nowrap">
                              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                                 <tr>
                                    <th className="px-4 py-3 text-center w-12">No</th>
                                    <th className="px-4 py-3 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSortModerasi('nama')}>
                                       <div className="flex items-center justify-between">Nama Mahasiswa <ArrowUpDown size={14} className="text-slate-400" /></div>
                                    </th>
                                    <th className="px-4 py-3 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSortModerasi('nim')}>
                                       <div className="flex items-center justify-between">NIM <ArrowUpDown size={14} className="text-slate-400" /></div>
                                    </th>
                                    <th className="px-4 py-3 max-w-[200px]">Judul Seminar</th>
                                    <th className="px-4 py-3 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSortModerasi('date')}>
                                       <div className="flex items-center justify-between">Jadwal Pelaksanaan <ArrowUpDown size={14} className="text-slate-400" /></div>
                                    </th>
                                    <th className="px-4 py-3">Ruangan</th>
                                 </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                 {futureModerasiStudents.length === 0 ? (
                                    <tr>
                                       <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                                          Belum ada jadwal moderasi mendatang.
                                       </td>
                                    </tr>
                                 ) : (
                                    futureModerasiStudents.map((item, idx) => (
                                       <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                          <td className="px-4 py-3 text-slate-500 text-center">{idx + 1}</td>
                                          <td className="px-4 py-3 font-medium text-[#06125C]">{item.nama}</td>
                                          <td className="px-4 py-3 text-slate-500">{item.nim}</td>
                                          <td className="px-4 py-3 text-slate-600 max-w-[200px] truncate" title={item.judul}>{item.judul}</td>
                                          <td className="px-4 py-3 text-slate-500">{item.dateStr || item.classData?.date} • {item.time}</td>
                                          <td className="px-4 py-3 text-slate-500">{item.room || "-"}</td>
                                       </tr>
                                    ))
                                 )}
                              </tbody>
                           </table>
                        </div>
                     </div>
                  </div>
                  <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
                     <button onClick={() => setIsModalModerasiOpen(false)} className="px-6 py-2.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl font-semibold transition-colors shadow-sm">Tutup</button>
                  </div>
               </div>
            </div>
         )}

         {/* Modal: Total Jadwal Bimbingan (Mendatang) */}
         {isModalBimbinganOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
               <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsModalBimbinganOpen(false)}></div>
               <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col relative z-10 overflow-hidden animate-in fade-in zoom-in duration-200">
                  <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                     <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                           <UserCheck size={20} />
                        </div>
                        <div>
                           <h3 className="text-lg font-bold text-[#06125C]">Jadwal Seminar Bimbingan Mendatang</h3>
                           <p className="text-sm text-slate-500">Daftar mahasiswa bimbingan yang jadwal seminarnya akan Anda hadiri.</p>
                        </div>
                     </div>
                     <button onClick={() => setIsModalBimbinganOpen(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-500">
                        <X size={20} />
                     </button>
                  </div>

                  <div className="p-6 overflow-y-auto">
                     <div className="border border-slate-200 rounded-xl overflow-hidden">
                        <div className="overflow-x-auto">
                           <table className="w-full text-left text-sm whitespace-nowrap">
                              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                                 <tr>
                                    <th className="px-4 py-3 text-center w-12">No</th>
                                    <th className="px-4 py-3 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSortBimbingan('nama')}>
                                       <div className="flex items-center justify-between">Nama Mahasiswa <ArrowUpDown size={14} className="text-slate-400" /></div>
                                    </th>
                                    <th className="px-4 py-3 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSortBimbingan('nim')}>
                                       <div className="flex items-center justify-between">NIM <ArrowUpDown size={14} className="text-slate-400" /></div>
                                    </th>
                                    <th className="px-4 py-3 max-w-[200px]">Judul Seminar</th>
                                    <th className="px-4 py-3 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSortBimbingan('date')}>
                                       <div className="flex items-center justify-between">Jadwal Pelaksanaan <ArrowUpDown size={14} className="text-slate-400" /></div>
                                    </th>
                                    <th className="px-4 py-3">Ruangan</th>
                                 </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                 {bimbinganMendatang.length === 0 ? (
                                    <tr>
                                       <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                                          Belum ada jadwal bimbingan mendatang.
                                       </td>
                                    </tr>
                                 ) : (
                                    bimbinganMendatang.map((item, idx) => (
                                       <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                          <td className="px-4 py-3 text-slate-500 text-center">{idx + 1}</td>
                                          <td className="px-4 py-3 font-medium text-slate-700">{item.name}</td>
                                          <td className="px-4 py-3 text-slate-500">{item.nim}</td>
                                          <td className="px-4 py-3 text-slate-600 max-w-[200px] truncate" title={item.title}>{item.title}</td>
                                          <td className="px-4 py-3 text-slate-500">{item.date} • {item.time}</td>
                                          <td className="px-4 py-3 text-slate-500">{item.room || "-"}</td>
                                       </tr>
                                    ))
                                 )}
                              </tbody>
                           </table>
                        </div>
                     </div>
                  </div>
                  <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
                     <button onClick={() => setIsModalBimbinganOpen(false)} className="px-6 py-2.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl font-semibold transition-colors shadow-sm">Tutup</button>
                  </div>
               </div>
            </div>
         )}

         {/* Modal Selesai Dimoderatori */}
         {isModalSelesaiOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
               {/* Backdrop */}
               <div
                  className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                  onClick={() => setIsModalSelesaiOpen(false)}
               ></div>

               {/* Modal Content */}
               <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col relative z-10 overflow-hidden animate-in fade-in zoom-in duration-200">
                  <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                     <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                           <CheckCircle2 size={20} />
                        </div>
                        <div>
                           <h3 className="text-lg font-bold text-[#06125C]">Riwayat Moderasi Selesai</h3>
                           <p className="text-sm text-slate-500">Daftar mahasiswa yang kelas seminarnya telah Anda moderatori.</p>
                        </div>
                     </div>
                     <button
                        onClick={() => setIsModalSelesaiOpen(false)}
                        className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-500"
                     >
                        <X size={20} />
                     </button>
                  </div>

                  <div className="p-6 overflow-y-auto">
                     <div className="border border-slate-200 rounded-xl overflow-hidden">
                        <div className="overflow-x-auto">
                           <table className="w-full text-left text-sm whitespace-nowrap">
                              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                                 <tr>
                                    <th className="px-4 py-3 text-center w-12">No</th>
                                    <th className="px-4 py-3">Nama Mahasiswa</th>
                                    <th className="px-4 py-3">NIM</th>
                                    <th className="px-4 py-3 max-w-[200px]">Judul Seminar</th>
                                    <th className="px-4 py-3">Ruangan</th>
                                    <th className="px-4 py-3">Tanggal Selesai</th>
                                    <th className="px-4 py-3 text-center">Status</th>
                                 </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                 {pastModerasiStudents.length === 0 ? (
                                    <tr>
                                       <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                                          Belum ada riwayat kelas yang dimoderatori.
                                       </td>
                                    </tr>
                                 ) : (
                                    pastModerasiStudents.map((item, idx) => (
                                       <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                          <td className="px-4 py-3 text-slate-500 text-center">{idx + 1}</td>
                                          <td className="px-4 py-3 font-medium text-slate-700">{item.nama}</td>
                                          <td className="px-4 py-3 text-slate-500">{item.nim}</td>
                                          <td className="px-4 py-3 text-slate-600 max-w-[200px] truncate" title={item.judul}>{item.judul}</td>
                                          <td className="px-4 py-3 text-slate-500">{item.room || "-"}</td>
                                          <td className="px-4 py-3 text-slate-500">{(item.dateStr || item.classData?.fullDate || item.classData?.date)} • {item.time}</td>
                                          <td className="px-4 py-3 text-center">
                                             <span className="bg-emerald-100 text-emerald-700 text-xs font-bold px-2.5 py-1 rounded-md">
                                                Selesai
                                             </span>
                                          </td>
                                       </tr>
                                    ))
                                 )}
                              </tbody>
                           </table>
                        </div>
                     </div>
                  </div>

                  <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
                     <button
                        onClick={() => setIsModalSelesaiOpen(false)}
                        className="px-6 py-2.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl font-semibold transition-colors shadow-sm"
                     >
                        Tutup
                     </button>
                  </div>
               </div>
            </div>
         )}

         {/* Modal Selesai Membimbing Seminar */}
         {isModalSelesaiBimbinganOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
               {/* Backdrop */}
               <div
                  className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                  onClick={() => setIsModalSelesaiBimbinganOpen(false)}
               ></div>

               {/* Modal Content */}
               <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col relative z-10 overflow-hidden animate-in fade-in zoom-in duration-200">
                  <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                     <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center text-teal-600">
                           <BookOpen size={20} />
                        </div>
                        <div>
                           <h3 className="text-lg font-bold text-[#06125C]">Riwayat Bimbingan Selesai</h3>
                           <p className="text-sm text-slate-500">Daftar mahasiswa yang kelas seminarnya telah selesai Anda hadiri sebagai pembimbing.</p>
                        </div>
                     </div>
                     <button
                        onClick={() => setIsModalSelesaiBimbinganOpen(false)}
                        className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-500"
                     >
                        <X size={20} />
                     </button>
                  </div>

                  <div className="p-6 overflow-y-auto">
                     <div className="border border-slate-200 rounded-xl overflow-hidden">
                        <div className="overflow-x-auto">
                           <table className="w-full text-left text-sm whitespace-nowrap">
                              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                                 <tr>
                                    <th className="px-4 py-3 text-center w-12">No</th>
                                    <th className="px-4 py-3">Nama Mahasiswa</th>
                                    <th className="px-4 py-3">NIM</th>
                                    <th className="px-4 py-3 max-w-[200px]">Judul Seminar</th>
                                    <th className="px-4 py-3">Ruangan</th>
                                    <th className="px-4 py-3">Tanggal Selesai</th>
                                    <th className="px-4 py-3 text-center">Status</th>
                                 </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                 {bimbingan.filter(b => b.isPast).length === 0 ? (
                                    <tr>
                                       <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                                          Belum ada riwayat kehadiran seminar bimbingan.
                                       </td>
                                    </tr>
                                 ) : (
                                    bimbingan.filter(b => b.isPast).map((student, idx) => (
                                       <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                          <td className="px-4 py-3 text-slate-500 text-center">{idx + 1}</td>
                                          <td className="px-4 py-3 font-medium text-slate-700">{student.name}</td>
                                          <td className="px-4 py-3 text-slate-500">{student.nim}</td>
                                          <td className="px-4 py-3 text-slate-600 max-w-[200px] truncate" title={student.title}>{student.title}</td>
                                          <td className="px-4 py-3 text-slate-500">{student.room}</td>
                                          <td className="px-4 py-3 text-slate-500">{student.date} • {student.time}</td>
                                          <td className="px-4 py-3 text-center">
                                             <span className="bg-teal-100 text-teal-700 text-xs font-bold px-2.5 py-1 rounded-md">
                                                Selesai
                                             </span>
                                          </td>
                                       </tr>
                                    ))
                                 )}

                              </tbody>
                           </table>
                        </div>
                     </div>
                  </div>

                  <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
                     <button
                        onClick={() => setIsModalSelesaiBimbinganOpen(false)}
                        className="px-6 py-2.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl font-semibold transition-colors shadow-sm"
                     >
                        Tutup
                     </button>
                  </div>
               </div>
            </div>
         )}

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
