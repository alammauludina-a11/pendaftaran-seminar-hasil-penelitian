import { db } from "../src/db";
import { kelasSeminar } from "../src/db/schema";
import { eq } from "drizzle-orm";

async function main() {
  const data = await db.select().from(kelasSeminar).where(eq(kelasSeminar.periodeId, 9));
  console.log("Classes in Period 9:", JSON.stringify(data, null, 2));
}

main().catch(console.error);
