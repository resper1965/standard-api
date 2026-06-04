export class PoamWorkflowError extends Error {
  constructor(public readonly code: string, message: string, public readonly details: Record<string, unknown> = {}) {
    super(`${code}: ${message}`);
  }
}

export const assertContext = (context: { organizationId?: string; assessmentId?: string; traceId?: string }): void => {
  if (!context.organizationId || !context.assessmentId || !context.traceId) {
    throw new PoamWorkflowError("POAM_CONTEXT_REQUIRED", "POA&M workflow requires tenant, organization, assessment and trace context.");
  }
};

export const assertActor = (context: { actorId?: string }): void => {
  if (!context.actorId) throw new PoamWorkflowError("POAM_ACTOR_REQUIRED", "POA&M workflow requires actor context.");
};
