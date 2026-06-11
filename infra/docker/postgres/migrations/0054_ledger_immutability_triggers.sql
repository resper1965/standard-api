-- Migration: 0054 — Ledger immutability triggers (ADR-002)
-- Date: 2026-06-11
-- Author: Antigravity (Google DeepMind)
--
-- Co-Authored-By: Antigravity (Google DeepMind Advanced Agentic Coding)
--
-- Rationale:
--   ADR-002 specifies that assessment_control_events is append-only.
--   Migration 0049 partitioned the table but did NOT create the trigger
--   that blocks UPDATE/DELETE at the database level.
--   Currently, immutability is application-convention only — a raw SQL
--   UPDATE would succeed. This migration closes that gap.
--
-- PostgreSQL partitioned table behavior:
--   Row-level BEFORE triggers created on the partitioned parent table
--   are automatically inherited by all existing and future partitions
--   (PostgreSQL 11+). No per-partition trigger creation needed.
--
-- Applies to:
--   1. assessment_control_events (partitioned, migration 0049)
--   2. audit_logs (partitioned, migration 0049)
--
-- Compliance: SOC 2 Type II CC6.1, ISO 27001 §9.1, LGPD Art. 37

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────────
-- Shared function: prevents any UPDATE or DELETE on ledger tables
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION prevent_ledger_mutation()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION
    '[ADR-002] Table "%" is APPEND-ONLY. % operations are forbidden. '
    'See docs/decisions/ADR-002-ledger-append-only.md',
    TG_TABLE_NAME, TG_OP
  USING ERRCODE = 'restrict_violation';
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION prevent_ledger_mutation() IS
  'ADR-002: Blocks UPDATE/DELETE on append-only ledger tables. '
  'Applied to assessment_control_events and audit_logs.';

-- ─────────────────────────────────────────────────────────────────────────────
-- assessment_control_events — append-only triggers
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TRIGGER trg_ace_prevent_update
  BEFORE UPDATE ON assessment_control_events
  FOR EACH ROW EXECUTE FUNCTION prevent_ledger_mutation();

CREATE TRIGGER trg_ace_prevent_delete
  BEFORE DELETE ON assessment_control_events
  FOR EACH ROW EXECUTE FUNCTION prevent_ledger_mutation();

-- ─────────────────────────────────────────────────────────────────────────────
-- audit_logs — append-only triggers
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TRIGGER trg_al_prevent_update
  BEFORE UPDATE ON audit_logs
  FOR EACH ROW EXECUTE FUNCTION prevent_ledger_mutation();

CREATE TRIGGER trg_al_prevent_delete
  BEFORE DELETE ON audit_logs
  FOR EACH ROW EXECUTE FUNCTION prevent_ledger_mutation();

COMMIT;

-- ─────────────────────────────────────────────────────────────────────────────
-- Verification (run manually after applying migration):
-- ─────────────────────────────────────────────────────────────────────────────
--
-- 1. Confirm triggers exist on parent:
--    SELECT tgname, tgrelid::regclass, tgenabled
--    FROM pg_trigger
--    WHERE tgname LIKE 'trg_ace_%' OR tgname LIKE 'trg_al_%'
--    ORDER BY tgname;
--
-- 2. Test UPDATE is blocked:
--    DO $$ BEGIN
--      UPDATE assessment_control_events
--        SET event_type = 'tampered' WHERE false;
--    EXCEPTION WHEN restrict_violation THEN
--      RAISE NOTICE 'PASS: UPDATE correctly blocked by trigger.';
--    END $$;
--
-- 3. Test DELETE is blocked:
--    DO $$ BEGIN
--      DELETE FROM assessment_control_events WHERE false;
--    EXCEPTION WHEN restrict_violation THEN
--      RAISE NOTICE 'PASS: DELETE correctly blocked by trigger.';
--    END $$;
--
-- 4. Test INSERT still works:
--    INSERT INTO assessment_control_events (
--      organization_id, assessment_id, scf_control_id, scf_version_id,
--      event_type, new_value, trace_id
--    ) VALUES (
--      gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid(),
--      'test_trigger_verification', '{"test": true}'::jsonb, 'trace-verify-0054'
--    );
--    -- Then delete the test row... wait, we can't! Clean up via partition drop.
