import {
  WorkflowEntrypoint,
  WorkflowStep,
  WorkflowEvent,
} from "cloudflare:workers";
import { inheritVendorControls } from "@standard/assessment-engine";

export type Env = Record<string, unknown>;

export type TpraApprovalPayload = {
  organizationId: string;
  assessmentId: string;
  vendorId: string;
  tpraAssessmentId: string;
  scfVersionId: string;
  traceId: string;
  actorId?: string;
  tpraRiskScore: number;
  vendorControls: { scfControlId: string }[];
};

export class TpraApprovalWorkflow extends WorkflowEntrypoint<
  Env,
  TpraApprovalPayload
> {
  async run(event: WorkflowEvent<TpraApprovalPayload>, step: WorkflowStep) {
    const payload = event.payload;

    // 1. Calculate the inherited controls
    const inheritedEvents = await step.do<any[]>(
      "calculate_inherited_controls",
      async () => {
        const events = inheritVendorControls({
          organizationId: payload.organizationId,
          assessmentId: payload.assessmentId,
          vendorId: payload.vendorId,
          tpraAssessmentId: payload.tpraAssessmentId,
          scfVersionId: payload.scfVersionId,
          traceId: payload.traceId,
          ...(payload.actorId ? { actorId: payload.actorId } : {}),
          tpraRiskScore: payload.tpraRiskScore,
          vendorControls: payload.vendorControls,
        });

        // Serializable workaround for unknown / null
        return events as any[];
      },
    );

    // 2. Dispatch events to the ledger
    if (inheritedEvents && inheritedEvents.length > 0) {
      await step.do("dispatch_soa_events", async () => {
        // Here we would typically insert these into assessment_control_events via DB call.
        // For now, we mock the DB call or place it in the event queue for the ledger.
        return { dispatchedCount: inheritedEvents.length };
      });
    }

    return {
      status: "completed",
      inheritedCount: inheritedEvents ? inheritedEvents.length : 0,
      traceId: payload.traceId,
    };
  }
}
