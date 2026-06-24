/**
 * @deprecated Removed in auth simplification.
 * API key auth is now handled directly by the auth.middleware.ts pipeline.
 *
 * This file is kept as a stub to prevent import breaks during cleanup.
 * Will be removed entirely in a follow-up.
 */
import type { AuthProvider, AuthenticateInput } from "./auth-provider";

/**
 * @deprecated Use the auth.middleware.ts M2M pipeline instead.
 */
export class ApiKeyAuthProvider implements AuthProvider {
  constructor(_db: unknown, _table: unknown) {}

  async authenticate(_input: AuthenticateInput): Promise<null> {
    console.warn(
      "[DEPRECATED] ApiKeyAuthProvider is deprecated. Use auth.middleware.ts M2M pipeline.",
    );
    return null;
  }
}
