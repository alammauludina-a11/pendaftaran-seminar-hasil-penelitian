const fs = require('fs');
const path = require('path');

function updateFile(filePath, replacements) {
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;
  for (const rep of replacements) {
    if (content.includes(rep.target)) {
      content = content.replace(rep.target, rep.replacement);
      changed = true;
    } else if (rep.isRegex) {
      if (rep.target.test(content)) {
        content = content.replace(rep.target, rep.replacement);
        changed = true;
      }
    } else {
      console.log('Target not found in ' + filePath + ': ' + rep.target);
    }
  }
  if (changed) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Updated ' + filePath);
  }
}

const dir = path.join(__dirname, '../src');

// 1. API GET & POST route
updateFile(path.join(dir, 'app/api/admin/master/dosen/route.ts'), [
  {
    target: 'jabatan: d.jabatan || "Dosen",',
    replacement: 'jabatan: d.jabatan || "Dosen",\n      statusDosen: d.statusDosen || "Dosen Tetap",'
  },
  {
    target: 'const { nip, name, prodi, jabatan } = body;',
    replacement: 'const { nip, name, prodi, jabatan, statusDosen } = body;'
  },
  {
    target: 'jabatan: jabatan || "Dosen",',
    replacement: 'jabatan: jabatan || "Dosen",\n        statusDosen: statusDosen || "Dosen Tetap",'
  }
]);

// 2. API PUT route
updateFile(path.join(dir, 'app/api/admin/master/dosen/[id]/route.ts'), [
  {
    target: 'const { nip, name, prodi, jabatan } = body;',
    replacement: 'const { nip, name, prodi, jabatan, statusDosen } = body;'
  },
  {
    target: 'jabatan: jabatan,',
    replacement: 'jabatan: jabatan,\n        statusDosen: statusDosen,'
  }
]);

// 3. Frontend page.tsx
updateFile(path.join(dir, 'app/dashboard/admin/page.tsx'), [
  {
    target: 'jabatan: string;',
    replacement: 'jabatan: string;\n  statusDosen?: string;'
  },
  {
    target: 'status_jabatan: "Aktif",',
    replacement: 'status_jabatan: "Aktif", statusDosen: "Dosen Tetap",'
  },
  {
    target: 'status_jabatan: "Aktif" }',
    replacement: 'status_jabatan: "Aktif", statusDosen: "Dosen Tetap" }'
  },
  {
    target: 'jabatan: addForm.status_jabatan,\n                  };',
    replacement: 'jabatan: addForm.status_jabatan,\n                    statusDosen: addForm.statusDosen,\n                  };'
  },
  {
    target: '{activeMasterTab === "dosen" ? "Nama Dosen" : "Nama Lengkap"}</th>',
    replacement: '{activeMasterTab === "dosen" ? "Nama Dosen" : "Nama Lengkap"}</th>\n                        {activeMasterTab === "dosen" && <th className="p-4 text-center">Status</th>}'
  },
  {
    target: '<td className="p-4 text-slate-700">{d.name}</td>',
    replacement: '<td className="p-4 font-semibold text-slate-800">{d.name}</td>\n                              <td className="p-4 text-center">\n                                <span className={`px-3 py-1.5 rounded-full text-[11px] font-bold shadow-sm ${d.statusDosen === "Dosen Praktisi/Luar" ? "bg-amber-100 text-amber-700 border border-amber-200" : "bg-blue-100 text-blue-700 border border-blue-200"}`}>\n                                  {d.statusDosen || "Dosen Tetap"}\n                                </span>\n                              </td>'
  },
  {
    target: '</>\n              )}',
    replacement: '{activeMasterTab === "dosen" && (\n                    <div>\n                      <label className="block text-sm font-medium text-slate-700 mb-1">Status Dosen</label>\n                      <select\n                        value={addForm.statusDosen}\n                        onChange={(e) => setAddForm({ ...addForm, statusDosen: e.target.value })}\n                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-[#06125C]/20 outline-none text-sm transition-all"\n                      >\n                        <option value="Dosen Tetap">Dosen Tetap</option>\n                        <option value="Dosen Praktisi/Luar">Dosen Praktisi/Luar</option>\n                      </select>\n                    </div>\n                  )}\n                </>\n              )}'
  }
]);
