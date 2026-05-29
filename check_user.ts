import { db } from './packages/scf-data/src/db';
import { user, account } from './packages/schemas/src/db/schema';
import { eq } from 'drizzle-orm';

async function main() {
  const users = await db.select().from(user).where(eq(user.email, 'resper@bekaa.eu'));
  console.log('User found:', users);
  
  if (users.length > 0) {
    const accs = await db.select().from(account).where(eq(account.userId, users[0].id));
    console.log('Account found:', accs.map(a => ({ id: a.id, providerId: a.providerId })));
  }
}

main().catch(console.error);
