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
 * Builds the name → id lookup the seeder resolves focal documents against.
 *
 * `scf_frameworks` is unique on (scf_version_id, framework_id), not on name:
 * a database holding more than one SCF version has one row per version named
 * e.g. "ISO 27001:2022", and they all normalise to the same key. A plain
 * `Map.set` keeps whichever row was read last, so a focal document resolves
 * to whichever version happened to sort last — silently, and it still counts
 * as "resolved" in the seeder's summary.
 *
 * On a collision this removes the key entirely rather than picking a winner,
 * so the name resolves to nothing. The collided key is also returned so the
 * caller can report "this name is ambiguous in the catalogue" (had >1 row)
 * distinctly from "this name is absent from the catalogue" (had none).
 */
export const buildFrameworkByName = (
  rows: readonly { id: string; name: string }[],
): { byName: Map<string, string>; collidedKeys: Set<string> } => {
  const byName = new Map<string, string>();
  const collidedKeys = new Set<string>();

  for (const row of rows) {
    const key = normaliseFrameworkKey(row.name);
    if (!key) continue;
    if (collidedKeys.has(key)) continue;
    if (byName.has(key)) {
      byName.delete(key);
      collidedKeys.add(key);
    } else {
      byName.set(key, row.id);
    }
  }

  return { byName, collidedKeys };
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
