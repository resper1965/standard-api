/**
 * @module @standard/contracts — Pagination Contracts
 * Shared pagination parameter types for API request handling.
 */

/**
 * Standard pagination parameters accepted by all list endpoints.
 * Mirrors PaginationParamsSchema from @standard/schemas but as a plain type
 * for use without Zod dependency.
 */
export type PaginationParams = {
  /** Maximum items per page (1–100, default 25). */
  limit?: number;
  /** Opaque cursor for keyset pagination. */
  cursor?: string;
  /** Comma-separated list of fields to return (sparse fieldset). */
  fields?: string;
};

/**
 * Sort direction enum for list queries.
 */
export type SortDirection = "asc" | "desc";

/**
 * Generic sort parameter for list endpoints.
 */
export type SortParam<TField extends string = string> = {
  field: TField;
  direction: SortDirection;
};
