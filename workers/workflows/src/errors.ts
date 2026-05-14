import type { WorkflowSafeErrorCode } from "./types";

export class WorkflowOrchestrationError extends Error {
  constructor(
    readonly code: WorkflowSafeErrorCode,
    message: string,
    readonly details: Record<string, unknown> = {}
  ) {
    super(`${code}: ${message}`);
  }
}
