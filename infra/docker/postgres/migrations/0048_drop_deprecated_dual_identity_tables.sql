-- Migration: 0048 — Drop deprecated dual-identity and BA tables from product branch
-- Auth simplification A7 (2026-06-10)
--
-- Rationale:
--   - users, memberships, roles → replaced by 1:1 model (baUser.id IS the domain identity)
--   - user, account, session, verification → Better Auth internal tables moved to auth branch
--     (Neon branch: br-soft-moon-anumk15h, accessed via HYPERDRIVE_AUTH)
--
-- Executed directly on Neon product branch (main) via MCP transaction.
-- This file registers the drop in Drizzle migration history for consistency.
--
-- WARNING: These tables cannot be restored from this migration.
-- Recovery requires restoring from Neon branch point-in-time before 2026-06-10T18:59:00Z.

DROP TABLE IF EXISTS "memberships" CASCADE;
DROP TABLE IF EXISTS "roles" CASCADE;
DROP TABLE IF EXISTS "users" CASCADE;
DROP TABLE IF EXISTS "account" CASCADE;
DROP TABLE IF EXISTS "session" CASCADE;
DROP TABLE IF EXISTS "verification" CASCADE;
DROP TABLE IF EXISTS "user" CASCADE;
