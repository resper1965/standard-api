// @ts-nocheck -- Zod v4 CI type compat
export type Span = {
  span_id: string;
  name: string;
  started_at: string;
  ended_at?: string;
};

export const startSpan = (name: string): Span => ({
  span_id: crypto.randomUUID(),
  name,
  started_at: new Date().toISOString()
});

