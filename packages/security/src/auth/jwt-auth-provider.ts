/**
 * @deprecated Removed in auth simplification.
 * JWT auth is handled by Better Auth (Standard Native Auth).
 *
 * This file is kept as a stub to prevent import breaks during cleanup.
 * Will be removed entirely in a follow-up.
 */
import type { AuthProvider, AuthenticateInput } from "./auth-provider";

export type JwtAuthConfig =
  | { mode: "jwks"; jwksUrl: string }
  | { mode: "secret"; secret: string }
  | { mode: "decode-only" };

/**
 * @deprecated Use `@standard/auth` (Standard Native Auth) instead.
 */
export class JwtAuthProvider implements AuthProvider {
  constructor(_config: JwtAuthConfig = { mode: "decode-only" }) {}

  async authenticate(_input: AuthenticateInput): Promise<null> {
    console.warn(
      "[DEPRECATED] JwtAuthProvider is deprecated. Use Standard Native Auth (Better Auth).",
    );
    return null;
  }
}

/**
 * @deprecated No longer needed — Better Auth handles JWT configuration.
 */
export const buildJwtConfig = (
  _env: Record<string, string | undefined>,
): JwtAuthConfig => {
  return { mode: "decode-only" };
};
