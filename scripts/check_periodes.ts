import { db } from "../src/db";
import { periode } from "../src/db/schema";

async function main() {
  const data = await db.select().from(periode);
  console.log("Periodes:", JSON.stringify(data, null, 2));
}

main().catch(console.error);
