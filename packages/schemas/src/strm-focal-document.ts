/**
 * Focal-document helpers for the STRM bundle seeder.
 *
 * Extracted from seed-strm-bundle.ts so the keying and resolution rules can be
 * tested without a 40MB bundle and a seeded catalogue behind them.
 */

/**
 * The dedupe/upsert key, matching migration 0060's unique constraint:
 * (scf_control_id, fde_code, focal_document). fde_code is normalised the way
 * the seeder always normalised it; focal_document is a filename and is
 * compared as-is apart from case, because the filesystem gave it to us.
 */
export const strmDedupeKey = (
  controlId: string,
  fdeCode: string,
  focalDocument: string,
): string =>
  `${controlId}||${fdeCode.trim().toLowerCase()}||${focalDocument.trim().toLowerCase()}`;

/**
 * The Focal Document Identifier a bundle file is named for.
 *
 * Bundle files are `scf-strm-<FDI>.xlsx`, and `Authoritative Sources` gives
 * the same FDI as the framework's `framework_id`. Resolving on it replaces
 * matching on the focal document's display name, which could collide — an
 * identifier cannot, so the ambiguity this used to guard against cannot arise.
 */
export const fdiFromBundleFilename = (filename: string): string | null => {
  const base = filename.split(/[\\/]/).pop() ?? "";
  const m = base.toLowerCase().match(/^scf-strm-(.+)\.xlsx$/);
  const fdi = m?.[1]?.trim();
  if (!fdi) return null;
  return BUNDLE_FILENAME_FDI_CORRECTIONS[fdi] ?? fdi;
};

/**
 * Three bundle filenames whose FDI does not match the identifier the catalogue
 * publishes for the same focal document. Exhaustive and hand-verified: this is
 * a record of three vendor filename defects, not a matcher.
 *
 * That distinction is the whole point. A fuzzy or prefix-tolerant lookup is how
 * one framework's operators end up grading another's requirements, which is the
 * failure this branch exists to end — so nothing here generalises. Each entry
 * was confirmed against `scf_frameworks` to resolve to exactly one row, and an
 * FDI absent from this table is still resolved by exact match or not at all.
 *
 * Measured 2026-09-08: these three files carry 5,589 mappings, 8% of the
 * catalogue, which graded nothing while they went unresolved.
 *
 *   general-general-mitre-att_ck-16-1  the prefix is doubled, and `&` is not
 *                                      safe in a filename so it was written
 *                                      `_`; the catalogue has
 *                                      `general-mitre-att&ck-16-1`
 *   general-general-mpa-csbp-5-3-1     the prefix is doubled
 *   scf-dpmp-2025                      the `general-` prefix is missing
 *
 * If the vendor corrects a filename, its entry stops matching and resolution
 * falls through to the exact match, which then succeeds — so a fixed bundle
 * needs no change here. The seeder still reports anything unresolved.
 */
const BUNDLE_FILENAME_FDI_CORRECTIONS: Readonly<Record<string, string>> = {
  "general-general-mitre-att_ck-16-1": "general-mitre-att&ck-16-1",
  "general-general-mpa-csbp-5-3-1": "general-mpa-csbp-5-3-1",
  "scf-dpmp-2025": "general-scf-dpmp-2025",
};

/**
 * scf_mapping_id is a backward-compat convenience, not the join the backfill
 * uses. It used to be set to `list[0]` — an arbitrary pick among every mapping
 * sharing the control, which attaches one requirement's mapping to another
 * requirement's STRM row. One candidate or nothing.
 */
export const pickUnambiguousMappingId = (
  mappingIds: readonly string[] | undefined,
): string | null => (mappingIds?.length === 1 ? mappingIds[0]! : null);
