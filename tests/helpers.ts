import "./setup-env";
import crypto from "node:crypto";
import { migrate } from "drizzle-orm/libsql/migrator";
import { db } from "../src/db";
import { users, periode, slotWaktu, pendaftaran, kelasSeminar, moderator } from "../src/db/schema";

export { db };

/** Builds the schema from the migrations in ./drizzle (call once per test file in `before`). */
export async function siapkanDb() {
  await migrate(db, { migrationsFolder: "./drizzle" });
}

/** YYYY-MM-DD of a Monday about one year ahead, so slots are always in the future. */
export function seninDepan(tambahHari = 0) {
  const d = new Date();
  d.setUTCFullYear(d.getUTCFullYear() + 1);
  while (d.getUTCDay() !== 1) d.setUTCDate(d.getUTCDate() + 1);
  d.setUTCDate(d.getUTCDate() + tambahHari);
  return d.toISOString().slice(0, 10);
}

/** Date for `jam`:00 WIB on the given YYYY-MM-DD. */
export const jamWIB = (iso: string, jam: number) => new Date(`${iso}T${String(jam).padStart(2, "0")}:00:00+07:00`);

export async function buatUser(data: { nama: string; role: "mahasiswa" | "dosen" | "admin"; angkatan?: string }) {
  const id = crypto.randomUUID();
  await db.insert(users).values({
    id,
    email: `${id}@test.invalid`,
    role: data.role,
    name: data.nama,
    nama: data.nama,
    nipNim: id,
    angkatan: data.angkatan ?? null,
  });
  return id;
}

export async function buatPeriode(data: Partial<typeof periode.$inferInsert> = {}) {
  const [p] = await db.insert(periode).values({
    angkatan: "60",
    jenisSeminar: "hasil_penelitian",
    startDate: seninDepan(),
    endDate: seninDepan(5),
    isOpen: true,
    isDraft: false,
    batasKelas: 3,
    ...data,
  }).returning();
  return p;
}

export async function buatSlot(iso: string, jam: number) {
  const [s] = await db.insert(slotWaktu).values({
    waktuMulai: jamWIB(iso, jam),
    waktuSelesai: new Date(jamWIB(iso, jam).getTime() + 50 * 60 * 1000),
  }).returning();
  return s;
}

export async function buatPendaftaran(data: Partial<typeof pendaftaran.$inferInsert> & { userId: string }) {
  const [p] = await db.insert(pendaftaran).values({ statusVerifikasi: "menunggu", ...data }).returning();
  return p;
}

export async function buatKelas(periodeId: number, namaKelas = "A") {
  const [k] = await db.insert(kelasSeminar).values({ periodeId, namaKelas }).returning();
  return k;
}

export async function jadikanModerator(pendaftaranId: number, dosenId: string) {
  await db.insert(moderator).values({ pendaftaranId, dosenId });
}

/** Removes all rows between tests (schema stays). */
export async function kosongkan() {
  await db.delete(moderator);
  await db.delete(pendaftaran);
  await db.delete(kelasSeminar);
  await db.delete(slotWaktu);
  await db.delete(periode);
  await db.delete(users);
}
