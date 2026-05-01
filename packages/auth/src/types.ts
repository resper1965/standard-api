/**
 * Shared types for @aegis/auth.
 */
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type { NeonHttpDatabase } from "drizzle-orm/neon-http";

/**
 * Drizzle client type — supports both Neon serverless and postgres.js drivers.
 * Better Auth's drizzle adapter accepts any drizzle instance.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type DrizzleClient = PostgresJsDatabase<any> | NeonHttpDatabase<any> | Record<string, unknown>;
