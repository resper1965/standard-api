export class GapAnalysisWorkflowError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly details: Record<string, unknown> = {}
  ) {
    super(`${code}: ${message}`);
    this.name = "GapAnalysisWorkflowError";
  }
}

export const assertContext = (context: { tenantId?: string; organizationId?: string; assessmentId?: string; traceId?: string }): void => {
  if (!context.tenantId || !context.organizationId || !context.assessmentId || !context.traceId) {
    throw new GapAnalysisWorkflowError("TENANT_CONTEXT_REQUIRED", "Evidence and Gap Analysis require tenant, organization, assessment and trace context.");
  }
};

export const assertActor = (context: { actorId?: string }): void => {
  if (!context.actorId) throw new GapAnalysisWorkflowError("ACTOR_REQUIRED", "Gap Analysis mutation requires actor context.");
};
