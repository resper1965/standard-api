/**
 * @module @standard/auth/types
 * @description Extended types for Standard Native Auth session fields added by plugins.
 *
 * The Standard Native Auth base types do not include plugin-injected fields (role, activeOrganizationId,
 * platformAdmin). These interfaces extend the base types so we can access them without `as any`.
 *
 * Rule: Never use `as any`, `as StandardUser`, or `as StandardSession` in middleware.
 *       Cast with `as StandardUser` only here, at the boundary, when reading from the opaque
 *       Standard Native Auth session response. All downstream code uses these typed interfaces.
 */

/**
 * Shared types for @standard/auth.
 */
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type { NeonHttpDatabase } from "drizzle-orm/neon-http";

/**
 * Drizzle client type — supports both Neon serverless and postgres.js drivers.
 * Standard Native Auth's drizzle adapter accepts any drizzle instance.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type DrizzleClient = PostgresJsDatabase<any> | NeonHttpDatabase<any> | Record<string, unknown>;

/**
 * Standard Native Auth user type extended with plugin-injected fields.
 * - `role`: injected by the `admin` plugin.
 * - `platformAdmin`: custom additionalField in auth.ts (fieldName: "platform_admin").
 *   When true, the user is a Bekaa operator with cross-tenant access.
 *   Only settable via SQL/seed — never via public API (input: false).
 */
export interface StandardUser {
  id: string;
  email: string;
  name: string;
  /** Set by Standard Native Auth `admin` plugin. Defaults to undefined for regular users. */
  role?: "admin" | "user" | string;
  /**
   * Platform-level admin flag (Bekaa operator).
   * Populated from `platform_admin` column via Standard Native Auth `additionalFields`.
   * Checked by `isPlatformAdmin()` in `rbac.middleware.ts`.
   * camelCase variant set by Standard Native Auth additionalFields mapping.
   */
  platformAdmin?: boolean;
  /**
   * Snake_case variant of the platform admin flag.
   * Standard Native Auth may serialize additionalFields as snake_case depending on
   * plugin/serializer version. Both forms are declared so middleware never needs `as any`.
   */
  platform_admin?: boolean;
  /**
   * Account approval gate. New users default to `false` and require
   * platform admin approval before gaining access. Pre-existing users
   * are migrated as `true`.
   */
  approved?: boolean;
  emailVerified?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Standard Native Auth session type extended with the `organization` plugin field.
 * The `organization` plugin stores the active org in the session.
 */
export interface StandardSession {
  id: string;
  userId: string;
  /** Set by Standard Native Auth `organization` plugin when user switches active org. */
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
 * Typed result of resolving a Standard Native Auth session.
 * Use this as the return type of any function that wraps `auth.api.getSession()`.
 */
export type AuthSessionResult =
  | { resolved: true; user: StandardUser; session: StandardSession }
  | { resolved: false };
