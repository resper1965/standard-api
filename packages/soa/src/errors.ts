export class SoaWorkflowError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly details: Record<string, unknown> = {}
  ) {
    super(`${code}: ${message}`);
    this.name = "SoaWorkflowError";
  }
}

export const assertContext = (context: { tenantId?: string; organizationId?: string; assessmentId?: string; traceId?: string }): void => {
  if (!context.tenantId || !context.organizationId || !context.assessmentId || !context.traceId) {
    throw new SoaWorkflowError("TENANT_CONTEXT_REQUIRED", "SoA workflow requires tenant, organization, assessment and trace context.");
  }
};

export const assertActor = (context: { actorId?: string }): void => {
  if (!context.actorId) throw new SoaWorkflowError("ACTOR_REQUIRED", "SoA workflow mutation requires actor context.");
};
