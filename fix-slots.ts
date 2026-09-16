import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

// Now import db after dotenv is loaded
import { autoGenerateSlots } from "./src/lib/slot-generator";

async function run() {
  console.log("Generating missing slots for Sept 12 to Sept 28...");
  await autoGenerateSlots('2026-09-12', '2026-09-28');
  console.log("Done generating slots.");
  process.exit(0);
}
run();
