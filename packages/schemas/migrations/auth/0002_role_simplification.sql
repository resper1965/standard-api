-- Fix role default and normalize stale role values to match the 2-role model.
-- Migration: 0002 — Role simplification (audit fix C2)
-- See: docs/decisions/IMPLEMENTATION-CONSTRAINTS.md

-- 1. Fix the DB column default from 'organization_admin' to 'customer'
ALTER TABLE "user" ALTER COLUMN "role" SET DEFAULT 'customer';

-- 2. Normalize stale role values to canonical roles
UPDATE "user" SET role = 'customer' WHERE role IN ('organization_admin', 'user', 'member', 'viewer', 'assessor', 'owner', 'auditor', 'approver');
UPDATE "user" SET role = 'platform_admin' WHERE role = 'admin';
