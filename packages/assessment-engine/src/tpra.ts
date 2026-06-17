import { AssessmentEngineError } from "./errors";

export interface TpraInheritanceContext {
  organizationId: string;
  assessmentId: string;
  vendorId: string;
  tpraAssessmentId: string;
  scfVersionId: string;
  actorId?: string;
  traceId: string;
  vendorControls: { scfControlId: string }[];
  tpraRiskScore: number;
  minimumAcceptableScore?: number;
}

export interface ControlEventPayload {
  organizationId: string;
  assessmentId: string;
  scfControlId: string;
  scfVersionId: string;
  eventType: string;
  previousValue: Record<string, unknown> | null;
  newValue: Record<string, unknown>;
  actorId?: string;
  traceId: string;
}

/**
 * Calculates and generates the ledger events for inheriting controls from an approved TPRA.
 * This function is pure and returns the events to be persisted by the caller.
 */
export const inheritVendorControls = (
  context: TpraInheritanceContext,
): ControlEventPayload[] => {
  const minScore = context.minimumAcceptableScore ?? 70.0;

  if (context.tpraRiskScore < minScore) {
    throw new AssessmentEngineError(
      "TPRA_SCORE_TOO_LOW",
      `Vendor risk score ${context.tpraRiskScore} is below minimum ${minScore} for inheritance.`,
      { vendorId: context.vendorId, score: context.tpraRiskScore },
    );
  }

  const events: ControlEventPayload[] = [];

  for (const vc of context.vendorControls) {
    events.push({
      organizationId: context.organizationId,
      assessmentId: context.assessmentId,
      scfControlId: vc.scfControlId,
      scfVersionId: context.scfVersionId,
      eventType: "third_party_inherited",
      previousValue: null, // Since ledger is append-only, the caller should compute previous if needed, or null
      newValue: {
        status: "implemented",
        weight: 1.0,
        source: "tpra_inheritance",
        vendorId: context.vendorId,
        tpraAssessmentId: context.tpraAssessmentId,
        inheritedScore: context.tpraRiskScore,
      },
      ...(context.actorId ? { actorId: context.actorId } : {}),
      traceId: context.traceId,
    });
  }

  return events;
};

