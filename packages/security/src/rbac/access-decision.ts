import type { AccessDecision } from "@aegis/schemas";

export const isAllowed = (decision: AccessDecision): boolean => decision.allowed;
