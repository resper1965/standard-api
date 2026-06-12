import {
  WorkflowEntrypoint,
  WorkflowStep,
  WorkflowEvent,
} from "cloudflare:workers";
import { inheritVendorControls } from "@standard/assessment-engine";
import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import { assessmentControlEvents } from "@standard/schemas";

if (typeof WebSocket !== "undefined") {
  neonConfig.webSocketConstructor = WebSocket;
}

export type Env = {
  DATABASE_URL: string;
};

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
        const pool = new Pool({ connectionString: this.env.DATABASE_URL });
        const db = drizzle({ client: pool });

        await db.insert(assessmentControlEvents).values(inheritedEvents);

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
