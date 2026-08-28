-- CREATE EXTENSION IF NOT EXISTS pgcrypto;--> statement-breakpoint
CREATE TYPE "public"."agent_run_status" AS ENUM('queued', 'running', 'completed', 'failed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."approval_decision" AS ENUM('approved', 'rejected', 'changes_requested');--> statement-breakpoint
CREATE TYPE "public"."approval_gate" AS ENUM('soa', 'gap_analysis', 'maturity_assessment', 'poam', 'report');--> statement-breakpoint
CREATE TYPE "public"."artifact_status" AS ENUM('draft', 'under_review', 'approved', 'superseded', 'archived');--> statement-breakpoint
CREATE TYPE "public"."assessment_state" AS ENUM('draft', 'documents_ingesting', 'kb_building', 'preliminary_scf_analysis', 'framework_selection_pending', 'scope_soa_drafting', 'soa_approval_pending', 'soa_reingesting', 'gap_analysis_running', 'gap_analysis_approval_pending', 'maturity_assessment_running', 'maturity_approval_pending', 'poam_generation_running', 'poam_approval_pending', 'completed', 'cancelled', 'failed');--> statement-breakpoint
CREATE TYPE "public"."document_classification" AS ENUM('public', 'internal', 'confidential', 'restricted');--> statement-breakpoint
CREATE TYPE "public"."document_type" AS ENUM('policy', 'procedure', 'standard', 'evidence', 'soa', 'report', 'other');--> statement-breakpoint
CREATE TYPE "public"."evidence_strength" AS ENUM('strong', 'partial', 'weak', 'absent', 'conflicting', 'not_checked');--> statement-breakpoint
CREATE TYPE "public"."extraction_job_status" AS ENUM('queued', 'processing', 'completed', 'failed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."gap_status" AS ENUM('met', 'partially_met', 'not_met', 'not_evidenced', 'not_applicable_justified', 'not_applicable_not_justified', 'requires_validation');--> statement-breakpoint
CREATE TYPE "public"."gap_type" AS ENUM('documentation_gap', 'implementation_gap', 'evidence_gap', 'effectiveness_gap', 'governance_gap', 'technical_gap', 'contractual_gap', 'monitoring_gap', 'no_gap', 'not_applicable');--> statement-breakpoint
CREATE TYPE "public"."mapping_source" AS ENUM('official_scf', 'derived', 'consultative');--> statement-breakpoint
CREATE TYPE "public"."poam_status" AS ENUM('draft', 'approved', 'in_progress', 'blocked', 'completed', 'cancelled', 'deferred');--> statement-breakpoint
CREATE TYPE "public"."priority" AS ENUM('low', 'medium', 'high', 'critical', 'urgent');--> statement-breakpoint
CREATE TYPE "public"."severity" AS ENUM('informational', 'low', 'medium', 'high', 'critical');--> statement-breakpoint
CREATE TYPE "public"."storage_provider" AS ENUM('r2', 'external', 'r2_compatible_mock');--> statement-breakpoint
CREATE TABLE "agent_decisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"organization_id" uuid NOT NULL,
	"assessment_id" uuid,
	"agent_run_id" uuid NOT NULL,
	"decision_type" text NOT NULL,
	"decision_summary" text NOT NULL,
	"assumptions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"limitations" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"sources" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"confidence_score" numeric(5, 4) NOT NULL,
	"trace_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agent_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"organization_id" uuid NOT NULL,
	"assessment_id" uuid,
	"agent_name" text NOT NULL,
	"agent_version" text NOT NULL,
	"model_provider" text,
	"model_name" text,
	"prompt_version" text NOT NULL,
	"input_hash" text NOT NULL,
	"output_hash" text,
	"confidence_score" numeric(5, 4),
	"status" "agent_run_status" DEFAULT 'queued' NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"trace_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "approval_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"organization_id" uuid NOT NULL,
	"assessment_id" uuid NOT NULL,
	"gate" "approval_gate" NOT NULL,
	"decision" "approval_decision" NOT NULL,
	"artifact_type" text NOT NULL,
	"artifact_id" uuid NOT NULL,
	"reviewer_user_id" uuid NOT NULL,
	"comment" text,
	"trace_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "assessment_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"organization_id" uuid NOT NULL,
	"assessment_id" uuid NOT NULL,
	"previous_state" "assessment_state",
	"next_state" "assessment_state" NOT NULL,
	"event_type" text NOT NULL,
	"actor_id" uuid,
	"trace_id" text NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "assessment_frameworks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"organization_id" uuid NOT NULL,
	"assessment_id" uuid NOT NULL,
	"scf_framework_id" uuid NOT NULL,
	"status" "artifact_status" DEFAULT 'draft' NOT NULL,
	"selected_by" uuid,
	"selected_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "assessment_scope" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"organization_id" uuid NOT NULL,
	"assessment_id" uuid NOT NULL,
	"status" "artifact_status" DEFAULT 'draft' NOT NULL,
	"scope_summary" text NOT NULL,
	"inclusions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"exclusions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"assumptions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"approval_event_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "assessments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"organization_id" uuid NOT NULL,
	"name" text NOT NULL,
	"state" "assessment_state" DEFAULT 'draft' NOT NULL,
	"scf_version_id" uuid NOT NULL,
	"created_by" uuid,
	"trace_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_id" uuid,
	"tenant_id" uuid,
	"organization_id" uuid,
	"action" text NOT NULL,
	"resource_type" text NOT NULL,
	"resource_id" uuid,
	"ip_address" text,
	"user_agent" text,
	"trace_id" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "document_chunks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"organization_id" uuid NOT NULL,
	"assessment_id" uuid,
	"document_id" uuid NOT NULL,
	"document_version_id" uuid,
	"chunk_index" integer NOT NULL,
	"text_hash" text NOT NULL,
	"page_number" integer,
	"location_metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"approximate_token_count" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "document_extraction_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"organization_id" uuid NOT NULL,
	"assessment_id" uuid,
	"document_id" uuid NOT NULL,
	"status" "extraction_job_status" DEFAULT 'queued' NOT NULL,
	"error_code" text,
	"error_message" text,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"trace_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "document_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"organization_id" uuid NOT NULL,
	"assessment_id" uuid,
	"document_id" uuid NOT NULL,
	"version_number" integer NOT NULL,
	"storage_key" text NOT NULL,
	"content_hash" text NOT NULL,
	"status" "artifact_status" DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"organization_id" uuid NOT NULL,
	"assessment_id" uuid,
	"original_filename" text NOT NULL,
	"storage_provider" "storage_provider" DEFAULT 'r2' NOT NULL,
	"storage_key" text NOT NULL,
	"content_hash" text NOT NULL,
	"mime_type" text NOT NULL,
	"file_size" bigint NOT NULL,
	"uploaded_by" uuid,
	"uploaded_at" timestamp with time zone DEFAULT now() NOT NULL,
	"classification" "document_classification" DEFAULT 'internal' NOT NULL,
	"document_type" "document_type" DEFAULT 'other' NOT NULL,
	"effective_date" date,
	"version_label" text,
	"language" text DEFAULT 'und' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "evidence_findings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"organization_id" uuid NOT NULL,
	"assessment_id" uuid NOT NULL,
	"soa_item_id" uuid,
	"scf_control_id" uuid,
	"agent_run_id" uuid,
	"strength" "evidence_strength" NOT NULL,
	"status" text DEFAULT 'not_evidenced' NOT NULL,
	"summary" text NOT NULL,
	"rationale" text,
	"confidence_score" numeric(5, 4),
	"trace_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "evidence_sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"organization_id" uuid NOT NULL,
	"assessment_id" uuid NOT NULL,
	"evidence_finding_id" uuid NOT NULL,
	"document_chunk_id" uuid,
	"soa_item_id" uuid,
	"source_type" text NOT NULL,
	"source_hash" text,
	"excerpt_hash" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gap_analysis_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"organization_id" uuid NOT NULL,
	"assessment_id" uuid NOT NULL,
	"version_number" integer NOT NULL,
	"status" "artifact_status" DEFAULT 'draft' NOT NULL,
	"approval_event_id" uuid,
	"created_by_agent_run_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "gap_findings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"organization_id" uuid NOT NULL,
	"assessment_id" uuid NOT NULL,
	"gap_analysis_version_id" uuid NOT NULL,
	"finding_code" text NOT NULL,
	"framework_requirement_id" uuid NOT NULL,
	"scf_control_id" uuid NOT NULL,
	"soa_item_id" uuid,
	"evidence_finding_id" uuid,
	"agent_run_id" uuid,
	"trace_id" text NOT NULL,
	"status" "gap_status" NOT NULL,
	"gap_type" "gap_type" NOT NULL,
	"summary" text NOT NULL,
	"rationale" text NOT NULL,
	"confidence_score" numeric(5, 4),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "kb_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"organization_id" uuid NOT NULL,
	"assessment_id" uuid NOT NULL,
	"document_chunk_id" uuid,
	"entry_type" text NOT NULL,
	"content_hash" text NOT NULL,
	"source_summary" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "maturity_assessment_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"organization_id" uuid NOT NULL,
	"assessment_id" uuid NOT NULL,
	"version_number" integer NOT NULL,
	"status" "artifact_status" DEFAULT 'draft' NOT NULL,
	"approval_event_id" uuid,
	"created_by_agent_run_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "maturity_scores" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"organization_id" uuid NOT NULL,
	"assessment_id" uuid NOT NULL,
	"maturity_assessment_version_id" uuid NOT NULL,
	"scf_control_id" uuid NOT NULL,
	"score" integer NOT NULL,
	"confidence_score" numeric(5, 4) NOT NULL,
	"rationale" text NOT NULL,
	"evidence_coverage" numeric(5, 4) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "memberships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"organization_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role_id" uuid NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "poam_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"organization_id" uuid NOT NULL,
	"assessment_id" uuid NOT NULL,
	"poam_version_id" uuid NOT NULL,
	"item_code" text NOT NULL,
	"related_gap_id" uuid NOT NULL,
	"scf_control_id" uuid NOT NULL,
	"framework_requirement_id" uuid NOT NULL,
	"corrective_action" text NOT NULL,
	"priority" "priority" NOT NULL,
	"severity" "severity" NOT NULL,
	"suggested_owner" text,
	"due_date" date,
	"dependencies" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"expected_evidence" text NOT NULL,
	"acceptance_criteria" text NOT NULL,
	"status" "poam_status" DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "poam_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"organization_id" uuid NOT NULL,
	"assessment_id" uuid NOT NULL,
	"version_number" integer NOT NULL,
	"status" "artifact_status" DEFAULT 'draft' NOT NULL,
	"approval_event_id" uuid,
	"created_by_agent_run_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "report_artifacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"organization_id" uuid NOT NULL,
	"assessment_id" uuid NOT NULL,
	"report_version_id" uuid NOT NULL,
	"storage_provider" "storage_provider" DEFAULT 'r2' NOT NULL,
	"storage_key" text NOT NULL,
	"content_hash" text NOT NULL,
	"mime_type" text NOT NULL,
	"file_size" bigint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "report_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"organization_id" uuid NOT NULL,
	"assessment_id" uuid NOT NULL,
	"version_number" integer NOT NULL,
	"report_type" text NOT NULL,
	"status" "artifact_status" DEFAULT 'draft' NOT NULL,
	"approval_event_id" uuid,
	"created_by_agent_run_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "scf_control_metadata" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"scf_version_id" uuid NOT NULL,
	"scf_control_id" uuid NOT NULL,
	"risk_weight" numeric(6, 3),
	"threat_tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"maturity_guidance" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "scf_controls" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"scf_version_id" uuid NOT NULL,
	"scf_domain_id" uuid NOT NULL,
	"control_code" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "scf_domains" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"scf_version_id" uuid NOT NULL,
	"domain_code" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "scf_framework_requirements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"scf_version_id" uuid NOT NULL,
	"scf_framework_id" uuid NOT NULL,
	"requirement_code" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "scf_frameworks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"scf_version_id" uuid NOT NULL,
	"framework_id" text NOT NULL,
	"name" text NOT NULL,
	"version_label" text NOT NULL,
	"publisher" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "scf_mappings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"scf_version_id" uuid NOT NULL,
	"scf_framework_requirement_id" uuid NOT NULL,
	"scf_control_id" uuid NOT NULL,
	"relationship_type" text NOT NULL,
	"relationship_strength" text NOT NULL,
	"mapping_rationale" text,
	"mapping_source" "mapping_source" DEFAULT 'official_scf' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "scf_strm_relationships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"scf_mapping_id" uuid NOT NULL,
	"relationship_type" text NOT NULL,
	"relationship_strength" text NOT NULL,
	"rationale" text,
	"source" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "scf_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"version" text NOT NULL,
	"source_uri" text,
	"content_hash" text,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "soa_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"organization_id" uuid NOT NULL,
	"assessment_id" uuid NOT NULL,
	"soa_version_id" uuid NOT NULL,
	"scf_control_id" uuid NOT NULL,
	"scf_framework_requirement_id" uuid,
	"applicability" text NOT NULL,
	"justification" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "soa_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"organization_id" uuid NOT NULL,
	"assessment_id" uuid NOT NULL,
	"version_number" integer NOT NULL,
	"status" "artifact_status" DEFAULT 'draft' NOT NULL,
	"approval_event_id" uuid,
	"created_by_agent_run_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "tenants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "traceability_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"organization_id" uuid NOT NULL,
	"assessment_id" uuid,
	"source_type" text NOT NULL,
	"source_id" uuid NOT NULL,
	"target_type" text NOT NULL,
	"target_id" uuid NOT NULL,
	"relationship_type" text NOT NULL,
	"trace_id" text NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"display_name" text NOT NULL,
	"identity_provider" text,
	"identity_provider_subject" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "vector_references" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"organization_id" uuid NOT NULL,
	"assessment_id" uuid NOT NULL,
	"kb_entry_id" uuid NOT NULL,
	"vector_provider" text DEFAULT 'cloudflare_vectorize' NOT NULL,
	"vector_index_name" text NOT NULL,
	"vector_id" text NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "agent_decisions" ADD CONSTRAINT "agent_decisions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_decisions" ADD CONSTRAINT "agent_decisions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_decisions" ADD CONSTRAINT "agent_decisions_assessment_id_assessments_id_fk" FOREIGN KEY ("assessment_id") REFERENCES "public"."assessments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_decisions" ADD CONSTRAINT "agent_decisions_agent_run_id_agent_runs_id_fk" FOREIGN KEY ("agent_run_id") REFERENCES "public"."agent_runs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_runs" ADD CONSTRAINT "agent_runs_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_runs" ADD CONSTRAINT "agent_runs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_runs" ADD CONSTRAINT "agent_runs_assessment_id_assessments_id_fk" FOREIGN KEY ("assessment_id") REFERENCES "public"."assessments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_events" ADD CONSTRAINT "approval_events_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_events" ADD CONSTRAINT "approval_events_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_events" ADD CONSTRAINT "approval_events_assessment_id_assessments_id_fk" FOREIGN KEY ("assessment_id") REFERENCES "public"."assessments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_events" ADD CONSTRAINT "approval_events_reviewer_user_id_users_id_fk" FOREIGN KEY ("reviewer_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment_events" ADD CONSTRAINT "assessment_events_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment_events" ADD CONSTRAINT "assessment_events_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment_events" ADD CONSTRAINT "assessment_events_assessment_id_assessments_id_fk" FOREIGN KEY ("assessment_id") REFERENCES "public"."assessments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment_events" ADD CONSTRAINT "assessment_events_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment_frameworks" ADD CONSTRAINT "assessment_frameworks_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment_frameworks" ADD CONSTRAINT "assessment_frameworks_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment_frameworks" ADD CONSTRAINT "assessment_frameworks_assessment_id_assessments_id_fk" FOREIGN KEY ("assessment_id") REFERENCES "public"."assessments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment_frameworks" ADD CONSTRAINT "assessment_frameworks_scf_framework_id_scf_frameworks_id_fk" FOREIGN KEY ("scf_framework_id") REFERENCES "public"."scf_frameworks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment_frameworks" ADD CONSTRAINT "assessment_frameworks_selected_by_users_id_fk" FOREIGN KEY ("selected_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment_scope" ADD CONSTRAINT "assessment_scope_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment_scope" ADD CONSTRAINT "assessment_scope_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment_scope" ADD CONSTRAINT "assessment_scope_assessment_id_assessments_id_fk" FOREIGN KEY ("assessment_id") REFERENCES "public"."assessments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment_scope" ADD CONSTRAINT "assessment_scope_approval_event_id_approval_events_id_fk" FOREIGN KEY ("approval_event_id") REFERENCES "public"."approval_events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_scf_version_id_scf_versions_id_fk" FOREIGN KEY ("scf_version_id") REFERENCES "public"."scf_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_chunks" ADD CONSTRAINT "document_chunks_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_chunks" ADD CONSTRAINT "document_chunks_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_chunks" ADD CONSTRAINT "document_chunks_assessment_id_assessments_id_fk" FOREIGN KEY ("assessment_id") REFERENCES "public"."assessments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_chunks" ADD CONSTRAINT "document_chunks_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_chunks" ADD CONSTRAINT "document_chunks_document_version_id_document_versions_id_fk" FOREIGN KEY ("document_version_id") REFERENCES "public"."document_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_extraction_jobs" ADD CONSTRAINT "document_extraction_jobs_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_extraction_jobs" ADD CONSTRAINT "document_extraction_jobs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_extraction_jobs" ADD CONSTRAINT "document_extraction_jobs_assessment_id_assessments_id_fk" FOREIGN KEY ("assessment_id") REFERENCES "public"."assessments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_extraction_jobs" ADD CONSTRAINT "document_extraction_jobs_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_versions" ADD CONSTRAINT "document_versions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_versions" ADD CONSTRAINT "document_versions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_versions" ADD CONSTRAINT "document_versions_assessment_id_assessments_id_fk" FOREIGN KEY ("assessment_id") REFERENCES "public"."assessments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_versions" ADD CONSTRAINT "document_versions_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_assessment_id_assessments_id_fk" FOREIGN KEY ("assessment_id") REFERENCES "public"."assessments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence_findings" ADD CONSTRAINT "evidence_findings_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence_findings" ADD CONSTRAINT "evidence_findings_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence_findings" ADD CONSTRAINT "evidence_findings_assessment_id_assessments_id_fk" FOREIGN KEY ("assessment_id") REFERENCES "public"."assessments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence_findings" ADD CONSTRAINT "evidence_findings_soa_item_id_soa_items_id_fk" FOREIGN KEY ("soa_item_id") REFERENCES "public"."soa_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence_findings" ADD CONSTRAINT "evidence_findings_scf_control_id_scf_controls_id_fk" FOREIGN KEY ("scf_control_id") REFERENCES "public"."scf_controls"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence_findings" ADD CONSTRAINT "evidence_findings_agent_run_id_agent_runs_id_fk" FOREIGN KEY ("agent_run_id") REFERENCES "public"."agent_runs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence_sources" ADD CONSTRAINT "evidence_sources_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence_sources" ADD CONSTRAINT "evidence_sources_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence_sources" ADD CONSTRAINT "evidence_sources_assessment_id_assessments_id_fk" FOREIGN KEY ("assessment_id") REFERENCES "public"."assessments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence_sources" ADD CONSTRAINT "evidence_sources_evidence_finding_id_evidence_findings_id_fk" FOREIGN KEY ("evidence_finding_id") REFERENCES "public"."evidence_findings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence_sources" ADD CONSTRAINT "evidence_sources_document_chunk_id_document_chunks_id_fk" FOREIGN KEY ("document_chunk_id") REFERENCES "public"."document_chunks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence_sources" ADD CONSTRAINT "evidence_sources_soa_item_id_soa_items_id_fk" FOREIGN KEY ("soa_item_id") REFERENCES "public"."soa_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gap_analysis_versions" ADD CONSTRAINT "gap_analysis_versions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gap_analysis_versions" ADD CONSTRAINT "gap_analysis_versions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gap_analysis_versions" ADD CONSTRAINT "gap_analysis_versions_assessment_id_assessments_id_fk" FOREIGN KEY ("assessment_id") REFERENCES "public"."assessments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gap_analysis_versions" ADD CONSTRAINT "gap_analysis_versions_approval_event_id_approval_events_id_fk" FOREIGN KEY ("approval_event_id") REFERENCES "public"."approval_events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gap_analysis_versions" ADD CONSTRAINT "gap_analysis_versions_created_by_agent_run_id_agent_runs_id_fk" FOREIGN KEY ("created_by_agent_run_id") REFERENCES "public"."agent_runs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gap_findings" ADD CONSTRAINT "gap_findings_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gap_findings" ADD CONSTRAINT "gap_findings_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gap_findings" ADD CONSTRAINT "gap_findings_assessment_id_assessments_id_fk" FOREIGN KEY ("assessment_id") REFERENCES "public"."assessments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gap_findings" ADD CONSTRAINT "gap_findings_gap_analysis_version_id_gap_analysis_versions_id_fk" FOREIGN KEY ("gap_analysis_version_id") REFERENCES "public"."gap_analysis_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gap_findings" ADD CONSTRAINT "gap_findings_framework_requirement_id_scf_framework_requirements_id_fk" FOREIGN KEY ("framework_requirement_id") REFERENCES "public"."scf_framework_requirements"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gap_findings" ADD CONSTRAINT "gap_findings_scf_control_id_scf_controls_id_fk" FOREIGN KEY ("scf_control_id") REFERENCES "public"."scf_controls"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gap_findings" ADD CONSTRAINT "gap_findings_soa_item_id_soa_items_id_fk" FOREIGN KEY ("soa_item_id") REFERENCES "public"."soa_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gap_findings" ADD CONSTRAINT "gap_findings_evidence_finding_id_evidence_findings_id_fk" FOREIGN KEY ("evidence_finding_id") REFERENCES "public"."evidence_findings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gap_findings" ADD CONSTRAINT "gap_findings_agent_run_id_agent_runs_id_fk" FOREIGN KEY ("agent_run_id") REFERENCES "public"."agent_runs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kb_entries" ADD CONSTRAINT "kb_entries_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kb_entries" ADD CONSTRAINT "kb_entries_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kb_entries" ADD CONSTRAINT "kb_entries_assessment_id_assessments_id_fk" FOREIGN KEY ("assessment_id") REFERENCES "public"."assessments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kb_entries" ADD CONSTRAINT "kb_entries_document_chunk_id_document_chunks_id_fk" FOREIGN KEY ("document_chunk_id") REFERENCES "public"."document_chunks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maturity_assessment_versions" ADD CONSTRAINT "maturity_assessment_versions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maturity_assessment_versions" ADD CONSTRAINT "maturity_assessment_versions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maturity_assessment_versions" ADD CONSTRAINT "maturity_assessment_versions_assessment_id_assessments_id_fk" FOREIGN KEY ("assessment_id") REFERENCES "public"."assessments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maturity_assessment_versions" ADD CONSTRAINT "maturity_assessment_versions_approval_event_id_approval_events_id_fk" FOREIGN KEY ("approval_event_id") REFERENCES "public"."approval_events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maturity_assessment_versions" ADD CONSTRAINT "maturity_assessment_versions_created_by_agent_run_id_agent_runs_id_fk" FOREIGN KEY ("created_by_agent_run_id") REFERENCES "public"."agent_runs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maturity_scores" ADD CONSTRAINT "maturity_scores_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maturity_scores" ADD CONSTRAINT "maturity_scores_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maturity_scores" ADD CONSTRAINT "maturity_scores_assessment_id_assessments_id_fk" FOREIGN KEY ("assessment_id") REFERENCES "public"."assessments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maturity_scores" ADD CONSTRAINT "maturity_scores_maturity_assessment_version_id_maturity_assessment_versions_id_fk" FOREIGN KEY ("maturity_assessment_version_id") REFERENCES "public"."maturity_assessment_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maturity_scores" ADD CONSTRAINT "maturity_scores_scf_control_id_scf_controls_id_fk" FOREIGN KEY ("scf_control_id") REFERENCES "public"."scf_controls"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "poam_items" ADD CONSTRAINT "poam_items_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "poam_items" ADD CONSTRAINT "poam_items_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "poam_items" ADD CONSTRAINT "poam_items_assessment_id_assessments_id_fk" FOREIGN KEY ("assessment_id") REFERENCES "public"."assessments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "poam_items" ADD CONSTRAINT "poam_items_poam_version_id_poam_versions_id_fk" FOREIGN KEY ("poam_version_id") REFERENCES "public"."poam_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "poam_items" ADD CONSTRAINT "poam_items_related_gap_id_gap_findings_id_fk" FOREIGN KEY ("related_gap_id") REFERENCES "public"."gap_findings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "poam_items" ADD CONSTRAINT "poam_items_scf_control_id_scf_controls_id_fk" FOREIGN KEY ("scf_control_id") REFERENCES "public"."scf_controls"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "poam_items" ADD CONSTRAINT "poam_items_framework_requirement_id_scf_framework_requirements_id_fk" FOREIGN KEY ("framework_requirement_id") REFERENCES "public"."scf_framework_requirements"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "poam_versions" ADD CONSTRAINT "poam_versions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "poam_versions" ADD CONSTRAINT "poam_versions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "poam_versions" ADD CONSTRAINT "poam_versions_assessment_id_assessments_id_fk" FOREIGN KEY ("assessment_id") REFERENCES "public"."assessments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "poam_versions" ADD CONSTRAINT "poam_versions_approval_event_id_approval_events_id_fk" FOREIGN KEY ("approval_event_id") REFERENCES "public"."approval_events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "poam_versions" ADD CONSTRAINT "poam_versions_created_by_agent_run_id_agent_runs_id_fk" FOREIGN KEY ("created_by_agent_run_id") REFERENCES "public"."agent_runs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_artifacts" ADD CONSTRAINT "report_artifacts_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_artifacts" ADD CONSTRAINT "report_artifacts_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_artifacts" ADD CONSTRAINT "report_artifacts_assessment_id_assessments_id_fk" FOREIGN KEY ("assessment_id") REFERENCES "public"."assessments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_artifacts" ADD CONSTRAINT "report_artifacts_report_version_id_report_versions_id_fk" FOREIGN KEY ("report_version_id") REFERENCES "public"."report_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_versions" ADD CONSTRAINT "report_versions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_versions" ADD CONSTRAINT "report_versions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_versions" ADD CONSTRAINT "report_versions_assessment_id_assessments_id_fk" FOREIGN KEY ("assessment_id") REFERENCES "public"."assessments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_versions" ADD CONSTRAINT "report_versions_approval_event_id_approval_events_id_fk" FOREIGN KEY ("approval_event_id") REFERENCES "public"."approval_events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_versions" ADD CONSTRAINT "report_versions_created_by_agent_run_id_agent_runs_id_fk" FOREIGN KEY ("created_by_agent_run_id") REFERENCES "public"."agent_runs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scf_control_metadata" ADD CONSTRAINT "scf_control_metadata_scf_version_id_scf_versions_id_fk" FOREIGN KEY ("scf_version_id") REFERENCES "public"."scf_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scf_control_metadata" ADD CONSTRAINT "scf_control_metadata_scf_control_id_scf_controls_id_fk" FOREIGN KEY ("scf_control_id") REFERENCES "public"."scf_controls"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scf_controls" ADD CONSTRAINT "scf_controls_scf_version_id_scf_versions_id_fk" FOREIGN KEY ("scf_version_id") REFERENCES "public"."scf_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scf_controls" ADD CONSTRAINT "scf_controls_scf_domain_id_scf_domains_id_fk" FOREIGN KEY ("scf_domain_id") REFERENCES "public"."scf_domains"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scf_domains" ADD CONSTRAINT "scf_domains_scf_version_id_scf_versions_id_fk" FOREIGN KEY ("scf_version_id") REFERENCES "public"."scf_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scf_framework_requirements" ADD CONSTRAINT "scf_framework_requirements_scf_version_id_scf_versions_id_fk" FOREIGN KEY ("scf_version_id") REFERENCES "public"."scf_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scf_framework_requirements" ADD CONSTRAINT "scf_framework_requirements_scf_framework_id_scf_frameworks_id_fk" FOREIGN KEY ("scf_framework_id") REFERENCES "public"."scf_frameworks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scf_frameworks" ADD CONSTRAINT "scf_frameworks_scf_version_id_scf_versions_id_fk" FOREIGN KEY ("scf_version_id") REFERENCES "public"."scf_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scf_mappings" ADD CONSTRAINT "scf_mappings_scf_version_id_scf_versions_id_fk" FOREIGN KEY ("scf_version_id") REFERENCES "public"."scf_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scf_mappings" ADD CONSTRAINT "scf_mappings_scf_framework_requirement_id_scf_framework_requirements_id_fk" FOREIGN KEY ("scf_framework_requirement_id") REFERENCES "public"."scf_framework_requirements"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scf_mappings" ADD CONSTRAINT "scf_mappings_scf_control_id_scf_controls_id_fk" FOREIGN KEY ("scf_control_id") REFERENCES "public"."scf_controls"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scf_strm_relationships" ADD CONSTRAINT "scf_strm_relationships_scf_mapping_id_scf_mappings_id_fk" FOREIGN KEY ("scf_mapping_id") REFERENCES "public"."scf_mappings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "soa_items" ADD CONSTRAINT "soa_items_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "soa_items" ADD CONSTRAINT "soa_items_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "soa_items" ADD CONSTRAINT "soa_items_assessment_id_assessments_id_fk" FOREIGN KEY ("assessment_id") REFERENCES "public"."assessments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "soa_items" ADD CONSTRAINT "soa_items_soa_version_id_soa_versions_id_fk" FOREIGN KEY ("soa_version_id") REFERENCES "public"."soa_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "soa_items" ADD CONSTRAINT "soa_items_scf_control_id_scf_controls_id_fk" FOREIGN KEY ("scf_control_id") REFERENCES "public"."scf_controls"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "soa_items" ADD CONSTRAINT "soa_items_scf_framework_requirement_id_scf_framework_requirements_id_fk" FOREIGN KEY ("scf_framework_requirement_id") REFERENCES "public"."scf_framework_requirements"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "soa_versions" ADD CONSTRAINT "soa_versions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "soa_versions" ADD CONSTRAINT "soa_versions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "soa_versions" ADD CONSTRAINT "soa_versions_assessment_id_assessments_id_fk" FOREIGN KEY ("assessment_id") REFERENCES "public"."assessments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "soa_versions" ADD CONSTRAINT "soa_versions_approval_event_id_approval_events_id_fk" FOREIGN KEY ("approval_event_id") REFERENCES "public"."approval_events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "traceability_links" ADD CONSTRAINT "traceability_links_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "traceability_links" ADD CONSTRAINT "traceability_links_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "traceability_links" ADD CONSTRAINT "traceability_links_assessment_id_assessments_id_fk" FOREIGN KEY ("assessment_id") REFERENCES "public"."assessments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vector_references" ADD CONSTRAINT "vector_references_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vector_references" ADD CONSTRAINT "vector_references_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vector_references" ADD CONSTRAINT "vector_references_assessment_id_assessments_id_fk" FOREIGN KEY ("assessment_id") REFERENCES "public"."assessments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vector_references" ADD CONSTRAINT "vector_references_kb_entry_id_kb_entries_id_fk" FOREIGN KEY ("kb_entry_id") REFERENCES "public"."kb_entries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "agent_decisions_run_idx" ON "agent_decisions" USING btree ("agent_run_id");--> statement-breakpoint
CREATE INDEX "agent_decisions_trace_idx" ON "agent_decisions" USING btree ("trace_id");--> statement-breakpoint
CREATE INDEX "agent_runs_assessment_idx" ON "agent_runs" USING btree ("tenant_id","organization_id","assessment_id");--> statement-breakpoint
CREATE INDEX "agent_runs_trace_idx" ON "agent_runs" USING btree ("trace_id");--> statement-breakpoint
CREATE INDEX "approval_events_assessment_gate_idx" ON "approval_events" USING btree ("tenant_id","organization_id","assessment_id","gate");--> statement-breakpoint
CREATE INDEX "approval_events_artifact_idx" ON "approval_events" USING btree ("artifact_type","artifact_id");--> statement-breakpoint
CREATE INDEX "assessment_events_assessment_idx" ON "assessment_events" USING btree ("tenant_id","organization_id","assessment_id");--> statement-breakpoint
CREATE INDEX "assessment_events_trace_idx" ON "assessment_events" USING btree ("trace_id");--> statement-breakpoint
CREATE INDEX "assessment_frameworks_assessment_idx" ON "assessment_frameworks" USING btree ("tenant_id","organization_id","assessment_id");--> statement-breakpoint
CREATE UNIQUE INDEX "assessment_frameworks_assessment_framework_uidx" ON "assessment_frameworks" USING btree ("assessment_id","scf_framework_id");--> statement-breakpoint
CREATE INDEX "assessment_scope_assessment_idx" ON "assessment_scope" USING btree ("tenant_id","organization_id","assessment_id");--> statement-breakpoint
CREATE INDEX "assessments_tenant_org_idx" ON "assessments" USING btree ("tenant_id","organization_id");--> statement-breakpoint
CREATE INDEX "assessments_state_idx" ON "assessments" USING btree ("state");--> statement-breakpoint
CREATE INDEX "assessments_scf_version_idx" ON "assessments" USING btree ("scf_version_id");--> statement-breakpoint
CREATE INDEX "audit_logs_tenant_org_idx" ON "audit_logs" USING btree ("tenant_id","organization_id");--> statement-breakpoint
CREATE INDEX "audit_logs_resource_idx" ON "audit_logs" USING btree ("resource_type","resource_id");--> statement-breakpoint
CREATE INDEX "audit_logs_created_idx" ON "audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "document_chunks_document_idx" ON "document_chunks" USING btree ("document_id");--> statement-breakpoint
CREATE UNIQUE INDEX "document_chunks_document_index_uidx" ON "document_chunks" USING btree ("document_id","chunk_index");--> statement-breakpoint
CREATE INDEX "document_extraction_jobs_status_idx" ON "document_extraction_jobs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "document_extraction_jobs_document_idx" ON "document_extraction_jobs" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX "document_versions_document_idx" ON "document_versions" USING btree ("document_id");--> statement-breakpoint
CREATE UNIQUE INDEX "document_versions_document_number_uidx" ON "document_versions" USING btree ("document_id","version_number");--> statement-breakpoint
CREATE INDEX "documents_tenant_org_assessment_idx" ON "documents" USING btree ("tenant_id","organization_id","assessment_id");--> statement-breakpoint
CREATE UNIQUE INDEX "documents_storage_key_uidx" ON "documents" USING btree ("storage_provider","storage_key");--> statement-breakpoint
CREATE UNIQUE INDEX "documents_assessment_hash_uidx" ON "documents" USING btree ("tenant_id","organization_id","assessment_id","content_hash");--> statement-breakpoint
CREATE INDEX "evidence_findings_assessment_idx" ON "evidence_findings" USING btree ("tenant_id","organization_id","assessment_id");--> statement-breakpoint
CREATE INDEX "evidence_findings_control_idx" ON "evidence_findings" USING btree ("scf_control_id");--> statement-breakpoint
CREATE INDEX "evidence_findings_agent_idx" ON "evidence_findings" USING btree ("agent_run_id");--> statement-breakpoint
CREATE INDEX "evidence_sources_finding_idx" ON "evidence_sources" USING btree ("evidence_finding_id");--> statement-breakpoint
CREATE INDEX "evidence_sources_chunk_idx" ON "evidence_sources" USING btree ("document_chunk_id");--> statement-breakpoint
CREATE INDEX "gap_versions_assessment_idx" ON "gap_analysis_versions" USING btree ("tenant_id","organization_id","assessment_id");--> statement-breakpoint
CREATE UNIQUE INDEX "gap_versions_assessment_version_uidx" ON "gap_analysis_versions" USING btree ("assessment_id","version_number");--> statement-breakpoint
CREATE INDEX "gap_findings_assessment_idx" ON "gap_findings" USING btree ("tenant_id","organization_id","assessment_id");--> statement-breakpoint
CREATE INDEX "gap_findings_control_idx" ON "gap_findings" USING btree ("scf_control_id");--> statement-breakpoint
CREATE INDEX "gap_findings_requirement_idx" ON "gap_findings" USING btree ("framework_requirement_id");--> statement-breakpoint
CREATE UNIQUE INDEX "gap_findings_version_code_uidx" ON "gap_findings" USING btree ("gap_analysis_version_id","finding_code");--> statement-breakpoint
CREATE INDEX "kb_entries_assessment_idx" ON "kb_entries" USING btree ("tenant_id","organization_id","assessment_id");--> statement-breakpoint
CREATE INDEX "kb_entries_chunk_idx" ON "kb_entries" USING btree ("document_chunk_id");--> statement-breakpoint
CREATE INDEX "maturity_versions_assessment_idx" ON "maturity_assessment_versions" USING btree ("tenant_id","organization_id","assessment_id");--> statement-breakpoint
CREATE UNIQUE INDEX "maturity_versions_assessment_version_uidx" ON "maturity_assessment_versions" USING btree ("assessment_id","version_number");--> statement-breakpoint
CREATE INDEX "maturity_scores_version_idx" ON "maturity_scores" USING btree ("maturity_assessment_version_id");--> statement-breakpoint
CREATE INDEX "maturity_scores_control_idx" ON "maturity_scores" USING btree ("scf_control_id");--> statement-breakpoint
CREATE UNIQUE INDEX "maturity_scores_version_control_uidx" ON "maturity_scores" USING btree ("maturity_assessment_version_id","scf_control_id");--> statement-breakpoint
CREATE INDEX "memberships_tenant_org_idx" ON "memberships" USING btree ("tenant_id","organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "memberships_org_user_role_uidx" ON "memberships" USING btree ("organization_id","user_id","role_id");--> statement-breakpoint
CREATE INDEX "organizations_tenant_idx" ON "organizations" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "organizations_tenant_slug_uidx" ON "organizations" USING btree ("tenant_id","slug");--> statement-breakpoint
CREATE INDEX "poam_items_version_idx" ON "poam_items" USING btree ("poam_version_id");--> statement-breakpoint
CREATE INDEX "poam_items_gap_idx" ON "poam_items" USING btree ("related_gap_id");--> statement-breakpoint
CREATE UNIQUE INDEX "poam_items_version_code_uidx" ON "poam_items" USING btree ("poam_version_id","item_code");--> statement-breakpoint
CREATE INDEX "poam_versions_assessment_idx" ON "poam_versions" USING btree ("tenant_id","organization_id","assessment_id");--> statement-breakpoint
CREATE UNIQUE INDEX "poam_versions_assessment_version_uidx" ON "poam_versions" USING btree ("assessment_id","version_number");--> statement-breakpoint
CREATE INDEX "report_artifacts_version_idx" ON "report_artifacts" USING btree ("report_version_id");--> statement-breakpoint
CREATE UNIQUE INDEX "report_artifacts_storage_key_uidx" ON "report_artifacts" USING btree ("storage_provider","storage_key");--> statement-breakpoint
CREATE INDEX "report_versions_assessment_idx" ON "report_versions" USING btree ("tenant_id","organization_id","assessment_id");--> statement-breakpoint
CREATE UNIQUE INDEX "report_versions_assessment_type_version_uidx" ON "report_versions" USING btree ("assessment_id","report_type","version_number");--> statement-breakpoint
CREATE UNIQUE INDEX "roles_key_uidx" ON "roles" USING btree ("key");--> statement-breakpoint
CREATE UNIQUE INDEX "scf_control_metadata_control_uidx" ON "scf_control_metadata" USING btree ("scf_control_id");--> statement-breakpoint
CREATE INDEX "scf_controls_version_domain_idx" ON "scf_controls" USING btree ("scf_version_id","scf_domain_id");--> statement-breakpoint
CREATE UNIQUE INDEX "scf_controls_version_code_uidx" ON "scf_controls" USING btree ("scf_version_id","control_code");--> statement-breakpoint
CREATE INDEX "scf_domains_version_idx" ON "scf_domains" USING btree ("scf_version_id");--> statement-breakpoint
CREATE UNIQUE INDEX "scf_domains_version_code_uidx" ON "scf_domains" USING btree ("scf_version_id","domain_code");--> statement-breakpoint
CREATE INDEX "scf_requirements_framework_idx" ON "scf_framework_requirements" USING btree ("scf_framework_id");--> statement-breakpoint
CREATE UNIQUE INDEX "scf_requirements_framework_code_uidx" ON "scf_framework_requirements" USING btree ("scf_framework_id","requirement_code");--> statement-breakpoint
CREATE INDEX "scf_frameworks_version_idx" ON "scf_frameworks" USING btree ("scf_version_id");--> statement-breakpoint
CREATE UNIQUE INDEX "scf_frameworks_version_framework_uidx" ON "scf_frameworks" USING btree ("scf_version_id","framework_id");--> statement-breakpoint
CREATE INDEX "scf_mappings_version_idx" ON "scf_mappings" USING btree ("scf_version_id");--> statement-breakpoint
CREATE INDEX "scf_mappings_requirement_idx" ON "scf_mappings" USING btree ("scf_framework_requirement_id");--> statement-breakpoint
CREATE INDEX "scf_mappings_control_idx" ON "scf_mappings" USING btree ("scf_control_id");--> statement-breakpoint
CREATE UNIQUE INDEX "scf_mappings_requirement_control_uidx" ON "scf_mappings" USING btree ("scf_framework_requirement_id","scf_control_id");--> statement-breakpoint
CREATE INDEX "scf_strm_mapping_idx" ON "scf_strm_relationships" USING btree ("scf_mapping_id");--> statement-breakpoint
CREATE UNIQUE INDEX "scf_versions_version_uidx" ON "scf_versions" USING btree ("version");--> statement-breakpoint
CREATE INDEX "soa_items_version_idx" ON "soa_items" USING btree ("soa_version_id");--> statement-breakpoint
CREATE INDEX "soa_items_control_idx" ON "soa_items" USING btree ("scf_control_id");--> statement-breakpoint
CREATE UNIQUE INDEX "soa_items_version_control_requirement_uidx" ON "soa_items" USING btree ("soa_version_id","scf_control_id","scf_framework_requirement_id");--> statement-breakpoint
CREATE INDEX "soa_versions_assessment_idx" ON "soa_versions" USING btree ("tenant_id","organization_id","assessment_id");--> statement-breakpoint
CREATE UNIQUE INDEX "soa_versions_assessment_version_uidx" ON "soa_versions" USING btree ("assessment_id","version_number");--> statement-breakpoint
CREATE UNIQUE INDEX "tenants_slug_uidx" ON "tenants" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "traceability_links_assessment_idx" ON "traceability_links" USING btree ("tenant_id","organization_id","assessment_id");--> statement-breakpoint
CREATE INDEX "traceability_links_source_idx" ON "traceability_links" USING btree ("source_type","source_id");--> statement-breakpoint
CREATE INDEX "traceability_links_target_idx" ON "traceability_links" USING btree ("target_type","target_id");--> statement-breakpoint
CREATE INDEX "traceability_links_trace_idx" ON "traceability_links" USING btree ("trace_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_uidx" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "vector_refs_assessment_idx" ON "vector_references" USING btree ("tenant_id","organization_id","assessment_id");--> statement-breakpoint
CREATE UNIQUE INDEX "vector_refs_index_vector_uidx" ON "vector_references" USING btree ("vector_index_name","vector_id");
--> statement-breakpoint
ALTER TABLE "agent_runs" ADD CONSTRAINT "agent_runs_confidence_score_range" CHECK ("confidence_score" IS NULL OR ("confidence_score" >= 0 AND "confidence_score" <= 1));--> statement-breakpoint
ALTER TABLE "agent_decisions" ADD CONSTRAINT "agent_decisions_confidence_score_range" CHECK ("confidence_score" >= 0 AND "confidence_score" <= 1);--> statement-breakpoint
ALTER TABLE "evidence_findings" ADD CONSTRAINT "evidence_findings_confidence_score_range" CHECK ("confidence_score" IS NULL OR ("confidence_score" >= 0 AND "confidence_score" <= 1));--> statement-breakpoint
ALTER TABLE "gap_findings" ADD CONSTRAINT "gap_findings_confidence_score_range" CHECK ("confidence_score" IS NULL OR ("confidence_score" >= 0 AND "confidence_score" <= 1));--> statement-breakpoint
ALTER TABLE "maturity_scores" ADD CONSTRAINT "maturity_scores_score_range" CHECK ("score" >= 0 AND "score" <= 5);--> statement-breakpoint
ALTER TABLE "maturity_scores" ADD CONSTRAINT "maturity_scores_confidence_score_range" CHECK ("confidence_score" >= 0 AND "confidence_score" <= 1);--> statement-breakpoint
ALTER TABLE "maturity_scores" ADD CONSTRAINT "maturity_scores_evidence_coverage_range" CHECK ("evidence_coverage" >= 0 AND "evidence_coverage" <= 1);