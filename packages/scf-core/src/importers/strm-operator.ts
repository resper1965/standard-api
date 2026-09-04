/**
 * Canonicalisation of STRM operators (ADR-001).
 *
 * Read requirement-relative: `requirement <operator> control`. `subset` means
 * the requirement fits inside the control.
 *
 * An operator this function does not recognise returns null. It is deliberately
 * not coerced to `intersects`: `intersects` asserts that two scopes overlap,
 * which is a claim about the source material, and a value we failed to parse
 * makes no such claim. Coercing it is how 79.127 of 79.133 crosswalk rows came
 * to carry an operator nobody recorded.
 */
export type StrmOperator =
  | "equal"
  | "subset"
  | "intersects"
  | "superset"
  | "no_relation";

const CANONICAL: ReadonlySet<string> = new Set([
  "equal",
  "subset",
  "intersects",
  "superset",
  "no_relation",
]);

/** Aliases the STRM bundle has used across editions. */
const ALIASES: Readonly<Record<string, StrmOperator>> = {
  direct: "equal",
  related: "intersects",
  intersecting: "intersects",
  no_relationship: "no_relation",
};

export const toCanonicalOperator = (
  raw: string | null | undefined,
): StrmOperator | null => {
  if (typeof raw !== "string") return null;
  const key = raw.trim().toLowerCase();
  if (key === "") return null;
  if (CANONICAL.has(key)) return key as StrmOperator;
  return ALIASES[key] ?? null;
};
