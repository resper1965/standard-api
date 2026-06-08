/** Common types for the Standard SDK */

export type RequestOptions = {
  /** Additional headers to send */
  headers?: Record<string, string>;
  /** Request signal for cancellation */
  signal?: AbortSignal;
  /** Idempotency key for write operations */
  idempotencyKey?: string;
  /** Override retry behaviour for this specific request */
  retry?: Partial<RetryConfig>;
};

export type RetryConfig = {
  /**
   * Maximum number of attempts (including the first).
   * Set to 1 to disable retry. Default: 3.
   */
  maxAttempts: number;
  /**
   * Initial delay in ms before the first retry. Default: 500.
   * Doubles on each attempt (exponential backoff) up to maxDelayMs.
   */
  initialDelayMs: number;
  /**
   * Maximum delay cap in ms. Default: 32000.
   */
  maxDelayMs: number;
  /**
   * HTTP status codes that trigger a retry.
   * Default: [429, 500, 502, 503, 504]
   */
  retryableStatuses: number[];
};

export type PaginatedResponse<T> = {
  data: T[];
  pagination?: {
    total: number;
    page: number;
    limit: number;
    has_more: boolean;
    next_cursor?: string;
  };
  has_more?: boolean;
  next_cursor?: string;
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
  cursor?: string;
};
