require("dotenv").config({ path: ".env.local" });

async function run() {
  // Use dynamic import for ES modules or compile a TS file that does this
  const { autoGenerateSlots } = require("./src/lib/slot-generator");
  console.log("Generating missing slots for Sept 12 to Sept 28...");
  await autoGenerateSlots('2026-09-12', '2026-09-28');
  console.log("Done generating slots.");
  process.exit(0);
}
run();
