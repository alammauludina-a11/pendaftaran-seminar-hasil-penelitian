"use client";

import { useEffect, useState } from "react";
import { Users, CheckCircle2, Clock, XCircle, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";

type Mahasiswa = {
   id: number;
   nama: string | null;
   nim: string | null;
   judul: string | null;
   peran: string;
   tanggalDaftar: string | null;
   statusVerifikasi: "menunggu" | "disetujui" | "ditolak";
   catatanAdmin: string | null;
   namaKelas: string | null;
   waktuMulai: string | null;
   waktuSelesai: string | null;
   pembahas: string | null;
   ruanganDisetujui: string | null;
   ruanganDiajukan: string | null;
   statusRuangan: "menunggu" | "disetujui" | "ditolak";
   moderator: string | null;
   moderatorBatalStatus: "menunggu" | "disetujui" | "ditolak" | null;
   isFinalized: boolean;
   isReleased: boolean;
};

const tz = { timeZone: "Asia/Jakarta" } as const;
const formatTanggal = (v: string | null) =>
   v ? new Date(v).toLocaleDateString("id-ID", { ...tz, day: "2-digit", month: "short", year: "numeric" }) : "-";
const formatJam = (v: string) =>
   new Date(v).toLocaleTimeString("id-ID", { ...tz, hour: "2-digit", minute: "2-digit" });

const Badge = ({ tone, children, title }: { tone: "ok" | "wait" | "no" | "none"; children: React.ReactNode; title?: string }) => {
   const styles = {
      ok: "bg-emerald-50 text-emerald-700 border-emerald-200",
      wait: "bg-amber-50 text-amber-700 border-amber-200",
      no: "bg-red-50 text-red-700 border-red-200",
      none: "bg-slate-50 text-slate-400 border-slate-200",
   }[tone];
   const Icon = tone === "ok" ? CheckCircle2 : tone === "no" ? XCircle : Clock;
   return (
      <span title={title} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-semibold ${styles}`}>
         <Icon size={12} /> {children}
      </span>
   );
};

// Sort value per column; statuses sort by how far along the process they are
type SortKey = "nama" | "judul" | "tanggalDaftar" | "verifikasi" | "jadwal" | "pembahas" | "ruangan" | "moderator" | "rilis";
const nilaiSort: Record<SortKey, (m: Mahasiswa) => string | number | null> = {
   nama: m => m.nama,
   judul: m => m.judul,
   tanggalDaftar: m => (m.tanggalDaftar ? new Date(m.tanggalDaftar).getTime() : null),
   verifikasi: m => ({ ditolak: 0, menunggu: 1, disetujui: 2 })[m.statusVerifikasi],
   jadwal: m => (m.waktuMulai ? new Date(m.waktuMulai).getTime() : null),
   pembahas: m => m.pembahas || null,
   ruangan: m => m.ruanganDisetujui || m.ruanganDiajukan || null,
   moderator: m => m.moderator,
   rilis: m => (m.isReleased ? 2 : m.isFinalized ? 1 : 0),
};
const kolom: { key: SortKey; label: string }[] = [
   { key: "nama", label: "Mahasiswa" },
   { key: "judul", label: "Judul" },
   { key: "tanggalDaftar", label: "Mendaftar" },
   { key: "verifikasi", label: "Verifikasi" },
   { key: "jadwal", label: "Kelas & Jadwal" },
   { key: "pembahas", label: "Pembahas" },
   { key: "ruangan", label: "Ruangan" },
   { key: "moderator", label: "Moderator" },
   { key: "rilis", label: "Rilis" },
];

export default function TabMahasiswaBimbingan({ periodeId }: { periodeId: string | null }) {
   const [mahasiswa, setMahasiswa] = useState<Mahasiswa[]>([]);
   const [isLoading, setIsLoading] = useState(true);
   const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({ key: "nama", dir: "asc" });

   useEffect(() => {
      // Ignore a late response when the periode was changed in the meantime
      let dibatalkan = false;
      const load = async () => {
         try {
            setIsLoading(true);
            const res = await fetch(periodeId ? `/api/dosen/bimbingan?periodeId=${periodeId}` : "/api/dosen/bimbingan");
            const data = await res.json();
            if (!dibatalkan) setMahasiswa(data.mahasiswa || []);
         } catch (e) {
            console.error(e);
         } finally {
            if (!dibatalkan) setIsLoading(false);
         }
      };
      load();
      return () => { dibatalkan = true; };
   }, [periodeId]);

   const handleSort = (key: SortKey) =>
      setSort(prev => ({ key, dir: prev.key === key && prev.dir === "asc" ? "desc" : "asc" }));

   const sorted = [...mahasiswa].sort((a, b) => {
      const va = nilaiSort[sort.key](a);
      const vb = nilaiSort[sort.key](b);
      // Empty values always go last, whatever the direction
      if (va === null || va === "") return vb === null || vb === "" ? 0 : 1;
      if (vb === null || vb === "") return -1;
      const cmp = typeof va === "number" && typeof vb === "number"
         ? va - vb
         : String(va).localeCompare(String(vb), "id", { numeric: true, sensitivity: "base" });
      // Ties fall back to name so the order stays predictable
      return (cmp || (a.nama || "").localeCompare(b.nama || "", "id")) * (cmp ? (sort.dir === "asc" ? 1 : -1) : 1);
   });

   return (
      <div className="flex flex-col gap-4">
         <div className="space-y-1">
            <h2 className="text-xl font-bold text-[#06125C] flex items-center gap-2">
               <Users className="text-indigo-500" /> Mahasiswa Bimbingan
            </h2>
            <p className="text-sm text-slate-500">Progres pendaftaran seminar mahasiswa bimbingan Anda pada periode yang dipilih.</p>
         </div>

         <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
               <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                     <tr>
                        <th className="px-4 py-3 text-center w-12">No</th>
                        {kolom.map(k => {
                           const Icon = sort.key !== k.key ? ArrowUpDown : sort.dir === "asc" ? ArrowUp : ArrowDown;
                           return (
                              <th key={k.key} className="px-4 py-3 cursor-pointer hover:bg-slate-100 transition-colors select-none" onClick={() => handleSort(k.key)}>
                                 <div className="flex items-center justify-between gap-2">
                                    {k.label} <Icon size={14} className={sort.key === k.key ? "text-[#06125C]" : "text-slate-400"} />
                                 </div>
                              </th>
                           );
                        })}
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                     {isLoading ? (
                        <tr>
                           <td colSpan={10} className="px-4 py-8 text-center text-slate-500">Memuat data...</td>
                        </tr>
                     ) : sorted.length === 0 ? (
                        <tr>
                           <td colSpan={10} className="px-4 py-8 text-center text-slate-500">
                              Belum ada mahasiswa bimbingan yang mendaftar pada periode ini.
                           </td>
                        </tr>
                     ) : (
                        sorted.map((m, idx) => {
                           const pembahas = (m.pembahas || "").split(",").map(s => s.trim()).filter(Boolean);
                           return (
                              <tr key={m.id} className="hover:bg-slate-50 transition-colors align-top">
                                 <td className="px-4 py-3 text-slate-500 text-center">{idx + 1}</td>
                                 <td className="px-4 py-3">
                                    <div className="font-semibold text-slate-800">{m.nama}</div>
                                    <div className="text-xs text-slate-500">{m.nim} • {m.peran}</div>
                                 </td>
                                 <td className="px-4 py-3 text-slate-600 max-w-[220px] truncate" title={m.judul || ""}>{m.judul || "-"}</td>
                                 <td className="px-4 py-3">
                                    <Badge tone="ok">{formatTanggal(m.tanggalDaftar)}</Badge>
                                 </td>
                                 <td className="px-4 py-3">
                                    {m.statusVerifikasi === "disetujui" ? (
                                       <Badge tone="ok">Disetujui</Badge>
                                    ) : m.statusVerifikasi === "ditolak" ? (
                                       <Badge tone="no" title={m.catatanAdmin || undefined}>Ditolak</Badge>
                                    ) : (
                                       <Badge tone="wait">Menunggu</Badge>
                                    )}
                                 </td>
                                 <td className="px-4 py-3">
                                    {m.namaKelas ? (
                                       <div className="flex flex-col gap-0.5">
                                          <span className="font-medium text-slate-700">{m.namaKelas}</span>
                                          {m.waktuMulai && (
                                             <span className="text-xs text-slate-500">
                                                {formatTanggal(m.waktuMulai)} • {formatJam(m.waktuMulai)}{m.waktuSelesai ? ` - ${formatJam(m.waktuSelesai)}` : ""}
                                             </span>
                                          )}
                                       </div>
                                    ) : (
                                       <Badge tone="none">Belum</Badge>
                                    )}
                                 </td>
                                 <td className="px-4 py-3">
                                    {pembahas.length > 0 ? (
                                       <div className="flex flex-col gap-0.5 text-xs text-slate-600">
                                          {pembahas.map((p, i) => <span key={i}>{i + 1}. {p}</span>)}
                                       </div>
                                    ) : (
                                       <Badge tone="none">Belum</Badge>
                                    )}
                                 </td>
                                 <td className="px-4 py-3">
                                    {/* The first room is set directly by the student; later changes wait for admin approval */}
                                    {m.ruanganDisetujui || m.ruanganDiajukan ? (
                                       <div className="flex flex-col gap-1">
                                          {m.ruanganDisetujui && <span className="font-medium text-slate-700">{m.ruanganDisetujui}</span>}
                                          {m.statusRuangan === "menunggu" && m.ruanganDiajukan && m.ruanganDiajukan !== m.ruanganDisetujui && (
                                             <>
                                                <span className="text-xs text-slate-500">Pindah ke: {m.ruanganDiajukan}</span>
                                                <Badge tone="wait">Menunggu admin</Badge>
                                             </>
                                          )}
                                       </div>
                                    ) : (
                                       <Badge tone="none">Belum</Badge>
                                    )}
                                 </td>
                                 <td className="px-4 py-3">
                                    {m.moderator ? (
                                       <div className="flex flex-col gap-1">
                                          <span className="text-slate-700">{m.moderator}</span>
                                          {m.moderatorBatalStatus === "menunggu" && (
                                             <span className="text-[11px] leading-tight text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1 whitespace-normal max-w-[200px]">
                                                Moderator mengajukan pembatalan dan sedang menunggu persetujuan admin
                                             </span>
                                          )}
                                       </div>
                                    ) : (
                                       <Badge tone="none">Belum</Badge>
                                    )}
                                 </td>
                                 <td className="px-4 py-3">
                                    {m.isReleased ? (
                                       <Badge tone="ok">Dirilis</Badge>
                                    ) : m.isFinalized ? (
                                       // Finalisasi releases at once; finalized but unreleased means the admin withdrew it
                                       <Badge tone="wait">Rilis ditarik</Badge>
                                    ) : (
                                       <Badge tone="none">Belum</Badge>
                                    )}
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
   );
}
