import type { ApiErrorCode } from "./error-codes";

export class ApiError extends Error {
  readonly code: ApiErrorCode;
  readonly status: number;
  readonly details: unknown[];

  constructor(code: ApiErrorCode, message: string, status: number, details: unknown[] = []) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

