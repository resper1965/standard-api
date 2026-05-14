import type { AccessDeniedReason } from "@standard/schemas";

export class SecurityPolicyError extends Error {
  constructor(
    readonly reason: AccessDeniedReason,
    message: string,
    readonly details: Record<string, unknown> = {}
  ) {
    super(`${reason}: ${message}`);
  }
}

