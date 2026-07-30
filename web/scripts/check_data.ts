import { db } from "../src/db";
import { pendaftaran, users } from "../src/db/schema";
import { eq } from "drizzle-orm";

async function main() {
  const data = await db
    .select({
      id: pendaftaran.id,
      name: users.nama,
      status: pendaftaran.statusVerifikasi,
      kelas: pendaftaran.kelasSeminarId,
      periodeId: pendaftaran.periodeId,
    })
    .from(pendaftaran)
    .leftJoin(users, eq(pendaftaran.userId, users.id));

  console.log("All Data:", JSON.stringify(data, null, 2));
}

main().catch(console.error);
