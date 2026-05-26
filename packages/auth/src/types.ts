/**
 * @module @standard/auth/types
 * @description Extended types for Better Auth session fields added by plugins.
 *
 * The Better Auth base types do not include plugin-injected fields (role, activeOrganizationId,
 * platformAdmin). These interfaces extend the base types so we can access them without `as any`.
 *
 * Rule: Never use `as any`, `as StandardUser`, or `as StandardSession` in middleware.
 *       Cast with `as StandardUser` only here, at the boundary, when reading from the opaque
 *       Better Auth session response. All downstream code uses these typed interfaces.
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
 * Better Auth user type extended with plugin-injected fields.
 * - `role`: injected by the `admin` plugin.
 * - `platformAdmin`: custom additionalField in auth.ts (fieldName: "platform_admin").
 *   When true, the user is a Bekaa operator with cross-tenant access.
 *   Only settable via SQL/seed — never via public API (input: false).
 */
export interface StandardUser {
  id: string;
  email: string;
  name: string;
  /** Set by Better Auth `admin` plugin. Defaults to undefined for regular users. */
  role?: "admin" | "user" | string;
  /**
   * Platform-level admin flag (Bekaa operator).
   * Populated from `platform_admin` column via Better Auth `additionalFields`.
   * Checked by `isPlatformAdmin()` in `rbac.middleware.ts`.
   */
  platformAdmin?: boolean;
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

/**
 * Typed result of resolving a Better Auth session.
 * Use this as the return type of any function that wraps `auth.api.getSession()`.
 */
export type AuthSessionResult =
  | { resolved: true; user: StandardUser; session: StandardSession }
  | { resolved: false };
