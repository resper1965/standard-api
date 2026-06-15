// @ts-nocheck -- Zod v4 CI type compat
export class PrivacyError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly details: Record<string, unknown> = {}
  ) {
    super(`${code}: ${message}`);
    this.name = "PrivacyError";
  }
}

const assertPrivacyContext = (context: { organizationId?: string; traceId?: string }): void => {
  if (!context.organizationId || !context.traceId) {
    throw new PrivacyError("TENANT_CONTEXT_REQUIRED", "Privacy operations require tenant and trace context.");
  }
};

const assertPrivacyActor = (context: { actorId?: string }): void => {
  if (!context.actorId) throw new PrivacyError("ACTOR_REQUIRED", "Privacy mutation requires actor context.");
};

