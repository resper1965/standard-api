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

/** Collapses case and whitespace runs so "ISO  27001" and "iso 27001" agree. */
export const normaliseFrameworkKey = (raw: string): string =>
  raw.trim().toLowerCase().replace(/\s+/g, " ");

/**
 * Exact match only. A focal document that does not name a framework we hold
 * resolves to null, and a null-framework row grades no mapping.
 *
 * ⛔ Do not add prefix, substring or edit-distance matching here. "NIST SP
 * 800-53" is a prefix of "NIST SP 800-53 R5" and of "NIST SP 800-53 R4"; a
 * matcher that picks one is guessing which framework a customer is graded
 * against, which is the failure migration 0060 exists to end.
 */
export const resolveFrameworkId = (
  frameworkName: string,
  byName: Map<string, string>,
): string | null => {
  const key = normaliseFrameworkKey(frameworkName);
  if (!key) return null;
  return byName.get(key) ?? null;
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
