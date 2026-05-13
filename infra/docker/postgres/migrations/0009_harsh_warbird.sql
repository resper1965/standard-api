CREATE TYPE "public"."malware_scan_status" AS ENUM('pending', 'clean', 'infected', 'error', 'skipped');--> statement-breakpoint
CREATE TYPE "public"."privacy_activity_status" AS ENUM('draft', 'needs_information', 'under_review', 'approved', 'rejected', 'archived');--> statement-breakpoint
CREATE TYPE "public"."privacy_controller_role" AS ENUM('controller', 'processor', 'joint_controller', 'independent_controller', 'unknown');--> statement-breakpoint
CREATE TYPE "public"."privacy_data_subject_category" AS ENUM('employees', 'customers', 'prospects', 'partners', 'suppliers', 'minors', 'patients', 'students', 'citizens', 'visitors', 'contractors', 'other');--> statement-breakpoint
CREATE TYPE "public"."privacy_field_review_source" AS ENUM('human', 'ai_suggestion', 'system_rule', 'import');--> statement-breakpoint
CREATE TYPE "public"."privacy_field_review_status" AS ENUM('pending', 'approved', 'rejected', 'needs_revision');--> statement-breakpoint
CREATE TYPE "public"."privacy_legal_basis_lgpd" AS ENUM('consent', 'legal_obligation', 'public_administration', 'research', 'contract', 'legitimate_interest', 'credit_protection', 'life_protection', 'health_protection', 'judicial_process', 'not_determined');--> statement-breakpoint
CREATE TYPE "public"."privacy_scf_applicability" AS ENUM('applicable', 'possibly_applicable', 'not_applicable', 'needs_review');--> statement-breakpoint
CREATE TYPE "public"."privacy_scf_priority" AS ENUM('critical', 'high', 'medium', 'low');--> statement-breakpoint
CREATE TYPE "public"."privacy_screening_result" AS ENUM('required', 'not_required', 'recommended', 'inconclusive');--> statement-breakpoint
CREATE TYPE "public"."privacy_screening_type" AS ENUM('dpia', 'lia', 'tia');--> statement-breakpoint
CREATE TYPE "public"."privacy_data_sensitivity" AS ENUM('personal', 'sensitive', 'anonymized', 'pseudonymized', 'children', 'financial', 'health', 'biometric', 'genetic', 'political', 'religious', 'sexual', 'criminal', 'other');--> statement-breakpoint
CREATE TYPE "public"."privacy_third_party_role" AS ENUM('processor', 'controller', 'joint_controller', 'sub_processor', 'recipient', 'other');--> statement-breakpoint
CREATE TYPE "public"."privacy_transfer_mechanism" AS ENUM('adequacy_decision', 'standard_contractual_clauses', 'binding_corporate_rules', 'consent', 'contractual_necessity', 'legal_obligation', 'public_interest', 'vital_interests', 'not_applicable', 'other');--> statement-breakpoint
CREATE TABLE "privacy_processing_activities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"assessment_id" uuid,
	"name" text NOT NULL,
	"description" text,
	"business_process" text,
	"department_id" uuid,
	"owner_person_id" uuid,
	"controller_role" "privacy_controller_role" DEFAULT 'unknown' NOT NULL,
	"status" "privacy_activity_status" DEFAULT 'draft' NOT NULL,
	"purpose" text,
	"legal_basis_lgpd" "privacy_legal_basis_lgpd",
	"legal_basis_detail" text,
	"retention_period" text,
	"retention_justification" text,
	"third_party_sharing" boolean DEFAULT false NOT NULL,
	"international_transfer" boolean DEFAULT false NOT NULL,
	"automated_decision_making" boolean DEFAULT false NOT NULL,
	"large_scope_processing" boolean DEFAULT false NOT NULL,
	"vulnerable_subjects" boolean DEFAULT false NOT NULL,
	"systematic_monitoring" boolean DEFAULT false NOT NULL,
	"security_measures_summary" text,
	"dpia_required" boolean,
	"lia_required" boolean,
	"tia_required" boolean,
	"risk_level" text,
	"created_by" uuid,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "privacy_processing_activity_data_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"activity_id" uuid NOT NULL,
	"category_name" text NOT NULL,
	"sensitivity" "privacy_data_sensitivity" DEFAULT 'personal' NOT NULL,
	"specific_data_elements" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"source_of_data" text,
	"retention_period" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "privacy_processing_activity_data_subjects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"activity_id" uuid NOT NULL,
	"category" "privacy_data_subject_category" NOT NULL,
	"description" text,
	"estimated_count" text,
	"vulnerable_group" boolean DEFAULT false NOT NULL,
	"age_restrictions" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "privacy_processing_activity_field_reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"activity_id" uuid NOT NULL,
	"field_name" text NOT NULL,
	"review_status" "privacy_field_review_status" DEFAULT 'pending' NOT NULL,
	"reviewer_id" uuid,
	"comment" text,
	"suggested_value" text,
	"current_value" text,
	"source" "privacy_field_review_source" DEFAULT 'human' NOT NULL,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "privacy_processing_activity_scf_controls" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"activity_id" uuid NOT NULL,
	"scf_version" text,
	"control_id" uuid,
	"control_code" text NOT NULL,
	"control_title" text NOT NULL,
	"scf_domain" text,
	"applicability_status" "privacy_scf_applicability" DEFAULT 'needs_review' NOT NULL,
	"priority" "privacy_scf_priority" DEFAULT 'medium' NOT NULL,
	"justification" text,
	"expected_evidence" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"assessment_questions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"gaps" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"suggested_by" text,
	"reviewed_by" uuid,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "privacy_processing_activity_screenings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"activity_id" uuid NOT NULL,
	"screening_type" "privacy_screening_type" NOT NULL,
	"result" "privacy_screening_result" NOT NULL,
	"triggered_by" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"risk_factors" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"recommendation" text,
	"screened_at" timestamp with time zone DEFAULT now() NOT NULL,
	"screened_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "privacy_processing_activity_third_parties" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"activity_id" uuid NOT NULL,
	"name" text NOT NULL,
	"role" "privacy_third_party_role" DEFAULT 'processor' NOT NULL,
	"country" text,
	"purpose" text,
	"data_shared" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"contract_reference" text,
	"safeguards" text,
	"transfer_mechanism" "privacy_transfer_mechanism",
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "document_versions" ADD COLUMN "scan_status" "malware_scan_status" DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE "document_versions" ADD COLUMN "malware_signature" text;--> statement-breakpoint
ALTER TABLE "document_versions" ADD COLUMN "scanned_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "scan_status" "malware_scan_status" DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "malware_signature" text;--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "scanned_at" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "idx_privacy_activities_tenant" ON "privacy_processing_activities" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_privacy_activities_assessment" ON "privacy_processing_activities" USING btree ("assessment_id");--> statement-breakpoint
CREATE INDEX "idx_privacy_activities_status" ON "privacy_processing_activities" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_privacy_activities_tenant_status" ON "privacy_processing_activities" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "idx_privacy_data_categories_activity" ON "privacy_processing_activity_data_categories" USING btree ("activity_id");--> statement-breakpoint
CREATE INDEX "idx_privacy_data_categories_tenant" ON "privacy_processing_activity_data_categories" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_privacy_data_subjects_activity" ON "privacy_processing_activity_data_subjects" USING btree ("activity_id");--> statement-breakpoint
CREATE INDEX "idx_privacy_data_subjects_tenant" ON "privacy_processing_activity_data_subjects" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_privacy_field_reviews_activity" ON "privacy_processing_activity_field_reviews" USING btree ("activity_id");--> statement-breakpoint
CREATE INDEX "idx_privacy_field_reviews_tenant" ON "privacy_processing_activity_field_reviews" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_privacy_field_reviews_status" ON "privacy_processing_activity_field_reviews" USING btree ("review_status");--> statement-breakpoint
CREATE INDEX "idx_privacy_scf_controls_activity" ON "privacy_processing_activity_scf_controls" USING btree ("activity_id");--> statement-breakpoint
CREATE INDEX "idx_privacy_scf_controls_tenant" ON "privacy_processing_activity_scf_controls" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_privacy_scf_controls_code" ON "privacy_processing_activity_scf_controls" USING btree ("control_code");--> statement-breakpoint
CREATE INDEX "idx_privacy_screenings_activity" ON "privacy_processing_activity_screenings" USING btree ("activity_id");--> statement-breakpoint
CREATE INDEX "idx_privacy_screenings_tenant" ON "privacy_processing_activity_screenings" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_privacy_third_parties_activity" ON "privacy_processing_activity_third_parties" USING btree ("activity_id");--> statement-breakpoint
CREATE INDEX "idx_privacy_third_parties_tenant" ON "privacy_processing_activity_third_parties" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "document_versions_scan_status_idx" ON "document_versions" USING btree ("scan_status");--> statement-breakpoint
CREATE INDEX "documents_scan_status_idx" ON "documents" USING btree ("scan_status");