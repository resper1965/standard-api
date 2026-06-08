CREATE TYPE "public"."evidence_status" AS ENUM('candidate', 'accepted', 'rejected', 'insufficient', 'conflicting', 'not_evidenced');--> statement-breakpoint
CREATE TYPE "public"."export_job_status" AS ENUM('queued', 'running', 'succeeded', 'failed', 'skipped', 'cancelled', 'retrying');--> statement-breakpoint
CREATE TYPE "public"."poam_action_type" AS ENUM('policy_update', 'procedure_creation', 'technical_implementation', 'evidence_collection', 'governance_improvement', 'monitoring_improvement', 'training', 'third_party_action', 'risk_acceptance', 'validation_required', 'other');--> statement-breakpoint
CREATE TYPE "public"."poam_dependency_type" AS ENUM('blocks', 'related_to', 'prerequisite', 'duplicates', 'depends_on_external_party');--> statement-breakpoint
CREATE TYPE "public"."poam_effort_estimate" AS ENUM('small', 'medium', 'large', 'extra_large', 'unknown');--> statement-breakpoint
CREATE TYPE "public"."report_artifact_type" AS ENUM('report', 'export', 'evidence_index', 'audit_package', 'appendix', 'summary');--> statement-breakpoint
CREATE TYPE "public"."report_format" AS ENUM('json', 'markdown', 'html', 'docx', 'pdf', 'csv', 'xlsx', 'zip');--> statement-breakpoint
CREATE TYPE "public"."report_type" AS ENUM('full_assessment_report', 'executive_summary', 'soa_export', 'gap_analysis_report', 'maturity_report', 'poam_report', 'audit_package', 'machine_readable_export');--> statement-breakpoint
CREATE TYPE "public"."workflow_run_status" AS ENUM('pending', 'running', 'waiting_for_input', 'waiting_for_approval', 'blocked', 'failed', 'cancelled', 'completed');--> statement-breakpoint
ALTER TYPE "public"."approval_gate" ADD VALUE 'report';--> statement-breakpoint
ALTER TYPE "public"."evidence_strength" ADD VALUE 'not_checked';--> statement-breakpoint
ALTER TYPE "public"."gap_type" ADD VALUE 'no_gap';--> statement-breakpoint
ALTER TYPE "public"."gap_type" ADD VALUE 'not_applicable';--> statement-breakpoint
ALTER TYPE "public"."poam_status" ADD VALUE 'deferred';--> statement-breakpoint
ALTER TYPE "public"."priority" ADD VALUE 'urgent';--> statement-breakpoint
ALTER TYPE "public"."severity" ADD VALUE 'informational' BEFORE 'low';--> statement-breakpoint
ALTER TYPE "public"."storage_provider" ADD VALUE 'r2_compatible_mock';--> statement-breakpoint
CREATE TABLE "agent_tool_calls" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"organization_id" uuid NOT NULL,
	"assessment_id" uuid NOT NULL,
	"agent_run_id" uuid NOT NULL,
	"tool_name" text NOT NULL,
	"risk_level" text NOT NULL,
	"input_hash" text NOT NULL,
	"output_hash" text,
	"status" text NOT NULL,
	"trace_id" text NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "export_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"organization_id" uuid NOT NULL,
	"assessment_id" uuid NOT NULL,
	"report_version_id" uuid,
	"job_type" text NOT NULL,
	"status" "export_job_status" DEFAULT 'queued' NOT NULL,
	"requested_format" "report_format" NOT NULL,
	"requested_by" uuid NOT NULL,
	"queued_at" timestamp with time zone DEFAULT now() NOT NULL,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"error_code" text,
	"error_message_safe" text,
	"trace_id" text NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "kb_embedding_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"organization_id" uuid NOT NULL,
	"assessment_id" uuid NOT NULL,
	"document_id" uuid NOT NULL,
	"chunk_id" uuid,
	"job_type" text NOT NULL,
	"status" text NOT NULL,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"queued_at" timestamp with time zone DEFAULT now() NOT NULL,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"error_code" text,
	"error_message_safe" text,
	"trace_id" text NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "kb_search_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"organization_id" uuid NOT NULL,
	"assessment_id" uuid NOT NULL,
	"actor_id" uuid,
	"query_hash" text NOT NULL,
	"search_type" text NOT NULL,
	"filters" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"result_count" integer DEFAULT 0 NOT NULL,
	"trace_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "poam_dependencies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"organization_id" uuid NOT NULL,
	"assessment_id" uuid NOT NULL,
	"poam_item_id" uuid NOT NULL,
	"depends_on_poam_item_id" uuid,
	"dependency_type" "poam_dependency_type" NOT NULL,
	"description" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "poam_milestones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"organization_id" uuid NOT NULL,
	"assessment_id" uuid NOT NULL,
	"poam_item_id" uuid NOT NULL,
	"milestone_code" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"due_date" date,
	"status" "poam_status" DEFAULT 'draft' NOT NULL,
	"acceptance_criteria" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"expected_evidence" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "scf_import_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"scf_version_id" uuid,
	"source_type" text NOT NULL,
	"source_filename" text,
	"source_hash" text NOT NULL,
	"status" text NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"error_summary_safe" text,
	"import_statistics" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"imported_by" text,
	"trace_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "workflow_audit_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"organization_id" uuid NOT NULL,
	"assessment_id" uuid NOT NULL,
	"workflow_run_id" uuid NOT NULL,
	"event_type" text NOT NULL,
	"step_name" text,
	"actor_id" uuid,
	"system_actor" text,
	"trace_id" text NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workflow_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"organization_id" uuid NOT NULL,
	"assessment_id" uuid NOT NULL,
	"status" "workflow_run_status" DEFAULT 'pending' NOT NULL,
	"idempotency_key" text NOT NULL,
	"state" jsonb NOT NULL,
	"signal_idempotency_keys" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"step_idempotency_keys" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "apikey" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text,
	"start" text,
	"prefix" text,
	"key" text NOT NULL,
	"user_id" text NOT NULL,
	"refill_interval" integer,
	"refill_amount" integer,
	"last_refill_at" timestamp,
	"enabled" boolean DEFAULT true,
	"rate_limit_enabled" boolean DEFAULT true,
	"rate_limit_time_window" integer,
	"rate_limit_max" integer,
	"request_count" integer DEFAULT 0,
	"remaining" integer,
	"last_request" timestamp,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"permissions" text,
	"metadata" text
);
--> statement-breakpoint
CREATE TABLE "invitation" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"email" text NOT NULL,
	"role" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"expires_at" timestamp NOT NULL,
	"inviter_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "member" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"user_id" text NOT NULL,
	"role" text DEFAULT 'member' NOT NULL,
	"team_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organization" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text,
	"logo" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"metadata" text,
	CONSTRAINT "organization_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	"impersonated_by" text,
	"active_organization_id" text,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"role" text DEFAULT 'user',
	"banned" boolean DEFAULT false,
	"ban_reason" text,
	"ban_expires" timestamp,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "evidence_findings" DROP CONSTRAINT "evidence_findings_agent_run_id_agent_runs_id_fk";
--> statement-breakpoint
ALTER TABLE "evidence_sources" DROP CONSTRAINT "evidence_sources_document_chunk_id_document_chunks_id_fk";
--> statement-breakpoint
ALTER TABLE "evidence_sources" DROP CONSTRAINT "evidence_sources_soa_item_id_soa_items_id_fk";
--> statement-breakpoint
ALTER TABLE "gap_analysis_versions" DROP CONSTRAINT "gap_analysis_versions_created_by_agent_run_id_agent_runs_id_fk";
--> statement-breakpoint
ALTER TABLE "gap_findings" DROP CONSTRAINT "gap_findings_agent_run_id_agent_runs_id_fk";
--> statement-breakpoint
ALTER TABLE "poam_items" DROP CONSTRAINT "poam_items_related_gap_id_gap_findings_id_fk";
--> statement-breakpoint
ALTER TABLE "poam_versions" DROP CONSTRAINT "poam_versions_created_by_agent_run_id_agent_runs_id_fk";
--> statement-breakpoint
ALTER TABLE "report_versions" DROP CONSTRAINT "report_versions_created_by_agent_run_id_agent_runs_id_fk";
--> statement-breakpoint
DROP INDEX "evidence_findings_agent_idx";--> statement-breakpoint
DROP INDEX "evidence_sources_chunk_idx";--> statement-breakpoint
DROP INDEX "gap_findings_version_code_uidx";--> statement-breakpoint
DROP INDEX "poam_items_gap_idx";--> statement-breakpoint
DROP INDEX "poam_items_version_code_uidx";--> statement-breakpoint
ALTER TABLE "evidence_findings" ALTER COLUMN "soa_item_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "gap_findings" ALTER COLUMN "scf_control_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "gap_findings" ALTER COLUMN "soa_item_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "poam_items" ALTER COLUMN "scf_control_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "poam_items" ALTER COLUMN "framework_requirement_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "poam_items" ALTER COLUMN "expected_evidence" SET DATA TYPE jsonb USING expected_evidence::jsonb;--> statement-breakpoint
ALTER TABLE "poam_items" ALTER COLUMN "expected_evidence" SET DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "poam_items" ALTER COLUMN "acceptance_criteria" SET DATA TYPE jsonb USING acceptance_criteria::jsonb;--> statement-breakpoint
ALTER TABLE "poam_items" ALTER COLUMN "acceptance_criteria" SET DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "report_versions" ALTER COLUMN "report_type" SET DATA TYPE "public"."report_type" USING "report_type"::"public"."report_type";--> statement-breakpoint
ALTER TABLE "scf_frameworks" ALTER COLUMN "version_label" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "scf_mappings" ALTER COLUMN "relationship_strength" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "soa_items" ALTER COLUMN "scf_control_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "assessment_scope" ADD COLUMN "scope_version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "assessment_scope" ADD COLUMN "title" text;--> statement-breakpoint
ALTER TABLE "assessment_scope" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "assessment_scope" ADD COLUMN "business_units" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "assessment_scope" ADD COLUMN "processes" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "assessment_scope" ADD COLUMN "systems" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "assessment_scope" ADD COLUMN "locations" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "assessment_scope" ADD COLUMN "legal_entities" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "assessment_scope" ADD COLUMN "data_types" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "assessment_scope" ADD COLUMN "third_parties" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "assessment_scope" ADD COLUMN "constraints" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "assessment_scope" ADD COLUMN "created_by" uuid;--> statement-breakpoint
ALTER TABLE "evidence_findings" ADD COLUMN "soa_version_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "evidence_findings" ADD COLUMN "framework_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "evidence_findings" ADD COLUMN "framework_requirement_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "evidence_findings" ADD COLUMN "scf_version_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "evidence_findings" ADD COLUMN "evidence_strength" "evidence_strength" DEFAULT 'not_checked' NOT NULL;--> statement-breakpoint
ALTER TABLE "evidence_findings" ADD COLUMN "evidence_status" "evidence_status" DEFAULT 'not_evidenced' NOT NULL;--> statement-breakpoint
ALTER TABLE "evidence_findings" ADD COLUMN "evidence_summary" text NOT NULL;--> statement-breakpoint
ALTER TABLE "evidence_findings" ADD COLUMN "evidence_limitations" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "evidence_findings" ADD COLUMN "generated_by_agent_run_id" uuid;--> statement-breakpoint
ALTER TABLE "evidence_sources" ADD COLUMN "document_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "evidence_sources" ADD COLUMN "chunk_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "evidence_sources" ADD COLUMN "vector_reference_id" uuid;--> statement-breakpoint
ALTER TABLE "evidence_sources" ADD COLUMN "source_title" text;--> statement-breakpoint
ALTER TABLE "evidence_sources" ADD COLUMN "source_location" text;--> statement-breakpoint
ALTER TABLE "evidence_sources" ADD COLUMN "snippet" text NOT NULL;--> statement-breakpoint
ALTER TABLE "evidence_sources" ADD COLUMN "retrieval_score" numeric(8, 6) NOT NULL;--> statement-breakpoint
ALTER TABLE "evidence_sources" ADD COLUMN "retrieval_method" text NOT NULL;--> statement-breakpoint
ALTER TABLE "evidence_sources" ADD COLUMN "candidate_evidence" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "gap_analysis_versions" ADD COLUMN "source_soa_version_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "gap_analysis_versions" ADD COLUMN "framework_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "gap_analysis_versions" ADD COLUMN "scf_version_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "gap_analysis_versions" ADD COLUMN "generated_by_agent_run_id" uuid;--> statement-breakpoint
ALTER TABLE "gap_analysis_versions" ADD COLUMN "created_by" uuid;--> statement-breakpoint
ALTER TABLE "gap_analysis_versions" ADD COLUMN "submitted_for_review_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "gap_analysis_versions" ADD COLUMN "approved_by" uuid;--> statement-breakpoint
ALTER TABLE "gap_analysis_versions" ADD COLUMN "approved_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "gap_analysis_versions" ADD COLUMN "superseded_by" uuid;--> statement-breakpoint
ALTER TABLE "gap_analysis_versions" ADD COLUMN "trace_id" text;--> statement-breakpoint
ALTER TABLE "gap_analysis_versions" ADD COLUMN "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "gap_findings" ADD COLUMN "soa_version_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "gap_findings" ADD COLUMN "framework_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "gap_findings" ADD COLUMN "scf_version_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "gap_findings" ADD COLUMN "gap_code" text NOT NULL;--> statement-breakpoint
ALTER TABLE "gap_findings" ADD COLUMN "assessment_status" "gap_status" NOT NULL;--> statement-breakpoint
ALTER TABLE "gap_findings" ADD COLUMN "severity" "severity" NOT NULL;--> statement-breakpoint
ALTER TABLE "gap_findings" ADD COLUMN "impact" text;--> statement-breakpoint
ALTER TABLE "gap_findings" ADD COLUMN "likelihood" text;--> statement-breakpoint
ALTER TABLE "gap_findings" ADD COLUMN "gap_summary" text NOT NULL;--> statement-breakpoint
ALTER TABLE "gap_findings" ADD COLUMN "gap_rationale" text;--> statement-breakpoint
ALTER TABLE "gap_findings" ADD COLUMN "recommendation_summary" text;--> statement-breakpoint
ALTER TABLE "gap_findings" ADD COLUMN "requires_user_validation" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "poam_items" ADD COLUMN "related_gap_finding_id" uuid;--> statement-breakpoint
ALTER TABLE "poam_items" ADD COLUMN "source_maturity_score_id" uuid;--> statement-breakpoint
ALTER TABLE "poam_items" ADD COLUMN "soa_item_id" uuid;--> statement-breakpoint
ALTER TABLE "poam_items" ADD COLUMN "framework_id" uuid;--> statement-breakpoint
ALTER TABLE "poam_items" ADD COLUMN "scf_version_id" uuid;--> statement-breakpoint
ALTER TABLE "poam_items" ADD COLUMN "scf_domain_id" uuid;--> statement-breakpoint
ALTER TABLE "poam_items" ADD COLUMN "poam_code" text NOT NULL;--> statement-breakpoint
ALTER TABLE "poam_items" ADD COLUMN "action_type" "poam_action_type" NOT NULL;--> statement-breakpoint
ALTER TABLE "poam_items" ADD COLUMN "risk_rating" text NOT NULL;--> statement-breakpoint
ALTER TABLE "poam_items" ADD COLUMN "effort_estimate" "poam_effort_estimate" DEFAULT 'unknown' NOT NULL;--> statement-breakpoint
ALTER TABLE "poam_items" ADD COLUMN "owner_role" text;--> statement-breakpoint
ALTER TABLE "poam_items" ADD COLUMN "target_maturity_score" integer;--> statement-breakpoint
ALTER TABLE "poam_items" ADD COLUMN "dependencies_summary" text;--> statement-breakpoint
ALTER TABLE "poam_items" ADD COLUMN "rationale" text NOT NULL;--> statement-breakpoint
ALTER TABLE "poam_items" ADD COLUMN "confidence_score" numeric(5, 4) NOT NULL;--> statement-breakpoint
ALTER TABLE "poam_items" ADD COLUMN "requires_user_validation" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "poam_versions" ADD COLUMN "source_gap_analysis_version_id" uuid;--> statement-breakpoint
ALTER TABLE "poam_versions" ADD COLUMN "source_maturity_assessment_version_id" uuid;--> statement-breakpoint
ALTER TABLE "poam_versions" ADD COLUMN "framework_id" uuid;--> statement-breakpoint
ALTER TABLE "poam_versions" ADD COLUMN "scf_version_id" uuid;--> statement-breakpoint
ALTER TABLE "poam_versions" ADD COLUMN "generated_by_agent_run_id" uuid;--> statement-breakpoint
ALTER TABLE "poam_versions" ADD COLUMN "created_by" uuid;--> statement-breakpoint
ALTER TABLE "poam_versions" ADD COLUMN "submitted_for_review_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "poam_versions" ADD COLUMN "approved_by" uuid;--> statement-breakpoint
ALTER TABLE "poam_versions" ADD COLUMN "approved_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "poam_versions" ADD COLUMN "superseded_by" uuid;--> statement-breakpoint
ALTER TABLE "poam_versions" ADD COLUMN "trace_id" text;--> statement-breakpoint
ALTER TABLE "poam_versions" ADD COLUMN "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "report_artifacts" ADD COLUMN "artifact_type" "report_artifact_type" DEFAULT 'report' NOT NULL;--> statement-breakpoint
ALTER TABLE "report_artifacts" ADD COLUMN "format" "report_format" DEFAULT 'json' NOT NULL;--> statement-breakpoint
ALTER TABLE "report_artifacts" ADD COLUMN "storage_bucket" text;--> statement-breakpoint
ALTER TABLE "report_artifacts" ADD COLUMN "generated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "report_artifacts" ADD COLUMN "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "report_versions" ADD COLUMN "title" text DEFAULT 'Standard Assessment Report' NOT NULL;--> statement-breakpoint
ALTER TABLE "report_versions" ADD COLUMN "source_scope_id" uuid;--> statement-breakpoint
ALTER TABLE "report_versions" ADD COLUMN "source_soa_version_id" uuid;--> statement-breakpoint
ALTER TABLE "report_versions" ADD COLUMN "source_gap_analysis_version_id" uuid;--> statement-breakpoint
ALTER TABLE "report_versions" ADD COLUMN "source_maturity_assessment_version_id" uuid;--> statement-breakpoint
ALTER TABLE "report_versions" ADD COLUMN "source_poam_version_id" uuid;--> statement-breakpoint
ALTER TABLE "report_versions" ADD COLUMN "framework_id" uuid;--> statement-breakpoint
ALTER TABLE "report_versions" ADD COLUMN "scf_version_id" uuid;--> statement-breakpoint
ALTER TABLE "report_versions" ADD COLUMN "generated_by_agent_run_id" uuid;--> statement-breakpoint
ALTER TABLE "report_versions" ADD COLUMN "created_by" uuid;--> statement-breakpoint
ALTER TABLE "report_versions" ADD COLUMN "submitted_for_review_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "report_versions" ADD COLUMN "approved_by" uuid;--> statement-breakpoint
ALTER TABLE "report_versions" ADD COLUMN "approved_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "report_versions" ADD COLUMN "superseded_by" uuid;--> statement-breakpoint
ALTER TABLE "report_versions" ADD COLUMN "trace_id" text DEFAULT 'trace-not-set' NOT NULL;--> statement-breakpoint
ALTER TABLE "report_versions" ADD COLUMN "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "scf_controls" ADD COLUMN "control_question" text;--> statement-breakpoint
ALTER TABLE "scf_controls" ADD COLUMN "control_intent" text;--> statement-breakpoint
ALTER TABLE "scf_controls" ADD COLUMN "implementation_guidance" text;--> statement-breakpoint
ALTER TABLE "scf_controls" ADD COLUMN "expected_evidence" text;--> statement-breakpoint
ALTER TABLE "scf_controls" ADD COLUMN "control_weight" numeric(6, 3);--> statement-breakpoint
ALTER TABLE "scf_controls" ADD COLUMN "maturity_criteria_ref" text;--> statement-breakpoint
ALTER TABLE "scf_controls" ADD COLUMN "sort_order" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "scf_controls" ADD COLUMN "status" text DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE "scf_controls" ADD COLUMN "is_synthetic" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "scf_domains" ADD COLUMN "sort_order" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "scf_domains" ADD COLUMN "is_synthetic" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "scf_framework_requirements" ADD COLUMN "requirement_text" text;--> statement-breakpoint
ALTER TABLE "scf_framework_requirements" ADD COLUMN "parent_requirement_id" uuid;--> statement-breakpoint
ALTER TABLE "scf_framework_requirements" ADD COLUMN "sort_order" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "scf_framework_requirements" ADD COLUMN "status" text DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE "scf_framework_requirements" ADD COLUMN "is_synthetic" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "scf_frameworks" ADD COLUMN "jurisdiction" text;--> statement-breakpoint
ALTER TABLE "scf_frameworks" ADD COLUMN "category" text;--> statement-breakpoint
ALTER TABLE "scf_frameworks" ADD COLUMN "source_reference" text;--> statement-breakpoint
ALTER TABLE "scf_frameworks" ADD COLUMN "status" text DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE "scf_frameworks" ADD COLUMN "is_synthetic" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "scf_mappings" ADD COLUMN "is_official" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "scf_mappings" ADD COLUMN "status" text DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE "scf_mappings" ADD COLUMN "is_synthetic" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "soa_items" ADD COLUMN "framework_id" uuid;--> statement-breakpoint
ALTER TABLE "soa_items" ADD COLUMN "framework_requirement_id" uuid;--> statement-breakpoint
ALTER TABLE "soa_items" ADD COLUMN "scf_version_id" uuid;--> statement-breakpoint
ALTER TABLE "soa_items" ADD COLUMN "applicability_status" text DEFAULT 'requires_validation' NOT NULL;--> statement-breakpoint
ALTER TABLE "soa_items" ADD COLUMN "implementation_status" text DEFAULT 'not_assessed' NOT NULL;--> statement-breakpoint
ALTER TABLE "soa_items" ADD COLUMN "applicability_rationale" text;--> statement-breakpoint
ALTER TABLE "soa_items" ADD COLUMN "non_applicability_rationale" text;--> statement-breakpoint
ALTER TABLE "soa_items" ADD COLUMN "scope_rationale" text;--> statement-breakpoint
ALTER TABLE "soa_items" ADD COLUMN "evidence_summary" text;--> statement-breakpoint
ALTER TABLE "soa_items" ADD COLUMN "evidence_coverage" text DEFAULT 'not_checked' NOT NULL;--> statement-breakpoint
ALTER TABLE "soa_items" ADD COLUMN "confidence_score" numeric(5, 4);--> statement-breakpoint
ALTER TABLE "soa_items" ADD COLUMN "requires_user_validation" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "soa_items" ADD COLUMN "validation_notes" text;--> statement-breakpoint
ALTER TABLE "soa_items" ADD COLUMN "source_mapping_id" uuid;--> statement-breakpoint
ALTER TABLE "soa_items" ADD COLUMN "mapping_status" text DEFAULT 'official_mapping' NOT NULL;--> statement-breakpoint
ALTER TABLE "soa_items" ADD COLUMN "relationship_type" text;--> statement-breakpoint
ALTER TABLE "soa_items" ADD COLUMN "relationship_strength" text;--> statement-breakpoint
ALTER TABLE "soa_versions" ADD COLUMN "source_framework_id" uuid;--> statement-breakpoint
ALTER TABLE "soa_versions" ADD COLUMN "scf_version_id" uuid;--> statement-breakpoint
ALTER TABLE "soa_versions" ADD COLUMN "source_scope_id" uuid;--> statement-breakpoint
ALTER TABLE "soa_versions" ADD COLUMN "created_by" uuid;--> statement-breakpoint
ALTER TABLE "soa_versions" ADD COLUMN "submitted_for_review_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "soa_versions" ADD COLUMN "approved_by" uuid;--> statement-breakpoint
ALTER TABLE "soa_versions" ADD COLUMN "approved_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "soa_versions" ADD COLUMN "superseded_by" uuid;--> statement-breakpoint
ALTER TABLE "soa_versions" ADD COLUMN "trace_id" text;--> statement-breakpoint
ALTER TABLE "soa_versions" ADD COLUMN "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "agent_tool_calls" ADD CONSTRAINT "agent_tool_calls_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_tool_calls" ADD CONSTRAINT "agent_tool_calls_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_tool_calls" ADD CONSTRAINT "agent_tool_calls_assessment_id_assessments_id_fk" FOREIGN KEY ("assessment_id") REFERENCES "public"."assessments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_tool_calls" ADD CONSTRAINT "agent_tool_calls_agent_run_id_agent_runs_id_fk" FOREIGN KEY ("agent_run_id") REFERENCES "public"."agent_runs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "export_jobs" ADD CONSTRAINT "export_jobs_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "export_jobs" ADD CONSTRAINT "export_jobs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "export_jobs" ADD CONSTRAINT "export_jobs_assessment_id_assessments_id_fk" FOREIGN KEY ("assessment_id") REFERENCES "public"."assessments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "export_jobs" ADD CONSTRAINT "export_jobs_report_version_id_report_versions_id_fk" FOREIGN KEY ("report_version_id") REFERENCES "public"."report_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "export_jobs" ADD CONSTRAINT "export_jobs_requested_by_users_id_fk" FOREIGN KEY ("requested_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kb_embedding_jobs" ADD CONSTRAINT "kb_embedding_jobs_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kb_embedding_jobs" ADD CONSTRAINT "kb_embedding_jobs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kb_embedding_jobs" ADD CONSTRAINT "kb_embedding_jobs_assessment_id_assessments_id_fk" FOREIGN KEY ("assessment_id") REFERENCES "public"."assessments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kb_embedding_jobs" ADD CONSTRAINT "kb_embedding_jobs_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kb_embedding_jobs" ADD CONSTRAINT "kb_embedding_jobs_chunk_id_document_chunks_id_fk" FOREIGN KEY ("chunk_id") REFERENCES "public"."document_chunks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kb_search_logs" ADD CONSTRAINT "kb_search_logs_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kb_search_logs" ADD CONSTRAINT "kb_search_logs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kb_search_logs" ADD CONSTRAINT "kb_search_logs_assessment_id_assessments_id_fk" FOREIGN KEY ("assessment_id") REFERENCES "public"."assessments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kb_search_logs" ADD CONSTRAINT "kb_search_logs_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "poam_dependencies" ADD CONSTRAINT "poam_dependencies_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "poam_dependencies" ADD CONSTRAINT "poam_dependencies_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "poam_dependencies" ADD CONSTRAINT "poam_dependencies_assessment_id_assessments_id_fk" FOREIGN KEY ("assessment_id") REFERENCES "public"."assessments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "poam_dependencies" ADD CONSTRAINT "poam_dependencies_poam_item_id_poam_items_id_fk" FOREIGN KEY ("poam_item_id") REFERENCES "public"."poam_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "poam_dependencies" ADD CONSTRAINT "poam_dependencies_depends_on_poam_item_id_poam_items_id_fk" FOREIGN KEY ("depends_on_poam_item_id") REFERENCES "public"."poam_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "poam_milestones" ADD CONSTRAINT "poam_milestones_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "poam_milestones" ADD CONSTRAINT "poam_milestones_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "poam_milestones" ADD CONSTRAINT "poam_milestones_assessment_id_assessments_id_fk" FOREIGN KEY ("assessment_id") REFERENCES "public"."assessments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "poam_milestones" ADD CONSTRAINT "poam_milestones_poam_item_id_poam_items_id_fk" FOREIGN KEY ("poam_item_id") REFERENCES "public"."poam_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scf_import_runs" ADD CONSTRAINT "scf_import_runs_scf_version_id_scf_versions_id_fk" FOREIGN KEY ("scf_version_id") REFERENCES "public"."scf_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_audit_events" ADD CONSTRAINT "workflow_audit_events_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_audit_events" ADD CONSTRAINT "workflow_audit_events_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_audit_events" ADD CONSTRAINT "workflow_audit_events_assessment_id_assessments_id_fk" FOREIGN KEY ("assessment_id") REFERENCES "public"."assessments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_audit_events" ADD CONSTRAINT "workflow_audit_events_workflow_run_id_workflow_runs_id_fk" FOREIGN KEY ("workflow_run_id") REFERENCES "public"."workflow_runs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_audit_events" ADD CONSTRAINT "workflow_audit_events_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_runs" ADD CONSTRAINT "workflow_runs_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_runs" ADD CONSTRAINT "workflow_runs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_runs" ADD CONSTRAINT "workflow_runs_assessment_id_assessments_id_fk" FOREIGN KEY ("assessment_id") REFERENCES "public"."assessments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "apikey" ADD CONSTRAINT "apikey_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitation" ADD CONSTRAINT "invitation_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitation" ADD CONSTRAINT "invitation_inviter_id_user_id_fk" FOREIGN KEY ("inviter_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member" ADD CONSTRAINT "member_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member" ADD CONSTRAINT "member_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "agent_tool_calls_run_idx" ON "agent_tool_calls" USING btree ("agent_run_id");--> statement-breakpoint
CREATE INDEX "agent_tool_calls_assessment_idx" ON "agent_tool_calls" USING btree ("tenant_id","organization_id","assessment_id");--> statement-breakpoint
CREATE INDEX "agent_tool_calls_trace_idx" ON "agent_tool_calls" USING btree ("trace_id");--> statement-breakpoint
CREATE INDEX "export_jobs_assessment_idx" ON "export_jobs" USING btree ("tenant_id","organization_id","assessment_id");--> statement-breakpoint
CREATE INDEX "export_jobs_report_idx" ON "export_jobs" USING btree ("report_version_id");--> statement-breakpoint
CREATE INDEX "export_jobs_status_idx" ON "export_jobs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "kb_embedding_jobs_assessment_idx" ON "kb_embedding_jobs" USING btree ("tenant_id","organization_id","assessment_id");--> statement-breakpoint
CREATE INDEX "kb_embedding_jobs_document_idx" ON "kb_embedding_jobs" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX "kb_embedding_jobs_status_idx" ON "kb_embedding_jobs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "kb_embedding_jobs_trace_idx" ON "kb_embedding_jobs" USING btree ("trace_id");--> statement-breakpoint
CREATE INDEX "kb_search_logs_assessment_idx" ON "kb_search_logs" USING btree ("tenant_id","organization_id","assessment_id");--> statement-breakpoint
CREATE INDEX "kb_search_logs_trace_idx" ON "kb_search_logs" USING btree ("trace_id");--> statement-breakpoint
CREATE INDEX "kb_search_logs_query_hash_idx" ON "kb_search_logs" USING btree ("query_hash");--> statement-breakpoint
CREATE INDEX "poam_dependencies_item_idx" ON "poam_dependencies" USING btree ("poam_item_id");--> statement-breakpoint
CREATE INDEX "poam_dependencies_depends_on_idx" ON "poam_dependencies" USING btree ("depends_on_poam_item_id");--> statement-breakpoint
CREATE INDEX "poam_milestones_item_idx" ON "poam_milestones" USING btree ("poam_item_id");--> statement-breakpoint
CREATE UNIQUE INDEX "poam_milestones_item_code_uidx" ON "poam_milestones" USING btree ("poam_item_id","milestone_code");--> statement-breakpoint
CREATE INDEX "scf_import_runs_version_idx" ON "scf_import_runs" USING btree ("scf_version_id");--> statement-breakpoint
CREATE INDEX "scf_import_runs_status_idx" ON "scf_import_runs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "scf_import_runs_trace_idx" ON "scf_import_runs" USING btree ("trace_id");--> statement-breakpoint
CREATE INDEX "workflow_audit_events_run_idx" ON "workflow_audit_events" USING btree ("workflow_run_id");--> statement-breakpoint
CREATE INDEX "workflow_audit_events_assessment_idx" ON "workflow_audit_events" USING btree ("tenant_id","organization_id","assessment_id");--> statement-breakpoint
CREATE INDEX "workflow_audit_events_trace_idx" ON "workflow_audit_events" USING btree ("trace_id");--> statement-breakpoint
CREATE INDEX "workflow_runs_assessment_idx" ON "workflow_runs" USING btree ("tenant_id","organization_id","assessment_id");--> statement-breakpoint
CREATE INDEX "workflow_runs_status_idx" ON "workflow_runs" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "workflow_runs_idempotency_uidx" ON "workflow_runs" USING btree ("idempotency_key");--> statement-breakpoint
CREATE INDEX "ba_account_user_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "ba_apikey_user_idx" ON "apikey" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "ba_invitation_org_idx" ON "invitation" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "ba_member_org_idx" ON "member" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "ba_member_user_idx" ON "member" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "ba_session_user_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "ba_session_token_idx" ON "session" USING btree ("token");--> statement-breakpoint
ALTER TABLE "assessment_scope" ADD CONSTRAINT "assessment_scope_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence_findings" ADD CONSTRAINT "evidence_findings_soa_version_id_soa_versions_id_fk" FOREIGN KEY ("soa_version_id") REFERENCES "public"."soa_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence_findings" ADD CONSTRAINT "evidence_findings_framework_id_scf_frameworks_id_fk" FOREIGN KEY ("framework_id") REFERENCES "public"."scf_frameworks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence_findings" ADD CONSTRAINT "evidence_findings_framework_requirement_id_scf_framework_requirements_id_fk" FOREIGN KEY ("framework_requirement_id") REFERENCES "public"."scf_framework_requirements"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence_findings" ADD CONSTRAINT "evidence_findings_scf_version_id_scf_versions_id_fk" FOREIGN KEY ("scf_version_id") REFERENCES "public"."scf_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence_findings" ADD CONSTRAINT "evidence_findings_generated_by_agent_run_id_agent_runs_id_fk" FOREIGN KEY ("generated_by_agent_run_id") REFERENCES "public"."agent_runs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence_sources" ADD CONSTRAINT "evidence_sources_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence_sources" ADD CONSTRAINT "evidence_sources_chunk_id_document_chunks_id_fk" FOREIGN KEY ("chunk_id") REFERENCES "public"."document_chunks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence_sources" ADD CONSTRAINT "evidence_sources_vector_reference_id_vector_references_id_fk" FOREIGN KEY ("vector_reference_id") REFERENCES "public"."vector_references"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gap_analysis_versions" ADD CONSTRAINT "gap_analysis_versions_source_soa_version_id_soa_versions_id_fk" FOREIGN KEY ("source_soa_version_id") REFERENCES "public"."soa_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gap_analysis_versions" ADD CONSTRAINT "gap_analysis_versions_framework_id_scf_frameworks_id_fk" FOREIGN KEY ("framework_id") REFERENCES "public"."scf_frameworks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gap_analysis_versions" ADD CONSTRAINT "gap_analysis_versions_scf_version_id_scf_versions_id_fk" FOREIGN KEY ("scf_version_id") REFERENCES "public"."scf_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gap_analysis_versions" ADD CONSTRAINT "gap_analysis_versions_generated_by_agent_run_id_agent_runs_id_fk" FOREIGN KEY ("generated_by_agent_run_id") REFERENCES "public"."agent_runs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gap_analysis_versions" ADD CONSTRAINT "gap_analysis_versions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gap_analysis_versions" ADD CONSTRAINT "gap_analysis_versions_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gap_findings" ADD CONSTRAINT "gap_findings_soa_version_id_soa_versions_id_fk" FOREIGN KEY ("soa_version_id") REFERENCES "public"."soa_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gap_findings" ADD CONSTRAINT "gap_findings_framework_id_scf_frameworks_id_fk" FOREIGN KEY ("framework_id") REFERENCES "public"."scf_frameworks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gap_findings" ADD CONSTRAINT "gap_findings_scf_version_id_scf_versions_id_fk" FOREIGN KEY ("scf_version_id") REFERENCES "public"."scf_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "poam_items" ADD CONSTRAINT "poam_items_related_gap_finding_id_gap_findings_id_fk" FOREIGN KEY ("related_gap_finding_id") REFERENCES "public"."gap_findings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "poam_items" ADD CONSTRAINT "poam_items_source_maturity_score_id_maturity_scores_id_fk" FOREIGN KEY ("source_maturity_score_id") REFERENCES "public"."maturity_scores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "poam_items" ADD CONSTRAINT "poam_items_soa_item_id_soa_items_id_fk" FOREIGN KEY ("soa_item_id") REFERENCES "public"."soa_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "poam_items" ADD CONSTRAINT "poam_items_framework_id_scf_frameworks_id_fk" FOREIGN KEY ("framework_id") REFERENCES "public"."scf_frameworks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "poam_items" ADD CONSTRAINT "poam_items_scf_version_id_scf_versions_id_fk" FOREIGN KEY ("scf_version_id") REFERENCES "public"."scf_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "poam_items" ADD CONSTRAINT "poam_items_scf_domain_id_scf_domains_id_fk" FOREIGN KEY ("scf_domain_id") REFERENCES "public"."scf_domains"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "poam_versions" ADD CONSTRAINT "poam_versions_source_gap_analysis_version_id_gap_analysis_versions_id_fk" FOREIGN KEY ("source_gap_analysis_version_id") REFERENCES "public"."gap_analysis_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "poam_versions" ADD CONSTRAINT "poam_versions_source_maturity_assessment_version_id_maturity_assessment_versions_id_fk" FOREIGN KEY ("source_maturity_assessment_version_id") REFERENCES "public"."maturity_assessment_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "poam_versions" ADD CONSTRAINT "poam_versions_framework_id_scf_frameworks_id_fk" FOREIGN KEY ("framework_id") REFERENCES "public"."scf_frameworks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "poam_versions" ADD CONSTRAINT "poam_versions_scf_version_id_scf_versions_id_fk" FOREIGN KEY ("scf_version_id") REFERENCES "public"."scf_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "poam_versions" ADD CONSTRAINT "poam_versions_generated_by_agent_run_id_agent_runs_id_fk" FOREIGN KEY ("generated_by_agent_run_id") REFERENCES "public"."agent_runs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "poam_versions" ADD CONSTRAINT "poam_versions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "poam_versions" ADD CONSTRAINT "poam_versions_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_versions" ADD CONSTRAINT "report_versions_source_scope_id_assessment_scope_id_fk" FOREIGN KEY ("source_scope_id") REFERENCES "public"."assessment_scope"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_versions" ADD CONSTRAINT "report_versions_source_soa_version_id_soa_versions_id_fk" FOREIGN KEY ("source_soa_version_id") REFERENCES "public"."soa_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_versions" ADD CONSTRAINT "report_versions_source_gap_analysis_version_id_gap_analysis_versions_id_fk" FOREIGN KEY ("source_gap_analysis_version_id") REFERENCES "public"."gap_analysis_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_versions" ADD CONSTRAINT "report_versions_source_maturity_assessment_version_id_maturity_assessment_versions_id_fk" FOREIGN KEY ("source_maturity_assessment_version_id") REFERENCES "public"."maturity_assessment_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_versions" ADD CONSTRAINT "report_versions_source_poam_version_id_poam_versions_id_fk" FOREIGN KEY ("source_poam_version_id") REFERENCES "public"."poam_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_versions" ADD CONSTRAINT "report_versions_framework_id_scf_frameworks_id_fk" FOREIGN KEY ("framework_id") REFERENCES "public"."scf_frameworks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_versions" ADD CONSTRAINT "report_versions_scf_version_id_scf_versions_id_fk" FOREIGN KEY ("scf_version_id") REFERENCES "public"."scf_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_versions" ADD CONSTRAINT "report_versions_generated_by_agent_run_id_agent_runs_id_fk" FOREIGN KEY ("generated_by_agent_run_id") REFERENCES "public"."agent_runs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_versions" ADD CONSTRAINT "report_versions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_versions" ADD CONSTRAINT "report_versions_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "soa_items" ADD CONSTRAINT "soa_items_framework_id_scf_frameworks_id_fk" FOREIGN KEY ("framework_id") REFERENCES "public"."scf_frameworks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "soa_items" ADD CONSTRAINT "soa_items_framework_requirement_id_scf_framework_requirements_id_fk" FOREIGN KEY ("framework_requirement_id") REFERENCES "public"."scf_framework_requirements"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "soa_items" ADD CONSTRAINT "soa_items_scf_version_id_scf_versions_id_fk" FOREIGN KEY ("scf_version_id") REFERENCES "public"."scf_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "soa_items" ADD CONSTRAINT "soa_items_source_mapping_id_scf_mappings_id_fk" FOREIGN KEY ("source_mapping_id") REFERENCES "public"."scf_mappings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "soa_versions" ADD CONSTRAINT "soa_versions_source_framework_id_scf_frameworks_id_fk" FOREIGN KEY ("source_framework_id") REFERENCES "public"."scf_frameworks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "soa_versions" ADD CONSTRAINT "soa_versions_scf_version_id_scf_versions_id_fk" FOREIGN KEY ("scf_version_id") REFERENCES "public"."scf_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "soa_versions" ADD CONSTRAINT "soa_versions_source_scope_id_assessment_scope_id_fk" FOREIGN KEY ("source_scope_id") REFERENCES "public"."assessment_scope"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "soa_versions" ADD CONSTRAINT "soa_versions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "soa_versions" ADD CONSTRAINT "soa_versions_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "evidence_findings_soa_item_idx" ON "evidence_findings" USING btree ("soa_item_id");--> statement-breakpoint
CREATE INDEX "evidence_sources_vector_reference_idx" ON "evidence_sources" USING btree ("vector_reference_id");--> statement-breakpoint
CREATE INDEX "poam_items_control_idx" ON "poam_items" USING btree ("scf_control_id");--> statement-breakpoint
CREATE INDEX "poam_versions_gap_idx" ON "poam_versions" USING btree ("source_gap_analysis_version_id");--> statement-breakpoint
CREATE INDEX "report_versions_sources_idx" ON "report_versions" USING btree ("source_soa_version_id","source_gap_analysis_version_id","source_poam_version_id");--> statement-breakpoint
CREATE INDEX "evidence_findings_agent_idx" ON "evidence_findings" USING btree ("generated_by_agent_run_id");--> statement-breakpoint
CREATE INDEX "evidence_sources_chunk_idx" ON "evidence_sources" USING btree ("chunk_id");--> statement-breakpoint
CREATE UNIQUE INDEX "gap_findings_version_code_uidx" ON "gap_findings" USING btree ("gap_analysis_version_id","gap_code");--> statement-breakpoint
CREATE INDEX "poam_items_gap_idx" ON "poam_items" USING btree ("related_gap_finding_id");--> statement-breakpoint
CREATE UNIQUE INDEX "poam_items_version_code_uidx" ON "poam_items" USING btree ("poam_version_id","poam_code");--> statement-breakpoint
ALTER TABLE "evidence_findings" DROP COLUMN "agent_run_id";--> statement-breakpoint
ALTER TABLE "evidence_findings" DROP COLUMN "strength";--> statement-breakpoint
ALTER TABLE "evidence_findings" DROP COLUMN "status";--> statement-breakpoint
ALTER TABLE "evidence_findings" DROP COLUMN "summary";--> statement-breakpoint
ALTER TABLE "evidence_findings" DROP COLUMN "rationale";--> statement-breakpoint
ALTER TABLE "evidence_sources" DROP COLUMN "document_chunk_id";--> statement-breakpoint
ALTER TABLE "evidence_sources" DROP COLUMN "soa_item_id";--> statement-breakpoint
ALTER TABLE "evidence_sources" DROP COLUMN "source_hash";--> statement-breakpoint
ALTER TABLE "evidence_sources" DROP COLUMN "excerpt_hash";--> statement-breakpoint
ALTER TABLE "gap_analysis_versions" DROP COLUMN "created_by_agent_run_id";--> statement-breakpoint
ALTER TABLE "gap_findings" DROP COLUMN "finding_code";--> statement-breakpoint
ALTER TABLE "gap_findings" DROP COLUMN "agent_run_id";--> statement-breakpoint
ALTER TABLE "gap_findings" DROP COLUMN "trace_id";--> statement-breakpoint
ALTER TABLE "gap_findings" DROP COLUMN "status";--> statement-breakpoint
ALTER TABLE "gap_findings" DROP COLUMN "summary";--> statement-breakpoint
ALTER TABLE "gap_findings" DROP COLUMN "rationale";--> statement-breakpoint
ALTER TABLE "poam_items" DROP COLUMN "item_code";--> statement-breakpoint
ALTER TABLE "poam_items" DROP COLUMN "related_gap_id";--> statement-breakpoint
ALTER TABLE "poam_items" DROP COLUMN "dependencies";--> statement-breakpoint
ALTER TABLE "poam_versions" DROP COLUMN "created_by_agent_run_id";--> statement-breakpoint
ALTER TABLE "report_versions" DROP COLUMN "created_by_agent_run_id";
