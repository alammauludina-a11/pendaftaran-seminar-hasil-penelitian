import { db } from "../src/db";
import { slotWaktu } from "../src/db/schema";
import { sql } from "drizzle-orm";

async function main() {
  console.log("Removing 12:00 slots...");
  // SQLite strftime('%H', waktuMulai) gets the hour
  await db.delete(slotWaktu).where(
    sql`strftime('%H', ${slotWaktu.waktuMulai} / 1000, 'unixepoch', 'localtime') = '12' OR strftime('%H', ${slotWaktu.waktuMulai}) = '12'`
  );
  // Wait, in JS the date is stored as ISO string or timestamp in SQLite. Let's just fetch all, filter in JS, and delete by ID.
  const allSlots = await db.select().from(slotWaktu);
  const idsToDelete = allSlots.filter(s => {
    const d = new Date(s.waktuMulai);
    return d.getHours() === 12;
  }).map(s => s.id);
  
  if (idsToDelete.length > 0) {
    console.log(`Found ${idsToDelete.length} slots at 12:00. Deleting...`);
    // SQLite limits query variables, delete in chunks
    for (let i = 0; i < idsToDelete.length; i += 50) {
      const chunk = idsToDelete.slice(i, i + 50);
      await db.delete(slotWaktu).where(sql`id IN (${sql.join(chunk, sql`, `)})`);
    }
  }
  console.log("Done");
}

main().catch(console.error);
