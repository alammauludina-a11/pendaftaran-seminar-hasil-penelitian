import { db } from "./src/db";
import { account } from "./src/db/schema";
async function main() {
  const accounts = await db.select().from(account);
  console.log(accounts.map(a => ({ id: a.id, plainPassword: a.plainPassword })));
}
main();
