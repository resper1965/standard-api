import type { AuthContext, Permission, Role } from "@standard/schemas";
import { DEFAULT_ROLE_PERMISSIONS } from "../constants";
import { SecurityPolicyError } from "../errors";
import type { AuthenticateInput, AuthProvider } from "./auth-provider";

export type SecurityRuntimeEnvironment = "development" | "test" | "staging" | "production";

const unique = <T>(items: T[]): T[] => [...new Set(items)];

/**
 * @deprecated Use `@standard/auth` (Better Auth) instead.
 * This provider will be removed in v0.3.0.
 */
export class MockAuthProvider implements AuthProvider {
  constructor(private readonly environment: SecurityRuntimeEnvironment = "development") {}

  async authenticate(input: AuthenticateInput): Promise<AuthContext | null> {
    if (!input.actorId) return null;
    if (this.environment === "production") {
      throw new SecurityPolicyError("mock_auth_forbidden_in_production", "MockAuthProvider cannot be used in production.");
    }

    const roles = input.roles?.length ? input.roles : this.rolesFromHeader(input.authHeader);
    const permissions = unique([
      ...roles.flatMap((role) => DEFAULT_ROLE_PERMISSIONS[role] ?? []),
      ...(input.permissions ?? [])
    ]) as Permission[];

    return {
      actor_id: input.actorId,
      actor_type: roles.includes("system") ? "system" : "user",
      ...(input.tenantId ? { tenant_id: input.tenantId } : {}),
      organization_ids: input.organizationIds ?? [],
      roles,
      permissions,
      auth_method: "mock_dev",
      issued_at: new Date().toISOString(),
      trace_id: input.traceId
    };
  }

  private rolesFromHeader(authHeader?: string): Role[] {
    if (!authHeader?.startsWith("Bearer dev:")) return ["owner", "admin"] as any;
    const roleText = authHeader.slice("Bearer dev:".length);
    const roles = roleText.split(",").map((role) => role.trim()).filter(Boolean) as Role[];
    return roles.length > 0 ? roles : (["owner"] as any);
  }
}

