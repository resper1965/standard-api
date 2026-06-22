/**
 * @module @standard/contracts — API Response Contracts
 * Standardised response wrappers used by all API endpoints.
 * All responses follow the envelope pattern with traceability fields.
 */

// ── Single Resource Response ──────────────────────────────────────────────────

/**
 * Envelope for a single resource response.
 * Every API endpoint that returns a single entity should use this shape.
 */
export type ApiResponse<T> = {
  data: T;
  trace_id: string;
};

// ── Paginated List Response ──────────────────────────────────────────────────

/** Pagination metadata returned in list endpoints. */
export type PaginationMeta = {
  /** Total number of items matching the query (across all pages). */
  total: number;
  /** Maximum items per page. */
  limit: number;
  /** Opaque cursor for the next page; `null` when there is no next page. */
  next_cursor: string | null;
  /** Indicates whether more pages exist. */
  has_more: boolean;
};

/**
 * Envelope for paginated list responses.
 * All list endpoints should return this shape.
 */
export type ApiListResponse<T> = {
  data: T[];
  pagination: PaginationMeta;
  trace_id: string;
};

// ── Async Job Response ──────────────────────────────────────────────────────

/**
 * Envelope for 202 Accepted (async job queued) responses.
 * Used by batch endpoints and async MCP tool dispatch (ADR-003).
 */
export type ApiAsyncResponse = {
  status: "queued" | "processing";
  job_id: string;
  trace_id: string;
  /** Optional: estimated time to completion in seconds. */
  estimated_seconds?: number;
};
