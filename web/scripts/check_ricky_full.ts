import { db } from "../src/db";
import { pendaftaran, users } from "../src/db/schema";
import { eq } from "drizzle-orm";

async function main() {
  const data = await db.select().from(pendaftaran).where(eq(pendaftaran.id, 12));
  console.log("Ricky Data:", JSON.stringify(data, null, 2));
}

main().catch(console.error);
