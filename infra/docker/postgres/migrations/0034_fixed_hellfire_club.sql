CREATE TYPE "public"."cdpas_method" AS ENUM('examine', 'interview', 'test');--> statement-breakpoint
CREATE TYPE "public"."cdpas_rating" AS ENUM('conforms', 'significant_deficiency', 'material_weakness', 'not_assessed', 'not_applicable');--> statement-breakpoint
CREATE TYPE "public"."mad_phase" AS ENUM('pre_transaction', 'transaction_assessment', 'data_privacy_evaluation', 'third_party_risk', 'integration_planning', 'inherited_risk', 'contractual_controls', 'post_transaction_monitoring');--> statement-breakpoint
CREATE TYPE "public"."mad_transaction_type" AS ENUM('acquisition', 'merger', 'divestiture', 'joint_venture', 'spin_off');--> statement-breakpoint
CREATE TYPE "public"."dpmp_domain" AS ENUM('privacy_by_design', 'data_minimization', 'consent_management', 'data_subject_rights', 'data_retention', 'third_party_privacy', 'cross_border_transfers', 'privacy_governance', 'breach_notification', 'privacy_impact_assessment', 'business_environment');--> statement-breakpoint
CREATE TABLE "cdpas_assessment_findings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"assessment_id" uuid NOT NULL,
	"cdpas_sub_requirement_id" uuid NOT NULL,
	"rating" "cdpas_rating" DEFAULT 'not_assessed' NOT NULL,
	"method_used" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"finding_summary" text,
	"evidence_summary" text,
	"assessed_by" uuid,
	"assessed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "cdpas_control_mappings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"scf_version_id" uuid NOT NULL,
	"cdpas_sub_requirement_id" uuid NOT NULL,
	"scf_control_id" uuid NOT NULL,
	"relationship_note" text,
	"is_synthetic" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "cdpas_standards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"scf_version_id" uuid NOT NULL,
	"standard_number" integer NOT NULL,
	"code" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_synthetic" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "cdpas_sub_requirements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"scf_version_id" uuid NOT NULL,
	"cdpas_standard_id" uuid NOT NULL,
	"requirement_code" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"assessment_methods" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_synthetic" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "mad_control_mappings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"scf_version_id" uuid NOT NULL,
	"mad_sub_requirement_id" uuid NOT NULL,
	"scf_control_id" uuid NOT NULL,
	"relationship_note" text,
	"is_synthetic" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "mad_maturity_criteria" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"scf_version_id" uuid NOT NULL,
	"mad_sub_requirement_id" uuid NOT NULL,
	"level" integer NOT NULL,
	"criteria_text" text NOT NULL,
	"remediation_guidance" text,
	"is_synthetic" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "mad_maturity_scores" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"mad_transaction_assessment_id" uuid NOT NULL,
	"mad_sub_requirement_id" uuid NOT NULL,
	"score" integer NOT NULL,
	"rationale" text,
	"assessed_by" uuid,
	"assessed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "mad_standards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"scf_version_id" uuid NOT NULL,
	"standard_number" integer NOT NULL,
	"code" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"phase" "mad_phase" NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_synthetic" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "mad_sub_requirements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"scf_version_id" uuid NOT NULL,
	"mad_standard_id" uuid NOT NULL,
	"requirement_code" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_synthetic" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "mad_transaction_assessments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"assessment_id" uuid,
	"transaction_name" text NOT NULL,
	"transaction_type" "mad_transaction_type" NOT NULL,
	"target_entity_name" text,
	"transaction_date" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"scf_version_id" uuid,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "dpmp_framework_mappings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"scf_version_id" uuid,
	"dpmp_principle_id" uuid NOT NULL,
	"framework_id" text NOT NULL,
	"requirement_reference" text,
	"mapping_note" text,
	"is_synthetic" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "dpmp_principles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"scf_version_id" uuid,
	"principle_code" text NOT NULL,
	"domain" "dpmp_domain" NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"scf_control_codes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_synthetic" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "scf_assessment_objectives" ADD COLUMN "pptdf_people" boolean;--> statement-breakpoint
ALTER TABLE "scf_assessment_objectives" ADD COLUMN "pptdf_process" boolean;--> statement-breakpoint
ALTER TABLE "scf_assessment_objectives" ADD COLUMN "pptdf_technology" boolean;--> statement-breakpoint
ALTER TABLE "scf_assessment_objectives" ADD COLUMN "pptdf_data" boolean;--> statement-breakpoint
ALTER TABLE "scf_assessment_objectives" ADD COLUMN "pptdf_facility" boolean;--> statement-breakpoint
ALTER TABLE "scf_controls" ADD COLUMN "compensating_control_guidance" text;--> statement-breakpoint
ALTER TABLE "cdpas_assessment_findings" ADD CONSTRAINT "cdpas_assessment_findings_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cdpas_assessment_findings" ADD CONSTRAINT "cdpas_assessment_findings_assessment_id_assessments_id_fk" FOREIGN KEY ("assessment_id") REFERENCES "public"."assessments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cdpas_assessment_findings" ADD CONSTRAINT "cdpas_assessment_findings_cdpas_sub_requirement_id_cdpas_sub_requirements_id_fk" FOREIGN KEY ("cdpas_sub_requirement_id") REFERENCES "public"."cdpas_sub_requirements"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cdpas_assessment_findings" ADD CONSTRAINT "cdpas_assessment_findings_assessed_by_users_id_fk" FOREIGN KEY ("assessed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cdpas_control_mappings" ADD CONSTRAINT "cdpas_control_mappings_scf_version_id_scf_versions_id_fk" FOREIGN KEY ("scf_version_id") REFERENCES "public"."scf_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cdpas_control_mappings" ADD CONSTRAINT "cdpas_control_mappings_cdpas_sub_requirement_id_cdpas_sub_requirements_id_fk" FOREIGN KEY ("cdpas_sub_requirement_id") REFERENCES "public"."cdpas_sub_requirements"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cdpas_control_mappings" ADD CONSTRAINT "cdpas_control_mappings_scf_control_id_scf_controls_id_fk" FOREIGN KEY ("scf_control_id") REFERENCES "public"."scf_controls"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cdpas_standards" ADD CONSTRAINT "cdpas_standards_scf_version_id_scf_versions_id_fk" FOREIGN KEY ("scf_version_id") REFERENCES "public"."scf_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cdpas_sub_requirements" ADD CONSTRAINT "cdpas_sub_requirements_scf_version_id_scf_versions_id_fk" FOREIGN KEY ("scf_version_id") REFERENCES "public"."scf_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cdpas_sub_requirements" ADD CONSTRAINT "cdpas_sub_requirements_cdpas_standard_id_cdpas_standards_id_fk" FOREIGN KEY ("cdpas_standard_id") REFERENCES "public"."cdpas_standards"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mad_control_mappings" ADD CONSTRAINT "mad_control_mappings_scf_version_id_scf_versions_id_fk" FOREIGN KEY ("scf_version_id") REFERENCES "public"."scf_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mad_control_mappings" ADD CONSTRAINT "mad_control_mappings_mad_sub_requirement_id_mad_sub_requirements_id_fk" FOREIGN KEY ("mad_sub_requirement_id") REFERENCES "public"."mad_sub_requirements"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mad_control_mappings" ADD CONSTRAINT "mad_control_mappings_scf_control_id_scf_controls_id_fk" FOREIGN KEY ("scf_control_id") REFERENCES "public"."scf_controls"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mad_maturity_criteria" ADD CONSTRAINT "mad_maturity_criteria_scf_version_id_scf_versions_id_fk" FOREIGN KEY ("scf_version_id") REFERENCES "public"."scf_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mad_maturity_criteria" ADD CONSTRAINT "mad_maturity_criteria_mad_sub_requirement_id_mad_sub_requirements_id_fk" FOREIGN KEY ("mad_sub_requirement_id") REFERENCES "public"."mad_sub_requirements"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mad_maturity_scores" ADD CONSTRAINT "mad_maturity_scores_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mad_maturity_scores" ADD CONSTRAINT "mad_maturity_scores_mad_transaction_assessment_id_mad_transaction_assessments_id_fk" FOREIGN KEY ("mad_transaction_assessment_id") REFERENCES "public"."mad_transaction_assessments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mad_maturity_scores" ADD CONSTRAINT "mad_maturity_scores_mad_sub_requirement_id_mad_sub_requirements_id_fk" FOREIGN KEY ("mad_sub_requirement_id") REFERENCES "public"."mad_sub_requirements"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mad_maturity_scores" ADD CONSTRAINT "mad_maturity_scores_assessed_by_users_id_fk" FOREIGN KEY ("assessed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mad_standards" ADD CONSTRAINT "mad_standards_scf_version_id_scf_versions_id_fk" FOREIGN KEY ("scf_version_id") REFERENCES "public"."scf_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mad_sub_requirements" ADD CONSTRAINT "mad_sub_requirements_scf_version_id_scf_versions_id_fk" FOREIGN KEY ("scf_version_id") REFERENCES "public"."scf_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mad_sub_requirements" ADD CONSTRAINT "mad_sub_requirements_mad_standard_id_mad_standards_id_fk" FOREIGN KEY ("mad_standard_id") REFERENCES "public"."mad_standards"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mad_transaction_assessments" ADD CONSTRAINT "mad_transaction_assessments_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mad_transaction_assessments" ADD CONSTRAINT "mad_transaction_assessments_assessment_id_assessments_id_fk" FOREIGN KEY ("assessment_id") REFERENCES "public"."assessments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mad_transaction_assessments" ADD CONSTRAINT "mad_transaction_assessments_scf_version_id_scf_versions_id_fk" FOREIGN KEY ("scf_version_id") REFERENCES "public"."scf_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mad_transaction_assessments" ADD CONSTRAINT "mad_transaction_assessments_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dpmp_framework_mappings" ADD CONSTRAINT "dpmp_framework_mappings_scf_version_id_scf_versions_id_fk" FOREIGN KEY ("scf_version_id") REFERENCES "public"."scf_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dpmp_framework_mappings" ADD CONSTRAINT "dpmp_framework_mappings_dpmp_principle_id_dpmp_principles_id_fk" FOREIGN KEY ("dpmp_principle_id") REFERENCES "public"."dpmp_principles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dpmp_principles" ADD CONSTRAINT "dpmp_principles_scf_version_id_scf_versions_id_fk" FOREIGN KEY ("scf_version_id") REFERENCES "public"."scf_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "cdpas_findings_assessment_idx" ON "cdpas_assessment_findings" USING btree ("organization_id","assessment_id");--> statement-breakpoint
CREATE INDEX "cdpas_findings_subreq_idx" ON "cdpas_assessment_findings" USING btree ("cdpas_sub_requirement_id");--> statement-breakpoint
CREATE UNIQUE INDEX "cdpas_findings_assessment_subreq_uidx" ON "cdpas_assessment_findings" USING btree ("assessment_id","cdpas_sub_requirement_id");--> statement-breakpoint
CREATE INDEX "cdpas_cm_subreq_idx" ON "cdpas_control_mappings" USING btree ("cdpas_sub_requirement_id");--> statement-breakpoint
CREATE INDEX "cdpas_cm_control_idx" ON "cdpas_control_mappings" USING btree ("scf_control_id");--> statement-breakpoint
CREATE UNIQUE INDEX "cdpas_cm_subreq_control_uidx" ON "cdpas_control_mappings" USING btree ("cdpas_sub_requirement_id","scf_control_id");--> statement-breakpoint
CREATE INDEX "cdpas_standards_version_idx" ON "cdpas_standards" USING btree ("scf_version_id");--> statement-breakpoint
CREATE UNIQUE INDEX "cdpas_standards_version_code_uidx" ON "cdpas_standards" USING btree ("scf_version_id","code");--> statement-breakpoint
CREATE INDEX "cdpas_subreq_standard_idx" ON "cdpas_sub_requirements" USING btree ("cdpas_standard_id");--> statement-breakpoint
CREATE UNIQUE INDEX "cdpas_subreq_version_code_uidx" ON "cdpas_sub_requirements" USING btree ("scf_version_id","requirement_code");--> statement-breakpoint
CREATE INDEX "mad_cm_subreq_idx" ON "mad_control_mappings" USING btree ("mad_sub_requirement_id");--> statement-breakpoint
CREATE INDEX "mad_cm_control_idx" ON "mad_control_mappings" USING btree ("scf_control_id");--> statement-breakpoint
CREATE UNIQUE INDEX "mad_cm_subreq_control_uidx" ON "mad_control_mappings" USING btree ("mad_sub_requirement_id","scf_control_id");--> statement-breakpoint
CREATE INDEX "mad_mc_subreq_idx" ON "mad_maturity_criteria" USING btree ("mad_sub_requirement_id");--> statement-breakpoint
CREATE UNIQUE INDEX "mad_mc_subreq_level_uidx" ON "mad_maturity_criteria" USING btree ("mad_sub_requirement_id","level");--> statement-breakpoint
CREATE INDEX "mad_ms_transaction_idx" ON "mad_maturity_scores" USING btree ("mad_transaction_assessment_id");--> statement-breakpoint
CREATE UNIQUE INDEX "mad_ms_transaction_subreq_uidx" ON "mad_maturity_scores" USING btree ("mad_transaction_assessment_id","mad_sub_requirement_id");--> statement-breakpoint
CREATE INDEX "mad_standards_version_idx" ON "mad_standards" USING btree ("scf_version_id");--> statement-breakpoint
CREATE UNIQUE INDEX "mad_standards_version_code_uidx" ON "mad_standards" USING btree ("scf_version_id","code");--> statement-breakpoint
CREATE INDEX "mad_subreq_standard_idx" ON "mad_sub_requirements" USING btree ("mad_standard_id");--> statement-breakpoint
CREATE UNIQUE INDEX "mad_subreq_version_code_uidx" ON "mad_sub_requirements" USING btree ("scf_version_id","requirement_code");--> statement-breakpoint
CREATE INDEX "mad_ta_org_idx" ON "mad_transaction_assessments" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "mad_ta_assessment_idx" ON "mad_transaction_assessments" USING btree ("assessment_id");--> statement-breakpoint
CREATE INDEX "idx_dpmp_fw_mappings_principle" ON "dpmp_framework_mappings" USING btree ("dpmp_principle_id");--> statement-breakpoint
CREATE INDEX "idx_dpmp_fw_mappings_framework" ON "dpmp_framework_mappings" USING btree ("framework_id");--> statement-breakpoint
CREATE UNIQUE INDEX "dpmp_fw_mappings_principle_fw_req_uidx" ON "dpmp_framework_mappings" USING btree ("dpmp_principle_id","framework_id","requirement_reference");--> statement-breakpoint
CREATE INDEX "idx_dpmp_principles_version" ON "dpmp_principles" USING btree ("scf_version_id");--> statement-breakpoint
CREATE INDEX "idx_dpmp_principles_domain" ON "dpmp_principles" USING btree ("domain");--> statement-breakpoint
CREATE UNIQUE INDEX "dpmp_principles_version_code_uidx" ON "dpmp_principles" USING btree ("scf_version_id","principle_code");