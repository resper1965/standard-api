ALTER TABLE "assessment_events" ALTER COLUMN "previous_state" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "assessment_events" ALTER COLUMN "next_state" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "assessments" ALTER COLUMN "state" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "assessments" ALTER COLUMN "state" SET DEFAULT 'draft'::text;--> statement-breakpoint
UPDATE "assessments" SET "state" = CASE "state"
  WHEN 'documents_ingesting' THEN 'documents_uploaded'
  WHEN 'kb_building' THEN 'documents_ingested'
  WHEN 'preliminary_scf_analysis' THEN 'scf_pre_analysis_ready'
  WHEN 'framework_selection_pending' THEN 'scf_pre_analysis_ready'
  WHEN 'scope_soa_drafting' THEN 'scope_drafted'
  WHEN 'soa_approval_pending' THEN 'soa_under_review'
  WHEN 'soa_reingesting' THEN 'soa_ingested'
  WHEN 'gap_analysis_running' THEN 'gap_analysis_drafted'
  WHEN 'gap_analysis_approval_pending' THEN 'gap_analysis_under_review'
  WHEN 'maturity_assessment_running' THEN 'maturity_assessed'
  WHEN 'maturity_approval_pending' THEN 'maturity_under_review'
  WHEN 'poam_generation_running' THEN 'poam_drafted'
  WHEN 'poam_approval_pending' THEN 'poam_under_review'
  WHEN 'completed' THEN 'closed'
  ELSE "state"
END;--> statement-breakpoint
UPDATE "assessment_events" SET "previous_state" = CASE "previous_state"
  WHEN 'documents_ingesting' THEN 'documents_uploaded'
  WHEN 'kb_building' THEN 'documents_ingested'
  WHEN 'preliminary_scf_analysis' THEN 'scf_pre_analysis_ready'
  WHEN 'framework_selection_pending' THEN 'scf_pre_analysis_ready'
  WHEN 'scope_soa_drafting' THEN 'scope_drafted'
  WHEN 'soa_approval_pending' THEN 'soa_under_review'
  WHEN 'soa_reingesting' THEN 'soa_ingested'
  WHEN 'gap_analysis_running' THEN 'gap_analysis_drafted'
  WHEN 'gap_analysis_approval_pending' THEN 'gap_analysis_under_review'
  WHEN 'maturity_assessment_running' THEN 'maturity_assessed'
  WHEN 'maturity_approval_pending' THEN 'maturity_under_review'
  WHEN 'poam_generation_running' THEN 'poam_drafted'
  WHEN 'poam_approval_pending' THEN 'poam_under_review'
  WHEN 'completed' THEN 'closed'
  ELSE "previous_state"
END WHERE "previous_state" IS NOT NULL;--> statement-breakpoint
UPDATE "assessment_events" SET "next_state" = CASE "next_state"
  WHEN 'documents_ingesting' THEN 'documents_uploaded'
  WHEN 'kb_building' THEN 'documents_ingested'
  WHEN 'preliminary_scf_analysis' THEN 'scf_pre_analysis_ready'
  WHEN 'framework_selection_pending' THEN 'scf_pre_analysis_ready'
  WHEN 'scope_soa_drafting' THEN 'scope_drafted'
  WHEN 'soa_approval_pending' THEN 'soa_under_review'
  WHEN 'soa_reingesting' THEN 'soa_ingested'
  WHEN 'gap_analysis_running' THEN 'gap_analysis_drafted'
  WHEN 'gap_analysis_approval_pending' THEN 'gap_analysis_under_review'
  WHEN 'maturity_assessment_running' THEN 'maturity_assessed'
  WHEN 'maturity_approval_pending' THEN 'maturity_under_review'
  WHEN 'poam_generation_running' THEN 'poam_drafted'
  WHEN 'poam_approval_pending' THEN 'poam_under_review'
  WHEN 'completed' THEN 'closed'
  ELSE "next_state"
END;--> statement-breakpoint
DROP TYPE "public"."assessment_state";--> statement-breakpoint
CREATE TYPE "public"."assessment_state" AS ENUM('draft', 'documents_uploaded', 'documents_ingested', 'scf_pre_analysis_ready', 'framework_selected', 'scope_drafted', 'soa_drafted', 'soa_under_review', 'soa_approved', 'soa_ingested', 'evidence_analysis_ready', 'gap_analysis_drafted', 'gap_analysis_under_review', 'gap_analysis_approved', 'maturity_assessed', 'maturity_under_review', 'maturity_approved', 'poam_drafted', 'poam_under_review', 'poam_approved', 'report_generated', 'closed', 'archived', 'failed', 'cancelled', 'blocked');--> statement-breakpoint
ALTER TABLE "assessment_events" ALTER COLUMN "previous_state" SET DATA TYPE "public"."assessment_state" USING "previous_state"::"public"."assessment_state";--> statement-breakpoint
ALTER TABLE "assessment_events" ALTER COLUMN "next_state" SET DATA TYPE "public"."assessment_state" USING "next_state"::"public"."assessment_state";--> statement-breakpoint
ALTER TABLE "assessments" ALTER COLUMN "state" SET DEFAULT 'draft'::"public"."assessment_state";--> statement-breakpoint
ALTER TABLE "assessments" ALTER COLUMN "state" SET DATA TYPE "public"."assessment_state" USING "state"::"public"."assessment_state";