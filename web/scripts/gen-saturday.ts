import { db } from "../src/db";
import { periode } from "../src/db/schema";
import { eq } from "drizzle-orm";
import { autoGenerateSlots } from "../src/lib/slot-generator";

async function main() {
  const activePeriodeData = await db.query.periode.findFirst({
    where: eq(periode.isOpen, true)
  });

  if (activePeriodeData && activePeriodeData.startDate && activePeriodeData.endDate) {
    console.log("Generating slots for active period...", activePeriodeData.startDate, activePeriodeData.endDate);
    await autoGenerateSlots(activePeriodeData.startDate, activePeriodeData.endDate);
    console.log("Done");
  } else {
    console.log("No active period found");
  }
}

main().catch(console.error);
