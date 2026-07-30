const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/app/dashboard/admin/page.tsx');
let content = fs.readFileSync(filePath, 'utf8');

const targetStr = `  const handleExportExcel = () => {
    const sortedData = getSortedDisplayFinalized();
    const ws = XLSX.utils.json_to_sheet(sortedData.map((item: any) => ({
      Mahasiswa: \`\${item.name} (\${item.nim})\`,
      Judul: item.title,
      Kelas: item.kelas,
      DosenPembimbing: item.dospem,
      Waktu: \`\${item.date} • \${item.time}\`,
      Ruangan: item.room,
      Moderator: item.moderator,
      Pembahas: item.pembahas
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Jadwal");
    XLSX.writeFile(wb, "Pengumuman_Jadwal.xlsx");
  };

  const handleExportPDF = () => {
    const sortedData = getSortedDisplayFinalized();
    const doc = new jsPDF('landscape');
    
    const kelasTitle = globalKelasFilter !== "Semua Kelas" ? \`Kelas \${globalKelasFilter.replace('Kelas ', '')}\` : "Semua Kelas";
    const title = \`Pengumuman Jadwal Seminar Hasil Penelitian \${kelasTitle} Tanggal \${selectedDateFilter}\`;
    
    const pageWidth = doc.internal.pageSize.getWidth();
    doc.text(title, pageWidth / 2, 15, { align: 'center' });`;

const replacementStr = `  const getExportTitleAndFilename = (sortedData: any[]) => {
    const angkatanStr = activePeriode?.angkatan || "";

    const uniqueKelas = Array.from(new Set(sortedData.map((item: any) => item.kelas))).filter(Boolean).map((k: any) => k.replace('Kelas ', ''));
    let kelasStr = '';
    if (uniqueKelas.length === 0) {
      kelasStr = '-';
    } else if (uniqueKelas.length === 1) {
      kelasStr = uniqueKelas[0];
    } else if (uniqueKelas.length === 2) {
      kelasStr = \`\${uniqueKelas[0]} dan \${uniqueKelas[1]}\`;
    } else {
      const last = uniqueKelas.pop();
      kelasStr = \`\${uniqueKelas.join(', ')}, dan \${last}\`;
    }

    let dateStr = selectedDateFilter;
    const timestamps = sortedData.map((item: any) => new Date(item.waktuMulai || 0).getTime()).filter((t: number) => t > 0);
    if (timestamps.length > 0) {
      const minDate = new Date(Math.min(...timestamps));
      const maxDate = new Date(Math.max(...timestamps));
      
      const formatFullDate = (d: Date) => {
        const months = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
        return \`\${d.getDate()} \${months[d.getMonth()]} \${d.getFullYear()}\`;
      };

      if (minDate.getFullYear() === maxDate.getFullYear() && minDate.getMonth() === maxDate.getMonth()) {
        if (minDate.getDate() === maxDate.getDate()) {
          dateStr = formatFullDate(minDate);
        } else {
          const months = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
          dateStr = \`\${minDate.getDate()}-\${maxDate.getDate()} \${months[minDate.getMonth()]} \${minDate.getFullYear()}\`;
        }
      } else {
        dateStr = \`\${formatFullDate(minDate)} - \${formatFullDate(maxDate)}\`;
      }
    }

    const title = \`Pengumuman Jadwal Seminar Hasil Penelitian AKN \${angkatanStr} Kelas \${kelasStr} Tanggal \${dateStr}\`;
    const filename = \`Pengumuman_Jadwal_AKN_\${angkatanStr}_Kelas_\${kelasStr.replace(/, /g, '_').replace(/ dan /g, '_')}_Tanggal_\${dateStr.replace(/ /g, '_')}\`;

    return { title, filename };
  };

  const handleExportExcel = () => {
    const sortedData = getSortedDisplayFinalized();
    const { filename } = getExportTitleAndFilename(sortedData);
    
    const ws = XLSX.utils.json_to_sheet(sortedData.map((item: any) => ({
      Mahasiswa: \`\${item.name} (\${item.nim})\`,
      Judul: item.title,
      Kelas: item.kelas,
      DosenPembimbing: item.dospem,
      Waktu: \`\${item.date} • \${item.time}\`,
      Ruangan: item.room,
      Moderator: item.moderator,
      Pembahas: item.pembahas
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Jadwal");
    XLSX.writeFile(wb, \`\${filename}.xlsx\`);
  };

  const handleExportPDF = () => {
    const sortedData = getSortedDisplayFinalized();
    const { title, filename } = getExportTitleAndFilename(sortedData);
    
    const doc = new jsPDF('landscape');
    const pageWidth = doc.internal.pageSize.getWidth();
    doc.text(title, pageWidth / 2, 15, { align: 'center' });`;

if (content.includes('const handleExportExcel = () => {')) {
  content = content.replace(targetStr, replacementStr);
  content = content.replace(`    doc.save(\`Pengumuman_Jadwal.pdf\`);`, `    doc.save(\`\${filename}.pdf\`);`);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Patched successfully!');
} else {
  console.log('Target string not found.');
}
