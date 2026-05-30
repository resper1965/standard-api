import type { AccessDecision, Permission, PolicyInput } from "@standard/schemas";

/**
 * @deprecated Use `@standard/auth` permissions (Standard Native Auth Access Control) instead.
 * This engine will be removed in v0.3.0.
 */
export class PolicyEngine {
  authorize(input: PolicyInput): AccessDecision {
    if (!input.auth) {
      return this.deny("missing_auth_context", input.required_permissions, [], input.trace_id);
    }
    if (!input.tenant && input.required_permissions.some((permission) => !permission.startsWith("scf:"))) {
      return this.deny("missing_tenant_context", input.required_permissions, input.auth.permissions, input.trace_id);
    }
    if (input.auth.tenant_id && input.tenant && input.auth.tenant_id !== input.tenant.tenant_id) {
      return this.deny("tenant_mismatch", input.required_permissions, input.auth.permissions, input.trace_id);
    }

    const granted = new Set(input.auth.permissions);
    const allowed = input.required_permissions.every((permission) => granted.has(permission));
    if (!allowed) {
      return this.deny("permission_missing", input.required_permissions, input.auth.permissions, input.trace_id);
    }

    return {
      allowed: true,
      required_permissions: input.required_permissions,
      granted_permissions: input.auth.permissions,
      trace_id: input.trace_id
    };
  }

  private deny(reason: AccessDecision["reason"], required: Permission[], granted: Permission[], traceId: string): AccessDecision {
    return {
      allowed: false,
      reason,
      required_permissions: required,
      granted_permissions: granted,
      trace_id: traceId
    };
  }
}

