// "Laporan Analisis" PDF for one angkatan, meant to be brought to a prodi meeting: student progress,
// kolokium → seminar duration, konsentrasi, and the title analysis. Rule-based results always appear;
// the AI interpretation of the titles is added when one has been saved.
// Uses the shared admin PDF look (title block + navy tables) from pdf-layout.
import { jsPDF } from "jspdf";
import autoTable, { type UserOptions } from "jspdf-autotable";
import { PDF_MARGIN, drawPdfHeader, pdfTableOptions } from "@/lib/pdf-layout";
import type { HasilAnalisisJudul, PasanganMirip } from "@/lib/analisis-judul";
import type { Interpretasi } from "@/lib/interpretasi-judul";
import { formatDurasi } from "@/lib/format-durasi";

export type DataLaporanAnalisis = {
  angkatan: string;
  /** Funnel stages in order, the first one being "Kolokium selesai". */
  progres: { label: string; jumlah: number }[];
  durasi: { kategori: { label: string; jumlah: number }[]; total: number; medianHari: number | null; tanpaKolokium: number };
  /** Approved Seminar Hasil registrations per konsentrasi, largest first. */
  konsentrasi: { nama: string; jumlah: number }[];
  hasil: HasilAnalisisJudul | null;
  interpretasi: {
    interpretasi: Interpretasi;
    dibuatPada: string;
    dibuatOleh: string | null;
    model: string;
    pembanding: string | null;
    kedaluwarsa: boolean;
  } | null;
};

const NAVY: [number, number, number] = [6, 18, 92];
const ABU: [number, number, number] = [100, 116, 139];
const TEKS: [number, number, number] = [30, 41, 59];
const MAKS_PASANGAN = 20;

// The built-in PDF fonts only cover basic Latin; replace typographic characters they cannot draw
const bersih = (t: string) =>
  t.replace(/[“”]/g, '"').replace(/[‘’]/g, "'").replace(/[–—]/g, "-").replace(/≥/g, ">=").replace(/≤/g, "<=")
    .replace(/→/g, "->").replace(/…/g, "...").replace(/·/g, "-").replace(/[^\x20-\x7E -ÿ\n]/g, "");

const tanggal = (iso: string | Date, jam = false) =>
  new Date(iso).toLocaleString("id-ID", {
    day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Jakarta",
    ...(jam ? { hour: "2-digit", minute: "2-digit" } : {}),
  });

const persen = (n: number, total: number) => (total ? `${Math.round((n / total) * 100)}%` : "-");

function labelTingkat(p: PasanganMirip, substansialMenurutAI: boolean) {
  if (p.kembar) return "Kembar";
  if (p.topikDanObjekSama) return "Topik & objek sama";
  if (substansialMenurutAI) return "Substansial (penilaian AI)";
  return "Sangat mirip";
}

export function buatLaporanAnalisisPdf({ angkatan, progres, durasi, konsentrasi, hasil, interpretasi }: DataLaporanAnalisis): jsPDF {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const lebar = pageWidth - PDF_MARGIN * 2;
  const batasBawah = pageHeight - 18;
  const ai = interpretasi?.interpretasi ?? null;
  const N = hasil?.jumlahJudul ?? 0;

  let y = drawPdfHeader(doc, "Laporan Analisis", [
    `Seminar Hasil Penelitian  |  ${angkatan}`,
    `Data per ${tanggal(new Date())}`,
  ]);

  const pastikanRuang = (tinggi: number) => {
    if (y + tinggi > batasBawah) {
      doc.addPage();
      y = 16;
    }
  };

  let nomorBab = 0;
  const bab = (judul: string, keterangan?: string) => {
    pastikanRuang(keterangan ? 22 : 16);
    nomorBab++;
    y += 3;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...NAVY);
    doc.text(bersih(`${nomorBab}. ${judul}`), PDF_MARGIN, y);
    y += 5;
    if (keterangan) teks(keterangan, { ukuran: 8.5, warna: ABU });
  };

  function teks(isi: string, o: { ukuran?: number; tebal?: boolean; warna?: [number, number, number]; indent?: number; awalan?: string } = {}) {
    const ukuran = o.ukuran ?? 9.5;
    const indent = o.indent ?? 0;
    doc.setFont("helvetica", o.tebal ? "bold" : "normal");
    doc.setFontSize(ukuran);
    doc.setTextColor(...(o.warna ?? TEKS));
    const awalanLebar = o.awalan ? doc.getTextWidth(o.awalan + " ") : 0;
    const baris = doc.splitTextToSize(bersih(isi), lebar - indent - awalanLebar) as string[];
    const tinggiBaris = ukuran * 0.42;
    baris.forEach((b, i) => {
      pastikanRuang(tinggiBaris + 1);
      if (i === 0 && o.awalan) doc.text(o.awalan, PDF_MARGIN + indent, y);
      doc.text(b, PDF_MARGIN + indent + awalanLebar, y);
      y += tinggiBaris;
    });
    y += 1.2;
  }

  const subjudul = (judul: string) => {
    pastikanRuang(14);
    y += 2.5;
    teks(judul, { tebal: true, ukuran: 10, warna: NAVY });
  };

  const tabel = (opsi: UserOptions) => {
    pastikanRuang(20);
    autoTable(doc, {
      ...pdfTableOptions(doc, y, opsi),
      // Page numbers are drawn once for all pages at the end
      didDrawPage: () => {},
      rowPageBreak: "avoid",
      margin: { left: PDF_MARGIN, right: PDF_MARGIN, top: 16, bottom: 18 },
    });
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 4;
  };

  // ---- Progres mahasiswa ----
  const awal = progres[0]?.jumlah ?? 0;
  bab("Progres Mahasiswa", "Jumlah mahasiswa di tiap tahap, dari kolokium sampai selesai Seminar Hasil. Persentase dari mahasiswa yang selesai kolokium.");
  if (progres.every(t => t.jumlah === 0)) {
    teks("Belum ada data kolokium maupun Seminar Hasil.");
  } else {
    tabel({
      head: [["Tahap", "Mahasiswa", "% dari kolokium selesai", "Selisih dari tahap sebelumnya"]],
      body: progres.map((t, i) => {
        const turun = i > 0 ? progres[i - 1].jumlah - t.jumlah : 0;
        return [bersih(t.label), t.jumlah, awal ? persen(t.jumlah, awal) : "-", turun > 0 ? turun : "-"];
      }),
      columnStyles: { 1: { cellWidth: 26, halign: "center" }, 2: { cellWidth: 40, halign: "center" }, 3: { cellWidth: 52, halign: "center" } },
    });
    const belumDaftar = (progres[0]?.jumlah ?? 0) - (progres[1]?.jumlah ?? 0);
    if (belumDaftar > 0) {
      teks(`${belumDaftar} mahasiswa sudah selesai kolokium tetapi belum mendaftar Seminar Hasil.`, { tebal: true, ukuran: 9, warna: [180, 83, 9] });
    }
  }

  // ---- Durasi kolokium → seminar hasil ----
  bab("Durasi Kolokium ke Seminar Hasil", "Waktu tempuh dari jadwal kolokium sampai Seminar Hasil, hanya untuk mahasiswa yang sudah selesai Seminar Hasil.");
  if (durasi.total === 0) {
    teks("Belum ada mahasiswa yang selesai Seminar Hasil, sehingga durasi belum dapat dihitung.");
  } else {
    tabel({
      head: [["Waktu tempuh", "Mahasiswa", "%"]],
      body: durasi.kategori.map(k => [bersih(k.label), k.jumlah, persen(k.jumlah, durasi.total)]),
      foot: [["Total", durasi.total, "100%"]],
      showFoot: "lastPage",
      columnStyles: { 1: { cellWidth: 30, halign: "center" }, 2: { cellWidth: 24, halign: "center" } },
      didParseCell: (data) => { if (data.section === "foot" && data.column.index > 0) data.cell.styles.halign = "center"; },
    });
    if (durasi.medianHari !== null) {
      teks(`Median waktu tempuh: ${formatDurasi(durasi.medianHari)}.`, { tebal: true, ukuran: 9 });
    }
  }
  if (durasi.tanpaKolokium > 0) {
    teks(`${durasi.tanpaKolokium} mahasiswa tidak dihitung karena data jadwal kolokiumnya tidak ditemukan.`, { ukuran: 8.5, warna: ABU });
  }

  // ---- Tren konsentrasi ----
  const totalKonsentrasi = konsentrasi.reduce((a, k) => a + k.jumlah, 0);
  bab("Sebaran Konsentrasi", "Pendaftar Seminar Hasil yang telah disetujui admin, per konsentrasi.");
  if (konsentrasi.length === 0) {
    teks("Belum ada pendaftaran Seminar Hasil yang disetujui.");
  } else {
    tabel({
      head: [["No", "Konsentrasi", "Mahasiswa", "%"]],
      body: konsentrasi.map((k, i) => [i + 1, bersih(k.nama), k.jumlah, persen(k.jumlah, totalKonsentrasi)]),
      foot: [["", "Total", totalKonsentrasi, "100%"]],
      showFoot: "lastPage",
      columnStyles: { 0: { cellWidth: 10, halign: "center" }, 2: { cellWidth: 30, halign: "center" }, 3: { cellWidth: 24, halign: "center" } },
      didParseCell: (data) => { if (data.section === "foot" && data.column.index > 1) data.cell.styles.halign = "center"; },
    });
  }

  // ---- Analisis judul (rule-based + AI interpretation) ----
  if (!hasil || N === 0) {
    bab("Analisis Judul Penelitian");
    teks("Belum ada judul Seminar Hasil yang disetujui pada angkatan ini.");
  } else {
    const h = hasil;
    // ---- Analisis judul: ringkasan ----
    bab("Analisis Judul Penelitian", `${N} judul Seminar Hasil yang disetujui, diurai menjadi topik, objek, dan lokasi.`);
    tabel({
      head: [["Judul dianalisis", "Topik berbeda", "Pasangan judul kembar", "Pasangan judul mirip"]],
      body: [[N, h.jumlahTopik, h.jumlahKembar, h.jumlahMirip]],
      styles: { halign: "center", fontSize: 11, fontStyle: "bold" },
      headStyles: { fontSize: 8, fillColor: NAVY, textColor: 255, halign: "center" },
    });

    if (ai && ai.ringkasanEksekutif.length) {
      teks("Ringkasan eksekutif (interpretasi AI):", { tebal: true, ukuran: 9.5 });
      ai.ringkasanEksekutif.forEach((p, i) => teks(p, { awalan: `${i + 1}.`, indent: 2 }));
    }
    if (interpretasi?.kedaluwarsa) {
      teks("Catatan: data judul telah berubah sejak interpretasi AI dibuat. Angka pada bagian interpretasi dapat berbeda dengan hasil olahan sistem di laporan ini.", { ukuran: 8.5, warna: [180, 83, 9] });
    }
    if (!ai) {
      teks("Interpretasi AI belum dibuat untuk angkatan ini; laporan hanya memuat hasil olahan sistem.", { ukuran: 8.5, warna: ABU });
    }

    // ---- Judul yang perlu dicek ----
    // Pairs the system is sure about, plus pairs the AI judged substantial (matched on titles, so a
    // stale interpretation can never point at the wrong pair)
    const penilaian = new Map((ai?.penilaianJudulMirip ?? []).map(p => [`${p.judulA}\u0000${p.judulB}`, p]));
    const dicek = h.judulMirip
      .map(p => ({ p, nilai: penilaian.get(`${p.a.judul}\u0000${p.b.judul}`) }))
      .filter(({ p, nilai }) => p.kembar || p.topikDanObjekSama || nilai?.tingkat === "substansial" || (!ai && p.skor >= 0.85));
    const ditampilkan = dicek.slice(0, MAKS_PASANGAN);

    bab("Judul yang Perlu Dicek", "Pasangan judul kembar, bertopik dan berobjek sama, atau dinilai tumpang tindih secara substansial. Kemiripan dihitung dari topik dan objek penelitian; lokasi atau indeks tidak ikut dihitung.");
    if (ditampilkan.length === 0) {
      teks("Tidak ada pasangan judul yang perlu dicek.");
    } else {
      const mhs = (m: PasanganMirip["a"]) => `${m.judul}\n${[m.nama, m.nim, m.konsentrasi].filter(Boolean).join(" - ")}`;
      tabel({
        head: [["No", "Tingkat", "Judul A", "Judul B", "Keterangan"]],
        body: ditampilkan.map(({ p, nilai }, i) => [
          i + 1,
          labelTingkat(p, nilai?.tingkat === "substansial"),
          bersih(mhs(p.a)),
          bersih(mhs(p.b)),
          bersih(nilai?.alasan || (p.topikSama.length ? `Topik sama: ${p.topikSama.join(", ")}` : "-")),
        ]),
        columnStyles: {
          0: { cellWidth: 9, halign: "center" },
          1: { cellWidth: 22, fontStyle: "bold" },
          2: { cellWidth: 55 },
          3: { cellWidth: 55 },
          4: { cellWidth: lebar - 141, fontSize: 7.5 },
        },
        styles: { fontSize: 7.8 },
      });
    }
    const sisa = h.judulMirip.length - ditampilkan.length;
    if (sisa > 0) {
      teks(`${sisa} pasangan lain dengan kemiripan ringan tidak dicantumkan. Daftar lengkap tersedia di Dashboard Analisis.`, { ukuran: 8.5, warna: ABU });
    }

    // ---- Topik ----
    bab("Topik Penelitian", "Topik adalah frasa inti judul, berlaku untuk penelitian kuantitatif maupun kualitatif. Persentase dari jumlah judul.");
    tabel({
      head: [["No", "Topik terpopuler", "Jumlah judul", "%"]],
      body: h.topTopik.slice(0, 10).map((t, i) => [i + 1, bersih(t.nama), t.jumlah, persen(t.jumlah, N)]),
      columnStyles: { 0: { cellWidth: 10, halign: "center" }, 2: { cellWidth: 28, halign: "center" }, 3: { cellWidth: 20, halign: "center" } },
    });
    if (h.topikBersama.length) {
      tabel({
        head: [["Topik yang sering muncul bersama dalam satu judul", "Jumlah judul"]],
        body: h.topikBersama.slice(0, 5).map(p => [bersih(`${p.pasangan[0]} + ${p.pasangan[1]}`), p.jumlah]),
        columnStyles: { 1: { cellWidth: 28, halign: "center" } },
      });
    }

    // ---- Objek & lokasi ----
    bab("Objek dan Lokasi Penelitian", "Objek diambil dari bagian judul setelah kata \"pada\", lokasi atau cakupan dari bagian setelah kata \"di\".");
    const baris = Math.max(Math.min(h.objek.length, 6), Math.min(h.lokasi.length, 6));
    tabel({
      head: [["Objek / sektor", "Judul", "Lokasi / cakupan", "Judul"]],
      body: Array.from({ length: baris }, (_, i) => [
        bersih(h.objek[i]?.nama ?? ""), h.objek[i]?.jumlah ?? "",
        bersih(h.lokasi[i]?.nama ?? ""), h.lokasi[i]?.jumlah ?? "",
      ]),
      columnStyles: { 1: { cellWidth: 18, halign: "center" }, 3: { cellWidth: 18, halign: "center" } },
    });

    // ---- Per konsentrasi ----
    bab("Topik per Konsentrasi");
    tabel({
      head: [["Konsentrasi", "Judul", "Topik teratas", "Objek teratas"]],
      body: h.perKonsentrasi.map(k => [
        bersih(k.konsentrasi),
        k.jumlahJudul,
        bersih(k.topTopik.map(t => `${t.nama} (${t.jumlah})`).join(", ") || "-"),
        bersih(k.objek.map(t => `${t.nama} (${t.jumlah})`).join(", ") || "-"),
      ]),
      columnStyles: { 0: { cellWidth: 38, fontStyle: "bold" }, 1: { cellWidth: 14, halign: "center" } },
    });

    if (h.judulUnik.length) {
      y += 1;
      teks("Judul dengan topik paling jarang di angkatan ini:", { tebal: true, ukuran: 9 });
      h.judulUnik.slice(0, 3).forEach((u, i) => teks(u.judul, { awalan: `${i + 1}.`, indent: 2, ukuran: 9 }));
    }

    // ---- Interpretasi AI ----
    if (ai) {
      bab("Interpretasi AI", `Bahan pertimbangan, bukan keputusan. Dibuat ${tanggal(interpretasi!.dibuatPada, true)} WIB${interpretasi!.dibuatOleh ? ` oleh ${interpretasi!.dibuatOleh}` : ""}${interpretasi!.pembanding ? `, dibandingkan dengan ${interpretasi!.pembanding}` : ""}. Angka berasal dari sistem.`);

      if (ai.tema.length) {
        tabel({
          head: [["Tema besar", "Topik yang termasuk", "Judul"]],
          body: ai.tema.map(t => [bersih(t.nama), bersih(t.topik.join(", ")), t.jumlahJudul]),
          columnStyles: { 0: { cellWidth: 45, fontStyle: "bold" }, 2: { cellWidth: 16, halign: "center" } },
        });
        teks("Satu judul dapat termasuk lebih dari satu tema, sehingga jumlahnya tidak dijumlahkan.", { ukuran: 8, warna: ABU });
      }

      if (ai.temuan.length) {
        subjudul("Temuan");
        ai.temuan.forEach((t, i) => {
          teks(`${t.judul}${t.jenis === "perhatian" ? " (perlu perhatian)" : ""}`, { awalan: `${i + 1}.`, tebal: true, ukuran: 9.3 });
          teks(t.penjelasan, { indent: 5, ukuran: 9 });
          if (t.bukti) teks(`Dasar data: ${t.bukti}`, { indent: 5, ukuran: 8.3, warna: ABU });
        });
      }

      if (ai.kesesuaianKonsentrasi.length) {
        subjudul("Kesesuaian dengan konsentrasi");
        ai.kesesuaianKonsentrasi.forEach(k => teks(`${k.konsentrasi}: ${k.catatan}`, { awalan: "-", indent: 2, ukuran: 9 }));
      }

      const rekomendasi = [
        { judul: "Rekomendasi untuk Admin", isi: ai.rekomendasi.admin },
        { judul: "Rekomendasi untuk Kaprodi / Sekprodi", isi: ai.rekomendasi.pimpinanProdi },
      ].filter(r => r.isi.length);
      for (const r of rekomendasi) {
        subjudul(`${r.judul} (saran AI)`);
        r.isi.forEach((s, i) => teks(s, { awalan: `${i + 1}.`, indent: 2, ukuran: 9 }));
      }

      if (ai.celahTopik.length) {
        tabel({
          head: [["Konsentrasi", "Celah topik (saran AI)", "Alasan"]],
          body: ai.celahTopik.map(c => [bersih(c.konsentrasi || "-"), bersih(c.saran), bersih(c.alasan)]),
          columnStyles: { 0: { cellWidth: 36, fontStyle: "bold" } },
          styles: { fontSize: 8 },
        });
      }
    }
  }

  // ---- Catatan metode ----
  pastikanRuang(24);
  y += 2;
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.2);
  doc.line(PDF_MARGIN, y, pageWidth - PDF_MARGIN, y);
  y += 4;
  teks("Catatan metode", { tebal: true, ukuran: 8.5, warna: ABU });
  teks(
    "Data: judul Seminar Hasil Penelitian yang telah disetujui admin. Setiap judul diurai oleh sistem menjadi topik, objek, dan lokasi " +
    "tanpa bantuan AI. Kemiripan dihitung dari kesamaan kata pada topik dan objek (ambang 0,6, dengan minimal satu topik yang sama). " +
    "Interpretasi AI hanya menerima ringkasan angka dan judul tanpa nama atau NIM, dan tidak menggantikan penilaian prodi. " +
    "Dokumen ini memuat nama dan NIM mahasiswa: untuk penggunaan internal program studi.",
    { ukuran: 8, warna: ABU },
  );

  // Footer on every page: print date and "Halaman x dari y"
  const total = doc.getNumberOfPages();
  const dicetak = tanggal(new Date());
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text(bersih(`Laporan Analisis - ${angkatan}  |  Dicetak: ${dicetak}`), PDF_MARGIN, pageHeight - 8);
    doc.text(`Halaman ${i} dari ${total}`, pageWidth - PDF_MARGIN, pageHeight - 8, { align: "right" });
  }

  return doc;
}
