-- Migration: 0059 — scf_strm_relationships.relationship_type becomes nullable
-- Date: 2026-08-28
--
-- Rationale:
--   Mirrors 0058, one table upstream. The STRM bundle seeder mapped any
--   operator it did not recognise onto 'intersects' under a comment calling it
--   a "safe fallback". It is not safe: 'intersects' asserts that two scopes
--   overlap, so an unparsed value became a claim about the source material.
--
--   The seeder now records NULL for an operator it cannot canonicalise. That
--   keeps the bundle entry — the pair exists, someone recorded a relationship —
--   while stating plainly that we could not read which relationship it is.
--   Dropping the row instead would lose both facts.
--
--   Consistent with 0058: absence is representable, and a NULL operator
--   contributes nothing to the compliance index.
--
-- Reversibility:
--   Reversible only by choosing a value for every null, which is the
--   fabrication this migration exists to end. Down is deliberately absent.

ALTER TABLE scf_strm_relationships
  ALTER COLUMN relationship_type DROP NOT NULL;

COMMENT ON COLUMN scf_strm_relationships.relationship_type IS
  'Canonical STRM operator (ADR-001), read requirement-relative. NULL means the bundle stated an operator we could not canonicalise — never a default.';
