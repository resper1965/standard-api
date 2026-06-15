// @ts-nocheck -- Zod v4 CI type compat
export class ReportingWorkflowError extends Error {
  constructor(public readonly code: string, message: string, public readonly details: Record<string, unknown> = {}) {
    super(`${code}: ${message}`);
  }
}

export const assertContext = (context: { organizationId?: string; assessmentId?: string; traceId?: string }): void => {
  if (!context.organizationId || !context.assessmentId || !context.traceId) {
    throw new ReportingWorkflowError("REPORT_CONTEXT_REQUIRED", "Reporting workflow requires tenant, organization, assessment and trace context.");
  }
};

export const assertActor = (context: { actorId?: string }): void => {
  if (!context.actorId) throw new ReportingWorkflowError("REPORT_ACTOR_REQUIRED", "Reporting workflow requires actor context.");
};

