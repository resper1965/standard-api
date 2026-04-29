import type { AccessDeniedReason } from "@aegis/schemas";

export class SecurityPolicyError extends Error {
  constructor(
    readonly reason: AccessDeniedReason,
    message: string,
    readonly details: Record<string, unknown> = {}
  ) {
    super(`${reason}: ${message}`);
  }
}
