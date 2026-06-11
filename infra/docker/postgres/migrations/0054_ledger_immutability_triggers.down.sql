-- Down migration: 0054 — Remove ledger immutability triggers
-- Date: 2026-06-11
-- Author: Antigravity (Google DeepMind)
--
-- WARNING: Removing these triggers means UPDATE/DELETE on ledger tables
-- will no longer be blocked at the DB level. Only do this if you need
-- to perform a controlled data migration or repair operation.

BEGIN;

DROP TRIGGER IF EXISTS trg_ace_prevent_update ON assessment_control_events;
DROP TRIGGER IF EXISTS trg_ace_prevent_delete ON assessment_control_events;
DROP TRIGGER IF EXISTS trg_al_prevent_update ON audit_logs;
DROP TRIGGER IF EXISTS trg_al_prevent_delete ON audit_logs;
DROP FUNCTION IF EXISTS prevent_ledger_mutation();

COMMIT;
