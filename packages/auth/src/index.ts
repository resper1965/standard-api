/**
 * @module @standard/auth
 * @description Public API for the Standard auth package.
 */

// Core auth â€” Standard Native Auth server
export { createAuth } from "./auth";
export type { StandardAuth, AuthEnv } from "./auth";

// Auth Repository â€” single access point for Better Auth internal tables (ADR-009)
export { createAuthRepository } from "./auth-repository";
export type {
  AuthRepository,
  BaUser,
  BaSession,
  UserSummary,
  UserUpdateInput,
} from "./auth-repository";

// Types
export type {
  DrizzleClient,
  StandardUser,
  StandardSession,
  StandardAuthSession,
} from "./types";

