/**
 * @module @aegis/auth
 * @description Public API for the Aegis auth package.
 */

// Core auth
export { createAuth } from "./auth";
export type { AegisAuth, AuthEnv } from "./auth";

// Permissions
export {
  AEGIS_PERMISSIONS,
  AEGIS_ROLE_PERMISSIONS,
  roleHasPermission,
} from "./permissions";
export type { AegisResource, AegisPermission, AegisRole } from "./permissions";

// Types
export type { DrizzleClient } from "./types";
