import { config } from "dotenv";
config({ path: ".env.local" });
import { createClient } from "@libsql/client";

async function run() {
  const client = createClient({
    url: process.env.DATABASE_URL!,
    authToken: process.env.DATABASE_AUTH_TOKEN,
  });

  // Check existing columns
  const cols = await client.execute("PRAGMA table_info(moderator)");
  console.log("Current moderator columns:", cols.rows.map((r: any) => r.name));

  const colNames = cols.rows.map((r: any) => r.name as string);
  
  if (!colNames.includes("batal_status")) {
    await client.execute("ALTER TABLE moderator ADD COLUMN batal_status TEXT");
    console.log("✓ Added batal_status column");
  } else {
    console.log("- batal_status already exists");
  }

  if (!colNames.includes("batal_reason")) {
    await client.execute("ALTER TABLE moderator ADD COLUMN batal_reason TEXT");
    console.log("✓ Added batal_reason column");
  } else {
    console.log("- batal_reason already exists");
  }

  // Verify
  const newCols = await client.execute("PRAGMA table_info(moderator)");
  console.log("Updated columns:", newCols.rows.map((r: any) => r.name));
  
  client.close();
  process.exit(0);
}

run().catch(console.error);
