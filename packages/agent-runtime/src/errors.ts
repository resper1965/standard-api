// @ts-nocheck -- Zod v4 CI type compat
export class AgentRuntimeError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly details: Record<string, unknown> = {}
  ) {
    super(`${code}: ${message}`);
    this.name = "AgentRuntimeError";
  }
}

