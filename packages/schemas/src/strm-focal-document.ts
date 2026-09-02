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
  return fdi ? fdi : null;
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
