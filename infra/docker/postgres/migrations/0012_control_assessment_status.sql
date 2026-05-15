-- Migration: control_assessment_status + cross-framework projection support
-- Purpose: Decouple control implementation status from framework-specific artifacts.
-- The control status is the SINGLE SOURCE OF TRUTH. SoA, gaps, and PoA&M become projections.

-- Create implementation status enum
DO $$ BEGIN
  CREATE TYPE "public"."control_implementation_status" AS ENUM(
    'not_assessed',
    'not_implemented',
    'planned',
    'partially_implemented',
    'implemented',
    'not_applicable'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Core table: assessment-level control implementation status
-- This is the "universal truth" — what the organization actually implements.
-- Framework projections (SoA, gaps) are DERIVED from this.
CREATE TABLE IF NOT EXISTS "control_assessment_status" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id"),
  "organization_id" uuid NOT NULL REFERENCES "organizations"("id"),
  "assessment_id" uuid NOT NULL REFERENCES "assessments"("id"),
  "scf_version_id" uuid NOT NULL REFERENCES "scf_versions"("id"),
  "scf_control_id" uuid NOT NULL REFERENCES "scf_controls"("id"),
  "implementation_status" "public"."control_implementation_status" NOT NULL DEFAULT 'not_assessed',
  "evidence_summary" text,
  "evidence_strength" "public"."evidence_strength" DEFAULT 'not_checked',
  "maturity_level" integer CHECK ("maturity_level" >= 0 AND "maturity_level" <= 5),
  "confidence_score" numeric(5,4),
  "assessed_by" uuid REFERENCES "users"("id"),
  "assessed_by_agent_run_id" uuid REFERENCES "agent_runs"("id"),
  "assessed_at" timestamp with time zone,
  "notes" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "deleted_at" timestamp with time zone
);

-- Primary lookup: "give me all control statuses for this assessment"
CREATE UNIQUE INDEX IF NOT EXISTS "control_assessment_status_assessment_control_uidx"
  ON "control_assessment_status" ("assessment_id", "scf_control_id");

-- Tenant isolation
CREATE INDEX IF NOT EXISTS "control_assessment_status_tenant_org_idx"
  ON "control_assessment_status" ("tenant_id", "organization_id");

-- Filter by implementation status (e.g., "show me all not_implemented controls")
CREATE INDEX IF NOT EXISTS "control_assessment_status_impl_status_idx"
  ON "control_assessment_status" ("assessment_id", "implementation_status");

-- Cross-framework projection index on scf_mappings
-- Enables: "given a control, find all framework requirements it satisfies"
CREATE INDEX IF NOT EXISTS "scf_mappings_control_version_idx"
  ON "scf_mappings" ("scf_control_id", "scf_version_id");

-- Composite index on soa_items for assessment + control lookups
CREATE INDEX IF NOT EXISTS "soa_items_assessment_control_idx"
  ON "soa_items" ("assessment_id", "scf_control_id");
