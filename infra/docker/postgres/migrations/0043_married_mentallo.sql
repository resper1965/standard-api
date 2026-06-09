CREATE TYPE "public"."risk_treatment" AS ENUM('mitigate', 'accept', 'transfer', 'avoid', 'monitor');--> statement-breakpoint
CREATE TABLE "assessment_risk_register" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"assessment_id" uuid NOT NULL,
	"scf_version_id" uuid NOT NULL,
	"gap_finding_id" uuid NOT NULL,
	"scf_risk_id" uuid,
	"risk_title" text NOT NULL,
	"risk_description" text,
	"inherent_risk_score" numeric(6, 2),
	"residual_risk_score" numeric(6, 2),
	"risk_category" text,
	"treatment" "risk_treatment" NOT NULL,
	"treatment_rationale" text,
	"owner_id" uuid,
	"review_date" date,
	"roc_determination" "roc_determination",
	"trace_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "assessment_risk_register" ADD CONSTRAINT "assessment_risk_register_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment_risk_register" ADD CONSTRAINT "assessment_risk_register_assessment_id_assessments_id_fk" FOREIGN KEY ("assessment_id") REFERENCES "public"."assessments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment_risk_register" ADD CONSTRAINT "assessment_risk_register_scf_version_id_scf_versions_id_fk" FOREIGN KEY ("scf_version_id") REFERENCES "public"."scf_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment_risk_register" ADD CONSTRAINT "assessment_risk_register_gap_finding_id_gap_findings_id_fk" FOREIGN KEY ("gap_finding_id") REFERENCES "public"."gap_findings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment_risk_register" ADD CONSTRAINT "assessment_risk_register_scf_risk_id_scf_risks_id_fk" FOREIGN KEY ("scf_risk_id") REFERENCES "public"."scf_risks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment_risk_register" ADD CONSTRAINT "assessment_risk_register_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "arr_org_assessment_idx" ON "assessment_risk_register" USING btree ("organization_id","assessment_id");--> statement-breakpoint
CREATE INDEX "arr_gap_finding_idx" ON "assessment_risk_register" USING btree ("gap_finding_id");--> statement-breakpoint
CREATE UNIQUE INDEX "arr_assessment_finding_uidx" ON "assessment_risk_register" USING btree ("assessment_id","gap_finding_id");