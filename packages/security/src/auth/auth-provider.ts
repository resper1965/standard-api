import type { AuthContext, Role } from "@aegis/schemas";

/**
 * @deprecated Use `@aegis/auth` (Better Auth) instead.
 * This interface will be removed in v0.3.0.
 */
export type AuthenticateInput = {
  actorId?: string;
  tenantId?: string;
  organizationIds?: string[];
  roles?: Role[];
  permissions?: AuthContext["permissions"];
  traceId: string;
  authHeader?: string;
  apiKey?: string;
};

/**
 * @deprecated Use `@aegis/auth` (Better Auth) instead.
 * This interface will be removed in v0.3.0.
 */
export type AuthProvider = {
  authenticate(input: AuthenticateInput): Promise<AuthContext | null>;
};
