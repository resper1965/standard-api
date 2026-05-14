import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "@standard/schemas";

/**
 * Initializes the Drizzle Connection specifically for Cloudflare Edge.
 * Uses neon-http which is TCP-less and perfect for V8 Isolates.
 */
export const createDb = (databaseUrl: string) => {
  const sql = neon(databaseUrl);
  return drizzle({ client: sql, schema });
};

export type DbClient = ReturnType<typeof createDb>;

