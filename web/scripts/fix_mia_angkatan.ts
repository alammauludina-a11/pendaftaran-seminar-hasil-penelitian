import { db } from "../src/db";
import { users } from "../src/db/schema";
import { eq } from "drizzle-orm";

async function main() {
  await db.update(users).set({ angkatan: "61" }).where(eq(users.nama, "mia"));
  console.log("Updated Mia's angkatan to 61");
}

main().catch(console.error);
