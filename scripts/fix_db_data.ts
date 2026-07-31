import { db } from "../src/db";
import { kelasSeminar } from "../src/db/schema";
import { eq } from "drizzle-orm";

async function main() {
  // Delete empty class C (id: 6)
  await db.delete(kelasSeminar).where(eq(kelasSeminar.id, 6));
  console.log("Deleted Class ID 6 (Empty Class C)");

  // Rename class D (id: 7) to B
  await db.update(kelasSeminar).set({ namaKelas: "B" }).where(eq(kelasSeminar.id, 7));
  console.log("Renamed Class ID 7 from D to B");
}

main().catch(console.error);
