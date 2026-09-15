import { db } from '../src/db/index';
import { slotWaktu, pendaftaran } from '../src/db/schema';
import { eq, isNotNull } from 'drizzle-orm';

async function main() {
  const regs = await db.select({
    id: pendaftaran.id,
    slotId: pendaftaran.slotWaktuId,
    waktuMulai: slotWaktu.waktuMulai,
    waktuSelesai: slotWaktu.waktuSelesai
  })
  .from(pendaftaran)
  .leftJoin(slotWaktu, eq(pendaftaran.slotWaktuId, slotWaktu.id))
  .where(isNotNull(pendaftaran.slotWaktuId))
  .limit(10);

  for (const r of regs) {
    const d = new Date(r.waktuMulai);
    console.log(`id:${r.id} ISO:${r.waktuMulai} UTCh:${d.getUTCHours()} localH:${d.getHours()} WIB:${new Intl.DateTimeFormat('id-ID', {timeZone:'Asia/Jakarta', hour:'2-digit', minute:'2-digit', hour12:false}).format(d)}`);
  }
}

main().catch(console.error);
