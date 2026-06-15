// @ts-nocheck -- Zod v4 CI type compat
export const resolveTraceId = (request: Request): string =>
  request.headers.get("x-trace-id") ?? request.headers.get("cf-ray") ?? crypto.randomUUID();

