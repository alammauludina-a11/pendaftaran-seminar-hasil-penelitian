import { db } from "../src/db";
import { pendaftaran, kelasSeminar } from "../src/db/schema";
import { eq, and } from "drizzle-orm";

async function main() {
  console.log("Menghapus data pendaftaran hasil_penelitian sebelumnya...");
  await db.delete(pendaftaran).where(eq(pendaftaran.jenisSeminar, "hasil_penelitian"));
  console.log("Data hasil_penelitian berhasil dihapus!");

  const allPendaftaran = await db.select().from(pendaftaran);
  console.log("Sisa pendaftaran:", allPendaftaran.map(p => ({id: p.id, user: p.userId, jenis: p.jenisSeminar, status: p.statusVerifikasi})));

  process.exit(0);
}

main().catch(console.error);
