-- Down migration: 0055 — Revert soa_items.relationship_type to TEXT
-- Date: 2026-06-11
-- Author: Antigravity (Google DeepMind)

BEGIN;

ALTER TABLE soa_items
  ALTER COLUMN relationship_type TYPE TEXT
  USING relationship_type::TEXT;

COMMIT;
