/**
 * @module @standard/auth
 * @description Public API for the Standard auth package.
 */

// Core auth — Standard Native Auth server
export { createAuth } from "./auth";
export type { StandardAuth, AuthEnv } from "./auth";




// Types
export type { DrizzleClient, StandardUser, StandardSession, StandardAuthSession } from "./types";
