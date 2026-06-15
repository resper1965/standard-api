import type {
  AccessDecision,
  Permission,
  PolicyInput,
} from "@standard/schemas";

/**
 * @deprecated Use `@standard/auth` permissions (Standard Native Auth Access Control) instead.
 * This engine will be removed in v0.3.0.
 */
export class PolicyEngine {
  authorize(input: PolicyInput): AccessDecision {
    const rawInput = input as any;
    const auth = rawInput.auth;
    const tenant = rawInput.tenant;
    const required_permissions = (rawInput.required_permissions || []) as any[];
    const trace_id = rawInput.trace_id as string;

    if (!auth) {
      return this.deny(
        "missing_auth_context",
        required_permissions,
        [],
        trace_id,
      );
    }
    if (
      !tenant &&
      required_permissions.some(
        (permission: any) => !permission.startsWith("scf:"),
      )
    ) {
      return this.deny(
        "missing_tenant_context",
        required_permissions,
        auth.permissions,
        trace_id,
      );
    }
    if (
      auth.organization_id &&
      tenant &&
      auth.organization_id !== tenant.organization_id
    ) {
      return this.deny(
        "tenant_mismatch",
        required_permissions,
        auth.permissions,
        trace_id,
      );
    }

    const granted = new Set(auth.permissions as string[]);
    const allowed = required_permissions.every((permission: any) =>
      granted.has(permission),
    );
    if (!allowed) {
      return this.deny(
        "permission_missing",
        required_permissions,
        auth.permissions,
        trace_id,
      );
    }

    return {
      allowed: true,
      required_permissions,
      granted_permissions: auth.permissions,
      trace_id,
    } as any;
  }

  private deny(
    reason: AccessDecision["reason"],
    required: Permission[],
    granted: Permission[],
    traceId: string,
  ): AccessDecision {
    return {
      allowed: false,
      reason,
      required_permissions: required,
      granted_permissions: granted,
      trace_id: traceId,
    };
  }
}
