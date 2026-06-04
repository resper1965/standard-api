import { createDrizzleScfRepository } from "./packages/scf-core/src/repositories/drizzle-scf.repository";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import "dotenv/config";

async function run() {
  const queryClient = postgres(process.env.DATABASE_URL!);
  const db = drizzle(queryClient);
  const repo = createDrizzleScfRepository(db);

  try {
    console.log("Fetching latest version...");
    const res = await repo.getLatestVersion();
    console.log("Result:", res);
  } catch (err: any) {
    console.error("ERROR:", err);
  } finally {
    await queryClient.end();
  }
}
run();
