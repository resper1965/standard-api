import type { AccessDecision, ToolUsePolicy } from "@aegis/schemas";

export class ToolUsePolicyService {
  canUseTool(policy: ToolUsePolicy, toolName: string): AccessDecision {
    const denied = policy.denied_tools.includes(toolName) ||
      !policy.allowed_tools.includes(toolName) ||
      (toolName.includes("external") && !policy.external_calls_allowed) ||
      (toolName.includes("approval") && !policy.approval_tools_allowed);

    return {
      allowed: !denied,
      reason: denied ? "permission_missing" : undefined,
      required_permissions: [],
      granted_permissions: [],
      trace_id: "tool-policy"
    };
  }
}
