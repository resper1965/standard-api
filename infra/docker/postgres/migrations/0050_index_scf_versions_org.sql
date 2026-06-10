-- Migration: 0050 — Index on scf_versions.organization_id
-- Date: 2026-06-10
--
-- Rationale (postgresql skill — index all FK columns):
--   scf_versions.organization_id was added in migration 0031 as a nullable
--   column with no index. All FK-like columns must be indexed.
--
-- Semantics:
--   NULL  = global SCF version (visible to all orgs)
--   value = private org-scoped version (visible to that org only)
--
-- CONCURRENTLY: allows index creation without locking the table.
--   Safe in Neon DB with no active production load.
--   If running during migration (with pnpm db:migrate), remove CONCURRENTLY.

CREATE INDEX CONCURRENTLY IF NOT EXISTS "scf_versions_org_idx"
  ON "scf_versions" ("organization_id");
