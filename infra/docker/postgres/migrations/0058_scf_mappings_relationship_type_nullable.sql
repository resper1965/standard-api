-- Migration: 0058 — scf_mappings.relationship_type becomes nullable
-- Date: 2026-08-28
--
-- Rationale:
--   The column was NOT NULL, and the XLSX crosswalk importer satisfied that
--   constraint by hardcoding 'intersects' on every row it produced:
--
--     // ADR-001: canonical STRM operator — crosswalk rows default to intersects
--     relationship_type: "intersects",
--
--   The result, measured by a customer walking the full crosswalk: 79.127 of
--   79.133 mappings are 'intersects', and the six that are not sit in a
--   synthetic fixture framework and one consultative row. The column carried
--   no information while looking as though it did.
--
--   A NOT NULL column with a default is how a gap becomes a claim. Absence
--   must be representable, so that a mapping whose STRM operator the source
--   does not state reads as unknown rather than as partial overlap.
--
--   ADR-001's weights are unaffected: a null relationship_type contributes
--   nothing to the compliance index, the same as it does today for a mapping
--   the calculator never sees.
--
-- Reversibility:
--   Reversible only by choosing a value for every null, which is the
--   fabrication this migration exists to end. Down is deliberately absent.

ALTER TABLE scf_mappings
  ALTER COLUMN relationship_type DROP NOT NULL;

COMMENT ON COLUMN scf_mappings.relationship_type IS
  'Canonical STRM operator (ADR-001), read requirement-relative: subset = the requirement fits inside the control. NULL means the source does not state one — never a default.';
