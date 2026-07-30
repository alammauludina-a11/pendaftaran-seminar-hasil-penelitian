import { db } from '../src/db';
import { users, account } from '../src/db/schema';
import { eq } from 'drizzle-orm';

async function run() {
  const admins = await db.select().from(users).where(eq(users.role, 'admin'));
  console.log('Admins users:', admins);

  const accs = await db.select().from(account);
  console.log('Accounts:', accs.filter(a => admins.some(ad => ad.id === a.userId)));
}
run();
