ALTER TABLE "assessment_risk_register" ADD COLUMN "risk_appetite_input" numeric(4, 2);--> statement-breakpoint
ALTER TABLE "assessment_risk_register" ADD COLUMN "risk_tolerance_input" numeric(4, 2);--> statement-breakpoint
ALTER TABLE "assessment_risk_register" ADD COLUMN "risk_threshold_input" numeric(4, 2);--> statement-breakpoint
ALTER TABLE "assessment_risk_register" ADD COLUMN "within_tolerance" boolean;