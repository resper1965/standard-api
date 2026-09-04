-- Migration: 0060 — scf_strm_relationships is keyed by focal document
-- Date: 2026-08-29
--
-- Rationale:
--   The unique key was (scf_control_id, fde_code). An FDE code is a requirement
--   code inside ONE focal document and is namespaced by nothing else: "1.1.1"
--   is a real code in CIS, in PCI DSS and in several more. Two frameworks
--   mapping their own "1.1.1" to the same SCF control therefore collided on one
--   row, and whichever of the 183 bundle files was parsed last decided the
--   operator that BOTH frameworks were then graded with.
--
--   focal_document records which bundle file the row came from — the filename,
--   which is unique per framework by construction. The sheet name is not used:
--   Excel caps it at 31 characters, so it can collide, and a key that can
--   collide is the defect being fixed.
--
--   scf_framework_id is the framework that focal document resolves to. It is
--   nullable on purpose: resolution is exact-match only and will not cover
--   every file. An unresolved row grades nothing, which loses coverage and
--   misattributes nothing. A fuzzy match would do the reverse.
--
--   NULLS NOT DISTINCT keeps pre-existing rows — which have no focal document —
--   behaving exactly as they did under the old two-column key, instead of
--   letting them multiply once the third column is nullable.
--
-- Reversibility:
--   Reversible only by choosing which framework's operator to discard for every
--   collided pair, which is the fabrication this migration exists to end.
--   Down is deliberately absent.

ALTER TABLE scf_strm_relationships
  ADD COLUMN focal_document  text,
  ADD COLUMN scf_framework_id uuid REFERENCES scf_frameworks(id);

--> statement-breakpoint

DROP INDEX IF EXISTS scf_strm_control_fde_uidx;

--> statement-breakpoint

ALTER TABLE scf_strm_relationships
  ADD CONSTRAINT scf_strm_control_fde_focal_uidx
  UNIQUE NULLS NOT DISTINCT (scf_control_id, fde_code, focal_document);

--> statement-breakpoint

CREATE INDEX IF NOT EXISTS scf_strm_framework_idx
  ON scf_strm_relationships (scf_framework_id);

--> statement-breakpoint

COMMENT ON COLUMN scf_strm_relationships.focal_document IS
  'Bundle file this row was parsed from — one file per framework. Part of the unique key: an FDE code is only unique within its focal document. NULL means the row predates the STRM bundle seeder.';

COMMENT ON COLUMN scf_strm_relationships.scf_framework_id IS
  'Framework the focal document resolved to, exact-match only. NULL means unresolved; an unresolved row grades no mapping. Never guessed.';
