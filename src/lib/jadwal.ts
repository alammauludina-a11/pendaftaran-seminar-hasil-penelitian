// Shared scheduling rules used by the admin & dosen APIs.
import { db } from "@/db";
import { pendaftaran, slotWaktu, moderator, users, kelasSeminar, periode } from "@/db/schema";
import { and, asc, eq, inArray, isNull, ne } from "drizzle-orm";
import { alias } from "drizzle-orm/sqlite-core";

/** Start time of a pendaftaran's slot, or null when it has no slot. */
export async function getWaktuMulaiPendaftaran(pendaftaranId: number): Promise<Date | null> {
  const rows = await db
    .select({ waktuMulai: slotWaktu.waktuMulai })
    .from(pendaftaran)
    .innerJoin(slotWaktu, eq(pendaftaran.slotWaktuId, slotWaktu.id))
    .where(eq(pendaftaran.id, pendaftaranId))
    .limit(1);
  return rows[0]?.waktuMulai ?? null;
}

/**
 * Checks whether a dosen already has a duty (pembimbing or moderator) in another seminar at the same time.
 * Matched by slot time (slot_waktu may contain duplicate rows for the same time); rejected registrations are ignored.
 * Returns a human readable reason, or null when there is no clash.
 */
export async function findDosenClash(opts: {
  dosenId: string;
  dosenName: string;
  waktuMulai: Date;
  excludePendaftaranId: number;
}): Promise<string | null> {
  const moderatorUsers = alias(users, "moderatorUsers");
  const rows = await db
    .select({
      mahasiswa: users.nama,
      dospem1: pendaftaran.dospem1,
      dospem2: pendaftaran.dospem2,
      moderatorId: moderator.dosenId,
      moderatorName: moderatorUsers.nama,
    })
    .from(pendaftaran)
    .innerJoin(slotWaktu, eq(pendaftaran.slotWaktuId, slotWaktu.id))
    .innerJoin(users, eq(pendaftaran.userId, users.id))
    .leftJoin(moderator, eq(moderator.pendaftaranId, pendaftaran.id))
    .leftJoin(moderatorUsers, eq(moderator.dosenId, moderatorUsers.id))
    .where(
      and(
        eq(slotWaktu.waktuMulai, opts.waktuMulai),
        ne(pendaftaran.statusVerifikasi, "ditolak"),
        ne(pendaftaran.id, opts.excludePendaftaranId)
      )
    );

  for (const r of rows) {
    if (r.dospem1 === opts.dosenName || r.dospem2 === opts.dosenName) {
      return `${opts.dosenName} sudah terjadwal sebagai dosen pembimbing (${r.mahasiswa}) di jam yang sama.`;
    }
    if (r.moderatorId === opts.dosenId || (r.moderatorName && r.moderatorName === opts.dosenName)) {
      return `${opts.dosenName} sudah terjadwal sebagai moderator (${r.mahasiswa}) di jam yang sama.`;
    }
  }
  return null;
}

/**
 * Forms one class from the queue (approved, no class yet) of a periode, up to its batas kelas.
 * Students are assigned in a single statement that only takes students still without a class,
 * so two simultaneous formations can never put the same student in two classes; a class that
 * ends up empty because another formation took the students first is removed again.
 */
export async function formClassFromQueue(
  periodeId: number,
  opts: { minStudents?: number } = {}
): Promise<{ className: string; kelas: typeof kelasSeminar.$inferSelect; count: number } | null> {
  const periodes = await db.select().from(periode).where(eq(periode.id, periodeId));
  if (periodes.length === 0) return null;
  const batasKelas = periodes[0].batasKelas || 31;

  const queued = await db
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
    (await db.select({ nama: kelasSeminar.namaKelas }).from(kelasSeminar).where(eq(kelasSeminar.periodeId, periodeId))).map(c => c.nama)
  );
  let className = "A";
  for (let i = 0; ; i++) {
    const candidate = String.fromCharCode(65 + (i % 26)) + (i >= 26 ? Math.floor(i / 26) : "");
    if (!existingNames.has(candidate)) {
      className = candidate;
      break;
    }
  }

  const [newClass] = await db
    .insert(kelasSeminar)
    .values({ namaKelas: className, periodeId, kuotaTerisi: 0, kapasitasMax: batasKelas })
    .returning();

  // Atomic assignment: only students that are still approved and without a class
  const assigned = await db
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
    await db.delete(kelasSeminar).where(eq(kelasSeminar.id, newClass.id));
    return null;
  }

  await db.update(kelasSeminar).set({ kuotaTerisi: assigned.length }).where(eq(kelasSeminar.id, newClass.id));
  return { className, kelas: { ...newClass, kuotaTerisi: assigned.length }, count: assigned.length };
}
