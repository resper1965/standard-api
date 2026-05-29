import { db } from './packages/scf-data/src/db';
import { organization } from './packages/schemas/src/db/schema';
import { not, eq } from 'drizzle-orm';

async function main() {
  await db.delete(organization).where(not(eq(organization.name, 'Bekaa')));
  console.log('Done deleting all orgs except Bekaa');
}
main();
