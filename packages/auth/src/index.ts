/**
 * @module @standard/auth
 * @description Public API for the Standard auth package.
 */

// Core auth — Better Auth server
export { createAuth } from "./auth";
export type { StandardAuth, AuthEnv } from "./auth";

// Permissions
export {
  STANDARD_PERMISSIONS,
  STANDARD_ROLE_PERMISSIONS,
  roleHasPermission,
} from "./permissions";
export type { StandardResource, StandardPermission, StandardRole } from "./permissions";

// Types
export type { DrizzleClient } from "./types";
