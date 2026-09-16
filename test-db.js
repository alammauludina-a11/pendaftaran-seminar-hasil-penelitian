const { db } = require("./src/db/index.js");
const { slotWaktu } = require("./src/db/schema.js");
async function run() {
  const slots = await db.select().from(slotWaktu);
  const sep16 = slots.filter(s => {
      const d = new Date(s.waktuMulai);
      return d.getMonth() === 8 && d.getDate() === 16;
  });
  console.log("Total Sept 16 slots:", sep16.length);
  console.log(sep16.map(s => new Date(s.waktuMulai).toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta' })));
}
run();
