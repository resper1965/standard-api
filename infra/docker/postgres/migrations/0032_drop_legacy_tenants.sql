-- Migration to clean up legacy tenant_id columns, constraints, indexes and drop the tenants table
ALTER TABLE "agent_decisions" DROP COLUMN IF EXISTS "tenant_id" CASCADE;
--> statement-breakpoint
ALTER TABLE "agent_runs" DROP COLUMN IF EXISTS "tenant_id" CASCADE;
--> statement-breakpoint
ALTER TABLE "agent_tool_calls" DROP COLUMN IF EXISTS "tenant_id" CASCADE;
--> statement-breakpoint
ALTER TABLE "agent_usage_records" DROP COLUMN IF EXISTS "tenant_id" CASCADE;
--> statement-breakpoint
ALTER TABLE "api_keys" DROP COLUMN IF EXISTS "tenant_id" CASCADE;
--> statement-breakpoint
ALTER TABLE "approval_events" DROP COLUMN IF EXISTS "tenant_id" CASCADE;
--> statement-breakpoint
ALTER TABLE "assessment_events" DROP COLUMN IF EXISTS "tenant_id" CASCADE;
--> statement-breakpoint
ALTER TABLE "assessment_frameworks" DROP COLUMN IF EXISTS "tenant_id" CASCADE;
--> statement-breakpoint
ALTER TABLE "assessment_scope" DROP COLUMN IF EXISTS "tenant_id" CASCADE;
--> statement-breakpoint
ALTER TABLE "assessments" DROP COLUMN IF EXISTS "tenant_id" CASCADE;
--> statement-breakpoint
ALTER TABLE "audit_logs" DROP COLUMN IF EXISTS "tenant_id" CASCADE;
--> statement-breakpoint
ALTER TABLE "control_assessment_status" DROP COLUMN IF EXISTS "tenant_id" CASCADE;
--> statement-breakpoint
ALTER TABLE "document_chunks" DROP COLUMN IF EXISTS "tenant_id" CASCADE;
--> statement-breakpoint
ALTER TABLE "document_extraction_jobs" DROP COLUMN IF EXISTS "tenant_id" CASCADE;
--> statement-breakpoint
ALTER TABLE "document_versions" DROP COLUMN IF EXISTS "tenant_id" CASCADE;
--> statement-breakpoint
ALTER TABLE "documents" DROP COLUMN IF EXISTS "tenant_id" CASCADE;
--> statement-breakpoint
ALTER TABLE "evidence_findings" DROP COLUMN IF EXISTS "tenant_id" CASCADE;
--> statement-breakpoint
ALTER TABLE "evidence_sources" DROP COLUMN IF EXISTS "tenant_id" CASCADE;
--> statement-breakpoint
ALTER TABLE "export_jobs" DROP COLUMN IF EXISTS "tenant_id" CASCADE;
--> statement-breakpoint
ALTER TABLE "gap_analysis_versions" DROP COLUMN IF EXISTS "tenant_id" CASCADE;
--> statement-breakpoint
ALTER TABLE "gap_findings" DROP COLUMN IF EXISTS "tenant_id" CASCADE;
--> statement-breakpoint
ALTER TABLE "kb_embedding_jobs" DROP COLUMN IF EXISTS "tenant_id" CASCADE;
--> statement-breakpoint
ALTER TABLE "kb_entries" DROP COLUMN IF EXISTS "tenant_id" CASCADE;
--> statement-breakpoint
ALTER TABLE "kb_search_logs" DROP COLUMN IF EXISTS "tenant_id" CASCADE;
--> statement-breakpoint
ALTER TABLE "maturity_assessment_versions" DROP COLUMN IF EXISTS "tenant_id" CASCADE;
--> statement-breakpoint
ALTER TABLE "maturity_scores" DROP COLUMN IF EXISTS "tenant_id" CASCADE;
--> statement-breakpoint
ALTER TABLE "memberships" DROP COLUMN IF EXISTS "tenant_id" CASCADE;
--> statement-breakpoint
ALTER TABLE "operational_metrics" DROP COLUMN IF EXISTS "tenant_id" CASCADE;
--> statement-breakpoint
ALTER TABLE "organizations" DROP COLUMN IF EXISTS "tenant_id" CASCADE;
--> statement-breakpoint
ALTER TABLE "poam_dependencies" DROP COLUMN IF EXISTS "tenant_id" CASCADE;
--> statement-breakpoint
ALTER TABLE "poam_items" DROP COLUMN IF EXISTS "tenant_id" CASCADE;
--> statement-breakpoint
ALTER TABLE "poam_milestones" DROP COLUMN IF EXISTS "tenant_id" CASCADE;
--> statement-breakpoint
ALTER TABLE "poam_versions" DROP COLUMN IF EXISTS "tenant_id" CASCADE;
--> statement-breakpoint
ALTER TABLE "privacy_processing_activities" DROP COLUMN IF EXISTS "tenant_id" CASCADE;
--> statement-breakpoint
ALTER TABLE "privacy_processing_activity_data_categories" DROP COLUMN IF EXISTS "tenant_id" CASCADE;
--> statement-breakpoint
ALTER TABLE "privacy_processing_activity_data_subjects" DROP COLUMN IF EXISTS "tenant_id" CASCADE;
--> statement-breakpoint
ALTER TABLE "privacy_processing_activity_field_reviews" DROP COLUMN IF EXISTS "tenant_id" CASCADE;
--> statement-breakpoint
ALTER TABLE "privacy_processing_activity_scf_controls" DROP COLUMN IF EXISTS "tenant_id" CASCADE;
--> statement-breakpoint
ALTER TABLE "privacy_processing_activity_screenings" DROP COLUMN IF EXISTS "tenant_id" CASCADE;
--> statement-breakpoint
ALTER TABLE "privacy_processing_activity_third_parties" DROP COLUMN IF EXISTS "tenant_id" CASCADE;
--> statement-breakpoint
ALTER TABLE "report_artifacts" DROP COLUMN IF EXISTS "tenant_id" CASCADE;
--> statement-breakpoint
ALTER TABLE "report_versions" DROP COLUMN IF EXISTS "tenant_id" CASCADE;
--> statement-breakpoint
ALTER TABLE "scf_control_metadata" DROP COLUMN IF EXISTS "tenant_id" CASCADE;
--> statement-breakpoint
ALTER TABLE "scf_controls" DROP COLUMN IF EXISTS "tenant_id" CASCADE;
--> statement-breakpoint
ALTER TABLE "scf_domains" DROP COLUMN IF EXISTS "tenant_id" CASCADE;
--> statement-breakpoint
ALTER TABLE "scf_framework_requirements" DROP COLUMN IF EXISTS "tenant_id" CASCADE;
--> statement-breakpoint
ALTER TABLE "scf_frameworks" DROP COLUMN IF EXISTS "tenant_id" CASCADE;
--> statement-breakpoint
ALTER TABLE "scf_mappings" DROP COLUMN IF EXISTS "tenant_id" CASCADE;
--> statement-breakpoint
ALTER TABLE "scf_strm_relationships" DROP COLUMN IF EXISTS "tenant_id" CASCADE;
--> statement-breakpoint
ALTER TABLE "scf_versions" DROP COLUMN IF EXISTS "tenant_id" CASCADE;
--> statement-breakpoint
ALTER TABLE "security_events" DROP COLUMN IF EXISTS "tenant_id" CASCADE;
--> statement-breakpoint
ALTER TABLE "soa_items" DROP COLUMN IF EXISTS "tenant_id" CASCADE;
--> statement-breakpoint
ALTER TABLE "soa_versions" DROP COLUMN IF EXISTS "tenant_id" CASCADE;
--> statement-breakpoint
ALTER TABLE "traceability_links" DROP COLUMN IF EXISTS "tenant_id" CASCADE;
--> statement-breakpoint
ALTER TABLE "usage_records" DROP COLUMN IF EXISTS "tenant_id" CASCADE;
--> statement-breakpoint
ALTER TABLE "vector_references" DROP COLUMN IF EXISTS "tenant_id" CASCADE;
--> statement-breakpoint
ALTER TABLE "webhook_endpoints" DROP COLUMN IF EXISTS "tenant_id" CASCADE;
--> statement-breakpoint
ALTER TABLE "workflow_audit_events" DROP COLUMN IF EXISTS "tenant_id" CASCADE;
--> statement-breakpoint
ALTER TABLE "workflow_runs" DROP COLUMN IF EXISTS "tenant_id" CASCADE;
--> statement-breakpoint
DROP TABLE IF EXISTS "tenants" CASCADE;
