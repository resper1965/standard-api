import { AssessmentLifecycleWorkflowInputSchema, type AssessmentLifecycleWorkflowState } from "@aegis/schemas";
import { WorkflowEntrypoint, WorkflowEvent, WorkflowStep } from "cloudflare:workers";

export type WorkflowCheckpoint = {
  assessment_id: string;
  state: AssessmentLifecycleWorkflowState;
};

export class AssessmentLifecycleWorkflow extends WorkflowEntrypoint<Env, unknown> {
  async run(event: WorkflowEvent<unknown>, step: WorkflowStep): Promise<WorkflowCheckpoint> {
    const input = AssessmentLifecycleWorkflowInputSchema.parse(event.payload);

    const checkpoint = await step.do("validate-assessment-lifecycle-input", async () => {
      const timestamp = new Date().toISOString();
      return {
        assessment_id: input.assessment_id,
        state: {
          tenant_id: input.tenant_id,
          organization_id: input.organization_id,
          assessment_id: input.assessment_id,
          current_step: "validate_assessment",
          assessment_state: "draft",
          trace_id: input.trace_id,
          started_at: timestamp,
          updated_at: timestamp
        } satisfies AssessmentLifecycleWorkflowState
      };
    });

    return checkpoint;
  }
}

export interface Env {}

export default {
  async fetch(): Promise<Response> {
    return Response.json({
      service: "aegis-assessment-lifecycle",
      message: "Workflow Worker reservado para orquestracao duravel."
    });
  }
};
