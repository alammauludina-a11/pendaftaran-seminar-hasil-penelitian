import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import * as schema from './schema';

const client = createClient({
  url: process.env.DATABASE_URL || 'file:./sqlite.db',
  authToken: process.env.DATABASE_AUTH_TOKEN,
});

export const db = drizzle(client, { schema });

export type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
/** Either the plain connection or an open transaction; shared helpers accept both. */
export type Executor = typeof db | Tx;

const isBusy = (e: unknown) => {
  const err = e as { code?: string; message?: string; cause?: { code?: string; message?: string } };
  const text = `${err?.code} ${err?.message} ${err?.cause?.code} ${err?.cause?.message}`;
  return text.includes("SQLITE_BUSY") || text.includes("database is locked");
};

// Transactions of this server process run one after another. Only one write transaction can hold the
// database at a time anyway; queueing them here avoids SQLITE_BUSY between requests of the same process
// (the local file driver can even get stuck after a busy BEGIN). Busy errors caused by other processes
// / server instances are still retried below.
let antrean: Promise<unknown> = Promise.resolve();

/**
 * Runs `fn` in a write transaction (BEGIN IMMEDIATE): checks and writes inside it see a consistent
 * database and no other write can interleave, so check-then-write races are impossible.
 * Throwing inside `fn` rolls everything back. Keep `fn` short (no file uploads or external calls),
 * since other writers wait for it.
 */
export function transaksi<T>(fn: (tx: Tx) => Promise<T>): Promise<T> {
  const run = antrean.then(() => jalankan(fn));
  antrean = run.catch(() => {});
  return run;
}

async function jalankan<T>(fn: (tx: Tx) => Promise<T>): Promise<T> {
  const deadline = Date.now() + 10_000;
  for (let attempt = 1; ; attempt++) {
    try {
      return await db.transaction(fn);
    } catch (e) {
      if (!isBusy(e) || Date.now() > deadline) throw e;
      // Exponential backoff with jitter, so waiting instances don't all retry at the same moment
      const delay = Math.min(500, 20 * 2 ** attempt);
      await new Promise(r => setTimeout(r, delay / 2 + Math.random() * delay));
    }
  }
}
