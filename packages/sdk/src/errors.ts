/** Standard API error class */

export type StandardErrorResponse = {
  error: {
    code: string;
    message: string;
    details?: unknown[];
    trace_id?: string;
  };
};

export class StandardError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details: unknown[];
  readonly traceId: string | undefined;

  constructor(status: number, body: any) {
    const errorObj = body?.error || {};
    const message =
      errorObj.message || body?.detail || body?.message || "Unknown error";
    super(message);
    this.name = "StandardError";
    this.code = errorObj.code || body?.code || "UNKNOWN";
    this.status = status;
    this.details = errorObj.details ?? [];
    this.traceId = errorObj.trace_id || body?.trace_id;
  }
}
