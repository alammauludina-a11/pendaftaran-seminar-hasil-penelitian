// Fills pendaftaran.dospem1_id / dospem2_id from the stored dospem names (same rule as migration 0001):
// only names that match exactly one dosen are linked. Safe to run repeatedly, e.g. after deploying,
// for registrations created by the old code between the migration and the deploy.
//
//   npx tsx --env-file=.env.local scripts/isi-dospem-id.ts              → report only
//   npx tsx --env-file=.env.local scripts/isi-dospem-id.ts --jalankan   → fill the missing ids
import { sql } from "drizzle-orm";
import { db, transaksi } from "../src/db";

const JALANKAN = process.argv.includes("--jalankan");

const kosong = (kolom: "dospem1" | "dospem2") => sql.raw(
  `\`${kolom}\` IS NOT NULL AND \`${kolom}\` != '' AND \`${kolom}_id\` IS NULL`
);
const cocok = (kolom: "dospem1" | "dospem2") => sql.raw(
  `(SELECT count(*) FROM users WHERE role = 'dosen' AND nama = pendaftaran.\`${kolom}\`) = 1`
);

async function main() {
  const url = (process.env.DATABASE_URL || "file:./sqlite.db").replace(/\/\/[^@/]*@/, "//").split("?")[0];
  console.log(`Database tujuan : ${url}`);

  for (const kolom of ["dospem1", "dospem2"] as const) {
    const [{ bisa }] = await db.all<{ bisa: number }>(sql`SELECT count(*) bisa FROM pendaftaran WHERE ${kosong(kolom)} AND ${cocok(kolom)}`);
    const tidak = await db.all<{ nama: string; jumlah: number }>(
      sql`SELECT ${sql.raw(`\`${kolom}\``)} nama, count(*) jumlah FROM pendaftaran WHERE ${kosong(kolom)} AND NOT ${cocok(kolom)} GROUP BY 1`
    );
    console.log(`${kolom}: ${bisa} pendaftaran bisa diisi ID-nya` + (tidak.length ? `; TIDAK cocok dengan tepat satu dosen: ${tidak.map(t => `"${t.nama}" (${t.jumlah})`).join(", ")}` : ""));
  }

  if (!JALANKAN) {
    console.log(`\nIni hanya laporan. Tambahkan --jalankan untuk mengisi ID yang kosong.`);
    return;
  }

  await transaksi(async (tx) => {
    for (const kolom of ["dospem1", "dospem2"] as const) {
      await tx.run(sql`UPDATE pendaftaran SET ${sql.raw(`\`${kolom}_id\``)} = (SELECT id FROM users WHERE role = 'dosen' AND nama = pendaftaran.${sql.raw(`\`${kolom}\``)})
        WHERE ${kosong(kolom)} AND ${cocok(kolom)}`);
    }
  });
  console.log(`\nSelesai. Nama yang tidak cocok (jika ada) perlu diperbaiki manual: samakan dengan nama di Master Dosen, lalu jalankan skrip ini lagi.`);
}

main().then(() => process.exit(0), (e) => { console.error(e); process.exit(1); });
