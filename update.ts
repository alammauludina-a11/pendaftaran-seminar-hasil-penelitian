import { db } from "./src/db";
import { periode } from "./src/db/schema";
import { like } from "drizzle-orm";

async function main() {
  await db.update(periode)
    .set({ jenisSeminar: "kolokium" })
    .where(like(periode.startDate, "2026-07-28%"));
  console.log("Update completed.");
}
main();
