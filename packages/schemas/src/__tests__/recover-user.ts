import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { eq } from "drizzle-orm";
import { baAccount } from "../db/auth-schema";

const connectionString =
  "postgresql://neondb_owner:npg_REDACTED@ep-REDACTED-pooler-pooler.c-6.us-east-1.aws.neon.tech/neondb?channel_binding=require&sslmode=require";
const client = postgres(connectionString);
const db = drizzle(client);

async function main() {
  const accounts = await db
    .select()
    .from(baAccount)
    .where(eq(baAccount.userId, "38YmJtQEQiZkRKBLue2WffNCCVyOlg2r"))
    .execute();
  console.log("Accounts:", accounts);
}

main()
  .catch(console.error)
  .finally(() => process.exit(0));
