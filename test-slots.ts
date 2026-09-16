import { db } from "./src/db/index";
import { slotWaktu } from "./src/db/schema";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

async function run() {
  const slots = await db.select().from(slotWaktu);
  const sep16 = slots.filter(s => {
      const d = new Date(s.waktuMulai);
      return d.getMonth() === 8 && d.getDate() === 16;
  });
  console.log("Total Sept 16 slots:", sep16.length);
  console.log(sep16.map(s => new Date(s.waktuMulai).toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta' })));
  
  console.log("Total Sept 15 slots:");
  const sep15 = slots.filter(s => {
      const d = new Date(s.waktuMulai);
      return d.getMonth() === 8 && d.getDate() === 15;
  });
  console.log(sep15.length);
  process.exit(0);
}
run();
