const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '../src/app/dashboard/admin/page.tsx');
let content = fs.readFileSync(file, 'utf8');

// 1. Add state
const stateTarget = `const [activeTab, setActiveTab] = useState<"verifikasi" | "finalisasi" | "pembahas" | "pengumuman" | "kelas" | "rekapitulasi">("verifikasi");`;
const stateReplacement = `${stateTarget}
  const [rekapSort, setRekapSort] = useState<{ key: 'name' | 'moderatorCount' | 'pembimbingCount', order: 'asc' | 'desc' }>({ key: 'name', order: 'asc' });`;
if (content.includes(stateTarget)) {
  content = content.replace(stateTarget, stateReplacement);
} else {
  console.log("State target not found");
}

// 2. Add computed data and handlers
const dataTarget = `const activePendaftaran = pendaftaran.filter(p => p.periodeId === activePeriodeId);`;
const dataReplacement = `${dataTarget}

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
    XLSX.writeFile(wb, \`Rekapitulasi_Dosen_AKN_\${activePeriode?.angkatan || ''}.xlsx\`);
  };

  const handleExportRekapPDF = () => {
    const doc = new jsPDF('p');
    doc.text(\`Rekapitulasi Dosen AKN \${activePeriode?.angkatan || ''}\`, 14, 15);
    
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
    
    doc.save(\`Rekapitulasi_Dosen_AKN_\${activePeriode?.angkatan || ''}.pdf\`);
  };`;
if (content.includes(dataTarget)) {
  content = content.replace(dataTarget, dataReplacement);
} else {
  console.log("Data target not found");
}

// 3. Update UI
const uiTarget = `                  <h2 className="text-xl font-bold text-[#06125C] flex items-center gap-2 mb-2">
                    <UserCheck className="text-amber-500" /> Rekapitulasi Dosen
                  </h2>
                  <p className="text-slate-500 text-sm mb-6">Rekapitulasi beban tugas dosen (sebagai moderator dan pembimbing) pada periode {activePeriode?.angkatan || '-'}.</p>
                  
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap border-collapse">
                      <thead className="bg-slate-50 border-y border-slate-200 text-slate-600 font-semibold">
                        <tr>
                          <th className="px-6 py-4 w-1/2">Nama Dosen</th>
                          <th className="px-6 py-4 text-center w-1/4">Sebagai Moderator</th>
                          <th className="px-6 py-4 text-center w-1/4">Sebagai Pembimbing</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {masterDosen.map(dosen => {
                          const moderatorCount = activePendaftaran.filter(p => p.moderator === dosen.name || (p.moderator && p.moderator.includes(dosen.name))).length;
                          const pembimbingCount = activePendaftaran.filter(p => p.dospem && p.dospem.includes(dosen.name)).length;
                          return (
                            <tr key={dosen.id} className="hover:bg-slate-50 transition-colors group">
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-[#06125C] text-white flex items-center justify-center font-bold text-xs shadow-sm">
                                    {dosen.name.charAt(0).toUpperCase()}
                                  </div>
                                  <div className="font-semibold text-slate-800 group-hover:text-[#06125C] transition-colors">{dosen.name}</div>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex justify-center">
                                  <span className={\`px-4 py-1.5 rounded-full font-bold text-xs flex items-center justify-center min-w-[3rem] \${moderatorCount > 0 ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' : 'bg-slate-50 text-slate-400 border border-slate-100'}\`}>
                                    {moderatorCount} x
                                  </span>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex justify-center">
                                  <span className={\`px-4 py-1.5 rounded-full font-bold text-xs flex items-center justify-center min-w-[3rem] \${pembimbingCount > 0 ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-slate-50 text-slate-400 border border-slate-100'}\`}>
                                    {pembimbingCount} x
                                  </span>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                        {masterDosen.length === 0 && (
                          <tr>
                            <td colSpan={3} className="px-6 py-12">
                              <div className="flex flex-col items-center justify-center gap-2 text-slate-500">
                                <UserCheck className="w-10 h-10 text-slate-300" />
                                <span>Belum ada data dosen.</span>
                              </div>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>`;

const uiReplacement = `                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
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
                                  <span className={\`px-4 py-1.5 rounded-full font-bold text-xs flex items-center justify-center min-w-[3rem] \${dosen.moderatorCount > 0 ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' : 'bg-slate-50 text-slate-400 border border-slate-100'}\`}>
                                    {dosen.moderatorCount} x
                                  </span>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex justify-center">
                                  <span className={\`px-4 py-1.5 rounded-full font-bold text-xs flex items-center justify-center min-w-[3rem] \${dosen.pembimbingCount > 0 ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-slate-50 text-slate-400 border border-slate-100'}\`}>
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
                    </table>`;

if (content.includes(uiTarget)) {
  content = content.replace(uiTarget, uiReplacement);
} else {
  console.log("UI target not found");
}

fs.writeFileSync(file, content, 'utf8');
console.log('Script completed.');
