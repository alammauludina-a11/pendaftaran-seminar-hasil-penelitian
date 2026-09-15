/**
 * Script: fix-slot-times.ts
 * 
 * Masalah: Slot lama (id < 385) menyimpan jam yang salah akibat bug timezone.
 * Slot lama jam 15:00 WIB = seharusnya 08:00 WIB (selisih 7 jam).
 * Script ini memindahkan setiap pendaftaran dari slot lama ke slot baru yang tepat waktunya.
 */

import { createClient } from '@libsql/client';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const client = createClient({
  url: process.env.DATABASE_URL!,
  authToken: process.env.DATABASE_AUTH_TOKEN!,
});

const fmt = new Intl.DateTimeFormat('id-ID', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit', hour12: false });
const dateFmt = new Intl.DateTimeFormat('id-ID', { timeZone: 'Asia/Jakarta', day: '2-digit', month: '2-digit', year: 'numeric' });

async function main() {
  // Get all pendaftaran with old slots (those showing wrong times)
  const regs = await client.execute(`
    SELECT p.id, p.slot_waktu_id, sw.waktu_mulai, sw.waktu_selesai
    FROM pendaftaran p
    JOIN slot_waktu sw ON p.slot_waktu_id = sw.id
  `);

  console.log(`Total pendaftaran with slots: ${regs.rows.length}`);

  let fixed = 0;
  let skipped = 0;

  for (const row of regs.rows) {
    const oldSlotId = Number(row.slot_waktu_id);
    const rawMulai = Number(row.waktu_mulai);
    const oldDate = new Date(rawMulai * 1000);

    const wibHour = parseInt(fmt.format(oldDate).split('.')[0]);
    
    // If WIB hour is within valid range (8-16), skip (already correct)
    if (wibHour >= 8 && wibHour <= 16) {
      console.log(`  p.id:${row.id} slot:${oldSlotId} already ${fmt.format(oldDate)} WIB - SKIP`);
      skipped++;
      continue;
    }

    // Old wrong time: e.g. 15:00 WIB = 08:00 UTC, correct should be 08:00 WIB = 01:00 UTC
    // Offset: wibHour - 7 = correct WIB hour
    const correctWibHour = wibHour - 7;
    if (correctWibHour < 8 || correctWibHour > 16 || correctWibHour === 12) {
      console.log(`  p.id:${row.id} slot:${oldSlotId} ${fmt.format(oldDate)} WIB -> corrected=${correctWibHour} WIB: OUT OF RANGE, skip`);
      skipped++;
      continue;
    }

    // Find a new correct slot on the same calendar date with the correct WIB hour
    // The new slot would have waktu_mulai such that UTC = correctWibHour - 7
    const correctUtcHour = correctWibHour - 7;
    
    // Get date parts in WIB
    const wibDateStr = dateFmt.format(oldDate); // DD/MM/YYYY
    const [dayStr, monthStr, yearStr] = wibDateStr.split('/');
    const year = parseInt(yearStr);
    const month = parseInt(monthStr) - 1;
    const day = parseInt(dayStr);

    // Correct slot start in UTC
    const correctStartSecs = Math.floor(Date.UTC(year, month, day, correctUtcHour, 0, 0) / 1000);
    const correctEndSecs = Math.floor(Date.UTC(year, month, day, correctUtcHour, 50, 0) / 1000);

    // Find matching slot in slot_waktu
    const matchSlot = await client.execute({
      sql: `SELECT id FROM slot_waktu WHERE waktu_mulai = ? LIMIT 1`,
      args: [correctStartSecs]
    });

    if (matchSlot.rows.length === 0) {
      console.log(`  p.id:${row.id} No correct slot found for ${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')} ${correctWibHour}:00 WIB. Creating...`);
      // Insert new correct slot
      const inserted = await client.execute({
        sql: `INSERT INTO slot_waktu (waktu_mulai, waktu_selesai, tersedia) VALUES (?, ?, 1) RETURNING id`,
        args: [correctStartSecs, correctEndSecs]
      });
      const newSlotId = Number(inserted.rows[0].id);
      await client.execute({ sql: `UPDATE pendaftaran SET slot_waktu_id = ? WHERE id = ?`, args: [newSlotId, row.id] });
      console.log(`  p.id:${row.id} slot ${oldSlotId} -> new slot ${newSlotId} (${correctWibHour}:00 WIB)`);
      fixed++;
    } else {
      const newSlotId = Number(matchSlot.rows[0].id);
      await client.execute({ sql: `UPDATE pendaftaran SET slot_waktu_id = ? WHERE id = ?`, args: [newSlotId, row.id] });
      const nd = new Date(correctStartSecs * 1000);
      console.log(`  p.id:${row.id} slot ${oldSlotId}(${fmt.format(oldDate)} WIB) -> slot ${newSlotId}(${fmt.format(nd)} WIB)`);
      fixed++;
    }
  }

  console.log(`\nDone. Fixed: ${fixed}, Skipped: ${skipped}`);
}

main().catch(console.error);
