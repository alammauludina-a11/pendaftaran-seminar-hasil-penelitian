// Shared scheduling rules used by the admin & dosen APIs.
import { db, type Executor } from "@/db";
import { pendaftaran, slotWaktu, moderator, users, kelasSeminar, periode } from "@/db/schema";
import { and, asc, eq, inArray, isNull, ne } from "drizzle-orm";
import { isValidSlotTime } from "@/lib/slot-rules";

/** Start time of a pendaftaran's slot, or null when it has no slot. */
export async function getWaktuMulaiPendaftaran(pendaftaranId: number, ex: Executor = db): Promise<Date | null> {
  const rows = await ex
    .select({ waktuMulai: slotWaktu.waktuMulai })
    .from(pendaftaran)
    .innerJoin(slotWaktu, eq(pendaftaran.slotWaktuId, slotWaktu.id))
    .where(eq(pendaftaran.id, pendaftaranId))
    .limit(1);
  return rows[0]?.waktuMulai ?? null;
}

/**
 * Checks whether a dosen already has a duty (pembimbing or moderator) in another seminar at the same time.
 * Matched by dosen id and slot time (slot_waktu may contain duplicate rows for the same time); rejected registrations are ignored.
 * Returns a human readable reason, or null when there is no clash. `dosenName` is only used in the message.
 */
export async function findDosenClash(opts: {
  dosenId: string;
  dosenName: string;
  waktuMulai: Date;
  excludePendaftaranId: number;
}, ex: Executor = db): Promise<string | null> {
  const rows = await ex
    .select({
      mahasiswa: users.nama,
      dospem1Id: pendaftaran.dospem1Id,
      dospem2Id: pendaftaran.dospem2Id,
      moderatorId: moderator.dosenId,
    })
    .from(pendaftaran)
    .innerJoin(slotWaktu, eq(pendaftaran.slotWaktuId, slotWaktu.id))
    .innerJoin(users, eq(pendaftaran.userId, users.id))
    .leftJoin(moderator, eq(moderator.pendaftaranId, pendaftaran.id))
    .where(
      and(
        eq(slotWaktu.waktuMulai, opts.waktuMulai),
        ne(pendaftaran.statusVerifikasi, "ditolak"),
        ne(pendaftaran.id, opts.excludePendaftaranId)
      )
    );

  for (const r of rows) {
    if (r.dospem1Id === opts.dosenId || r.dospem2Id === opts.dosenId) {
      return `${opts.dosenName} sudah terjadwal sebagai dosen pembimbing (${r.mahasiswa}) di jam yang sama.`;
    }
    if (r.moderatorId === opts.dosenId) {
      return `${opts.dosenName} sudah terjadwal sebagai moderator (${r.mahasiswa}) di jam yang sama.`;
    }
  }
  return null;
}

/** True when the dosen is pembimbing 1 or 2 of the registration. */
export const isPembimbing = (p: { dospem1Id: string | null; dospem2Id: string | null }, dosenId: string) =>
  p.dospem1Id === dosenId || p.dospem2Id === dosenId;

/**
 * Forms one class from the queue (approved, no class yet) of a periode, up to its batas kelas.
 * Pass the caller's transaction so the queue read, class creation and assignment happen atomically.
 */
export async function formClassFromQueue(
  periodeId: number,
  opts: { minStudents?: number } = {},
  ex: Executor = db
): Promise<{ className: string; kelas: typeof kelasSeminar.$inferSelect; count: number } | null> {
  const periodes = await ex.select().from(periode).where(eq(periode.id, periodeId));
  if (periodes.length === 0) return null;
  const batasKelas = periodes[0].batasKelas || 31;

  const queued = await ex
    .select({ id: pendaftaran.id })
    .from(pendaftaran)
    .where(
      and(
        eq(pendaftaran.periodeId, periodeId),
        eq(pendaftaran.statusVerifikasi, "disetujui"),
        isNull(pendaftaran.kelasSeminarId)
      )
    )
    .orderBy(asc(pendaftaran.id));

  if (queued.length === 0 || queued.length < (opts.minStudents ?? 1)) return null;
  const ids = queued.slice(0, batasKelas).map(q => q.id);

  // Pick the first free class name: A..Z, then A1..Z1, ...
  const existingNames = new Set(
    (await ex.select({ nama: kelasSeminar.namaKelas }).from(kelasSeminar).where(eq(kelasSeminar.periodeId, periodeId))).map(c => c.nama)
  );
  let className = "A";
  for (let i = 0; ; i++) {
    const candidate = String.fromCharCode(65 + (i % 26)) + (i >= 26 ? Math.floor(i / 26) : "");
    if (!existingNames.has(candidate)) {
      className = candidate;
      break;
    }
  }

  const [newClass] = await ex
    .insert(kelasSeminar)
    .values({ namaKelas: className, periodeId, kuotaTerisi: 0, kapasitasMax: batasKelas })
    .returning();

  // Atomic assignment: only students that are still approved and without a class
  const assigned = await ex
    .update(pendaftaran)
    .set({ kelasSeminarId: newClass.id })
    .where(
      and(
        inArray(pendaftaran.id, ids),
        isNull(pendaftaran.kelasSeminarId),
        eq(pendaftaran.statusVerifikasi, "disetujui")
      )
    )
    .returning({ id: pendaftaran.id });

  if (assigned.length === 0) {
    await ex.delete(kelasSeminar).where(eq(kelasSeminar.id, newClass.id));
    return null;
  }

  await ex.update(kelasSeminar).set({ kuotaTerisi: assigned.length }).where(eq(kelasSeminar.id, newClass.id));
  return { className, kelas: { ...newClass, kuotaTerisi: assigned.length }, count: assigned.length };
}

/**
 * Server-side slot rules, identical for kolokium & hasil_penelitian and matching /api/mahasiswa/slot:
 * valid time (no Sunday, no 12:00, 08-16 WIB), not in the past, inside the periode dates,
 * no pending class of the same seminar type on that time, no dospem/moderator clash.
 */
export async function validasiSlot(opts: {
  slotId: number;
  jenisSeminar: string;
  periode: { startDate: string | null; endDate: string | null };
  dospem1Id: string;
  dospem2Id: string;
  excludePendaftaranId?: number;
}, ex: Executor = db): Promise<{ waktuMulai: Date } | { error: string; status: number }> {
  const slotRecord = await ex.select().from(slotWaktu).where(eq(slotWaktu.id, opts.slotId)).limit(1);
  if (slotRecord.length === 0) {
    return { error: "Slot jadwal tidak ditemukan.", status: 404 };
  }
  const waktuMulai = slotRecord[0].waktuMulai;

  if (!isValidSlotTime(waktuMulai)) {
    return { error: "Slot jadwal tidak valid (hari Minggu dan jam 12.00 tidak tersedia).", status: 400 };
  }
  if (new Date(waktuMulai).getTime() <= Date.now()) {
    return { error: "Waktu slot jadwal sudah lewat. Silakan pilih slot lain.", status: 400 };
  }
  const slotIso = new Date(waktuMulai).toLocaleDateString("sv-SE", { timeZone: "Asia/Jakarta" }); // YYYY-MM-DD
  const { startDate, endDate } = opts.periode;
  if ((startDate && slotIso < startDate) || (endDate && slotIso > endDate)) {
    return { error: "Slot jadwal berada di luar rentang tanggal periode seminar.", status: 400 };
  }

  // All active registrations on this slot time (matched by time, not slot id: slot_waktu may contain duplicate rows)
  const activeOnSlot = await ex
    .select({
      id: pendaftaran.id,
      kelasSeminarId: pendaftaran.kelasSeminarId,
      dospem1Id: pendaftaran.dospem1Id,
      dospem2Id: pendaftaran.dospem2Id,
      jenisSeminar: pendaftaran.jenisSeminar,
      moderatorId: moderator.dosenId,
    })
    .from(pendaftaran)
    .innerJoin(slotWaktu, eq(pendaftaran.slotWaktuId, slotWaktu.id))
    .leftJoin(moderator, eq(pendaftaran.id, moderator.pendaftaranId))
    .where(
      and(
        eq(slotWaktu.waktuMulai, waktuMulai),
        ne(pendaftaran.statusVerifikasi, "ditolak"),
        opts.excludePendaftaranId ? ne(pendaftaran.id, opts.excludePendaftaranId) : undefined
      )
    );

  // Pending class is checked per seminar type
  if (activeOnSlot.some(r => r.jenisSeminar === opts.jenisSeminar && r.kelasSeminarId === null)) {
    return { error: "Slot ini belum bisa dipilih karena pendaftar sebelumnya masih menunggu kelas terbentuk.", status: 409 };
  }

  // Dospem / moderator clash is checked across ALL seminar types (a lecturer can't be in two places at once)
  const mine = [opts.dospem1Id, opts.dospem2Id].filter(Boolean);
  const clash = activeOnSlot.some(r =>
    [r.dospem1Id, r.dospem2Id, r.moderatorId].some(id => id && mine.includes(id))
  );
  if (clash) {
    return { error: "Dosen Pembimbing Anda sudah terjadwal di slot jam yang sama pada kelas lain. Pilih jadwal lain.", status: 409 };
  }

  return { waktuMulai };
}
