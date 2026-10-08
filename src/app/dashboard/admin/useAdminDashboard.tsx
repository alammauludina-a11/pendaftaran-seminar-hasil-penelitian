// All state and actions of the admin dashboard. The views read them through useAdmin() (AdminContext).
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { drawPdfHeader, pdfTableOptions, formatAngkatan } from "@/lib/pdf-layout";
import { ChevronUp, ChevronDown } from "lucide-react";
import type { PeriodeData, MahasiswaData, DosenData } from "./admin-types";

export function useAdminDashboard() {
  const router = useRouter();
  const handleLogout = async () => {
    await authClient.signOut();
    document.cookie = "user-role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
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
  const [pendaftaran, setPendaftaranState] = useState<any[]>([]);
  const [kelasData, setKelasData] = useState<any[]>([]);
  const [masterMahasiswa, setMasterMahasiswa] = useState<MahasiswaData[]>([]);
  const [masterDosen, setMasterDosen] = useState<DosenData[]>([]);
  const [masterAdmin, setMasterAdmin] = useState<any[]>([]);

  const [isLoading, setIsLoading] = useState(true);

  // Guards so background polling never overwrites local (optimistic) edits with stale server data:
  // - dataVersionRef changes on every local pendaftaran edit and after every write finishes;
  //   a fetch that started before such a change discards its pendaftaran result.
  // - pendingWritesRef counts writes still in-flight; polling is skipped while > 0.
  const dataVersionRef = useRef(0);
  const pendingWritesRef = useRef(0);

  // Local edits go through this wrapper so in-flight polls know their data is outdated
  const setPendaftaran: typeof setPendaftaranState = (update) => {
    dataVersionRef.current++;
    setPendaftaranState(update);
  };

  // Wrap a write request (PUT/POST) so polling pauses until it has been saved
  const trackWrite = async <T,>(request: Promise<T>): Promise<T> => {
    pendingWritesRef.current++;
    try {
      return await request;
    } finally {
      pendingWritesRef.current--;
      dataVersionRef.current++;
    }
  };



  const fetchData = async (silent = false) => {
    try {
      if (!silent) setIsLoading(true);
      const startVersion = dataVersionRef.current;
      // Each request updates its own state as soon as it resolves, so fast data
      // (e.g. the periode list) is not blocked by slower endpoints.
      const load = (url: string, apply: (data: any) => void) =>
        fetch(url)
          .then((res) => res.json())
          .then(apply)
          .catch((e) => console.error(url, e));

      await Promise.all([
        load("/api/admin/periode", (d) => setPeriodes(d.periodes || [])),
        load("/api/admin/master/mahasiswa", (d) => setMasterMahasiswa(d.mahasiswa || [])),
        load("/api/admin/master/dosen", (d) => setMasterDosen(d.dosen || [])),
        load("/api/admin/master/admin", (d) => setMasterAdmin(d.admin || [])),
        load("/api/admin/pendaftaran", (d) => {
          // Skip stale data if the admin edited something (or a write was in-flight) while this request ran
          if (dataVersionRef.current !== startVersion || pendingWritesRef.current > 0) return;
          setPendaftaranState(d.pendaftaran || []);
        }),
        load("/api/admin/kelas", (d) => setKelasData(d.kelas || [])),
      ]);
    } catch (e) {
      console.error(e);
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  // Navigation State
  const [currentView, setCurrentView] = useState<"visual_awal" | "landing" | "pengaturan" | "manajemen" | "master" | "analisis" | "analisis_log" | "coming_soon">("visual_awal");
  const [selectedSeminarType, setSelectedSeminarType] = useState<"kolokium" | "hasil_penelitian" | null>(null);
  const [activeMasterTab, setActiveMasterTab] = useState<"mahasiswa" | "dosen" | "admin">("mahasiswa");
  const [activePeriodeId, setActivePeriodeId] = useState<number | null>(null);

  // Use a ref to track currentView inside the interval closure
  const currentViewRef = useRef(currentView);
  useEffect(() => {
    currentViewRef.current = currentView;
  }, [currentView]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => {
      // Pause polling if the user is in the settings view or a moderator update is in-flight
      if (currentViewRef.current !== "pengaturan" && pendingWritesRef.current === 0) {
        fetchData(true);
      }
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // Tab State inside Manajemen
  const [activeTab, setActiveTab] = useState<"verifikasi" | "finalisasi" | "pembahas" | "pengumuman" | "kelas" | "rekapitulasi">("verifikasi");
  const [rekapSort, setRekapSort] = useState<{ key: 'name' | 'moderatorCount' | 'pembimbingCount', order: 'asc' | 'desc' }>({ key: 'name', order: 'asc' });
  const [rekapSearch, setRekapSearch] = useState("");

  // Filter States inside Manajemen
  const [globalSearch, setGlobalSearch] = useState("");
  const [globalKelasFilter, setGlobalKelasFilter] = useState("Semua Kelas");
  const [selectedDateFilter, setSelectedDateFilter] = useState("Semua Tanggal");
  const [selectedKonsentrasiFilter, setSelectedKonsentrasiFilter] = useState("Semua Konsentrasi");
  const [pengumumanSort, setPengumumanSort] = useState<{ key: 'name' | 'kelas' | 'dospem' | 'waktu' | 'moderator' | 'pembahas' | 'status', order: 'asc' | 'desc' }>({ key: 'waktu', order: 'asc' });
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [verifikasiSort, setVerifikasiSort] = useState<{ key: 'name' | 'kelas' | 'dospem' | 'title' | 'konsentrasi' | 'date', order: 'asc' | 'desc' } | null>(null);
  const [manajemenKelasFilter, setManajemenKelasFilter] = useState("Semua Kelas");
  const [manajemenKelasSort, setManajemenKelasSort] = useState<{ key: 'name' | 'nim', order: 'asc' | 'desc' } | null>(null);

  // Verifikasi Modal States
  const [selectedPendaftar, setSelectedPendaftar] = useState<any>(null);
  const [isVerifikasiModalOpen, setIsVerifikasiModalOpen] = useState(false);
  const [catatanVerifikasi, setCatatanVerifikasi] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Master Data Modal State
  const [selectedMasterIds, setSelectedMasterIds] = useState<string[]>([]);
  const [masterSort, setMasterSort] = useState<{ key: string, order: 'asc' | 'desc' } | null>(null);
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



  const handleGenerateAkunMahasiswa = async (id: string | number, silent = false) => {
    try {
      const res = await fetch("/api/admin/master/mahasiswa/account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id })
      });
      const data = await res.json();
      if (data.success) {
        setMasterMahasiswa(prev => prev.map(m => m.id === id ? { ...m, account: { username: data.username, password: data.password } } : m));
        return { ok: true };
      } else {
        if (!silent) alert(data.error);
        return { ok: false, error: data.error };
      }
    } catch (e) {
      console.error(e);
      if (!silent) alert("Terjadi kesalahan sistem");
      return { ok: false, error: "Kesalahan sistem" };
    }
  };

  const handleGenerateAkunDosen = async (id: string | number, silent = false) => {
    try {
      const res = await fetch("/api/admin/master/dosen/account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id })
      });
      const data = await res.json();
      if (data.success) {
        setMasterDosen(prev => prev.map(d => d.id === id ? { ...d, account: { username: data.username, password: data.password } } : d));
        return { ok: true };
      } else {
        if (!silent) alert(data.error);
        return { ok: false, error: data.error };
      }
    } catch (e) {
      console.error(e);
      if (!silent) alert("Terjadi kesalahan sistem");
      return { ok: false, error: "Kesalahan sistem" };
    }
  };

  const handleGenerateAkunAdmin = async (id: string, silent = false) => {
    try {
      const res = await fetch("/api/admin/master/admin/account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id })
      });
      const data = await res.json();
      if (data.success) {
        setMasterAdmin(prev => prev.map(a => a.id === id ? { ...a, account: { username: data.username, password: data.password } } : a));
        return { ok: true };
      } else {
        if (!silent) alert(data.error);
        return { ok: false, error: data.error };
      }
    } catch (e) {
      console.error(e);
      if (!silent) alert("Terjadi kesalahan sistem");
      return { ok: false, error: "Kesalahan sistem" };
    }
  };

  const handleGenerateSemuaAkun = async () => {
    let berhasil = 0;
    const gagalList: string[] = [];

    if (activeMasterTab === "mahasiswa") {
      const usersToGenerate = masterMahasiswa.filter(m => !m.account);
      for (const m of usersToGenerate) {
        const result = await handleGenerateAkunMahasiswa(m.id, true);
        if (result.ok) berhasil++;
        else gagalList.push(`${m.nim} (${m.name}): ${result.error}`);
      }
    } else if (activeMasterTab === "dosen") {
      const usersToGenerate = masterDosen.filter(d => !d.account);
      for (const d of usersToGenerate) {
        const result = await handleGenerateAkunDosen(d.id, true);
        if (result.ok) berhasil++;
        else gagalList.push(`${d.nip} (${d.name}): ${result.error}`);
      }
    } else {
      const usersToGenerate = masterAdmin.filter(a => !a.account);
      for (const a of usersToGenerate) {
        const result = await handleGenerateAkunAdmin(a.id as string, true);
        if (result.ok) berhasil++;
        else gagalList.push(`${a.name}: ${result.error}`);
      }
    }

    // Show single summary
    if (gagalList.length === 0) {
      alert(`Berhasil: ${berhasil} akun berhasil digenerate.`);
    } else {
      const gagalMsg = gagalList.join("\n");
      alert(`Berhasil: ${berhasil} akun.\nGagal (${gagalList.length}):\n${gagalMsg}`);
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

  const handleBulkDeleteMasterData = async () => {
    if (selectedMasterIds.length === 0) return;
    if (!confirm(`Apakah Anda yakin ingin menghapus ${selectedMasterIds.length} data terpilih secara massal?`)) return;
    try {
      const res = await fetch("/api/admin/master/bulk-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: activeMasterTab, ids: selectedMasterIds })
      });
      
      if (res.ok) {
        if (activeMasterTab === "mahasiswa") setMasterMahasiswa(prev => prev.filter(m => !selectedMasterIds.includes(String(m.id))));
        else if (activeMasterTab === "dosen") setMasterDosen(prev => prev.filter(d => !selectedMasterIds.includes(String(d.id))));
        else setMasterAdmin(prev => prev.filter(a => !selectedMasterIds.includes(String(a.id))));
        
        setSelectedMasterIds([]); // Clear selection after successful deletion
      } else {
        const data = await res.json();
        alert(data.error || "Gagal menghapus data massal.");
      }
    } catch (e) {
      console.error(e);
      alert("Terjadi kesalahan sistem saat menghapus data massal.");
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

  // Save a manually edited pembahas; on failure reload the real data so the screen never shows unsaved values
  const savePembahas = async (pendaftaranId: number, pembahasStr: string) => {
    try {
      const res = await trackWrite(fetch(`/api/admin/pendaftaran/${pendaftaranId}/pembahas`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pembahas: pembahasStr }),
      }));
      if (res.ok) return;
      const data = await res.json().catch(() => ({}));
      alert(data.error || "Pembahas gagal disimpan. Silakan coba lagi.");
    } catch (err) {
      console.error("Gagal menyimpan pembahas:", err);
      alert("Pembahas gagal disimpan. Periksa koneksi lalu coba lagi.");
    }
    fetchData(true);
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

    if (newAssignments.length === 0) {
      alert("Pembahas tidak dapat dibuat: kelas ini membutuhkan minimal 2 mahasiswa.");
      return;
    }

    // Remember the current values so the optimistic update can be rolled back on failure
    const previous = new Map(classStudents.map(s => [s.id, s.pembahas]));

    // Optimistic update
    setPendaftaran(prev => {
      let next = [...prev];
      newAssignments.forEach(assignment => {
        next = next.map(p => p.id === assignment.id ? { ...p, pembahas: assignment.pembahas } : p);
      });
      return next;
    });

    // DB Update: the whole class is saved in one atomic request (all or nothing)
    try {
      const res = await trackWrite(fetch(`/api/admin/pendaftaran/pembahas-batch`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignments: newAssignments }),
      }));
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `HTTP ${res.status}`);
      }
    } catch (e) {
      console.error("Gagal generate pembahas:", e);
      setPendaftaran(prev => prev.map(p => previous.has(p.id) ? { ...p, pembahas: previous.get(p.id) } : p));
      alert(`Pembahas gagal disimpan, tidak ada data yang berubah. Silakan coba lagi.\n${e instanceof Error ? e.message : ""}`);
    }
  };

  const activePeriode = periodes.find(p => p.id === activePeriodeId);

  // Helper for updating active period
  const updateActivePeriode = (updates: any) => {
    setPeriodes(prev => prev.map(p => p.id === activePeriodeId ? { ...p, ...updates } : p));
  };

  // Filter Pendaftaran (Hanya untuk periode aktif, dengan global search & kelas filter)
  const activePendaftaran = pendaftaran.filter(p => p.periodeId === activePeriodeId);

  const rekapitulasiData = [...masterDosen]
    .filter(d => !rekapSearch || d.name.toLowerCase().includes(rekapSearch.toLowerCase()))
    .map(dosen => {
    const moderatorCount = activePendaftaran.filter(p => p.moderatorId === dosen.id).length;
    const pembimbingCount = activePendaftaran.filter(p => p.dospem1Id === dosen.id || p.dospem2Id === dosen.id).length;
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
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const seminarType = activePeriode?.jenisSeminar === 'kolokium' ? 'Seminar Kolokium' : 'Seminar Hasil Penelitian';
    const angkatanText = formatAngkatan(activePeriode?.angkatan);
    const startY = drawPdfHeader(doc, 'Rekapitulasi Tugas Dosen', [
      [seminarType, angkatanText].filter(Boolean).join('  |  '),
      `Jumlah dosen: ${rekapitulasiData.length}`,
    ]);

    const totalModerator = rekapitulasiData.reduce((sum, d) => sum + d.moderatorCount, 0);
    const totalPembimbing = rekapitulasiData.reduce((sum, d) => sum + d.pembimbingCount, 0);

    autoTable(doc, pdfTableOptions(doc, startY, {
      head: [['No', 'Nama Dosen', 'Sebagai Moderator', 'Sebagai Pembimbing']],
      body: rekapitulasiData.map((d, i) => [i + 1, d.name, d.moderatorCount, d.pembimbingCount]),
      foot: [['', 'Total', totalModerator, totalPembimbing]],
      showFoot: 'lastPage',
      columnStyles: {
        0: { cellWidth: 12, halign: 'center' },
        1: { cellWidth: 98 },
        2: { cellWidth: 38, halign: 'center' },
        3: { cellWidth: 38, halign: 'center' },
      },
      didParseCell: (data) => {
        if (data.section === 'foot' && data.column.index >= 2) data.cell.styles.halign = 'center';
      },
    }));

    doc.save(`Rekapitulasi_Dosen_${seminarType}_${angkatanText}.pdf`.replace(/\s+/g, '_'));
  };
  const uniqueKelas = Array.from(new Set(activePendaftaran.map(p => p.kelas))).filter(Boolean);
  const uniqueAngkatan = Array.from(new Set(masterMahasiswa.map(m => m.angkatan).filter(Boolean))).sort();

  const filteredPendaftaran = activePendaftaran.filter(p => {
    const searchLower = globalSearch.toLowerCase();
    const matchesSearch = p.name.toLowerCase().includes(searchLower) ||
      p.nim.toLowerCase().includes(searchLower) ||
      (p.dospem && p.dospem.toLowerCase().includes(searchLower)) ||
      (p.dospem2 && p.dospem2.toLowerCase().includes(searchLower));
    const matchesKelas = globalKelasFilter === "Semua Kelas" || (p.kelas ? p.kelas === globalKelasFilter : globalKelasFilter === "Antrean");
    const matchesDate = selectedDateFilter === "Semua Tanggal" || p.date === selectedDateFilter;
    return matchesSearch && matchesKelas && matchesDate;
  }).sort((a, b) => {
    if (!verifikasiSort) return 0;
    const { key, order } = verifikasiSort;
    let valA = a[key] || "";
    let valB = b[key] || "";
    
    // For date sorting, we might want to compare the actual parsed date, but string comparison is okay if formatted properly, 
    // actually, let's just use string comparison for all text fields.
    if (valA < valB) return order === 'asc' ? -1 : 1;
    if (valA > valB) return order === 'asc' ? 1 : -1;
    return 0;
  });

  const uniqueKonsentrasi = Array.from(new Set(activePendaftaran.map(p => p.konsentrasi))).filter(Boolean).sort() as string[];
  const verifikasiList = selectedKonsentrasiFilter === "Semua Konsentrasi"
    ? filteredPendaftaran
    : filteredPendaftaran.filter(p => p.konsentrasi === selectedKonsentrasiFilter);

  const finalizedList = filteredPendaftaran.filter(p => p.isFinalized);
  const uniqueDates = Array.from(new Set(finalizedList.map(p => p.date)));
  const uniqueAllDates = Array.from(new Set(activePendaftaran.map(p => p.date))).filter(Boolean).sort();

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
        // Verification can form a class or remove the student from a class, so reload the real data
        fetchData(true);
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.error || "Gagal memperbarui verifikasi.");
      }
    } catch (e) {
      console.error(e);
      alert("Terjadi kesalahan sistem.");
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

  const handleBatalModerator = async (pendaftaranId: number, action: "setujui" | "tolak") => {
    try {
      const res = await fetch(`/api/admin/pendaftaran/${pendaftaranId}/batal-moderator`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (res.ok) {
        if (action === "setujui") {
          // Remove moderator from state
          setPendaftaran(prev => prev.map(p => p.id === pendaftaranId
            ? { ...p, moderatorId: null, moderator: null, moderatorAssignedByRole: null, moderatorBatalStatus: null }
            : p
          ));
        } else {
          // Update batal status to "ditolak"
          setPendaftaran(prev => prev.map(p => p.id === pendaftaranId
            ? { ...p, moderatorBatalStatus: "ditolak" }
            : p
          ));
        }
        alert(data.message);
      } else {
        alert(data.error || "Gagal memproses pengajuan.");
      }
    } catch (e) {
      console.error(e);
      alert("Terjadi kesalahan.");
    }
  };

  // Handlers for Pengumuman
  const displayFinalized = selectedDateFilter === "Semua Tanggal"
    ? finalizedList
    : finalizedList.filter(p => p.date === selectedDateFilter);

  // Table order for the Pengumuman tab (click a column header to sort)
  const getPengumumanStatus = (p: any) => {
    if (!p.isReleased) return 'Draft';
    return p.waktuMulai && new Date(p.waktuMulai) < new Date() ? 'Selesai' : 'Dirilis';
  };
  const sortedPengumuman = [...displayFinalized].sort((a: any, b: any) => {
    const { key, order } = pengumumanSort;
    const dir = order === 'asc' ? 1 : -1;
    if (key === 'waktu') {
      return (new Date(a.waktuMulai || 0).getTime() - new Date(b.waktuMulai || 0).getTime()) * dir;
    }
    const value = (p: any) => key === 'status' ? getPengumumanStatus(p) : (p[key] || '');
    const cmp = String(value(a)).localeCompare(String(value(b)), 'id', { numeric: true, sensitivity: 'base' });
    // Ties fall back to schedule time so the list stays in a predictable order
    return cmp !== 0 ? cmp * dir : new Date(a.waktuMulai || 0).getTime() - new Date(b.waktuMulai || 0).getTime();
  });

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

    return { title, filename, jenisText, angkatanStr, kelasStr, dateStr };
  };

  const handleExportExcel = () => {
    const sortedData = getSortedDisplayFinalized();
    const { filename } = getExportTitleAndFilename(sortedData);
    
    const ws = XLSX.utils.json_to_sheet(sortedData.map((item: any) => ({
      Mahasiswa: `${item.name} (${item.nim})`,
      Judul: item.title,
      Kelas: item.kelas,
      DosenPembimbing: item.dospem2 ? `1. ${item.dospem}\n2. ${item.dospem2}` : item.dospem,
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
    const { filename, jenisText, angkatanStr, kelasStr, dateStr } = getExportTitleAndFilename(sortedData);

    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const startY = drawPdfHeader(doc, `Pengumuman Jadwal ${jenisText}`, [
      [formatAngkatan(angkatanStr), `Kelas ${kelasStr}`].filter(Boolean).join('  |  '),
      `Tanggal: ${dateStr}`,
    ]);

    autoTable(doc, pdfTableOptions(doc, startY, {
      head: [['No', 'Mahasiswa', 'Judul Penelitian', 'Kelas', 'Dosen Pembimbing', 'Waktu & Ruangan', 'Moderator', 'Pembahas']],
      body: sortedData.map((item: any, idx: number) => [
        idx + 1,
        `${item.name}\n${item.nim}`,
        item.title || '-',
        item.kelas ? `Kelas ${item.kelas.replace('Kelas ', '')}` : '-',
        item.dospem2 ? `1. ${item.dospem}\n2. ${item.dospem2}` : (item.dospem || '-'),
        `${item.date}\n${item.time}\n${item.room || '-'}`,
        item.moderator || '-',
        item.pembahas ? item.pembahas.split(',').map((p: string) => p.trim()).filter(Boolean).join('\n') : '-'
      ]),
      columnStyles: {
        0: { cellWidth: 9, halign: 'center' },
        1: { cellWidth: 38 },
        2: { cellWidth: 62 },
        3: { cellWidth: 16, halign: 'center' },
        4: { cellWidth: 40 },
        5: { cellWidth: 32 },
        6: { cellWidth: 34 },
        7: { cellWidth: 42 },
      },
    }));
    doc.save(`${filename}.pdf`);
  };

  const handleExportKelasPDF = () => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    const displayList = activePendaftaran.filter(p => p.kelasSeminarId && (manajemenKelasFilter === "Semua Kelas" || p.kelasSeminarId?.toString() === manajemenKelasFilter)).sort((a, b) => {
      if (manajemenKelasSort) {
        const valA = a[manajemenKelasSort.key] || "";
        const valB = b[manajemenKelasSort.key] || "";
        if (valA < valB) return manajemenKelasSort.order === 'asc' ? -1 : 1;
        if (valA > valB) return manajemenKelasSort.order === 'asc' ? 1 : -1;
      }
      const aKelas = kelasData.find(k => k.id === a.kelasSeminarId)?.namaKelas || "";
      const bKelas = kelasData.find(k => k.id === b.kelasSeminarId)?.namaKelas || "";
      return aKelas.localeCompare(bKelas);
    });

    const uniqueClasses = Array.from(new Set(displayList.map((item: any) => kelasData.find(k => k.id === item.kelasSeminarId)?.namaKelas).filter(Boolean))).sort();
    const classRange = uniqueClasses.length > 1 ? `${uniqueClasses[0]}-${uniqueClasses[uniqueClasses.length - 1]}` : uniqueClasses.length === 1 ? uniqueClasses[0] : '';
    
    const seminarType = activePeriode?.jenisSeminar === 'kolokium' ? 'Kolokium' : 'Hasil Penelitian';
    const angkatanText = formatAngkatan(activePeriode?.angkatan);
    const kelasText = uniqueClasses.length === 0 ? ''
      : uniqueClasses.length === 1 ? `Kelas ${uniqueClasses[0]}`
      : `Kelas ${uniqueClasses.slice(0, -1).join(', ')} dan ${uniqueClasses[uniqueClasses.length - 1]}`;

    const startY = drawPdfHeader(doc, `Daftar Kelas Seminar ${seminarType}`, [
      [angkatanText, kelasText].filter(Boolean).join('  |  '),
      `Jumlah mahasiswa: ${displayList.length}`,
    ]);

    autoTable(doc, pdfTableOptions(doc, startY, {
      head: [['No', 'Nama Mahasiswa', 'NIM', 'Kelas']],
      body: displayList.map((item: any, idx: number) => {
        const currentClass = kelasData.find(k => k.id === item.kelasSeminarId);
        return [idx + 1, item.name, item.nim, `Kelas ${currentClass?.namaKelas || "-"}`];
      }),
      columnStyles: {
        0: { cellWidth: 12, halign: 'center' },
        1: { cellWidth: 94 },
        2: { cellWidth: 45, halign: 'center' },
        3: { cellWidth: 35, halign: 'center' },
      },
    }));

    const filename = `Daftar_Kelas_${classRange ? classRange + '_' : ''}Seminar_${seminarType}_${angkatanText}.pdf`.replace(/\s+/g, '_');
    doc.save(filename);
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
    const kirim = (konfirmasiFinal: boolean) => fetch(`/api/admin/pendaftaran/${id}/ruangan`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "approve", konfirmasiFinal }),
    });
    // Changing the room of a finalized schedule changes the published announcement: ask first
    const konfirmasi = (dirilis: boolean, dari: string | null, ke: string) => confirm(
      `Jadwal ini sudah difinalisasi${dirilis ? " dan DIRILIS di pengumuman" : ""}.\n\n` +
      `Ruangan akan berubah dari "${dari ?? "-"}" menjadi "${ke}".\n` +
      `Mahasiswa, dosen pembimbing, moderator, dan pembahas tidak mendapat pemberitahuan otomatis.\n\n` +
      `Lanjutkan mengubah ruangan?`
    );
    try {
      const item = pendaftaran.find((p) => p.id === id);
      const final = !!item && (item.isFinalized || item.isReleased);
      if (final && !konfirmasi(item.isReleased, item.room, item.ruanganDiajukan)) return;
      let res = await kirim(final);
      let result = await res.json().catch(() => ({}));
      // The local list may be outdated (finalized meanwhile): the server then asks for the confirmation itself
      if (res.status === 409 && result.perluKonfirmasi) {
        if (!konfirmasi(result.dirilis, result.dari, result.ke)) return;
        res = await kirim(true);
        result = await res.json().catch(() => ({}));
      }
      if (res.ok) {
        setPendaftaran((prev) =>
          prev.map((p) => (p.id === id ? { ...p, room: result.data.ruanganDisetujui, statusRuangan: result.data.statusRuangan } : p))
        );
      } else {
        alert(result.error || "Gagal menyetujui ruangan.");
      }
    } catch (e) {
      console.error(e);
    }
  };



  const handleCreateNewPeriode = async () => {
    try {
      const uniqueAngkatan = Array.from(new Set(masterMahasiswa.map(m => m.angkatan).filter(Boolean))) as string[];
      const currentType = selectedSeminarType || "hasil_penelitian";

      // Find angkatan that do NOT already have a non-draft periode for this seminar type
      const existingAngkatan = new Set(
        periodes
          .filter(p => p.jenisSeminar === currentType && !p.isDraft)
          .map(p => p.angkatan)
      );
      const availableAngkatan = uniqueAngkatan.filter(a => !existingAngkatan.has(`AKN ${a}`));

      // Default to first available, otherwise first existing angkatan
      const defaultAngkatan = availableAngkatan.length > 0
        ? `AKN ${availableAngkatan[0]}`
        : uniqueAngkatan.length > 0
        ? `AKN ${uniqueAngkatan[0]}`
        : `AKN ${new Date().getFullYear() - 1960 + 60}`;

      const res = await fetch("/api/admin/periode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          angkatan: defaultAngkatan,
          jenisSeminar: currentType,
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
  const rawCurrentMasterData = activeMasterTab === "mahasiswa" 
    ? masterMahasiswa.filter(m => (m.name.toLowerCase().includes(masterSearch.toLowerCase()) || m.nim.toLowerCase().includes(masterSearch.toLowerCase())) && (masterAngkatanFilter === "Semua Angkatan" || m.angkatan === masterAngkatanFilter))
    : activeMasterTab === "dosen"
    ? masterDosen.filter(d => d.name.toLowerCase().includes(masterSearch.toLowerCase()) || d.nip.toLowerCase().includes(masterSearch.toLowerCase()))
    : masterAdmin.filter(a => a.name.toLowerCase().includes(masterSearch.toLowerCase()));

  const currentMasterData = [...rawCurrentMasterData].sort((a: any, b: any) => {
    if (!masterSort) return 0;
    const { key, order } = masterSort;
    
    let valA = a[key] ?? '';
    let valB = b[key] ?? '';
    
    if (key === 'account') {
        valA = a.account ? '1' : '0';
        valB = b.account ? '1' : '0';
    } else if (key === 'nim_nip') {
        valA = a.nim || a.nip || '';
        valB = b.nim || b.nip || '';
    }

    if (typeof valA === 'string' && typeof valB === 'string') {
        return order === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
    }
    
    return order === 'asc' ? (valA > valB ? 1 : -1) : (valB > valA ? 1 : -1);
  });

  const handleMasterSort = (key: string) => {
    let order: 'asc' | 'desc' = 'asc';
    if (masterSort && masterSort.key === key && masterSort.order === 'asc') {
      order = 'desc';
    }
    setMasterSort({ key, order });
  };

  const renderMasterSortableHeader = (label: string, key: string, align: 'left' | 'center' | 'right' = 'left') => {
    const isSorted = masterSort?.key === key;
    return (
      <th 
        key={key}
        className={`p-4 text-${align} cursor-pointer hover:bg-slate-100 transition-colors select-none`}
        onClick={() => handleMasterSort(key)}
      >
        <div className={`flex items-center gap-1 ${align === 'center' ? 'justify-center' : align === 'right' ? 'justify-end' : ''}`}>
          {label}
          <div className="flex flex-col">
            <ChevronUp size={10} className={`${isSorted && masterSort.order === 'asc' ? 'text-indigo-600' : 'text-slate-300'}`} />
            <ChevronDown size={10} className={`${isSorted && masterSort.order === 'desc' ? 'text-indigo-600' : 'text-slate-300'} -mt-1`} />
          </div>
        </div>
      </th>
    );
  };

  const handleSelectAllMaster = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedMasterIds(currentMasterData.map(item => String(item.id)));
    } else {
      setSelectedMasterIds([]);
    }
  };

  const toggleSelectMaster = (id: string | number) => {
    const strId = String(id);
    setSelectedMasterIds(prev => 
      prev.includes(strId) ? prev.filter(selectedId => selectedId !== strId) : [...prev, strId]
    );
  };

  return {
    router,
    handleLogout,
    fileInputRef,
    handleImportExcel,
    handleDownloadTemplate,
    fileInputDosenRef,
    handleImportExcelDosen,
    handleDownloadTemplateDosen,
    periodes,
    setPeriodes,
    pendaftaran,
    setPendaftaranState,
    kelasData,
    setKelasData,
    masterMahasiswa,
    setMasterMahasiswa,
    masterDosen,
    setMasterDosen,
    masterAdmin,
    setMasterAdmin,
    isLoading,
    setIsLoading,
    dataVersionRef,
    pendingWritesRef,
    setPendaftaran,
    trackWrite,
    fetchData,
    currentView,
    setCurrentView,
    selectedSeminarType,
    setSelectedSeminarType,
    activeMasterTab,
    setActiveMasterTab,
    activePeriodeId,
    setActivePeriodeId,
    currentViewRef,
    activeTab,
    setActiveTab,
    rekapSort,
    setRekapSort,
    rekapSearch,
    setRekapSearch,
    globalSearch,
    setGlobalSearch,
    globalKelasFilter,
    setGlobalKelasFilter,
    selectedDateFilter,
    setSelectedDateFilter,
    selectedKonsentrasiFilter,
    setSelectedKonsentrasiFilter,
    pengumumanSort,
    setPengumumanSort,
    isMobileMenuOpen,
    setIsMobileMenuOpen,
    verifikasiSort,
    setVerifikasiSort,
    manajemenKelasFilter,
    setManajemenKelasFilter,
    manajemenKelasSort,
    setManajemenKelasSort,
    selectedPendaftar,
    setSelectedPendaftar,
    isVerifikasiModalOpen,
    setIsVerifikasiModalOpen,
    catatanVerifikasi,
    setCatatanVerifikasi,
    showDeleteModal,
    setShowDeleteModal,
    selectedMasterIds,
    setSelectedMasterIds,
    masterSort,
    setMasterSort,
    masterSearch,
    setMasterSearch,
    masterAngkatanFilter,
    setMasterAngkatanFilter,
    showAddDataModal,
    setShowAddDataModal,
    isEditMode,
    setIsEditMode,
    editId,
    setEditId,
    addForm,
    setAddForm,
    handleGenerateAkunMahasiswa,
    handleGenerateAkunDosen,
    handleGenerateAkunAdmin,
    handleGenerateSemuaAkun,
    handleEditMasterData,
    handleDeleteMasterData,
    handleBulkDeleteMasterData,
    handleBatalBentukKelas,
    handlePindahKelas,
    savePembahas,
    handleGeneratePembahas,
    activePeriode,
    updateActivePeriode,
    activePendaftaran,
    rekapitulasiData,
    handleSortRekap,
    handleExportRekapExcel,
    handleExportRekapPDF,
    uniqueKelas,
    uniqueAngkatan,
    filteredPendaftaran,
    uniqueKonsentrasi,
    verifikasiList,
    finalizedList,
    uniqueDates,
    uniqueAllDates,
    handleVerifikasiClick,
    handleActionVerifikasi,
    handleFinalisasi,
    handleBatalModerator,
    displayFinalized,
    getPengumumanStatus,
    sortedPengumuman,
    getSortedDisplayFinalized,
    getExportTitleAndFilename,
    handleExportExcel,
    handleExportPDF,
    handleExportKelasPDF,
    handleBatalRilis,
    handleSetujuiRuangan,
    handleCreateNewPeriode,
    rawCurrentMasterData,
    currentMasterData,
    handleMasterSort,
    renderMasterSortableHeader,
    handleSelectAllMaster,
    toggleSelectMaster,
  };
}
