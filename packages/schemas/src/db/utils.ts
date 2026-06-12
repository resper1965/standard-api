import { getTableColumns } from "drizzle-orm";
import type { AnyPgTable } from "drizzle-orm/pg-core";

/**
 * Generates a selection object for Drizzle ORM based on a requested list of fields.
 * If the fields parameter is empty or contains no valid fields, it returns all columns.
 *
 * @param table The Drizzle table instance.
 * @param fieldsParam Comma-separated list of field names requested by the client.
 * @returns An object mapping aliases to Drizzle column references, suitable for `db.select(fields)`.
 */
export function getSparseSelect<TTable extends AnyPgTable>(
  table: TTable,
  fieldsParam?: string,
) {
  const allColumns = getTableColumns(table);
  if (!fieldsParam) return allColumns;

  const requested = fieldsParam.split(",").map((s) => s.trim());
  const selected: Record<string, any> = {};

  let hasMatch = false;
  for (const key of requested) {
    if (key in allColumns) {
      selected[key] = allColumns[key as keyof typeof allColumns];
      hasMatch = true;
    }
  }

  // If user passed invalid fields, fallback to all columns to prevent empty selects
  return hasMatch ? selected : allColumns;
}
