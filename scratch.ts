import { db } from "./src/db";
import { pendaftaran } from "./src/db/schema";
import { isNotNull } from "drizzle-orm";

async function main() {
  const result = await db.select().from(pendaftaran).where(isNotNull(pendaftaran.fileBuktiKolokium));
  console.log(result);
}
main();
