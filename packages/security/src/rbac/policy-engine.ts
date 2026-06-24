import type {
  AccessDecision,
  Permission,
  PolicyInput,
} from "@standard/schemas";

/**
 * @deprecated Removed in auth simplification.
 * Permission checks are now handled declaratively by the RBAC middleware pipeline
 * in apps/api-gateway (assertRbac + gatherActorPermissions).
 *
 * This class is kept as a stub to prevent import breaks.
 * Will be removed entirely in a follow-up.
 */
export class PolicyEngine {
  authorize(input: PolicyInput): AccessDecision {
    console.warn(
      "[DEPRECATED] PolicyEngine is deprecated. Use assertRbac middleware instead.",
    );
    return {
      allowed: false,
      reason: "policy_not_configured",
      required_permissions: input.required_permissions ?? [],
      granted_permissions: [],
      trace_id: input.trace_id ?? "",
    };
  }
}
