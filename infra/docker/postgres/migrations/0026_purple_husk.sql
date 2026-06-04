CREATE TYPE "public"."responsibility_type" AS ENUM('internal', 'customer', 'third_party_provider', 'shared');--> statement-breakpoint
ALTER TABLE "assessments" ADD COLUMN "observation_start_date" date;--> statement-breakpoint
ALTER TABLE "assessments" ADD COLUMN "observation_end_date" date;--> statement-breakpoint
ALTER TABLE "gap_findings" ADD COLUMN "responsibility_type" "responsibility_type" DEFAULT 'internal';--> statement-breakpoint
ALTER TABLE "poam_items" ADD COLUMN "risk_acceptance_expires_at" date;--> statement-breakpoint
ALTER TABLE "soa_items" ADD COLUMN "responsibility_type" "responsibility_type" DEFAULT 'internal';