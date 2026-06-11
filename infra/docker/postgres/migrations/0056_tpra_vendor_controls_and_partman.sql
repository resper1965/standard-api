-- Migration: 0056 — TPRA Vendor Controls & pg_partman for security_events
-- Date: 2026-06-11
-- Author: Antigravity

BEGIN;

-- 1. Create tpra_vendor_controls
CREATE TABLE "tpra_vendor_controls" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"vendor_id" uuid NOT NULL,
	"scf_control_id" uuid NOT NULL,
	"scf_version_id" uuid NOT NULL,
	"trace_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "tpra_vendor_controls" ADD CONSTRAINT "tpra_vendor_controls_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "tpra_vendor_controls" ADD CONSTRAINT "tpra_vendor_controls_vendor_id_tpra_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."tpra_vendors"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "tpra_vendor_controls" ADD CONSTRAINT "tpra_vendor_controls_scf_control_id_scf_controls_id_fk" FOREIGN KEY ("scf_control_id") REFERENCES "public"."scf_controls"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "tpra_vendor_controls" ADD CONSTRAINT "tpra_vendor_controls_scf_version_id_scf_versions_id_fk" FOREIGN KEY ("scf_version_id") REFERENCES "public"."scf_versions"("id") ON DELETE no action ON UPDATE no action;

CREATE INDEX "tpra_vendor_ctrls_org_idx" ON "tpra_vendor_controls" USING btree ("organization_id");
CREATE UNIQUE INDEX "tpra_vendor_ctrls_uidx" ON "tpra_vendor_controls" USING btree ("vendor_id","scf_control_id");

-- 2. Enable pg_partman
CREATE SCHEMA IF NOT EXISTS partman;
CREATE EXTENSION IF NOT EXISTS pg_partman SCHEMA partman;

-- 3. Partition security_events
ALTER TABLE "security_events" RENAME TO "security_events_old";

CREATE TABLE "security_events" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "organization_id" uuid,
    "assessment_id" uuid,
    "actor_id" uuid,
    "event_type" text NOT NULL,
    "severity" text NOT NULL,
    "outcome" text NOT NULL,
    "source" text NOT NULL,
    "resource_type" text,
    "resource_id" text,
    "message_safe" text NOT NULL,
    "trace_id" text NOT NULL,
    "ip_address" text,
    "user_agent" text,
    "metadata_safe" jsonb DEFAULT '{}' NOT NULL,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL
) PARTITION BY RANGE ("created_at");

CREATE INDEX "security_events_org_idx" ON "security_events" USING btree ("organization_id");
CREATE INDEX "security_events_type_idx" ON "security_events" USING btree ("event_type");
CREATE INDEX "security_events_severity_idx" ON "security_events" USING btree ("severity");
CREATE INDEX "security_events_trace_idx" ON "security_events" USING btree ("trace_id");
CREATE INDEX "security_events_created_idx" ON "security_events" USING btree ("created_at");

SELECT partman.create_parent(
    p_parent_table := 'public.security_events',
    p_control := 'created_at',
    p_type := 'native',
    p_interval := '1 month',
    p_premake := 3
);

INSERT INTO "security_events" SELECT * FROM "security_events_old";

DROP TABLE "security_events_old";

COMMIT;
