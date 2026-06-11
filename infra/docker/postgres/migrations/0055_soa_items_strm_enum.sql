-- Migration: 0055 — soa_items.relationship_type → strm_operator enum
-- Date: 2026-06-11
-- Author: Antigravity (Google DeepMind)
--
-- Co-Authored-By: Antigravity (Google DeepMind Advanced Agentic Coding)
--
-- Rationale:
--   soa_items.relationship_type is currently TEXT (free-form), while
--   scf_mappings and scf_strm_relationships already use the canonical
--   strm_operator pgEnum (ADR-001). This migration normalizes existing
--   values and converts the column to use the same enum for consistency.
--
-- Risk: Low. soa_items.relationship_type is NULLABLE and many rows
--   may have NULL values (set from mapping data when available).
--   The USING cast only applies to non-NULL values.
--
-- Rollback: See 0055_soa_items_strm_enum.down.sql

BEGIN;

-- Step 1: Normalize legacy values in-place (before type change)
UPDATE soa_items SET relationship_type = CASE relationship_type
  WHEN 'direct' THEN 'equal'
  WHEN 'related' THEN 'intersects'
  WHEN 'intersecting' THEN 'intersects'
  WHEN 'no_relationship' THEN 'no_relation'
  WHEN 'source_defined' THEN 'intersects'
  ELSE relationship_type
END
WHERE relationship_type IS NOT NULL
  AND relationship_type NOT IN ('equal', 'subset', 'intersects', 'superset', 'no_relation');

-- Step 2: Convert column from TEXT to strm_operator enum
-- The strm_operator enum already exists (created in migration 0047/0051).
ALTER TABLE soa_items
  ALTER COLUMN relationship_type TYPE strm_operator
  USING relationship_type::strm_operator;

COMMIT;

-- Verification:
-- SELECT DISTINCT relationship_type FROM soa_items WHERE relationship_type IS NOT NULL;
-- Expected: only equal, subset, intersects, superset, no_relation (or empty if all NULL)
