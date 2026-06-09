CREATE TYPE "public"."assessment_method" AS ENUM('examine', 'interview', 'test');--> statement-breakpoint
ALTER TABLE "assessments" ADD COLUMN "maturity_domain_targets" jsonb;--> statement-breakpoint
ALTER TABLE "maturity_scores" ADD COLUMN "assessment_method" "assessment_method";