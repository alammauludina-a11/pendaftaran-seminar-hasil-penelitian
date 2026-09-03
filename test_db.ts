import { db } from './src/db/index';
import { pendaftaran } from './src/db/schema';
import { eq } from 'drizzle-orm';

async function main() {
  try {
    await db.select().from(pendaftaran).where(eq(pendaftaran.isReleased, true));
    console.log("Success");
  } catch (e: any) {
    console.error("DB Error:", e);
    if (e.cause) console.error("Cause:", e.cause);
  }
}
main();
