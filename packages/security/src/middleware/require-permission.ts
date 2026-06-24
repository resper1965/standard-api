import type {
  AuthContext,
  Permission,
  SecurityTenantContext,
} from "@standard/schemas";

/**
 * @deprecated This function is permanently broken after PolicyEngine was
 * gutted to a deny-all stub. Use `assertRbac` from
 * `apps/api-gateway/src/middleware/rbac.middleware.ts` instead.
 *
 * Kept only for API surface compatibility. Will be removed in v0.3.0.
 */
export const requirePermission = (
  _auth: AuthContext | undefined,
  _tenant: SecurityTenantContext | undefined,
  _permissions: Permission[],
  _traceId: string,
): void => {
  throw new Error(
    "[DEPRECATED] requirePermission is no longer functional. " +
      "Use assertRbac middleware from api-gateway instead. " +
      "See: apps/api-gateway/src/middleware/rbac.middleware.ts",
  );
};
