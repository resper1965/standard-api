// @ts-nocheck -- Zod v4 CI type compat
/**
 * @module approval-event-create
 * @description Reserved human approval tool.
 * Functional agents CANNOT use this tool directly â€” it always rejects agent calls.
 * Real approval flows go through the workflow signal endpoint with human actor validation.
 */

export type ApprovalEventCreateOutput = {
  error: string;
  message: string;
  gate: string;
};

export function createApprovalEventCreateTool() {
  return {
    execute: async (args: Record<string, unknown>): Promise<ApprovalEventCreateOutput> => {
      // This tool is RESERVED for human actors â€” agents cannot approve
      return {
        error: "AGENT_CANNOT_APPROVE",
        message:
          "Approval events must be created by human actors, not functional agents. " +
          "Use the workflow signal endpoint with a validated human actor identity.",
        gate: String(args.gate ?? ""),
      };
    },
  };
}

