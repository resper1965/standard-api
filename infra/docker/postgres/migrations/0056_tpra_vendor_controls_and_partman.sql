-- Migration: 0056 — TPRA Vendor Controls
-- Date: 2026-06-11
-- Author: Antigravity

BEGIN;

-- Create tpra_vendor_controls: links vendors to the SCF controls they certify.
-- Used by TpraApprovalWorkflow to know which controls a vendor covers.
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

COMMIT;
