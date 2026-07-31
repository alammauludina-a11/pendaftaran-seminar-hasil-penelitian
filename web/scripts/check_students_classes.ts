import { db } from "../src/db";
import { pendaftaran, users } from "../src/db/schema";
import { eq, inArray } from "drizzle-orm";

async function main() {
  const data = await db.select({
    name: users.nama,
    kelasId: pendaftaran.kelasSeminarId
  })
  .from(pendaftaran)
  .leftJoin(users, eq(pendaftaran.userId, users.id))
  .where(inArray(pendaftaran.kelasSeminarId, [3, 4, 6, 7]));
  
  console.log("Students in classes:", JSON.stringify(data, null, 2));
}

main().catch(console.error);
