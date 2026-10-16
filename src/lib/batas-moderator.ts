// How many seminars a dosen may pick to moderate in a periode (periode.batasModerator plus the dosen's
// pengecualian), shared by the dosen moderator API, the admin API and the tests.
import { and, count, eq } from "drizzle-orm";
import { db, type Executor } from "@/db";
import { moderator, pendaftaran, pengecualianModerator, periode } from "@/db/schema";

export const PESAN_BATAS_MODERATOR =
  "Anda telah melebihi batas maksimal menjadi dosen moderator. Hubungi admin untuk konfirmasi.";

/** Upper bound for both the batas and the tambahan an admin can enter. */
export const MAKS_ISIAN_BATAS = 999;

export type InfoBatasModerator = {
  /** The periode's limit, null when there is none. */
  batas: number | null;
  /** Extra seminars allowed for this dosen (0 without a pengecualian). */
  tambahan: number;
  /** Seminars this dosen moderates in the periode, including those picked by the admin. */
  terpakai: number;
};

/** True when the dosen may not pick another seminar. */
export const batasTercapai = (info: InfoBatasModerator) =>
  info.batas !== null && info.terpakai >= info.batas + info.tambahan;

export async function infoBatasModerator(dosenId: string, periodeId: number, ex: Executor = db): Promise<InfoBatasModerator> {
  const [p] = await ex.select({ batas: periode.batasModerator }).from(periode).where(eq(periode.id, periodeId)).limit(1);
  const [pengecualian] = await ex.select({ tambahan: pengecualianModerator.tambahan }).from(pengecualianModerator)
    .where(and(eq(pengecualianModerator.periodeId, periodeId), eq(pengecualianModerator.dosenId, dosenId))).limit(1);
  const [{ jumlah }] = await ex.select({ jumlah: count() }).from(moderator)
    .innerJoin(pendaftaran, eq(moderator.pendaftaranId, pendaftaran.id))
    .where(and(eq(moderator.dosenId, dosenId), eq(pendaftaran.periodeId, periodeId)));
  return { batas: p?.batas ?? null, tambahan: pengecualian?.tambahan ?? 0, terpakai: jumlah };
}

/** null/"" clears the value; otherwise a whole number 0..MAKS_ISIAN_BATAS (min 1 when `minimal` is 1). */
export function bacaAngkaIsian(nilai: unknown, minimal = 0): { ok: true; angka: number | null } | { ok: false } {
  if (nilai === null || nilai === "") return { ok: true, angka: null };
  const angka = Number(nilai);
  if (!Number.isInteger(angka) || angka < minimal || angka > MAKS_ISIAN_BATAS) return { ok: false };
  return { ok: true, angka };
}

/** The periode's limit and every pengecualian (dosenId → tambahan). */
export async function ambilBatasModerator(periodeId: number, ex: Executor = db) {
  const [p] = await ex.select({ batas: periode.batasModerator }).from(periode).where(eq(periode.id, periodeId)).limit(1);
  if (!p) return null;
  const rows = await ex.select({ dosenId: pengecualianModerator.dosenId, tambahan: pengecualianModerator.tambahan })
    .from(pengecualianModerator).where(eq(pengecualianModerator.periodeId, periodeId));
  return { batas: p.batas, pengecualian: Object.fromEntries(rows.map(r => [r.dosenId, r.tambahan])) as Record<string, number> };
}

/** Sets (tambahan) or removes (null) a dosen's pengecualian. */
export async function simpanPengecualian(periodeId: number, dosenId: string, tambahan: number | null, ex: Executor = db) {
  const kunci = and(eq(pengecualianModerator.periodeId, periodeId), eq(pengecualianModerator.dosenId, dosenId));
  if (tambahan === null) {
    await ex.delete(pengecualianModerator).where(kunci);
    return;
  }
  await ex.insert(pengecualianModerator).values({ periodeId, dosenId, tambahan })
    .onConflictDoUpdate({ target: [pengecualianModerator.periodeId, pengecualianModerator.dosenId], set: { tambahan } });
}
