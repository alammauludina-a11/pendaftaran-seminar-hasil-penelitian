"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authClient } from "../../../lib/auth-client";
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  LogOut, FileCheck, MapPin, Megaphone, CheckCircle2, XCircle, Eye,
  Clock, CheckSquare, X, Search, Filter, Users, Calendar, AlertCircle, Settings,
  ArrowLeft, Plus, Trash2, LayoutDashboard, Sparkles, Loader2, UserCheck
} from "lucide-react";
import DashboardAnalisis from "./DashboardAnalisis";
import AnalisisLog from "./AnalisisLog";

// Mock Data
type PeriodeData = {
  id: number;
  jenisSeminar: "kolokium" | "hasil_penelitian";
  angkatan: string;
  startDate: string;
  endDate: string;
  registrationEndDate: string;
  isOpen: boolean;
  batasKelas: number;
  forcedClasses: string[];
  cancelledClasses: string[];
  isDraft?: boolean;
};

const mockPeriodesData: PeriodeData[] = [
  {
    id: 1,
    jenisSeminar: 'hasil_penelitian',
    angkatan: 'AKN 60',
    startDate: '2026-10-01',
    endDate: '2026-11-30',
    registrationEndDate: '2026-10-14',
    isOpen: true,
    batasKelas: 10,
    forcedClasses: [],
    cancelledClasses: []
  },
  {
    id: 2,
    jenisSeminar: 'hasil_penelitian',
    angkatan: 'AKN 59',
    startDate: '2026-03-01',
    endDate: '2026-04-30',
    registrationEndDate: '2026-03-14',
    isOpen: false,
    batasKelas: 15,
    forcedClasses: [],
    cancelledClasses: []
  }
];

const mockPendaftaranData = [
  { id: 1, periodeId: 1, name: "Siti Rahmawati", nim: "J3C119001", prodi: "Informatika", dospem: "Dr. Irma, M.Si", title: "Sistem Pakar Diagnosa Penyakit Tanaman", status: "menunggu", date: "25 Okt 2026", time: "08:00 - 08:50", room: "Ruang Sidang 1", moderator: "", isFinalized: false, isReleased: false, pembahas: "" },
  { id: 2, periodeId: 1, name: "Budi Santoso", nim: "J3C119002", prodi: "Informatika", dospem: "Dr. Andi Setiawan, M.Kom", title: "Analisis Sentimen Pengguna Twitter terhadap Pemilu", status: "disetujui", date: "25 Okt 2026", time: "10:00 - 10:50", room: "Ruang Sidang 1", moderator: "Dr. Andi Setiawan, M.Kom", note: "Berkas lengkap", isFinalized: true, isReleased: false, pembahas: "" },
  { id: 3, periodeId: 1, name: "Agus Pratama", nim: "J3C119003", prodi: "Informatika", dospem: "Prof. Dr. Antonius, M.Sc", title: "Rancang Bangun Aplikasi E-Voting Berbasis Blockchain", status: "ditolak", date: "26 Okt 2026", time: "13:00 - 13:50", room: "", moderator: "", note: "Berkas persetujuan dosen pembimbing tidak memiliki tanda tangan.", isFinalized: false, isReleased: false, pembahas: "" },
  { id: 4, periodeId: 1, name: "Dewi Lestari", nim: "J3C119004", prodi: "Teknik Komputer", dospem: "Dr. Budi Haryanto, M.T", title: "Sistem Informasi Geografis Tata Kota", status: "disetujui", date: "27 Okt 2026", time: "08:00 - 08:50", room: "Ruang Sidang 2", moderator: "", isFinalized: false, isReleased: false, pembahas: "" },
  { id: 5, periodeId: 1, name: "Hendra", nim: "J3C119005", prodi: "Informatika", dospem: "Dr. Rina, M.Kom", title: "Penerapan AI untuk Deteksi", status: "disetujui", date: "26 Okt 2026", time: "08:00 - 08:50", room: "Ruang Sidang 1", moderator: "", note: "", isFinalized: true, isReleased: false, pembahas: "" },
  { id: 6, periodeId: 1, name: "Fitriani", nim: "J3C119006", prodi: "Teknik Komputer", dospem: "Dr. Andi Setiawan, M.Kom", title: "Rancang Bangun E-Commerce", status: "disetujui", date: "26 Okt 2026", time: "13:00 - 13:50", room: "Ruang Sidang 2", moderator: "Dr. Budi Haryanto, M.T", note: "", isFinalized: true, isReleased: false, pembahas: "" },
  { id: 7, periodeId: 2, name: "Joko Anwar", nim: "J3C118001", prodi: "Informatika", dospem: "Dr. Budi Haryanto, M.T", title: "Implementasi Sistem Cloud", status: "disetujui", date: "15 Apr 2026", time: "10:00 - 10:50", room: "Ruang Sidang 2", moderator: "Dr. Rina, M.Kom", note: "", isFinalized: true, isReleased: true, pembahas: "" }
];
type Account = { username: string; password: string; } | null;

type MahasiswaData = {
  id: string | number;
  nim: string;
  name: string;
  angkatan?: string;
  prodi: string;
  status: string;
  account: Account;
};

type DosenData = {
  id: string | number;
  nip: string;
  name: string;
  prodi: string;
  jabatan: string;
  statusDosen?: string;
  account: Account;
};

const mockMasterMahasiswa: MahasiswaData[] = [
  { id: 1, nim: "J3C119001", name: "Siti Rahmawati", angkatan: "60", prodi: "Informatika", status: "Aktif", account: null },
  { id: 2, nim: "J3C119002", name: "Budi Santoso", angkatan: "60", prodi: "Informatika", status: "Aktif", account: { username: "budi123", password: "password123" } },
  { id: 3, nim: "J3C119003", name: "Agus Pratama", angkatan: "60", prodi: "Informatika", status: "Aktif", account: null },
  { id: 4, nim: "J3C118001", name: "Joko Anwar", angkatan: "59", prodi: "Informatika", status: "Aktif", account: null },
];

const mockMasterDosen: DosenData[] = [
  { id: 1, nip: "198001012005011001", name: "Dr. Irma, M.Si", prodi: "Informatika", jabatan: "Lektor Kepala", account: null },
  { id: 2, nip: "198202022006021002", name: "Dr. Andi Setiawan, M.Kom", prodi: "Informatika", jabatan: "Lektor", account: null },
  { id: 3, nip: "197503032000031003", name: "Prof. Dr. Antonius, M.Sc", prodi: "Informatika", jabatan: "Guru Besar", account: null },
  { id: 4, nip: "198504042010041004", name: "Dr. Budi Haryanto, M.T", prodi: "Teknik Komputer", jabatan: "Lektor", account: null },
];

export default function AdminDashboard() {
  const router = useRouter();
  const handleLogout = async () => {
    await authClient.signOut();
    router.push("/");
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[];

      const res = await fetch("/api/admin/master/mahasiswa/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ students: jsonData }),
      });

      if (res.ok) {
        const result = await res.json();
        alert(result.message);
        setMasterMahasiswa(prev => [...prev, ...result.mahasiswa]);
      } else {
        const err = await res.json();
        alert(err.error || "Gagal mengimport data.");
      }
    } catch (error) {
      console.error(error);
      alert("Terjadi kesalahan saat memproses file Excel.");
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleDownloadTemplate = () => {
    const ws = XLSX.utils.json_to_sheet([
      { NIM: "J3A119001", Nama: "Budi Santoso", Angkatan: "60" },
      { NIM: "J3A119002", Nama: "Siti Aminah", Angkatan: "60" }
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template_Mahasiswa");
    XLSX.writeFile(wb, "Template_Data_Mahasiswa.xlsx");
  };

  const fileInputDosenRef = useRef<HTMLInputElement>(null);

  const handleImportExcelDosen = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[];

      const res = await fetch("/api/admin/master/dosen/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dosenList: jsonData }),
      });

      if (res.ok) {
        const result = await res.json();
        alert(result.message);
        setMasterDosen(prev => [...prev, ...result.dosen]);
      } else {
        const err = await res.json();
        alert(err.error || "Gagal mengimport data.");
      }
    } catch (error) {
      console.error(error);
      alert("Terjadi kesalahan saat memproses file Excel.");
    } finally {
      if (fileInputDosenRef.current) {
        fileInputDosenRef.current.value = "";
      }
    }
  };

  const handleDownloadTemplateDosen = () => {
    const ws = XLSX.utils.json_to_sheet([
      { "NIP/NPI": "198001012005011001", "Nama Dosen": "Dr. Budi Santoso, M.Si" },
      { "NIP/NPI": "198202022006021002", "Nama Dosen": "Siti Aminah, M.Kom" }
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template_Dosen");
    XLSX.writeFile(wb, "Template_Data_Dosen.xlsx");
  };

  const [periodes, setPeriodes] = useState<PeriodeData[]>([]);
  const [pendaftaran, setPendaftaran] = useState<any[]>([]);
  const [kelasData, setKelasData] = useState<any[]>([]);
  const [masterMahasiswa, setMasterMahasiswa] = useState<MahasiswaData[]>([]);
  const [masterDosen, setMasterDosen] = useState<DosenData[]>([]);
  const [masterAdmin, setMasterAdmin] = useState<any[]>([]);

  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [resPeriode, resMhs, resDosen, resAdmin, resPend, resKelas] = await Promise.all([
        fetch("/api/admin/periode"),
        fetch("/api/admin/master/mahasiswa"),
        fetch("/api/admin/master/dosen"),
        fetch("/api/admin/master/admin"),
        fetch("/api/admin/pendaftaran"),
        fetch("/api/admin/kelas")
      ]);

      const dataPeriode = await resPeriode.json();
      const dataMhs = await resMhs.json();
      const dataDosen = await resDosen.json();
      const dataAdmin = await resAdmin.json();
      const dataPend = await resPend.json();
      const dataKelas = await resKelas.json();

      setPeriodes(dataPeriode.periodes || []);
      setMasterMahasiswa(dataMhs.mahasiswa || []);
      setMasterDosen(dataDosen.dosen || []);
      setMasterAdmin(dataAdmin.admin || []);
      setPendaftaran(dataPend.pendaftaran || []);
      setKelasData(dataKelas.kelas || []);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  // Navigation State
  const [currentView, setCurrentView] = useState<"visual_awal" | "landing" | "pengaturan" | "manajemen" | "master" | "analisis" | "analisis_log" | "coming_soon">("visual_awal");
  const [selectedSeminarType, setSelectedSeminarType] = useState<"kolokium" | "hasil_penelitian" | null>(null);
  const [activeMasterTab, setActiveMasterTab] = useState<"mahasiswa" | "dosen" | "admin">("mahasiswa");
  const [activePeriodeId, setActivePeriodeId] = useState<number | null>(null);

  // Tab State inside Manajemen
  const [activeTab, setActiveTab] = useState<"verifikasi" | "finalisasi" | "pembahas" | "pengumuman" | "kelas" | "rekapitulasi">("verifikasi");
  const [rekapSort, setRekapSort] = useState<{ key: 'name' | 'moderatorCount' | 'pembimbingCount', order: 'asc' | 'desc' }>({ key: 'name', order: 'asc' });

  // Filter States inside Manajemen
  const [globalSearch, setGlobalSearch] = useState("");
  const [globalKelasFilter, setGlobalKelasFilter] = useState("Semua Kelas");
  const [selectedDateFilter, setSelectedDateFilter] = useState("Semua Tanggal");

  // Verifikasi Modal States
  const [selectedPendaftar, setSelectedPendaftar] = useState<any>(null);
  const [isVerifikasiModalOpen, setIsVerifikasiModalOpen] = useState(false);
  const [catatanVerifikasi, setCatatanVerifikasi] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Master Data Modal State
  const [masterSearch, setMasterSearch] = useState("");
  const [masterAngkatanFilter, setMasterAngkatanFilter] = useState("Semua Angkatan");
  const [showAddDataModal, setShowAddDataModal] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [addForm, setAddForm] = useState({
    nim_nip: "",
    name: "",
    angkatan: "60",
    prodi: "Akuntansi",
    status_jabatan: "Aktif",
    statusDosen: "Dosen Tetap"
  });



  const handleGenerateAkunMahasiswa = async (id: string | number) => {
    try {
      const res = await fetch("/api/admin/master/mahasiswa/account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id })
      });
      const data = await res.json();
      if (data.success) {
        setMasterMahasiswa(prev => prev.map(m => m.id === id ? { ...m, account: { username: data.username, password: data.password } } : m));
      } else {
        alert(data.error);
      }
    } catch (e) {
      console.error(e);
      alert("Terjadi kesalahan sistem");
    }
  };

  const handleGenerateAkunDosen = async (id: string | number) => {
    try {
      const res = await fetch("/api/admin/master/dosen/account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id })
      });
      const data = await res.json();
      if (data.success) {
        setMasterDosen(prev => prev.map(d => d.id === id ? { ...d, account: { username: data.username, password: data.password } } : d));
      } else {
        alert(data.error);
      }
    } catch (e) {
      console.error(e);
      alert("Terjadi kesalahan sistem");
    }
  };

  const handleGenerateAkunAdmin = async (id: string) => {
    try {
      const res = await fetch("/api/admin/master/admin/account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id })
      });
      const data = await res.json();
      if (data.success) {
        setMasterAdmin(prev => prev.map(a => a.id === id ? { ...a, account: { username: data.username, password: data.password } } : a));
      } else {
        alert(data.error);
      }
    } catch (e) {
      console.error(e);
      alert("Terjadi kesalahan sistem");
    }
  };

  const handleGenerateSemuaAkun = async () => {
    if (activeMasterTab === "mahasiswa") {
      const usersToGenerate = masterMahasiswa.filter(m => !m.account);
      for (const m of usersToGenerate) {
        await handleGenerateAkunMahasiswa(m.id);
      }
    } else if (activeMasterTab === "dosen") {
      const usersToGenerate = masterDosen.filter(d => !d.account);
      for (const d of usersToGenerate) {
        await handleGenerateAkunDosen(d.id);
      }
    } else {
      const usersToGenerate = masterAdmin.filter(a => !a.account);
      for (const a of usersToGenerate) {
        await handleGenerateAkunAdmin(a.id);
      }
    }
  };

  const handleEditMasterData = (type: "mahasiswa" | "dosen" | "admin", data: any) => {
    setIsEditMode(true);
    setEditId(data.id);
    setAddForm({
      nim_nip: type === "mahasiswa" ? data.nim : (type === "dosen" ? data.nip : ""),
      name: data.name,
      angkatan: type === "mahasiswa" ? (data.angkatan || "60") : "60",
      prodi: type === "admin" ? "" : data.prodi,
      status_jabatan: type === "mahasiswa" ? data.status : (type === "dosen" ? data.jabatan : ""),
      statusDosen: type === "dosen" ? (data.statusDosen || "Dosen Tetap") : "Dosen Tetap",
    });
    setShowAddDataModal(true);
  };

  const handleDeleteMasterData = async (type: "mahasiswa" | "dosen" | "admin", id: string | number) => {
    if (!confirm("Apakah Anda yakin ingin menghapus data ini?")) return;
    try {
      const res = await fetch(`/api/admin/master/${type}/${id}`, { method: "DELETE" });
      if (res.ok) {
        if (type === "mahasiswa") setMasterMahasiswa(prev => prev.filter(m => m.id !== id));
        else if (type === "dosen") setMasterDosen(prev => prev.filter(d => d.id !== id));
        else setMasterAdmin(prev => prev.filter(a => a.id !== id));
      } else {
        const data = await res.json();
        alert(data.error || "Gagal menghapus.");
      }
    } catch (e) {
      console.error(e);
      alert("Terjadi kesalahan sistem.");
    }
  };

  const handleBatalBentukKelas = async (kelasId: number) => {
    if (!confirm("Apakah Anda yakin ingin membatalkan kelas ini? Mahasiswa di dalamnya akan dikembalikan ke antrean.")) return;
    try {
      const res = await fetch(`/api/admin/kelas/${kelasId}`, {
        method: "DELETE"
      });
      if (res.ok) {
        fetchData();
      } else {
        const data = await res.json();
        alert(data.error || "Gagal membatalkan kelas");
      }
    } catch (e) {
      console.error(e);
      alert("Terjadi kesalahan sistem.");
    }
  };

  const handlePindahKelas = async (pendaftaranId: number, kelasSeminarId: number) => {
    try {
      const res = await fetch(`/api/admin/pendaftaran/${pendaftaranId}/pindah-kelas`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kelasSeminarId })
      });
      if (res.ok) {
        fetchData(); // Refetch all to update class counts and students
      } else {
        const data = await res.json();
        alert(data.error || "Gagal memindahkan kelas.");
      }
    } catch (e) {
      console.error(e);
      alert("Terjadi kesalahan sistem.");
    }
  };

  const handleGeneratePembahas = async (classStudents: any[]) => {
    // Sort to group by dospem, maximizing distance between same dospem
    const sortedStudents = [...classStudents].sort((a, b) => (a.dospem || "").localeCompare(b.dospem || ""));
    const offset = Math.floor(sortedStudents.length / 2);

    const newAssignments: { id: number, pembahas: string }[] = [];

    for (let i = 0; i < sortedStudents.length; i++) {
      const penyaji = sortedStudents[i];
      const pembahas = sortedStudents[(i + offset) % sortedStudents.length];

      if (penyaji.id !== pembahas.id) {
        newAssignments.push({ id: penyaji.id, pembahas: `${pembahas.name} (${pembahas.nim})` });
      }
    }

    // Optimistic update
    setPendaftaran(prev => {
      let next = [...prev];
      newAssignments.forEach(assignment => {
        next = next.map(p => p.id === assignment.id ? { ...p, pembahas: assignment.pembahas } : p);
      });
      return next;
    });

    // DB Update
    try {
      for (const assignment of newAssignments) {
        await fetch(`/api/admin/pendaftaran/${assignment.id}/pembahas`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pembahas: assignment.pembahas }),
        });
      }
    } catch (e) {
      console.error("Gagal generate pembahas:", e);
      alert("Sebagian atau seluruh data gagal disimpan ke server");
    }
  };

  const activePeriode = periodes.find(p => p.id === activePeriodeId);

  // Helper for updating active period
  const updateActivePeriode = (updates: any) => {
    setPeriodes(prev => prev.map(p => p.id === activePeriodeId ? { ...p, ...updates } : p));
  };

  // Filter Pendaftaran (Hanya untuk periode aktif, dengan global search & kelas filter)
  const activePendaftaran = pendaftaran.filter(p => p.periodeId === activePeriodeId);

  const rekapitulasiData = [...masterDosen].map(dosen => {
    const moderatorCount = activePendaftaran.filter(p => p.moderator === dosen.name || (p.moderator && p.moderator.includes(dosen.name))).length;
    const pembimbingCount = activePendaftaran.filter(p => p.dospem && p.dospem.includes(dosen.name)).length;
    return { ...dosen, moderatorCount, pembimbingCount };
  }).sort((a, b) => {
    let valA = (a as any)[rekapSort.key];
    let valB = (b as any)[rekapSort.key];
    if (rekapSort.key === 'name') {
      return rekapSort.order === 'asc' ? (valA as string).localeCompare(valB as string) : (valB as string).localeCompare(valA as string);
    } else {
      return rekapSort.order === 'asc' ? (valA as number) - (valB as number) : (valB as number) - (valA as number);
    }
  });

  const handleSortRekap = (key: 'name' | 'moderatorCount' | 'pembimbingCount') => {
    setRekapSort(prev => ({
      key,
      order: prev.key === key && prev.order === 'asc' ? 'desc' : 'asc'
    }));
  };

  const handleExportRekapExcel = () => {
    const ws = XLSX.utils.json_to_sheet(rekapitulasiData.map((d, i) => ({
      No: i + 1,
      "Nama Dosen": d.name,
      "Sebagai Moderator": d.moderatorCount,
      "Sebagai Pembimbing": d.pembimbingCount
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Rekapitulasi");
    XLSX.writeFile(wb, `Rekapitulasi_Dosen_AKN_${activePeriode?.angkatan || ''}.xlsx`);
  };

  const handleExportRekapPDF = () => {
    const doc = new jsPDF('p');
    doc.text(`Rekapitulasi Dosen AKN ${activePeriode?.angkatan || ''}`, 14, 15);
    
    autoTable(doc, {
      startY: 20,
      head: [['No', 'Nama Dosen', 'Sebagai Moderator', 'Sebagai Pembimbing']],
      body: rekapitulasiData.map((d, i) => [
        i + 1,
        d.name,
        d.moderatorCount,
        d.pembimbingCount
      ]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [6, 18, 92] }
    });
    
    doc.save(`Rekapitulasi_Dosen_AKN_${activePeriode?.angkatan || ''}.pdf`);
  };
  const uniqueKelas = Array.from(new Set(activePendaftaran.map(p => p.kelas))).filter(Boolean);
  const uniqueAngkatan = Array.from(new Set(masterMahasiswa.map(m => m.angkatan).filter(Boolean))).sort();

  const filteredPendaftaran = activePendaftaran.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(globalSearch.toLowerCase()) ||
      p.nim.toLowerCase().includes(globalSearch.toLowerCase());
    const matchesKelas = globalKelasFilter === "Semua Kelas" || (p.kelas ? p.kelas === globalKelasFilter : globalKelasFilter === "Antrean");
    return matchesSearch && matchesKelas;
  });

  const finalizedList = filteredPendaftaran.filter(p => p.isFinalized);
  const uniqueDates = Array.from(new Set(finalizedList.map(p => p.date)));

  // Handlers for Verifikasi & Finalisasi
  const handleVerifikasiClick = (item: any) => {
    setSelectedPendaftar(item);
    setCatatanVerifikasi(item.note || "");
    setIsVerifikasiModalOpen(true);
  };

  const handleActionVerifikasi = async (status: "disetujui" | "ditolak") => {
    try {
      const res = await fetch(`/api/admin/pendaftaran/${selectedPendaftar.id}/verifikasi`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, note: catatanVerifikasi })
      });
      if (res.ok) {
        setPendaftaran(prev =>
          prev.map(p => p.id === selectedPendaftar.id ? { ...p, status, note: catatanVerifikasi } : p)
        );
      }
    } catch (e) {
      console.error(e);
    }
    setIsVerifikasiModalOpen(false);
  };

  const handleFinalisasi = async (id: number) => {
    try {
      const res = await fetch(`/api/admin/pendaftaran/${id}/finalisasi`, {
        method: "PUT",
      });
      if (res.ok) {
        setPendaftaran((prev) =>
          prev.map((p) => (p.id === id ? { ...p, isFinalized: true, isReleased: true } : p))
        );
      } else {
        const data = await res.json();
        alert(data.error || "Gagal memfinalisasi.");
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Handlers for Pengumuman
  const displayFinalized = selectedDateFilter === "Semua Tanggal"
    ? finalizedList
    : finalizedList.filter(p => p.date === selectedDateFilter);

  const getSortedDisplayFinalized = () => {
    return [...displayFinalized].sort((a: any, b: any) => {
      const timeA = new Date(a.waktuMulai || 0).getTime();
      const timeB = new Date(b.waktuMulai || 0).getTime();
      return timeA - timeB;
    });
  };

  const getExportTitleAndFilename = (sortedData: any[]) => {
    const angkatanStr = activePeriode?.angkatan || "";

    const uniqueKelas = Array.from(new Set(sortedData.map((item: any) => item.kelas))).filter(Boolean).map((k: any) => k.replace('Kelas ', ''));
    let kelasStr = '';
    if (uniqueKelas.length === 0) {
      kelasStr = '-';
    } else if (uniqueKelas.length === 1) {
      kelasStr = uniqueKelas[0];
    } else if (uniqueKelas.length === 2) {
      kelasStr = `${uniqueKelas[0]} dan ${uniqueKelas[1]}`;
    } else {
      const last = uniqueKelas.pop();
      kelasStr = `${uniqueKelas.join(', ')}, dan ${last}`;
    }

    let dateStr = selectedDateFilter;
    const timestamps = sortedData.map((item: any) => new Date(item.waktuMulai || 0).getTime()).filter((t: number) => t > 0);
    if (timestamps.length > 0) {
      const minDate = new Date(Math.min(...timestamps));
      const maxDate = new Date(Math.max(...timestamps));
      
      const formatFullDate = (d: Date) => {
        const months = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
        return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
      };

      if (minDate.getFullYear() === maxDate.getFullYear() && minDate.getMonth() === maxDate.getMonth()) {
        if (minDate.getDate() === maxDate.getDate()) {
          dateStr = formatFullDate(minDate);
        } else {
          const months = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
          dateStr = `${minDate.getDate()}-${maxDate.getDate()} ${months[minDate.getMonth()]} ${minDate.getFullYear()}`;
        }
      } else {
        dateStr = `${formatFullDate(minDate)} - ${formatFullDate(maxDate)}`;
      }
    }

    const jenisText = selectedSeminarType === "kolokium" ? "Seminar Kolokium" : "Seminar Hasil Penelitian";
    const title = `Pengumuman Jadwal ${jenisText} AKN ${angkatanStr} Kelas ${kelasStr} Tanggal ${dateStr}`;
    const filename = `Pengumuman_Jadwal_${jenisText.replace(/ /g, '_')}_AKN_${angkatanStr}_Kelas_${kelasStr.replace(/, /g, '_').replace(/ dan /g, '_')}_Tanggal_${dateStr.replace(/ /g, '_')}`;

    return { title, filename };
  };

  const handleExportExcel = () => {
    const sortedData = getSortedDisplayFinalized();
    const { filename } = getExportTitleAndFilename(sortedData);
    
    const ws = XLSX.utils.json_to_sheet(sortedData.map((item: any) => ({
      Mahasiswa: `${item.name} (${item.nim})`,
      Judul: item.title,
      Kelas: item.kelas,
      DosenPembimbing: item.dospem,
      Waktu: `${item.date} • ${item.time}`,
      Ruangan: item.room,
      Moderator: item.moderator,
      Pembahas: item.pembahas
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Jadwal");
    XLSX.writeFile(wb, `${filename}.xlsx`);
  };

  const handleExportPDF = () => {
    const sortedData = getSortedDisplayFinalized();
    const { title, filename } = getExportTitleAndFilename(sortedData);
    
    const doc = new jsPDF('landscape');
    const pageWidth = doc.internal.pageSize.getWidth();
    doc.text(title, pageWidth / 2, 15, { align: 'center' });
    
    autoTable(doc, {
      startY: 20,
      head: [['Mahasiswa', 'Kelas', 'Dospem', 'Waktu', 'Ruangan', 'Moderator', 'Pembahas']],
      body: sortedData.map((item: any) => [
        `${item.name}\n${item.nim}`,
        item.kelas || '-',
        item.dospem || '-',
        `${item.date}\n${item.time}`,
        item.room || '-',
        item.moderator || '-',
        item.pembahas ? item.pembahas.replace(/,/g, '\n') : '-'
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [6, 18, 92] }
    });
    
    doc.save("Pengumuman_Jadwal.pdf");
  };

  const handleBatalRilis = async (id: number) => {
    try {
      const res = await fetch(`/api/admin/pendaftaran/${id}/batal-finalisasi`, {
        method: "PUT",
      });
      if (res.ok) {
        setPendaftaran((prev) =>
          prev.map((p) => (p.id === id ? { ...p, isFinalized: false, isReleased: false } : p))
        );
      } else {
        const data = await res.json();
        alert(data.error || "Gagal membatalkan rilis.");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSetujuiRuangan = async (id: number) => {
    try {
      const res = await fetch(`/api/admin/pendaftaran/${id}/ruangan`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve" }),
      });
      if (res.ok) {
        const result = await res.json();
        setPendaftaran((prev) =>
          prev.map((p) => (p.id === id ? { ...p, room: result.data.ruanganDisetujui, statusRuangan: result.data.statusRuangan } : p))
        );
      } else {
        alert("Gagal menyetujui ruangan.");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateNewPeriode = async () => {
    try {
      const uniqueAngkatan = Array.from(new Set(masterMahasiswa.map(m => m.angkatan).filter(Boolean)));
      const defaultAngkatan = uniqueAngkatan.length > 0 ? `AKN ${uniqueAngkatan[0]}` : `AKN ${new Date().getFullYear() - 1960 + 60}`;
      const res = await fetch("/api/admin/periode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          angkatan: defaultAngkatan,
          jenisSeminar: selectedSeminarType || "hasil_penelitian",
          startDate: "",
          endDate: "",
          registrationEndDate: "",
          isOpen: false,
          batasKelas: 10,
          isDraft: true,
        }),
      });
      const data = await res.json();
      if (res.ok && data.periode) {
        setPeriodes((prev) => [...prev, data.periode]);
        setActivePeriodeId(data.periode.id);
        setCurrentView("pengaturan");
      } else {
        alert(data.error || "Gagal membuat periode.");
      }
    } catch (e) {
      console.error(e);
      alert("Terjadi kesalahan sistem.");
    }
  };

  return (
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
          <div className="flex items-center gap-4">
            <button
              onClick={() => { setCurrentView("master"); setActivePeriodeId(null); }}
              className="hidden sm:flex items-center gap-2 px-3 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-medium transition-colors"
              title="Data Master Pengguna"
            >
              <Users className="w-5 h-5 text-white/90" />
              <span className="text-white font-medium">Master</span>
            </button>
            <button
              onClick={() => { setCurrentView("analisis"); setActivePeriodeId(null); }}
              className="hidden sm:flex items-center gap-2 px-3 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-medium transition-colors"
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
            <div className="hidden md:flex flex-col text-right mr-2">
              <span className="text-sm font-semibold">Administrator Seminar</span>
            </div>
            <div className="h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold border-2 border-white">
              AD
            </div>
            <button onClick={handleLogout} className="p-2 hover:bg-white/10 rounded-lg transition-colors ml-2" title="Keluar">
              <LogOut size={20} className="text-red-300" />
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-grow flex flex-col max-w-7xl mx-auto w-full px-6 py-8 gap-8">

        {/* =======================================================
            VIEW 5: ANALISIS
            ======================================================= */}
        {currentView === "analisis" && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <DashboardAnalisis />
          </div>
        )}

        {/* VIEW 6: ANALISIS LOG */}
        {currentView === "analisis_log" && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <AnalisisLog />
          </div>
        )}

        {/* =======================================================
            VIEW 0: VISUAL AWAL (SEMINAR TYPE SELECTION)
            ======================================================= */}
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
        )}

        {/* =======================================================
            VIEW 0.5: COMING SOON
            ======================================================= */}
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

        {/* =======================================================
            VIEW 1: LANDING PAGE (DAFTAR PERIODE)
            ======================================================= */}
        {currentView === "landing" && (
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
                <Plus size={18} /> Buat Periode Baru
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
        )}

        {/* =======================================================
            VIEW 2: PENGATURAN PERIODE
            ======================================================= */}
        {currentView === "pengaturan" && activePeriode && (
          <div className="animate-in fade-in duration-500 flex flex-col gap-6">
            <div className="flex items-center gap-4 mb-2">
              <button
                onClick={() => {
                  if (activePeriode.isDraft) {
                    setPeriodes(prev => prev.filter(p => p.id !== activePeriodeId));
                  }
                  setCurrentView("landing");
                  setActivePeriodeId(null);
                }}
                className="w-10 h-10 bg-white border border-slate-200 text-slate-600 rounded-xl flex items-center justify-center hover:bg-slate-50 transition-colors"
              >
                <ArrowLeft size={20} />
              </button>
              <div>
                <h1 className="text-2xl font-extrabold text-[#06125C]">Pengaturan Periode</h1>
                <p className="text-sm text-slate-500">Konfigurasi tanggal dan aturan kelas untuk angkatan {activePeriode.angkatan}.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Card 1: Periode */}
              <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-[#06125C]">
                    <Calendar size={20} />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-[#06125C]">Periode Pendaftaran</h2>
                    <p className="text-sm text-slate-500">Atur masa buka dan tutup pendaftaran.</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Nama Angkatan</label>
                      <select
                        value={activePeriode.angkatan}
                        onChange={(e) => updateActivePeriode({ angkatan: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-[#06125C]/20 outline-none text-sm font-bold text-[#06125C]"
                      >
                        <option value="" disabled>Pilih Angkatan</option>
                        {Array.from(new Set(masterMahasiswa.map(m => m.angkatan).filter(Boolean))).map(angkatan => (
                          <option key={angkatan} value={`AKN ${angkatan}`}>AKN {angkatan}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Mulai Periode Seminar</label>
                      <input
                        type="date"
                        value={activePeriode.startDate}
                        onChange={(e) => updateActivePeriode({ startDate: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-[#06125C]/20 outline-none text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Akhir Periode Seminar</label>
                      <input
                        type="date"
                        value={activePeriode.endDate}
                        onChange={(e) => updateActivePeriode({ endDate: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-[#06125C]/20 outline-none text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Batas Pendaftaran</label>
                      <input
                        type="date"
                        value={activePeriode.registrationEndDate}
                        onChange={(e) => updateActivePeriode({ registrationEndDate: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-[#06125C]/20 outline-none text-sm"
                      />
                    </div>
                  </div>
                  <div className="p-3 bg-slate-50 border border-slate-200 text-slate-600 rounded-xl text-xs flex items-start gap-2">
                    <AlertCircle className="shrink-0 mt-0.5" size={14} />
                    <p>Mahasiswa hanya dapat mendaftar hingga <strong>Batas Pendaftaran</strong>. Sisa waktu dalam periode digunakan untuk finalisasi dan pengumuman.</p>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
                    <div>
                      <p className="text-sm font-bold text-slate-800">Status Pendaftaran</p>
                      <p className="text-xs text-slate-500">Buka atau tutup manual tanpa mengubah tanggal.</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={activePeriode.isOpen}
                        onChange={(e) => updateActivePeriode({ isOpen: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                    </label>
                  </div>
                  <button
                    className="w-full py-2.5 bg-[#06125C] hover:bg-[#06125C]/90 text-white rounded-xl text-sm font-bold shadow-sm transition-colors mt-2"
                    onClick={async () => {
                      try {
                        const payload = {
                          angkatan: activePeriode.angkatan,
                          startDate: activePeriode.startDate,
                          endDate: activePeriode.endDate,
                          registrationEndDate: activePeriode.registrationEndDate,
                          isOpen: activePeriode.isOpen,
                          batasKelas: activePeriode.batasKelas,
                          isDraft: false,
                        };
                        const res = await fetch(`/api/admin/periode/${activePeriode.id}`, {
                          method: "PUT",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify(payload),
                        });
                        const data = await res.json();
                        if (res.ok && data.periode) {
                          setPeriodes(prev => prev.map(p => p.id === activePeriode.id ? { ...p, ...data.periode } : p));
                        } else {
                          alert(data.error || "Gagal menyimpan.");
                          return;
                        }
                      } catch (e) {
                        console.error(e);
                        alert("Terjadi kesalahan sistem.");
                        return;
                      }
                      setCurrentView("landing");
                      setActivePeriodeId(null);
                    }}
                  >
                    Simpan & Kembali
                  </button>
                  <button
                    className="w-full py-2.5 bg-white border border-red-200 text-red-600 hover:bg-red-50 rounded-xl text-sm font-bold shadow-sm transition-colors mt-2 flex items-center justify-center gap-2"
                    onClick={() => setShowDeleteModal(true)}
                  >
                    <Trash2 size={16} /> Hapus Periode
                  </button>
                </div>
              </div>

              {/* Card 2: Aturan Kelas */}
              <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600">
                    <Users size={20} />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-[#06125C]">Aturan Pembentukan Kelas</h2>
                    <p className="text-sm text-slate-500">Atur batasan pendaftar untuk otomatisasi kelas.</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Batas Maksimal Mahasiswa per Kelas</label>
                    <div className="flex items-center gap-3">
                      <input
                        type="number"
                        min={1}
                        value={activePeriode.batasKelas}
                        onChange={(e) => updateActivePeriode({ batasKelas: parseInt(e.target.value) || 1 })}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-[#06125C]/20 outline-none text-sm font-bold text-slate-800"
                      />
                      <span className="text-sm text-slate-500 font-medium whitespace-nowrap">Orang</span>
                    </div>
                  </div>
                  <div className="p-4 bg-blue-50 border border-blue-100 text-blue-800 rounded-xl flex items-start gap-3 text-sm">
                    <AlertCircle className="shrink-0 mt-0.5 text-blue-600" size={16} />
                    <p>Sistem <strong>tidak akan</strong> membentuk kelas jika kuota belum terpenuhi. Namun, Admin dapat memaksa pembentukan kelas (override) pada tabel di bawah.</p>
                  </div>
                </div>
              </div>

              {/* Card 3: Simulasi Kelas Saat Ini */}
              <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600">
                    <CheckSquare size={20} />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-[#06125C]">Daftar Kelas Terbentuk</h2>
                    <p className="text-sm text-slate-500">Daftar kelas seminar yang telah terbentuk di periode ini.</p>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                      <tr>
                        <th className="px-4 py-3">Nama Kelas</th>
                        <th className="px-4 py-3 text-center">Pendaftar Ter-assign</th>
                        <th className="px-4 py-3 text-center">Status Kelas</th>
                        <th className="px-4 py-3 text-center">Kapasitas Kelas</th>
                        <th className="px-4 py-3 text-center">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {kelasData.filter(k => k.periodeId === activePeriodeId).length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                            Belum ada kelas yang terbentuk di periode ini.
                          </td>
                        </tr>
                      ) : (
                        kelasData.filter(k => k.periodeId === activePeriodeId).map((k) => {
                          const targetCapacity = activePeriode.batasKelas;
                          const count = activePendaftaran.filter(p => p.kelasSeminarId === k.id).length;
                          const isFormed = true; // In DB, it is formed

                          return (
                            <tr key={k.id} className="hover:bg-slate-50 transition-colors">
                              <td className="px-4 py-4 font-bold text-[#06125C]">Kelas {k.namaKelas}</td>
                              <td className="px-4 py-4 text-center font-medium text-slate-700">{count} Orang</td>
                              <td className="px-4 py-4 text-center">
                                <span className="bg-emerald-100 text-emerald-700 font-bold px-3 py-1 rounded-lg">
                                  Terbentuk
                                </span>
                              </td>
                              <td className="px-4 py-4 text-center">
                                <div className="flex flex-col items-center">
                                  <div className="w-32 h-2 bg-slate-200 rounded-full overflow-hidden mb-1">
                                    <div
                                      className={`h-full ${count >= targetCapacity ? 'bg-amber-500' : 'bg-blue-500'}`}
                                      style={{ width: `${Math.min((count / targetCapacity) * 100, 100)}%` }}
                                    ></div>
                                  </div>
                                  <span className="text-[10px] font-medium text-slate-500">
                                    {count} / {targetCapacity} Terisi
                                  </span>
                                </div>
                              </td>
                              <td className="px-4 py-4 text-center">
                                <button
                                  onClick={() => handleBatalBentukKelas(k.id)}
                                  className="text-xs bg-red-50 hover:bg-red-100 text-red-600 font-semibold px-3 py-1.5 rounded-lg border border-red-200 transition-colors whitespace-nowrap"
                                >
                                  Batal Bentuk
                                </button>
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
          </div>
        )}

        {/* =======================================================
          VIEW 4: DATA PENGGUNA (MASTER)
          ======================================================= */}
        {currentView === "master" && (
          <div className="animate-in fade-in duration-500 flex flex-col gap-6">
            <div className="flex items-center gap-4 mb-2">
              <button
                onClick={() => { setCurrentView("visual_awal"); }}
                className="w-10 h-10 bg-white border border-slate-200 text-slate-600 rounded-xl flex items-center justify-center hover:bg-slate-50 transition-colors"
              >
                <ArrowLeft size={20} />
              </button>
              <div>
                <h1 className="text-2xl font-extrabold text-[#06125C]">Data Master Pengguna</h1>
                <p className="text-sm text-slate-500">Basis data utama Mahasiswa dan Dosen untuk autentikasi dan pendaftaran.</p>
              </div>
            </div>

            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="flex border-b border-slate-100">
                <button
                  onClick={() => setActiveMasterTab("mahasiswa")}
                  className={`px-6 py-4 text-sm font-bold ${activeMasterTab === "mahasiswa" ? "text-[#06125C] border-b-2 border-[#06125C]" : "text-slate-500 hover:text-slate-800"}`}
                >
                  Data Mahasiswa
                </button>
                <button
                  onClick={() => setActiveMasterTab("dosen")}
                  className={`px-6 py-4 text-sm font-bold ${activeMasterTab === "dosen" ? "text-[#06125C] border-b-2 border-[#06125C]" : "text-slate-500 hover:text-slate-800"}`}
                >
                  Data Dosen
                </button>
                <button
                  onClick={() => setActiveMasterTab("admin")}
                  className={`px-6 py-4 text-sm font-bold ${activeMasterTab === "admin" ? "text-[#06125C] border-b-2 border-[#06125C]" : "text-slate-500 hover:text-slate-800"}`}
                >
                  Data Admin
                </button>
              </div>

              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <div className="relative">
                    <Search size={18} className="absolute left-3 top-3 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Cari nama, NIM/NPM, atau NIP..."
                      value={masterSearch}
                      onChange={(e) => setMasterSearch(e.target.value)}
                      className="pl-10 pr-4 py-2 bg-slate-50 rounded-xl border border-slate-200 text-sm w-64 outline-none"
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    {activeMasterTab === "mahasiswa" && (
                      <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200">
                        <Filter size={16} className="text-slate-400" />
                        <select
                          value={masterAngkatanFilter}
                          onChange={(e) => setMasterAngkatanFilter(e.target.value)}
                          className="bg-transparent text-sm outline-none text-slate-700 font-medium"
                        >
                          <option value="Semua Angkatan">Semua Angkatan</option>
                          {uniqueAngkatan.map(a => (
                            <option key={a as string} value={a as string}>Angkatan {a}</option>
                          ))}
                        </select>
                      </div>
                    )}
                    <button
                      onClick={handleGenerateSemuaAkun}
                      className="bg-indigo-50 text-indigo-700 px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-indigo-100 border border-indigo-100 transition-colors"
                    >
                      Generate Semua Akun
                    </button>
                    <button
                      onClick={() => setShowAddDataModal(true)}
                      className="bg-[#06125C] text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-[#06125C]/90"
                    >
                      <Plus size={16} /> Tambah Data
                    </button>
                    {activeMasterTab === "mahasiswa" && (
                      <>
                        <input
                          type="file"
                          accept=".xlsx, .xls"
                          ref={fileInputRef}
                          onChange={handleImportExcel}
                          className="hidden"
                          id="import-excel-mahasiswa"
                        />
                        <button
                          onClick={handleDownloadTemplate}
                          className="text-[#06125C] underline px-4 py-2 text-sm font-medium hover:text-[#06125C]/80"
                        >
                          Download Template
                        </button>
                        <button
                          onClick={() => document.getElementById('import-excel-mahasiswa')?.click()}
                          className="bg-emerald-50 text-emerald-700 px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-emerald-100 border border-emerald-100 transition-colors"
                        >
                          Import Excel
                        </button>
                      </>
                    )}
                    {activeMasterTab === "dosen" && (
                      <>
                        <input
                          type="file"
                          accept=".xlsx, .xls"
                          ref={fileInputDosenRef}
                          onChange={handleImportExcelDosen}
                          className="hidden"
                          id="import-excel-dosen"
                        />
                        <button
                          onClick={handleDownloadTemplateDosen}
                          className="text-[#06125C] underline px-4 py-2 text-sm font-medium hover:text-[#06125C]/80"
                        >
                          Download Template
                        </button>
                        <button
                          onClick={() => document.getElementById('import-excel-dosen')?.click()}
                          className="bg-emerald-50 text-emerald-700 px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-emerald-100 border border-emerald-100 transition-colors"
                        >
                          Import Excel
                        </button>
                      </>
                    )}
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 text-xs uppercase font-semibold">
                      <tr>
                        <th className="p-4">No</th>
                        {activeMasterTab !== "admin" && <th className="p-4">{activeMasterTab === "mahasiswa" ? "NIM" : "NIP/NPI"}</th>}
                        <th className="p-4">{activeMasterTab === "dosen" ? "Nama Dosen" : "Nama Lengkap"}</th>
                        {activeMasterTab === "dosen" && <th className="p-4 text-center">Status</th>}
                        {activeMasterTab === "mahasiswa" && <th className="p-4">Angkatan</th>}
                        {activeMasterTab === "mahasiswa" && <th className="p-4">Program Studi</th>}
                        <th className="p-4">Akun Login</th>
                        <th className="p-4 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                      {activeMasterTab === "mahasiswa" && masterMahasiswa.filter(m => (m.name.toLowerCase().includes(masterSearch.toLowerCase()) || m.nim.toLowerCase().includes(masterSearch.toLowerCase())) && (masterAngkatanFilter === "Semua Angkatan" || m.angkatan === masterAngkatanFilter)).map((m, i) => (
                        <tr key={m.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="p-4 text-slate-500">{i + 1}</td>
                          <td className="p-4 font-medium text-slate-800">{m.nim}</td>
                          <td className="p-4 text-slate-700">{m.name}</td>
                          <td className="p-4 text-slate-600 font-medium">{m.angkatan || "-"}</td>
                          <td className="p-4 text-slate-600">{m.prodi}</td>
                          <td className="p-4">
                            {m.account ? (
                              <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-2 text-xs">
                                  <span className="text-slate-500 w-12">User:</span>
                                  <span className="font-mono font-semibold text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded">{m.account.username}</span>
                                </div>
                                <div className="flex items-center gap-2 text-xs">
                                  <span className="text-slate-500 w-12">Pass:</span>
                                  <span className="font-mono font-semibold text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded">{m.account.password}</span>
                                </div>
                              </div>
                            ) : (
                              <button
                                onClick={() => handleGenerateAkunMahasiswa(m.id)}
                                className="text-xs bg-indigo-50 hover:bg-indigo-100 text-indigo-600 font-semibold px-2.5 py-1.5 rounded-lg border border-indigo-100 transition-colors"
                              >
                                Generate Akun
                              </button>
                            )}
                          </td>
                          <td className="p-4 text-right">
                            <div className="flex justify-end gap-3">
                              <button
                                onClick={() => handleEditMasterData("mahasiswa", m)}
                                className="text-blue-600 hover:text-blue-800 font-medium"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDeleteMasterData("mahasiswa", m.id)}
                                className="text-red-600 hover:text-red-800 font-medium"
                              >
                                Hapus
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}

                      {activeMasterTab === "dosen" && masterDosen.filter(d => d.name.toLowerCase().includes(masterSearch.toLowerCase()) || d.nip.toLowerCase().includes(masterSearch.toLowerCase())).map((d, i) => (
                        <tr key={d.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="p-4 text-slate-500">{i + 1}</td>
                          <td className="p-4 font-medium text-slate-800">{d.nip}</td>
                          <td className="p-4 font-semibold text-slate-800">{d.name}</td>
                              <td className="p-4 text-center">
                                <span className={`px-3 py-1.5 rounded-full text-[11px] font-bold shadow-sm ${d.statusDosen === "Dosen Praktisi/Luar" ? "bg-amber-100 text-amber-700 border border-amber-200" : "bg-blue-100 text-blue-700 border border-blue-200"}`}>
                                  {d.statusDosen || "Dosen Tetap"}
                                </span>
                              </td>
                          <td className="p-4">
                            {d.account ? (
                              <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-2 text-xs">
                                  <span className="text-slate-500 w-12">User:</span>
                                  <span className="font-mono font-semibold text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded">{d.account.username}</span>
                                </div>
                                <div className="flex items-center gap-2 text-xs">
                                  <span className="text-slate-500 w-12">Pass:</span>
                                  <span className="font-mono font-semibold text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded">{d.account.password}</span>
                                </div>
                              </div>
                            ) : (
                              <button
                                onClick={() => handleGenerateAkunDosen(d.id)}
                                className="text-xs bg-indigo-50 hover:bg-indigo-100 text-indigo-600 font-semibold px-2.5 py-1.5 rounded-lg border border-indigo-100 transition-colors"
                              >
                                Generate Akun
                              </button>
                            )}
                          </td>
                          <td className="p-4 text-right">
                            <div className="flex justify-end gap-3">
                              <button
                                onClick={() => handleEditMasterData("dosen", d)}
                                className="text-blue-600 hover:text-blue-800 font-medium"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDeleteMasterData("dosen", d.id)}
                                className="text-red-600 hover:text-red-800 font-medium"
                              >
                                Hapus
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}

                      {activeMasterTab === "admin" && masterAdmin.filter(a => a.name.toLowerCase().includes(masterSearch.toLowerCase())).map((a, i) => (
                        <tr key={a.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="p-4 text-slate-500">{i + 1}</td>
                          <td className="p-4 text-slate-700">{a.name}</td>
                          <td className="p-4">
                            {a.account ? (
                              <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-2 text-xs">
                                  <span className="text-slate-500 w-12">User:</span>
                                  <span className="font-mono font-semibold text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded">{a.account.username}</span>
                                </div>
                                <div className="flex items-center gap-2 text-xs">
                                  <span className="text-slate-500 w-12">Pass:</span>
                                  <span className="font-mono font-semibold text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded">{a.account.password}</span>
                                </div>
                              </div>
                            ) : (
                              <button
                                onClick={() => handleGenerateAkunAdmin(a.id)}
                                className="text-xs bg-indigo-50 hover:bg-indigo-100 text-indigo-600 font-semibold px-2.5 py-1.5 rounded-lg border border-indigo-100 transition-colors"
                              >
                                Generate Akun
                              </button>
                            )}
                          </td>
                          <td className="p-4 text-right">
                            <div className="flex justify-end gap-3">
                              <button
                                onClick={() => handleEditMasterData("admin", a)}
                                className="text-blue-600 hover:text-blue-800 font-medium"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDeleteMasterData("admin", a.id)}
                                className="text-red-600 hover:text-red-800 font-medium"
                              >
                                Hapus
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}

                      {((activeMasterTab === "mahasiswa" && masterMahasiswa.length === 0) ||
                        (activeMasterTab === "dosen" && masterDosen.length === 0) ||
                        (activeMasterTab === "admin" && masterAdmin.length === 0)) && (
                          <tr>
                            <td colSpan={7} className="p-8 text-center text-slate-500">
                              <div className="flex flex-col items-center justify-center">
                                <Users size={32} className="text-slate-200 mb-2" />
                                <p>Belum ada data pengguna yang terdaftar.</p>
                              </div>
                            </td>
                          </tr>
                        )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =======================================================
            VIEW 3: MANAJEMEN MAHASISWA
            ======================================================= */}
        {currentView === "manajemen" && activePeriode && (
          <div className="animate-in fade-in duration-500 flex flex-col gap-8">
            <div className="flex items-center gap-4 mb-2">
              <button
                onClick={() => { setCurrentView("landing"); setActivePeriodeId(null); }}
                className="w-10 h-10 bg-white border border-slate-200 text-slate-600 rounded-xl flex items-center justify-center hover:bg-slate-50 transition-colors"
              >
                <ArrowLeft size={20} />
              </button>
              <div>
                <h1 className="text-2xl font-extrabold text-[#06125C]">Kelola Pendaftaran Mahasiswa</h1>
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center text-[#06125C]">
                  <Users size={24} />
                </div>
                <div>
                  <p className="text-sm text-slate-500 font-medium">Total Pendaftar</p>
                  <p className="text-2xl font-bold text-[#06125C]">{filteredPendaftaran.length}</p>
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
            </div>

            {/* Global Filters */}
            <div className="flex flex-col sm:flex-row gap-4 bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
              <div className="flex-1 flex items-center gap-3 bg-slate-50 px-4 py-2.5 rounded-xl border border-slate-200 focus-within:ring-2 focus-within:ring-[#06125C]/20 transition-all">
                <Search size={18} className="text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari nama atau NIM/NPM mahasiswa..."
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

            {/* Tab Navigation (Only 3 tabs now) */}
            <div className="flex flex-wrap gap-2 bg-white p-2 rounded-2xl shadow-sm border border-slate-200">
              <button
                onClick={() => setActiveTab("verifikasi")}
                className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-medium transition-all ${activeTab === "verifikasi"
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
                className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-medium transition-all ${activeTab === "finalisasi"
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
              </button>
              <button
                onClick={() => setActiveTab("pengumuman")}
                className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-medium transition-all ${activeTab === "pengumuman"
                  ? "bg-[#06125C] text-white shadow-md"
                  : "text-slate-600 hover:bg-slate-100 hover:text-[#06125C]"
                  }`}
              >
                <Megaphone size={18} />
                Pengumuman Jadwal
              </button>
              <button
                onClick={() => setActiveTab("kelas")}
                className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-medium transition-all ${activeTab === "kelas"
                  ? "bg-[#06125C] text-white shadow-md"
                  : "text-slate-600 hover:bg-slate-100 hover:text-[#06125C]"
                  }`}
              >
                <Users size={18} />
                Manajemen Kelas
              </button>
              <button
                onClick={() => setActiveTab("rekapitulasi")}
                className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-medium transition-all ${activeTab === "rekapitulasi"
                  ? "bg-[#06125C] text-white shadow-md"
                  : "text-slate-600 hover:bg-slate-100 hover:text-[#06125C]"
                  }`}
              >
                <UserCheck size={18} />
                Rekapitulasi Dosen
              </button>
            </div>

            {/* Tab Content: Verifikasi */}
            {activeTab === "kelas" && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 flex flex-col gap-6">
                <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm relative overflow-hidden flex flex-col md:flex-row gap-6 items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-[#06125C] flex items-center gap-2 mb-2">
                      <Users className="text-indigo-500" /> Antrean & Pembentukan Kelas
                    </h2>
                    <p className="text-slate-500 text-sm max-w-xl">
                      Mahasiswa yang telah diverifikasi namun belum tergabung dalam kelas akan masuk ke antrean. Sistem otomatis membentuk kelas jika antrean mencapai batas ({activePeriode.batasKelas || 31} orang). Anda juga dapat memaksa pembentukan kelas sekarang.
                    </p>
                  </div>
                  <div className="flex flex-col items-center p-4 bg-slate-50 rounded-2xl border border-slate-100 min-w-[200px]">
                    <span className="text-3xl font-black text-[#06125C]">
                      {filteredPendaftaran.filter(p => !p.kelas && p.status !== 'ditolak').length}
                    </span>
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest mt-1">Dalam Antrean</span>
                    <button
                      onClick={async () => {
                        const count = filteredPendaftaran.filter(p => p.status === 'disetujui' && !p.kelas).length;
                        if (count === 0) {
                          alert("Belum ada mahasiswa yang berstatus 'Disetujui' di dalam antrean untuk dibentuk kelas.");
                          return;
                        }
                        if (confirm(`Apakah Anda yakin ingin membentuk kelas baru dengan ${count} mahasiswa dari antrean?`)) {
                          try {
                            const res = await fetch("/api/admin/kelas/bentuk", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ periodeId: activePeriode.id })
                            });
                            const data = await res.json();
                            if (res.ok) {
                              alert(data.message);
                              fetchData();
                            } else {
                              alert(data.error);
                            }
                          } catch (e) {
                            alert("Terjadi kesalahan.");
                          }
                        }
                      }}
                      disabled={filteredPendaftaran.filter(p => p.status === 'disetujui' && !p.kelas).length === 0}
                      className="mt-4 w-full bg-[#06125C] hover:bg-[#06125C]/90 disabled:bg-slate-200 disabled:text-slate-400 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-sm transition-colors"
                    >
                      Bentuk Kelas Sekarang
                    </button>
                  </div>
                </div>

                <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
                  <h3 className="text-lg font-bold text-slate-800 mb-4">Mahasiswa dalam Antrean</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                        <tr>
                          <th className="px-4 py-3 text-center">No</th>
                          <th className="px-4 py-3">Nama</th>
                          <th className="px-4 py-3">NIM</th>
                          <th className="px-4 py-3">Judul Penelitian</th>
                          <th className="px-4 py-3 text-center">Status</th>
                          <th className="px-4 py-3 text-center">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredPendaftaran.filter(p => !p.kelas && p.status !== 'ditolak').length === 0 ? (
                          <tr>
                            <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                              Antrean kosong. Semua pendaftar sudah mendapatkan kelas.
                            </td>
                          </tr>
                        ) : (
                          filteredPendaftaran.filter(p => !p.kelas && p.status !== 'ditolak').map((item, idx) => (
                            <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                              <td className="px-4 py-3 text-slate-500 text-center">{idx + 1}</td>
                              <td className="px-4 py-3 font-medium text-[#06125C]">{item.name}</td>
                              <td className="px-4 py-3 text-slate-500">{item.nim}</td>
                              <td className="px-4 py-3 text-slate-600 truncate max-w-[300px]" title={item.title}>{item.title}</td>
                              <td className="px-4 py-3 text-center">
                                {item.status === 'menunggu' && (
                                  <span className="bg-amber-100 text-amber-700 text-[11px] font-bold px-2 py-0.5 rounded-md inline-flex items-center gap-1">
                                    <Clock size={10} /> Menunggu Verifikasi
                                  </span>
                                )}
                                {item.status === 'disetujui' && (
                                  <span className="bg-green-100 text-green-700 text-[11px] font-bold px-2 py-0.5 rounded-md inline-flex items-center gap-1">
                                    <CheckCircle2 size={10} /> Siap Dibentuk Kelas
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-center">
                                <button
                                  onClick={() => handleVerifikasiClick(item)}
                                  className="bg-[#06125C] hover:bg-[#06125C]/90 text-white px-3 py-1.5 rounded-lg text-xs font-semibold shadow-sm transition-colors"
                                >
                                  Periksa & Verifikasi
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm mt-2">
                  <h3 className="text-lg font-bold text-[#06125C] mb-4 flex items-center gap-2">
                    Daftar Kelas Terbentuk & Mahasiswa
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                        <tr>
                          <th className="px-4 py-3 text-center">No</th>
                          <th className="px-4 py-3">Nama Mahasiswa</th>
                          <th className="px-4 py-3">NIM</th>
                          <th className="px-4 py-3">Kelas Saat Ini</th>
                          <th className="px-4 py-3 text-center">Pindah Ke</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {kelasData.filter(k => k.periodeId === activePeriodeId).length === 0 ? (
                          <tr>
                            <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                              Belum ada kelas yang terbentuk di periode ini.
                            </td>
                          </tr>
                        ) : (
                          activePendaftaran.filter(p => p.kelasSeminarId).sort((a, b) => {
                            const aKelas = kelasData.find(k => k.id === a.kelasSeminarId)?.namaKelas || "";
                            const bKelas = kelasData.find(k => k.id === b.kelasSeminarId)?.namaKelas || "";
                            return aKelas.localeCompare(bKelas);
                          }).map((item, idx) => {
                            const currentClass = kelasData.find(k => k.id === item.kelasSeminarId);
                            return (
                              <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                                <td className="px-4 py-3 text-slate-500 text-center">{idx + 1}</td>
                                <td className="px-4 py-3 font-medium text-[#06125C]">{item.name}</td>
                                <td className="px-4 py-3 text-slate-500">{item.nim}</td>
                                <td className="px-4 py-3 font-bold text-slate-700">Kelas {currentClass?.namaKelas || "-"}</td>
                                <td className="px-4 py-3 text-center">
                                  <select
                                    value={item.kelasSeminarId || ""}
                                    onChange={(e) => handlePindahKelas(item.id, parseInt(e.target.value))}
                                    className="bg-slate-50 border border-slate-200 focus:border-[#06125C] focus:ring-1 focus:ring-[#06125C]/20 text-xs px-3 py-1.5 rounded-lg outline-none font-medium text-slate-700 cursor-pointer"
                                  >
                                    {kelasData.filter(c => c.periodeId === activePeriodeId).map(c => {
                                      const isTargetFull = activePendaftaran.filter(p => p.kelasSeminarId === c.id).length >= activePeriode.batasKelas;
                                      return (
                                        <option key={c.id} value={c.id}>
                                          Kelas {c.namaKelas} {isTargetFull && c.id !== currentClass?.id ? '(Penuh)' : ''}
                                        </option>
                                      );
                                    })}
                                  </select>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Tab Content: Verifikasi */}
            {activeTab === "verifikasi" && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 flex flex-col gap-4">
                <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm relative overflow-hidden">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                    <h2 className="text-xl font-bold text-[#06125C] flex items-center gap-2">
                      <FileCheck className="text-amber-500" /> Daftar Verifikasi Berkas
                    </h2>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                        <tr>
                          <th className="px-4 py-3">Mahasiswa</th>
                          <th className="px-4 py-3">Kelas</th>
                          <th className="px-4 py-3">Dosen Pembimbing</th>
                          <th className="px-4 py-3">Judul Penelitian</th>
                          <th className="px-4 py-3">Jadwal Diajukan</th>
                          <th className="px-4 py-3">Ruangan</th>
                          <th className="px-4 py-3 text-center">Status</th>
                          <th className="px-4 py-3 text-center">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredPendaftaran.map((item) => (
                          <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-4 py-4">
                              <div className="font-semibold text-slate-800">{item.name}</div>
                              <div className="text-xs text-slate-500">{item.nim}</div>
                            </td>
                            <td className="px-4 py-4 text-slate-700 font-medium whitespace-nowrap">
                              {item.kelas ? `Kelas ${item.kelas.replace('Kelas ', '')}` : '-'}
                            </td>
                            <td className="px-4 py-4 text-slate-700 font-medium">
                              {item.dospem}
                            </td>
                            <td className="px-4 py-4 max-w-[250px]">
                              <div className="truncate font-medium text-slate-800" title={item.title}>{item.title}</div>
                            </td>
                            <td className="px-4 py-4 text-slate-600 whitespace-nowrap">
                              <div className="flex items-center gap-1.5"><Calendar size={14} /> {item.date}</div>
                              <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1"><Clock size={12} /> {item.time}</div>
                            </td>
                            <td className="px-4 py-4">
                              {item.statusRuangan === 'disetujui' && item.room && (
                                <span className="text-sm font-medium text-slate-800">{item.room}</span>
                              )}
                              {item.statusRuangan === 'menunggu' && (item.ruanganDiajukan || item.room) && (
                                <div className="flex flex-col gap-2 items-start">
                                  <span className="text-xs text-amber-600 font-medium bg-amber-50 px-2 py-1 rounded">Minta: {item.ruanganDiajukan || item.room}</span>
                                  <button
                                    onClick={() => handleSetujuiRuangan(item.id)}
                                    className="bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] px-2 py-1 rounded shadow-sm font-semibold transition-colors"
                                  >
                                    Setujui Ruangan
                                  </button>
                                </div>
                              )}
                              {!item.room && !item.ruanganDiajukan && (
                                <span className="text-slate-400 italic text-xs">Belum di set</span>
                              )}
                            </td>
                            <td className="px-4 py-4 text-center">
                              {item.status === 'menunggu' && (
                                <span className="bg-amber-100 text-amber-700 text-xs font-bold px-2.5 py-1 rounded-md inline-flex items-center gap-1">
                                  <Clock size={12} /> Menunggu
                                </span>
                              )}
                              {item.status === 'disetujui' && (
                                <span className="bg-green-100 text-green-700 text-xs font-bold px-2.5 py-1 rounded-md inline-flex items-center gap-1">
                                  <CheckCircle2 size={12} /> Disetujui
                                </span>
                              )}
                              {item.status === 'ditolak' && (
                                <span className="bg-red-100 text-red-700 text-xs font-bold px-2.5 py-1 rounded-md inline-flex items-center gap-1">
                                  <XCircle size={12} /> Ditolak
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-4 text-center">
                              <button
                                onClick={() => handleVerifikasiClick(item)}
                                disabled={item.isFinalized || item.status === 'ditolak'}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold shadow-sm transition-colors ${(item.isFinalized || item.status === 'ditolak') ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200' : 'bg-[#06125C] hover:bg-[#06125C]/90 text-white'}`}
                              >
                                Periksa
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Tab Content: Finalisasi */}
            {activeTab === "finalisasi" && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 flex flex-col gap-6">
                <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                    <div>
                      <h2 className="text-xl font-bold text-[#06125C] flex items-center gap-2">
                        <CheckSquare className="text-amber-500" /> Finalisasi Pendaftaran
                      </h2>
                      <p className="text-sm text-slate-500 mt-1">Selesaikan pendaftaran mahasiswa yang telah disetujui dan telah mengisi ruangan.</p>
                    </div>
                  </div>

                  <div className="overflow-hidden rounded-xl border border-slate-200">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                        <tr>
                          <th className="px-4 py-3 w-[16%]">Mahasiswa</th>
                          <th className="px-4 py-3 w-[8%] whitespace-nowrap">Kelas</th>
                          <th className="px-4 py-3 w-[22%] whitespace-nowrap">Jadwal & Ruangan</th>
                          <th className="px-4 py-3 w-[13%] whitespace-nowrap">Dosen Pembimbing</th>
                          <th className="px-4 py-3 w-[13%] whitespace-nowrap">Dosen Moderator</th>
                          <th className="px-4 py-3 w-[13%]">Pembahas</th>
                          <th className="px-4 py-3 text-center w-[9%]">Status</th>
                          <th className="px-4 py-3 text-center w-[6%]">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredPendaftaran.filter(p => p.status === 'disetujui' && !p.isFinalized).map((item) => (
                          <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-4 py-4">
                              <div className="font-semibold text-slate-800">{item.name}</div>
                              <div className="text-xs text-slate-500">{item.nim}</div>
                            </td>
                            <td className="px-4 py-4 text-slate-700 font-medium whitespace-nowrap">
                              {item.kelas ? `Kelas ${item.kelas.replace('Kelas ', '')}` : '-'}
                            </td>
                            <td className="px-4 py-4 text-slate-600 whitespace-nowrap">
                              <div className="flex items-center gap-1.5"><Calendar size={14} /> {item.date} • {item.time}</div>
                              <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1">
                                <MapPin size={12} /> {item.room || <span className="italic text-slate-400">Belum diisi</span>}
                              </div>
                            </td>
                            <td className="px-4 py-4 text-slate-700 font-medium text-sm">
                              {item.dospem}
                            </td>
                            <td className="px-4 py-4 text-slate-700 font-medium text-sm">
                              <select
                                value={item.moderatorId || ""}
                                onChange={async (e) => {
                                  const newValue = e.target.value;
                                  const dosenId = newValue || null;
                                  const selectedDosen = masterDosen.find(d => d.id === dosenId);

                                  // Optimistic update
                                  setPendaftaran(prev => prev.map(p => p.id === item.id ? { ...p, moderatorId: dosenId, moderator: selectedDosen ? selectedDosen.name : null, moderatorAssignedByRole: 'admin' } : p));

                                  // DB Update
                                  try {
                                    await fetch(`/api/admin/pendaftaran/${item.id}/moderator`, {
                                      method: "PUT",
                                      headers: { "Content-Type": "application/json" },
                                      body: JSON.stringify({ dosenId })
                                    });
                                  } catch (err) {
                                    console.error("Gagal menyimpan moderator:", err);
                                  }
                                }}
                                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#06125C]/20 w-full font-medium text-[#06125C]"
                              >
                                <option value="">-- Pilih Moderator --</option>
                                {masterDosen.map(d => (
                                  <option key={d.id} value={d.id}>{d.name}</option>
                                ))}
                              </select>
                              {item.moderatorId && (
                                <div className="text-[10px] text-indigo-500 mt-1 flex items-center gap-1 font-semibold">
                                  <UserCheck size={10} /> Terpilih {item.moderatorAssignedByRole === 'dosen' ? '(Dipilih oleh Dosen)' : '(Dipilih oleh Admin)'}
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-4 text-slate-700 font-medium text-sm">
                              {item.pembahas ? (
                                <div className="flex flex-col gap-1.5">
                                  {item.pembahas.split(',').map((pStr: string, idx: number) => (
                                    <div key={idx} className="flex items-center gap-1.5">
                                      <Users size={14} className="text-[#06125C]" />
                                      {pStr}
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <span className="italic text-slate-400 flex items-center gap-1.5">
                                  <Clock size={14} /> Belum diatur
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-4 text-center">
                              <div className="flex flex-col gap-1.5 items-center">
                                {item.room ? (
                                  <span className="bg-green-100 text-green-700 text-[10px] font-bold px-2 py-0.5 rounded-md inline-flex items-center gap-1 w-fit">
                                    <CheckCircle2 size={10} /> Ruangan Terisi
                                  </span>
                                ) : (
                                  <span className="bg-amber-100 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded-md inline-flex items-center gap-1 w-fit">
                                    <Clock size={10} /> Menunggu Ruangan
                                  </span>
                                )}
                                {item.moderator ? (
                                  <span className="bg-green-100 text-green-700 text-[10px] font-bold px-2 py-0.5 rounded-md inline-flex items-center gap-1 w-fit" title={item.moderator}>
                                    <CheckCircle2 size={10} /> Mod: Terpilih
                                  </span>
                                ) : (
                                  <span className="bg-amber-100 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded-md inline-flex items-center gap-1 w-fit">
                                    <Clock size={10} /> Menunggu Dosen
                                  </span>
                                )}
                                {item.pembahas ? (
                                  <span className="bg-green-100 text-green-700 text-[10px] font-bold px-2 py-0.5 rounded-md inline-flex items-center gap-1 w-fit" title={item.pembahas}>
                                    <CheckCircle2 size={10} /> {item.pembahas.split(',').length} Pem: Terpilih
                                  </span>
                                ) : (
                                  <span className="bg-amber-100 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded-md inline-flex items-center gap-1 w-fit">
                                    <Clock size={10} /> Menunggu Pem
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-4 text-center">
                              <div className="flex flex-col gap-2 items-center">
                                <button
                                  onClick={() => handleFinalisasi(item.id)}
                                  disabled={!item.room || !item.moderator || !item.pembahas}
                                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                                    item.room && item.moderator && item.pembahas ? 'bg-[#06125C] hover:bg-[#06125C]/90 text-white' : 'bg-slate-100 text-slate-400'
                                  }`}
                                  title={(!item.room || !item.moderator || !item.pembahas) ? "Ruangan, Moderator, dan Pembahas harus terisi" : ""}
                                >
                                  Finalisasi
                                </button>
                                {item.room && item.moderator && !item.pembahas && (
                                  <button
                                    onClick={() => {
                                      if (confirm("Apakah Anda yakin ingin melakukan Paksa Finalisasi meskipun belum ada pembahas?")) {
                                        handleFinalisasi(item.id);
                                      }
                                    }}
                                    className="bg-amber-50 hover:bg-amber-100 text-amber-700 px-3 py-1.5 rounded-lg text-xs font-semibold shadow-sm transition-colors border border-amber-200"
                                    title="Paksa finalisasi tanpa pembahas"
                                  >
                                    Paksa Finalisasi
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                        {filteredPendaftaran.filter(p => p.status === 'disetujui' && !p.isFinalized).length === 0 && (
                          <tr>
                            <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                              Tidak ada pendaftaran yang perlu difinalisasi.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Tab Content: Pembahas */}
            {activeTab === "pembahas" && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 flex flex-col gap-6">
                {uniqueKelas.length === 0 ? (
                  <div className="bg-white rounded-3xl p-10 border border-slate-200 shadow-sm text-center flex flex-col items-center">
                    <Users size={48} className="text-slate-300 mb-4" />
                    <h3 className="text-lg font-bold text-slate-800 mb-2">Belum Ada Kelas Terbentuk</h3>
                    <p className="text-slate-500">Silakan pastikan terdapat kelas yang sudah terbentuk (mencapai kuota atau dipaksa terbentuk) untuk dapat mengatur pembahas.</p>
                  </div>
                ) : (
                  uniqueKelas.map(k => {
                    const classPendaftaran = activePendaftaran.filter(p => p.kelas === k);

                    return (
                      <div key={k} className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm relative overflow-hidden">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                          <div>
                            <h2 className="text-xl font-bold text-[#06125C] flex items-center gap-2">
                              <Users className="text-indigo-500" /> Kelas {k}
                            </h2>
                            <p className="text-sm text-slate-500 mt-1">Daftar mahasiswa dan plotting pembahas.</p>
                          </div>
                          <button
                            onClick={() => handleGeneratePembahas(classPendaftaran)}
                            disabled={classPendaftaran.some(p => p.isReleased)}
                            className={`px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors shrink-0 ${classPendaftaran.some(p => p.isReleased) ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed' : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200'}`}
                          >
                            <Settings size={16} /> Generate Pembahas Kelas Ini
                          </button>
                        </div>

                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-sm whitespace-nowrap">
                            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                              <tr>
                                <th className="px-4 py-3">Penyaji (Mahasiswa)</th>
                                <th className="px-4 py-3">Dosen Pembimbing</th>
                                <th className="px-4 py-3">Pembahas Ter-assign</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {classPendaftaran.map(p => {
                                const assignedPembahasList = classPendaftaran
                                  .map(x => x.pembahas)
                                  .filter(Boolean)
                                  .flatMap(pStr => pStr!.split(',').map((s: string) => s.trim()))
                                  .filter(Boolean);
                                  
                                const currentPembahas = p.pembahas ? p.pembahas.split(',').map((s: string) => s.trim()) : [""];
                                if (currentPembahas.length === 0) currentPembahas.push("");

                                return (
                                  <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-4 py-4">
                                      <div className="font-semibold text-slate-800">{p.name}</div>
                                      <div className="text-xs text-slate-500">{p.nim}</div>
                                    </td>
                                    <td className="px-4 py-4 text-slate-600">{p.dospem}</td>
                                    <td className="px-4 py-4">
                                      <div className="flex flex-col gap-2">
                                        {currentPembahas.map((pembVal: string, idx: number) => (
                                          <div key={idx} className="flex items-center gap-2">
                                            <select
                                              value={pembVal || ""}
                                              disabled={p.isReleased}
                                              onChange={async (e) => {
                                                const newValue = e.target.value;
                                                const newArr = [...currentPembahas];
                                                newArr[idx] = newValue;
                                                const newPembahasStr = newArr.filter(Boolean).join(',');
                                                
                                                // Optimistic update
                                                setPendaftaran(prev => prev.map(item => item.id === p.id ? { ...item, pembahas: newPembahasStr } : item));
                                                
                                                // Persist to DB
                                                try {
                                                  await fetch(`/api/admin/pendaftaran/${p.id}/pembahas`, {
                                                    method: "PUT",
                                                    headers: { "Content-Type": "application/json" },
                                                    body: JSON.stringify({ pembahas: newPembahasStr }),
                                                  });
                                                } catch (err) {
                                                  console.error("Gagal menyimpan pembahas:", err);
                                                }
                                              }}
                                              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#06125C]/20 w-full font-medium text-[#06125C] disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                              <option value="">-- Pilih Pembahas --</option>
                                              {classPendaftaran.filter(c => c.id !== p.id).map(c => {
                                                const value = `${c.name} (${c.nim})`;
                                                const isSameDospem = c.dospem === p.dospem;
                                                const isAlreadyAssigned = assignedPembahasList.filter(x => x === value).length >= 2 && pembVal !== value;

                                                return (
                                                  <option key={c.id} value={value} disabled={isAlreadyAssigned}>
                                                    {value} {isAlreadyAssigned ? '(🔒 Limit 2)' : isSameDospem ? '(⚠️ Dospem Sama)' : ''}
                                                  </option>
                                                );
                                              })}
                                            </select>
                                            {idx > 0 && !p.isReleased && (
                                              <button 
                                                onClick={async () => {
                                                  const newArr = [...currentPembahas];
                                                  newArr.splice(idx, 1);
                                                  const newPembahasStr = newArr.filter(Boolean).join(',');
                                                  setPendaftaran(prev => prev.map(item => item.id === p.id ? { ...item, pembahas: newPembahasStr } : item));
                                                  try {
                                                    await fetch(`/api/admin/pendaftaran/${p.id}/pembahas`, {
                                                      method: "PUT",
                                                      headers: { "Content-Type": "application/json" },
                                                      body: JSON.stringify({ pembahas: newPembahasStr }),
                                                    });
                                                  } catch (err) {
                                                    console.error("Gagal menyimpan pembahas:", err);
                                                  }
                                                }}
                                                className="text-red-500 hover:bg-red-50 p-1.5 rounded-lg shrink-0"
                                                title="Hapus pembahas ini"
                                              >
                                                <X size={16} />
                                              </button>
                                            )}
                                          </div>
                                        ))}
                                        {!p.isReleased && (
                                          <button 
                                            onClick={async () => {
                                              const newPembahasStr = [...currentPembahas, ""].join(',');
                                              setPendaftaran(prev => prev.map(item => item.id === p.id ? { ...item, pembahas: newPembahasStr } : item));
                                              try {
                                                await fetch(`/api/admin/pendaftaran/${p.id}/pembahas`, {
                                                  method: "PUT",
                                                  headers: { "Content-Type": "application/json" },
                                                  body: JSON.stringify({ pembahas: newPembahasStr }),
                                                });
                                              } catch (err) {
                                                console.error("Gagal menyimpan pembahas:", err);
                                              }
                                            }}
                                            className="text-xs text-[#06125C] font-semibold flex items-center gap-1 hover:bg-[#06125C]/5 px-2 py-1 rounded-lg w-fit transition-colors"
                                          >
                                            <Plus size={14}/> Tambah Pembahas
                                          </button>
                                        )}
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* Tab Content: Pengumuman */}
            {activeTab === "pengumuman" && (
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

                  <div className="overflow-hidden rounded-2xl border border-slate-200">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-sm text-slate-500">
                          <th className="p-4 font-semibold w-[16%]">Mahasiswa</th>
                          <th className="p-4 font-semibold w-[8%] whitespace-nowrap">Kelas</th>
                          <th className="p-4 font-semibold w-[13%] whitespace-nowrap">Dosen Pembimbing</th>
                          <th className="p-4 font-semibold w-[22%] whitespace-nowrap">Waktu & Ruangan</th>
                          <th className="p-4 font-semibold w-[13%] whitespace-nowrap">Moderator</th>
                          <th className="p-4 font-semibold w-[13%]">Pembahas</th>
                          <th className="p-4 font-semibold w-[9%]">Status</th>
                          <th className="p-4 font-semibold text-center w-[6%]">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="text-sm">
                        {displayFinalized.map((item, index, arr) => {
                          const isReady = item.room && item.moderator;
                          const isJugaPembahas = pendaftaran.some(p => p.pembahas && p.pembahas.includes(`${item.name} (${item.nim})`));
                          const isFinished = item.waktuMulai ? new Date(item.waktuMulai) < new Date() : false;
                          return (
                            <tr
                              key={item.id}
                              className={`border-b border-slate-100 transition-colors hover:bg-slate-50/50 ${index === arr.length - 1 ? 'border-b-0' : ''}`}
                            >
                              <td className="p-4">
                                <div className="font-bold text-[#06125C] flex flex-col gap-1 items-start">
                                  {item.name}
                                  {isJugaPembahas && (
                                    <span className="bg-indigo-100 text-indigo-700 text-[9px] px-2 py-0.5 rounded-full uppercase tracking-wider font-bold border border-indigo-200">
                                      Juga Pembahas
                                    </span>
                                  )}
                                </div>
                                <div className="text-xs text-slate-500 mt-1">{item.nim}</div>
                                <div className="text-xs text-slate-500 mt-1">Judul: <span className="italic">{item.title}</span></div>
                              </td>
                              <td className="p-4 text-slate-700 font-medium">
                                {item.kelas ? `Kelas ${item.kelas.replace('Kelas ', '')}` : '-'}
                              </td>
                              <td className="p-4 text-slate-700 font-medium">
                                {item.dospem}
                              </td>
                              <td className="p-4">
                                <div className="text-sm font-medium text-slate-800">{item.date} • {item.time}</div>
                                <div className="text-xs text-slate-500 mt-0.5"><MapPin size={12} className="inline mr-1 text-amber-500" />{item.room}</div>
                              </td>
                              <td className="p-4 text-slate-700 font-medium">
                                {item.moderator ? item.moderator : <span className="italic text-slate-500">Menunggu Dosen</span>}
                              </td>
                              <td className="p-4 text-slate-700 font-medium">
                                {item.pembahas ? item.pembahas.split(',').map((pStr: string, idx: number) => (
                                  <span key={idx} className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md text-xs font-medium whitespace-nowrap block mb-1">
                                    {pStr}
                                  </span>
                                )) : <span className="italic text-slate-500">Belum ada</span>}
                              </td>
                              <td className="p-4">
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
                              <td className="p-4 text-center">
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
                            <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                              Tidak ada jadwal yang sesuai dengan filter.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                </div>
              </div>
            )}

      {/* Tab Content: Rekapitulasi */}
            {activeTab === "rekapitulasi" && (
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
            )}
          </div>
        )}

      {/* Modal Verifikasi Pendaftaran */}
      {isVerifikasiModalOpen && selectedPendaftar && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsVerifikasiModalOpen(false)}></div>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col relative z-10 overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-[#06125C]">
                  <FileCheck size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[#06125C]">Verifikasi Berkas Mahasiswa</h3>
                  <p className="text-sm text-slate-500">Tinjau kelengkapan berkas pendaftaran seminar.</p>
                </div>
              </div>
              <button onClick={() => setIsVerifikasiModalOpen(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-500">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <h4 className="text-sm font-bold text-slate-700 mb-3 border-b pb-2">Informasi Pengajuan</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-slate-500">Nama Lengkap</p>
                    <p className="font-semibold text-slate-800">{selectedPendaftar.name}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">NIM</p>
                    <p className="font-semibold text-slate-800">{selectedPendaftar.nim}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-slate-500">Judul Penelitian</p>
                    <p className="font-medium text-slate-800">{selectedPendaftar.title}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Konsentrasi</p>
                    <p className="font-medium text-slate-800">{selectedPendaftar.konsentrasi || "-"}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Tanggal Kolokium</p>
                    <p className="font-medium text-slate-800">
                      {selectedPendaftar.tanggalKolokium 
                        ? new Date(selectedPendaftar.tanggalKolokium).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
                        : "-"}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-slate-500">Dosen Pembimbing</p>
                    <p className="font-medium text-slate-800">{selectedPendaftar.dospem}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Jadwal Dipilih</p>
                    <p className="font-medium text-slate-800">{selectedPendaftar.date} • {selectedPendaftar.time}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Ruangan</p>
                    <p className="font-medium text-slate-800">{selectedPendaftar.room}</p>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-bold text-slate-700 mb-3">Dokumen Terlampir</h4>
                <div className="space-y-3">
                  {/* Dokumen 1: Bukti Forum Kolokium */}
                  <div className="flex items-center justify-between p-3 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${selectedPendaftar.fileBuktiKolokium ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-400'}`}>
                        <FileCheck size={16} />
                      </div>
                      <div>
                        <p className={`text-sm font-semibold ${selectedPendaftar.fileBuktiKolokium ? 'text-slate-800' : 'text-slate-400 italic'}`}>
                          Bukti_Forum_Kolokium.pdf
                        </p>
                        <p className="text-xs text-slate-500">
                          {selectedPendaftar.fileBuktiKolokium ? 'Tersedia' : 'Tidak dilampirkan'}
                        </p>
                      </div>
                    </div>
                    {selectedPendaftar.fileBuktiKolokium ? (
                      <a 
                        href={selectedPendaftar.fileBuktiKolokium} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-[#06125C] bg-blue-50 hover:bg-blue-100 p-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                      >
                        <Eye size={16} /> Lihat
                      </a>
                    ) : (
                      <button disabled className="text-slate-400 bg-slate-100 p-2 rounded-lg text-sm font-medium flex items-center gap-2 cursor-not-allowed">
                        <Eye size={16} /> Lihat
                      </button>
                    )}
                  </div>

                  {/* Dokumen 2: Persetujuan Dospem */}
                  <div className="flex items-center justify-between p-3 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${selectedPendaftar.fileApprovalDospem ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-400'}`}>
                        <FileCheck size={16} />
                      </div>
                      <div>
                        <p className={`text-sm font-semibold ${selectedPendaftar.fileApprovalDospem ? 'text-slate-800' : 'text-slate-400 italic'}`}>
                          Persetujuan_Dospem.pdf
                        </p>
                        <p className="text-xs text-slate-500">
                          {selectedPendaftar.fileApprovalDospem ? 'Tersedia' : 'Tidak dilampirkan'}
                        </p>
                      </div>
                    </div>
                    {selectedPendaftar.fileApprovalDospem ? (
                      <a 
                        href={selectedPendaftar.fileApprovalDospem} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-[#06125C] bg-blue-50 hover:bg-blue-100 p-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                      >
                        <Eye size={16} /> Lihat
                      </a>
                    ) : (
                      <button disabled className="text-slate-400 bg-slate-100 p-2 rounded-lg text-sm font-medium flex items-center gap-2 cursor-not-allowed">
                        <Eye size={16} /> Lihat
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-bold text-slate-700 mb-2">Catatan Verifikasi (Opsional)</h4>
                <textarea
                  rows={3}
                  value={catatanVerifikasi}
                  onChange={(e) => setCatatanVerifikasi(e.target.value)}
                  placeholder="Masukkan catatan jika ada perbaikan..."
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-[#06125C]/20 focus:border-[#06125C] transition-all outline-none text-sm text-slate-700 resize-none"
                />
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
              <button
                onClick={() => handleActionVerifikasi('ditolak')}
                disabled={selectedPendaftar.status === 'ditolak'}
                className="px-6 py-2.5 bg-white border border-red-200 hover:bg-red-50 text-red-600 rounded-xl font-semibold transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white"
              >
                Tolak Pendaftaran
              </button>
              <button
                onClick={() => handleActionVerifikasi('disetujui')}
                disabled={selectedPendaftar.status === 'disetujui'}
                className="px-6 py-2.5 bg-[#06125C] hover:bg-[#06125C]/90 text-white rounded-xl font-semibold transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Setujui Pendaftaran
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Hapus Periode */}
      {showDeleteModal && activePeriode && (
        <div className="fixed inset-0 bg-slate-900/50 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-6">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center text-red-600 mb-4">
                <Trash2 size={24} />
              </div>
              <h2 className="text-xl font-bold text-slate-800 mb-2">Hapus Periode</h2>

              {(() => {
                const isAnyClassFormed = uniqueKelas.length > 0;

                return (activePeriode.isOpen || isAnyClassFormed) ? (
                  <div>
                    <p className="text-slate-600 mb-4 text-sm">
                      Periode ini <strong>tidak dapat dihapus</strong> karena kondisi berikut:
                    </p>
                    <ul className="text-sm text-slate-600 space-y-2 mb-6">
                      {activePeriode.isOpen && (
                        <li className="flex items-center gap-2 text-red-600">
                          <XCircle size={16} /> Status pendaftaran masih dibuka.
                        </li>
                      )}
                      {isAnyClassFormed && (
                        <li className="flex items-center gap-2 text-red-600">
                          <XCircle size={16} /> Terdapat kelas yang sudah terbentuk pada periode ini (harus dibatalkan terlebih dahulu).
                        </li>
                      )}
                    </ul>
                    <button
                      onClick={() => setShowDeleteModal(false)}
                      className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-bold transition-colors"
                    >
                      Tutup
                    </button>
                  </div>
                ) : (
                  <div>
                    <p className="text-slate-600 mb-6 text-sm">
                      Apakah Anda yakin ingin menghapus periode <strong>{activePeriode.angkatan}</strong>? Tindakan ini tidak dapat dibatalkan.
                    </p>
                    <div className="flex gap-3">
                      <button
                        onClick={() => setShowDeleteModal(false)}
                        className="flex-1 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-sm font-bold transition-colors"
                      >
                        Batal
                      </button>
                      <button
                        onClick={async () => {
                          try {
                            const res = await fetch(`/api/admin/periode/${activePeriodeId}`, {
                              method: "DELETE",
                            });
                            if (res.ok) {
                              setPeriodes(prev => prev.filter(p => p.id !== activePeriodeId));
                              setCurrentView("landing");
                              setActivePeriodeId(null);
                              setShowDeleteModal(false);
                            } else {
                              const data = await res.json();
                              alert(data.error || "Gagal menghapus periode.");
                            }
                          } catch (e) {
                            console.error(e);
                            alert("Terjadi kesalahan sistem.");
                          }
                        }}
                        className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-bold transition-colors shadow-sm"
                      >
                        Ya, Hapus
                      </button>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Modal Input Data (Mahasiswa / Dosen) */}
      {showAddDataModal && (
        <div className="fixed inset-0 bg-slate-900/50 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <div>
                <h3 className="text-xl font-bold text-slate-800">
                  {isEditMode ? "Edit Data" : "Tambah Data"} {activeMasterTab === "mahasiswa" ? "Mahasiswa" : activeMasterTab === "dosen" ? "Dosen" : "Admin"}
                </h3>
                <p className="text-sm text-slate-500 mt-1">Masukkan informasi {activeMasterTab} dengan benar.</p>
              </div>
              <button
                onClick={() => setShowAddDataModal(false)}
                className="text-slate-400 hover:text-slate-600 bg-slate-50 hover:bg-slate-100 p-2 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={async (e) => {
              e.preventDefault();
              try {
                const endpoint = `/api/admin/master/${activeMasterTab}${isEditMode ? `/${editId}` : ""}`;
                const method = isEditMode ? "PUT" : "POST";

                let body: any = {};
                if (activeMasterTab === "mahasiswa") {
                  body = {
                    nim: addForm.nim_nip,
                    name: addForm.name,
                    angkatan: addForm.angkatan,
                    prodi: addForm.prodi,
                    status: addForm.status_jabatan,
                  };
                } else if (activeMasterTab === "dosen") {
                  body = {
                    nip: addForm.nim_nip,
                    name: addForm.name,
                    prodi: addForm.prodi,
                    jabatan: addForm.status_jabatan,
                    statusDosen: addForm.statusDosen,
                  };
                } else {
                  body = { name: addForm.name };
                }

                const res = await fetch(endpoint, {
                  method,
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(body),
                });

                const data = await res.json();
                if (res.ok) {
                  if (activeMasterTab === "mahasiswa") {
                    if (isEditMode) {
                      setMasterMahasiswa(prev => prev.map(m => m.id === editId ? data.mahasiswa : m));
                    } else {
                      setMasterMahasiswa(prev => [...prev, data.mahasiswa]);
                    }
                  } else if (activeMasterTab === "dosen") {
                    if (isEditMode) {
                      setMasterDosen(prev => prev.map(d => d.id === editId ? data.dosen : d));
                    } else {
                      setMasterDosen(prev => [...prev, data.dosen]);
                    }
                  } else {
                    if (isEditMode) {
                      setMasterAdmin(prev => prev.map(a => a.id === editId ? data.admin : a));
                    } else {
                      setMasterAdmin(prev => [...prev, data.admin]);
                    }
                  }
                  setShowAddDataModal(false);
                  setIsEditMode(false);
                  setEditId(null);
                  setAddForm({ nim_nip: "", name: "", angkatan: "60", prodi: "Akuntansi", status_jabatan: "Aktif", statusDosen: "Dosen Tetap" });
                } else {
                  alert(data.error || "Gagal menyimpan.");
                }
              } catch (e) {
                console.error(e);
                alert("Terjadi kesalahan sistem.");
              }
            }} className="p-6 space-y-4">

              {activeMasterTab !== "admin" && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    {activeMasterTab === "mahasiswa" ? "NIM" : "NIP / NPI"}
                  </label>
                  <input
                    required
                    type="text"
                    value={addForm.nim_nip}
                    onChange={(e) => setAddForm({ ...addForm, nim_nip: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-[#06125C]/20 outline-none text-sm transition-all"
                    placeholder={activeMasterTab === "mahasiswa" ? "Masukkan NIM..." : "Masukkan NIP..."}
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nama Lengkap</label>
                <input
                  required
                  type="text"
                  value={addForm.name}
                  onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-[#06125C]/20 outline-none text-sm transition-all"
                  placeholder="Masukkan Nama Lengkap..."
                />
              </div>

              {activeMasterTab !== "admin" && (
                <>
                  {activeMasterTab === "mahasiswa" && (
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Angkatan</label>
                      <select
                        value={addForm.angkatan}
                        onChange={(e) => setAddForm({ ...addForm, angkatan: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-[#06125C]/20 outline-none text-sm transition-all"
                      >
                        {Array.from({ length: 10 }, (_, i) => 60 + i).map(year => (
                          <option key={year} value={year.toString()}>{year}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {activeMasterTab === "mahasiswa" && (
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Program Studi</label>
                      <input
                        type="text"
                        value="Akuntansi"
                        disabled
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-100 text-slate-500 font-medium outline-none text-sm transition-all cursor-not-allowed"
                      />
                    </div>
                  )}
                {activeMasterTab === "dosen" && (
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Status Dosen</label>
                      <select
                        value={addForm.statusDosen}
                        onChange={(e) => setAddForm({ ...addForm, statusDosen: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-[#06125C]/20 outline-none text-sm transition-all"
                      >
                        <option value="Dosen Tetap">Dosen Tetap</option>
                        <option value="Dosen Praktisi/Luar">Dosen Praktisi/Luar</option>
                      </select>
                    </div>
                  )}
                </>
              )}

              <div className="pt-4 mt-2 border-t border-slate-100 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddDataModal(false)}
                  className="flex-1 px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-sm font-bold transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2.5 bg-[#06125C] hover:bg-[#06125C]/90 text-white rounded-xl text-sm font-bold transition-colors shadow-sm"
                >
                  Simpan Data
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
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
  );
}
