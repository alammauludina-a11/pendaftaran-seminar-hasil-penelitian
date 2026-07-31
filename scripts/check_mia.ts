import { db } from "../src/db";
import { users } from "../src/db/schema";
import { eq } from "drizzle-orm";

async function main() {
  const data = await db.select().from(users).where(eq(users.nama, "Mia"));
  console.log("Mia Data:", JSON.stringify(data, null, 2));
}

main().catch(console.error);
