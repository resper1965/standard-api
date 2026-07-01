-- Rename the tenant role 'customer' -> 'org_admin' (2-role model: platform_admin + org_admin).
-- Migration: 0003 — org_admin rename
-- The org_admin's sole attribution is API-key management; GRC runs via those keys.

-- 1. Update the DB column default from 'customer' to 'org_admin'
ALTER TABLE "user" ALTER COLUMN "role" SET DEFAULT 'org_admin';

-- 2. Backfill existing rows to the canonical role
UPDATE "user" SET role = 'org_admin' WHERE role = 'customer';
