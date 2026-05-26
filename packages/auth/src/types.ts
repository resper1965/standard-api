/**
 * @module @standard/auth/types
 * @description Extended types for Better Auth session fields added by plugins.
 *
 * The Better Auth base types do not include plugin-injected fields (role, activeOrganizationId).
 * These interfaces extend the base types so we can cast safely instead of using `as any`.
 */

/**
 * Shared types for @standard/auth.
 */
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type { NeonHttpDatabase } from "drizzle-orm/neon-http";

/**
 * Drizzle client type — supports both Neon serverless and postgres.js drivers.
 * Better Auth's drizzle adapter accepts any drizzle instance.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type DrizzleClient = PostgresJsDatabase<any> | NeonHttpDatabase<any> | Record<string, unknown>;

/**
 * Better Auth user type extended with the `admin` plugin field.
 * The `admin` plugin adds `role` to the user record.
 */
export interface StandardUser {
  id: string;
  email: string;
  name: string;
  /** Set by Better Auth `admin` plugin. Defaults to undefined for regular users. */
  role?: "admin" | "user" | string;
  emailVerified?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Better Auth session type extended with the `organization` plugin field.
 * The `organization` plugin stores the active org in the session.
 */
export interface StandardSession {
  id: string;
  userId: string;
  /** Set by Better Auth `organization` plugin when user switches active org. */
  activeOrganizationId?: string;
  expiresAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface StandardAuthSession {
  user: StandardUser;
  session: StandardSession;
}
