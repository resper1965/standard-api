import type { AccessDecision } from "@standard/schemas";

export const isAllowed = (decision: AccessDecision): boolean => decision.allowed;

