CREATE TYPE "public"."strm_operator" AS ENUM('equal', 'subset', 'intersects', 'superset', 'no_relation');--> statement-breakpoint
CREATE TYPE "public"."tpra_assessment_status" AS ENUM('draft', 'submitted', 'scoring', 'scored', 'archived');--> statement-breakpoint
CREATE TYPE "public"."tpra_risk_category" AS ENUM('low', 'medium', 'high', 'critical');--> statement-breakpoint
CREATE TYPE "public"."tpra_vendor_type" AS ENUM('saas', 'infrastructure', 'processor', 'controller', 'subprocessor');--> statement-breakpoint
CREATE TABLE "assessment_control_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"assessment_id" uuid NOT NULL,
	"scf_control_id" uuid NOT NULL,
	"scf_version_id" uuid NOT NULL,
	"event_type" text NOT NULL,
	"previous_value" jsonb,
	"new_value" jsonb NOT NULL,
	"actor_id" uuid,
	"agent_run_id" uuid,
	"trace_id" text NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tpra_assessments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"vendor_id" uuid NOT NULL,
	"assessment_id" uuid,
	"status" "tpra_assessment_status" DEFAULT 'draft' NOT NULL,
	"submitted_at" timestamp with time zone,
	"responses" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"scf_version_id" uuid NOT NULL,
	"trace_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "tpra_risk_scores" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"tpra_assessment_id" uuid NOT NULL,
	"vendor_id" uuid NOT NULL,
	"raw_score" numeric(5, 2) NOT NULL,
	"risk_category" "tpra_risk_category" NOT NULL,
	"scf_domain_failures" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"scf_version_id" uuid NOT NULL,
	"trace_id" text NOT NULL,
	"computed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tpra_vendors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"vendor_name" text NOT NULL,
	"vendor_type" "tpra_vendor_type",
	"contact_email" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"trace_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
-- ⚠️ DATA MIGRATION (ADR-001): convert legacy relationship_type values to canonical STRM operators
-- MUST run BEFORE ALTER TABLE changes the column type to strm_operator enum.
-- Neon DB has 81,088 rows: "related" (81,083) + "direct" (5) that cannot be cast to the new enum.
-- Mapping: docs/decisions/IMPLEMENTATION-CONSTRAINTS.md Section 1 + ADR-001
UPDATE "scf_mappings" SET "relationship_type" = 'equal'       WHERE "relationship_type" = 'direct';
UPDATE "scf_mappings" SET "relationship_type" = 'intersects'  WHERE "relationship_type" = 'related';
UPDATE "scf_mappings" SET "relationship_type" = 'intersects'  WHERE "relationship_type" = 'intersecting';
UPDATE "scf_mappings" SET "relationship_type" = 'no_relation' WHERE "relationship_type" = 'no_relationship';
UPDATE "scf_mappings" SET "relationship_type" = 'intersects'  WHERE "relationship_type" = 'source_defined';
UPDATE "scf_strm_relationships" SET "relationship_type" = 'equal'       WHERE "relationship_type" = 'direct';
UPDATE "scf_strm_relationships" SET "relationship_type" = 'intersects'  WHERE "relationship_type" = 'related';
UPDATE "scf_strm_relationships" SET "relationship_type" = 'intersects'  WHERE "relationship_type" = 'intersecting';
UPDATE "scf_strm_relationships" SET "relationship_type" = 'no_relation' WHERE "relationship_type" = 'no_relationship';
UPDATE "scf_strm_relationships" SET "relationship_type" = 'intersects'  WHERE "relationship_type" = 'source_defined';
--> statement-breakpoint
ALTER TABLE "scf_mappings" ALTER COLUMN "relationship_type" SET DATA TYPE "public"."strm_operator" USING "relationship_type"::"public"."strm_operator";--> statement-breakpoint
ALTER TABLE "scf_strm_relationships" ALTER COLUMN "relationship_type" SET DATA TYPE "public"."strm_operator" USING "relationship_type"::"public"."strm_operator";--> statement-breakpoint
ALTER TABLE "scf_mappings" ADD COLUMN "strength_score" numeric(4, 3);--> statement-breakpoint
ALTER TABLE "scf_strm_relationships" ADD COLUMN "strength_score" numeric(4, 3);--> statement-breakpoint
-- Set strength_score = 0.500 for migrated intersects rows (safe neutral default per ADR-001)
-- Column must be added above before this UPDATE can run
UPDATE "scf_mappings" SET "strength_score" = 0.500 WHERE "relationship_type" = 'intersects' AND "strength_score" IS NULL;

ALTER TABLE "assessment_control_events" ADD CONSTRAINT "assessment_control_events_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment_control_events" ADD CONSTRAINT "assessment_control_events_assessment_id_assessments_id_fk" FOREIGN KEY ("assessment_id") REFERENCES "public"."assessments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment_control_events" ADD CONSTRAINT "assessment_control_events_scf_control_id_scf_controls_id_fk" FOREIGN KEY ("scf_control_id") REFERENCES "public"."scf_controls"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment_control_events" ADD CONSTRAINT "assessment_control_events_scf_version_id_scf_versions_id_fk" FOREIGN KEY ("scf_version_id") REFERENCES "public"."scf_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment_control_events" ADD CONSTRAINT "assessment_control_events_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment_control_events" ADD CONSTRAINT "assessment_control_events_agent_run_id_agent_runs_id_fk" FOREIGN KEY ("agent_run_id") REFERENCES "public"."agent_runs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tpra_assessments" ADD CONSTRAINT "tpra_assessments_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tpra_assessments" ADD CONSTRAINT "tpra_assessments_vendor_id_tpra_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."tpra_vendors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tpra_assessments" ADD CONSTRAINT "tpra_assessments_assessment_id_assessments_id_fk" FOREIGN KEY ("assessment_id") REFERENCES "public"."assessments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tpra_assessments" ADD CONSTRAINT "tpra_assessments_scf_version_id_scf_versions_id_fk" FOREIGN KEY ("scf_version_id") REFERENCES "public"."scf_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tpra_risk_scores" ADD CONSTRAINT "tpra_risk_scores_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tpra_risk_scores" ADD CONSTRAINT "tpra_risk_scores_tpra_assessment_id_tpra_assessments_id_fk" FOREIGN KEY ("tpra_assessment_id") REFERENCES "public"."tpra_assessments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tpra_risk_scores" ADD CONSTRAINT "tpra_risk_scores_vendor_id_tpra_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."tpra_vendors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tpra_risk_scores" ADD CONSTRAINT "tpra_risk_scores_scf_version_id_scf_versions_id_fk" FOREIGN KEY ("scf_version_id") REFERENCES "public"."scf_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tpra_vendors" ADD CONSTRAINT "tpra_vendors_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ace_org_assessment_idx" ON "assessment_control_events" USING btree ("organization_id","assessment_id");--> statement-breakpoint
CREATE INDEX "ace_control_idx" ON "assessment_control_events" USING btree ("assessment_id","scf_control_id");--> statement-breakpoint
CREATE INDEX "ace_trace_idx" ON "assessment_control_events" USING btree ("trace_id");--> statement-breakpoint
CREATE INDEX "ace_occurred_at_idx" ON "assessment_control_events" USING btree ("occurred_at");--> statement-breakpoint
CREATE INDEX "tpra_assessments_org_vendor_idx" ON "tpra_assessments" USING btree ("organization_id","vendor_id");--> statement-breakpoint
CREATE INDEX "tpra_assessments_status_idx" ON "tpra_assessments" USING btree ("status");--> statement-breakpoint
CREATE INDEX "tpra_risk_scores_assessment_idx" ON "tpra_risk_scores" USING btree ("tpra_assessment_id");--> statement-breakpoint
CREATE INDEX "tpra_risk_scores_vendor_idx" ON "tpra_risk_scores" USING btree ("vendor_id");--> statement-breakpoint
CREATE INDEX "tpra_risk_scores_computed_at_idx" ON "tpra_risk_scores" USING btree ("computed_at");--> statement-breakpoint
CREATE INDEX "tpra_vendors_org_idx" ON "tpra_vendors" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "tpra_vendors_org_name_uidx" ON "tpra_vendors" USING btree ("organization_id","vendor_name");--> statement-breakpoint
ALTER TABLE "scf_mappings" DROP COLUMN "relationship_strength";--> statement-breakpoint
ALTER TABLE "scf_strm_relationships" DROP COLUMN "relationship_strength";