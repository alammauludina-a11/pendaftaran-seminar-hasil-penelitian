// Moves the uploaded PDFs of the running app from the database (base64) to the server's disk, through the
// token protected maintenance endpoint. Needs APP_URL and MAINTENANCE_TOKEN in .env.local.
//
//   npx tsx --env-file=.env.local scripts/pindahkan-file.ts                → status only
//   npx tsx --env-file=.env.local scripts/pindahkan-file.ts --pindahkan    → step 1: copy every PDF to disk (base64 kept)
//   npx tsx --env-file=.env.local scripts/pindahkan-file.ts --kosongkan    → step 2: empty base64 of PDFs verified on disk
//
// Make a fresh backup (scripts/backup.ts) between step 1 and step 2.
const APP_URL = process.env.APP_URL?.replace(/\/$/, "");
const TOKEN = process.env.MAINTENANCE_TOKEN;

type Status = { total: number; diDisk: number; belumDipindah: number; masihAdaBase64: number };

async function panggil<T>(method: "GET" | "POST", body?: object): Promise<T> {
  const res = await fetch(`${APP_URL}/api/maintenance/files`, {
    method,
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${json.error ?? "gagal"}`);
  return json as T;
}

const tampil = (s: Status) =>
  console.log(`Total ${s.total} PDF | di disk server: ${s.diDisk} | belum dipindah: ${s.belumDipindah} | masih ada base64 di database: ${s.masihAdaBase64}`);

async function main() {
  if (!APP_URL || !TOKEN) throw new Error("Isi APP_URL dan MAINTENANCE_TOKEN di .env.local dulu.");
  console.log(`Aplikasi: ${APP_URL}`);
  tampil(await panggil<Status>("GET"));

  if (process.argv.includes("--pindahkan")) {
    for (;;) {
      const r = await panggil<{ dipindah: number; sisa: number }>("POST", { aksi: "pindahkan", batas: 50 });
      console.log(`  dipindah ${r.dipindah}, sisa ${r.sisa}`);
      if (r.sisa === 0 || r.dipindah === 0) break;
    }
    tampil(await panggil<Status>("GET"));
    console.log(`\nLangkah berikutnya: jalankan backup, lalu skrip ini dengan --kosongkan.`);
  } else if (process.argv.includes("--kosongkan")) {
    for (;;) {
      const r = await panggil<{ dikosongkan: number; bermasalah: string[]; sisa: number }>("POST", { aksi: "kosongkan", batas: 100 });
      console.log(`  dikosongkan ${r.dikosongkan}, sisa ${r.sisa}`);
      if (r.bermasalah.length) console.log(`  BERMASALAH (base64 tetap disimpan): ${r.bermasalah.join(", ")}`);
      if (r.sisa === 0 || r.dikosongkan === 0) break;
    }
    tampil(await panggil<Status>("GET"));
  } else {
    console.log(`\nIni hanya status. Pakai --pindahkan (langkah 1) atau --kosongkan (langkah 2).`);
  }
}

main().then(() => process.exit(0), (e) => { console.error(e?.message ?? e); process.exit(1); });
