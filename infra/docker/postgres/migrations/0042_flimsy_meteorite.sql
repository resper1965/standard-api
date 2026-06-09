CREATE TYPE "public"."assurance_level" AS ENUM('l1_standard', 'l2_enhanced', 'l3_comprehensive');--> statement-breakpoint
CREATE TYPE "public"."roc_determination" AS ENUM('strictly_conforms', 'conforms', 'significant_deficiency', 'material_weakness');--> statement-breakpoint
ALTER TABLE "assessments" ADD COLUMN "assurance_level" "assurance_level" DEFAULT 'l1_standard';--> statement-breakpoint
ALTER TABLE "gap_findings" ADD COLUMN "roc_determination" "roc_determination";--> statement-breakpoint
ALTER TABLE "gap_findings" ADD COLUMN "inherent_risk_score" numeric(6, 2);--> statement-breakpoint
ALTER TABLE "gap_findings" ADD COLUMN "residual_risk_score" numeric(6, 2);