ALTER TABLE "assessments" ADD COLUMN "parent_assessment_id" uuid;--> statement-breakpoint
ALTER TABLE "assessments" ADD COLUMN "cycle_number" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "assessments" ADD COLUMN "baseline_soa_version_id" uuid;