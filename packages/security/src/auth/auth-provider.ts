import type { AuthContext, Role } from "@standard/schemas";

/**
 * @deprecated Use `@standard/auth` (Standard Native Auth) instead.
 * This interface will be removed in v0.3.0.
 */
export type AuthenticateInput = {
  actorId?: string | undefined;
  tenantId?: string | undefined;
  organizationIds?: string[] | undefined;
  roles?: Role[] | undefined;
  permissions?: AuthContext["permissions"] | undefined;
  traceId: string;
  authHeader?: string | undefined;
  apiKey?: string | undefined;
};

/**
 * @deprecated Use `@standard/auth` (Standard Native Auth) instead.
 * This interface will be removed in v0.3.0.
 */
export type AuthProvider = {
  authenticate(input: AuthenticateInput): Promise<AuthContext | null>;
};

