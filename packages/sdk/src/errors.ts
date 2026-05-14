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

  constructor(status: number, body: StandardErrorResponse) {
    super(body.error.message);
    this.name = "StandardError";
    this.code = body.error.code;
    this.status = status;
    this.details = body.error.details ?? [];
    this.traceId = body.error.trace_id;
  }
}
