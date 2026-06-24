import type { Permission, Role } from "@standard/schemas";

/**
 * @deprecated Removed in auth simplification.
 * Use `@standard/auth` (Standard Native Auth) instead.
 */
export type AuthenticateInput = {
  actorId?: string | undefined;
  organizationId?: string | undefined;
  organizationIds?: string[] | undefined;
  roles?: Role[] | undefined;
  permissions?: Permission[] | undefined;
  traceId: string;
  authHeader?: string | undefined;
  apiKey?: string | undefined;
};

/**
 * @deprecated Removed in auth simplification.
 * Use `@standard/auth` (Standard Native Auth) instead.
 */
export type AuthProvider = {
  authenticate(input: AuthenticateInput): Promise<unknown>;
};
