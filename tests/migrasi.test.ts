// Checks the data part of the migrations against a database in the state production had before them.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { createClient } from "@libsql/client";
import { readMigrationFiles } from "drizzle-orm/migrator";

const migrasi = readMigrationFiles({ migrationsFolder: "./drizzle" });
const jalankan = async (client: ReturnType<typeof createClient>, tag: number) => {
  for (const stmt of migrasi[tag].sql) if (stmt.trim()) await client.execute(stmt);
};

describe("migrasi 0001_dospem_id", () => {
  it("mengisi ID dospem dari nama, hanya jika cocok tepat satu dosen", async () => {
    const client = createClient({ url: `file:${path.join(mkdtempSync(path.join(tmpdir(), "seminar-mig-")), "m.db")}` });
    await jalankan(client, 0);

    const now = Date.now();
    const user = (id: string, nama: string, role: string) => client.execute({
      sql: "insert into users (id, email, role, name, nama, nip_nim, email_verified, created_at, updated_at) values (?, ?, ?, ?, ?, ?, 0, ?, ?)",
      args: [id, `${id}@t.invalid`, role, nama, nama, id, now, now],
    });
    await user("d-ani", "Bu Ani", "dosen");
    await user("d-budi1", "Dr. Budi", "dosen");
    await user("d-budi2", "Dr. Budi", "dosen"); // nama ganda → tidak boleh ditebak
    await user("m-1", "Bu Ani", "mahasiswa");   // mahasiswa bernama sama → bukan dosen
    const daftar = (dospem1: string | null, dospem2: string | null) => client.execute({
      sql: "insert into pendaftaran (user_id, dospem1, dospem2, created_at) values ('m-1', ?, ?, ?)",
      args: [dospem1, dospem2, now],
    });
    await daftar("Bu Ani", null);
    await daftar("Dr. Budi", "Bu Ani");
    await daftar("Nama Tidak Dikenal", "");

    await jalankan(client, 1);
    const rows = (await client.execute("select dospem1, dospem2, dospem1_id, dospem2_id from pendaftaran order by id")).rows;
    assert.deepEqual(rows.map(r => [r.dospem1_id, r.dospem2_id]), [
      ["d-ani", null],
      [null, "d-ani"],
      [null, null],
    ]);
    assert.equal(rows[0].dospem1, "Bu Ani", "nama tetap tersimpan");
    client.close();
  });
});
