/**
 * Escapes SQL LIKE special characters to prevent pattern-based DoS.
 * Must be applied BEFORE wrapping the input with % wildcards.
 *
 * Characters escaped:
 * - `%` → `\\%`  (single-char wildcard)
 * - `_` → `\\_`  (any-char wildcard)
 * - `\\` → `\\\\` (escape char itself)
 *
 * @example
 * sanitizeLikeInput("test%_admin") // => "test\\%\\_admin"
 */
export const sanitizeLikeInput = (input: string): string =>
  input.replace(/[%_\\]/g, (char) => `\\${char}`);
