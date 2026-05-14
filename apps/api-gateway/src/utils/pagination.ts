/**
 * @module pagination
 * @description Dual-mode pagination utility (offset + cursor-based).
 *
 * Supports both traditional offset pagination and cursor-based pagination
 * for large collections (SoA items, Gap findings, POA&M items).
 *
 * Usage:
 *   const page = parsePagination(request);
 *   const result = applyPagination(allItems, page);
 *   return json({ data: result.data, pagination: result.pagination, trace_id });
 */

export type PaginationParams = {
  limit: number;
  offset: number;
  cursor: string | undefined;
  mode: "offset" | "cursor";
};

export type PaginationResult<T> = {
  data: T[];
  pagination: {
    limit: number;
    offset: number;
    total: number;
    cursor_next?: string | null;
    cursor_prev?: string | null;
    has_more: boolean;
  };
};

/**
 * Parse pagination parameters from URL search params.
 * Auto-detects mode: if `cursor` param is present, uses cursor mode.
 */
export const parsePagination = (request: Request, defaults?: { limit?: number }): PaginationParams => {
  const url = new URL(request.url);
  const limit = Math.min(Math.max(Number(url.searchParams.get("limit") ?? defaults?.limit ?? 50), 1), 200);
  const offset = Math.max(Number(url.searchParams.get("offset") ?? "0"), 0);
  const cursor = url.searchParams.get("cursor") ?? undefined;

  return {
    limit,
    offset,
    cursor,
    mode: cursor ? "cursor" : "offset",
  };
};

/**
 * Apply pagination to an array of items.
 *
 * - **Offset mode**: Standard slice(offset, offset + limit)
 * - **Cursor mode**: Find cursor position, return next `limit` items
 *
 * Items must have an `id` field (or any unique key) for cursor navigation.
 */
export const applyPagination = <T extends { [key: string]: unknown }>(
  items: T[],
  params: PaginationParams,
  cursorKey: string = "id"
): PaginationResult<T> => {
  const total = items.length;

  if (params.mode === "cursor" && params.cursor) {
    // Find the cursor position
    const cursorIndex = items.findIndex(item => String(item[cursorKey]) === params.cursor);
    const startIndex = cursorIndex === -1 ? 0 : cursorIndex + 1;
    const data = items.slice(startIndex, startIndex + params.limit);
    const hasMore = startIndex + params.limit < total;

    return {
      data,
      pagination: {
        limit: params.limit,
        offset: startIndex,
        total,
        cursor_next: hasMore && data.length > 0 ? String(data[data.length - 1]![cursorKey]) : null,
        cursor_prev: startIndex > 0 && data.length > 0 ? String(data[0]![cursorKey]) : null,
        has_more: hasMore,
      },
    };
  }

  // Offset mode (backward compatible)
  const data = items.slice(params.offset, params.offset + params.limit);
  const hasMore = params.offset + params.limit < total;

  return {
    data,
    pagination: {
      limit: params.limit,
      offset: params.offset,
      total,
      has_more: hasMore,
      ...(data.length > 0 ? { cursor_next: hasMore ? String(data[data.length - 1]![cursorKey]) : null } : {}),
    },
  };
};
