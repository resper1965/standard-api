/** Common types for the Standard SDK */

export type RequestOptions = {
  /** Additional headers to send */
  headers?: Record<string, string>;
  /** Request signal for cancellation */
  signal?: AbortSignal;
  /** Idempotency key for write operations */
  idempotencyKey?: string;
};

export type PaginatedResponse<T> = {
  data: T[];
  pagination?: {
    total: number;
    page: number;
    limit: number;
    has_more: boolean;
  };
  trace_id?: string;
};

export type StandardResponse<T> = {
  data: T;
  trace_id?: string;
};

export type ListQuery = {
  limit?: number;
  offset?: number;
  page?: number;
};
