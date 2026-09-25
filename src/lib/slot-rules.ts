// Shared slot rules for Seminar Kolokium & Seminar Hasil Penelitian.
// Safe to import from both server routes and client components (no DB access).

export const SLOT_START_HOUR = 8; // first slot 08:00 WIB
export const SLOT_END_HOUR = 16; // last slot 16:00 - 16:50 WIB
export const SLOT_BREAK_HOUR = 12; // 12:00 - 12:50 is a break (no slot)

/** Returns true if the slot start time (any Date/timestamp) is a bookable slot in WIB. */
export function isValidSlotTime(waktuMulai: Date | string | number): boolean {
  const d = new Date(waktuMulai);
  if (isNaN(d.getTime())) return false;
  const wib = new Date(d.getTime() + 7 * 60 * 60 * 1000);
  const day = wib.getUTCDay();
  const hour = wib.getUTCHours();
  if (day === 0) return false; // no slots on Sunday
  if (hour === SLOT_BREAK_HOUR) return false;
  return hour >= SLOT_START_HOUR && hour <= SLOT_END_HOUR;
}

/** Returns true if a YYYY-MM-DD date is a Sunday. */
export function isSundayIso(isoDate: string): boolean {
  const [y, m, d] = isoDate.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay() === 0;
}
