-- Migration to clean up legacy tenant_id columns, constraints, indexes and drop the tenants table
ALTER TABLE IF EXISTS "agent_decisions" DROP COLUMN IF EXISTS "tenant_id" CASCADE;
--> statement-breakpoint
ALTER TABLE IF EXISTS "agent_runs" DROP COLUMN IF EXISTS "tenant_id" CASCADE;
--> statement-breakpoint
ALTER TABLE IF EXISTS "agent_tool_calls" DROP COLUMN IF EXISTS "tenant_id" CASCADE;
--> statement-breakpoint
ALTER TABLE IF EXISTS "agent_usage_records" DROP COLUMN IF EXISTS "tenant_id" CASCADE;
--> statement-breakpoint
ALTER TABLE IF EXISTS "api_keys" DROP COLUMN IF EXISTS "tenant_id" CASCADE;
--> statement-breakpoint
ALTER TABLE IF EXISTS "approval_events" DROP COLUMN IF EXISTS "tenant_id" CASCADE;
--> statement-breakpoint
ALTER TABLE IF EXISTS "assessment_events" DROP COLUMN IF EXISTS "tenant_id" CASCADE;
--> statement-breakpoint
ALTER TABLE IF EXISTS "assessment_frameworks" DROP COLUMN IF EXISTS "tenant_id" CASCADE;
--> statement-breakpoint
ALTER TABLE IF EXISTS "assessment_scope" DROP COLUMN IF EXISTS "tenant_id" CASCADE;
--> statement-breakpoint
ALTER TABLE IF EXISTS "assessments" DROP COLUMN IF EXISTS "tenant_id" CASCADE;
--> statement-breakpoint
ALTER TABLE IF EXISTS "audit_logs" DROP COLUMN IF EXISTS "tenant_id" CASCADE;
--> statement-breakpoint
ALTER TABLE IF EXISTS "control_assessment_status" DROP COLUMN IF EXISTS "tenant_id" CASCADE;
--> statement-breakpoint
ALTER TABLE IF EXISTS "document_chunks" DROP COLUMN IF EXISTS "tenant_id" CASCADE;
--> statement-breakpoint
ALTER TABLE IF EXISTS "document_extraction_jobs" DROP COLUMN IF EXISTS "tenant_id" CASCADE;
--> statement-breakpoint
ALTER TABLE IF EXISTS "document_versions" DROP COLUMN IF EXISTS "tenant_id" CASCADE;
--> statement-breakpoint
ALTER TABLE IF EXISTS "documents" DROP COLUMN IF EXISTS "tenant_id" CASCADE;
--> statement-breakpoint
ALTER TABLE IF EXISTS "evidence_findings" DROP COLUMN IF EXISTS "tenant_id" CASCADE;
--> statement-breakpoint
ALTER TABLE IF EXISTS "evidence_sources" DROP COLUMN IF EXISTS "tenant_id" CASCADE;
--> statement-breakpoint
ALTER TABLE IF EXISTS "export_jobs" DROP COLUMN IF EXISTS "tenant_id" CASCADE;
--> statement-breakpoint
ALTER TABLE IF EXISTS "gap_analysis_versions" DROP COLUMN IF EXISTS "tenant_id" CASCADE;
--> statement-breakpoint
ALTER TABLE IF EXISTS "gap_findings" DROP COLUMN IF EXISTS "tenant_id" CASCADE;
--> statement-breakpoint
ALTER TABLE IF EXISTS "kb_embedding_jobs" DROP COLUMN IF EXISTS "tenant_id" CASCADE;
--> statement-breakpoint
ALTER TABLE IF EXISTS "kb_entries" DROP COLUMN IF EXISTS "tenant_id" CASCADE;
--> statement-breakpoint
ALTER TABLE IF EXISTS "kb_search_logs" DROP COLUMN IF EXISTS "tenant_id" CASCADE;
--> statement-breakpoint
ALTER TABLE IF EXISTS "maturity_assessment_versions" DROP COLUMN IF EXISTS "tenant_id" CASCADE;
--> statement-breakpoint
ALTER TABLE IF EXISTS "maturity_scores" DROP COLUMN IF EXISTS "tenant_id" CASCADE;
--> statement-breakpoint
ALTER TABLE IF EXISTS "memberships" DROP COLUMN IF EXISTS "tenant_id" CASCADE;
--> statement-breakpoint
ALTER TABLE IF EXISTS "operational_metrics" DROP COLUMN IF EXISTS "tenant_id" CASCADE;
--> statement-breakpoint
ALTER TABLE IF EXISTS "organizations" DROP COLUMN IF EXISTS "tenant_id" CASCADE;
--> statement-breakpoint
ALTER TABLE IF EXISTS "poam_dependencies" DROP COLUMN IF EXISTS "tenant_id" CASCADE;
--> statement-breakpoint
ALTER TABLE IF EXISTS "poam_items" DROP COLUMN IF EXISTS "tenant_id" CASCADE;
--> statement-breakpoint
ALTER TABLE IF EXISTS "poam_milestones" DROP COLUMN IF EXISTS "tenant_id" CASCADE;
--> statement-breakpoint
ALTER TABLE IF EXISTS "poam_versions" DROP COLUMN IF EXISTS "tenant_id" CASCADE;
--> statement-breakpoint
ALTER TABLE IF EXISTS "privacy_processing_activities" DROP COLUMN IF EXISTS "tenant_id" CASCADE;
--> statement-breakpoint
ALTER TABLE IF EXISTS "privacy_processing_activity_data_categories" DROP COLUMN IF EXISTS "tenant_id" CASCADE;
--> statement-breakpoint
ALTER TABLE IF EXISTS "privacy_processing_activity_data_subjects" DROP COLUMN IF EXISTS "tenant_id" CASCADE;
--> statement-breakpoint
ALTER TABLE IF EXISTS "privacy_processing_activity_field_reviews" DROP COLUMN IF EXISTS "tenant_id" CASCADE;
--> statement-breakpoint
ALTER TABLE IF EXISTS "privacy_processing_activity_scf_controls" DROP COLUMN IF EXISTS "tenant_id" CASCADE;
--> statement-breakpoint
ALTER TABLE IF EXISTS "privacy_processing_activity_screenings" DROP COLUMN IF EXISTS "tenant_id" CASCADE;
--> statement-breakpoint
ALTER TABLE IF EXISTS "privacy_processing_activity_third_parties" DROP COLUMN IF EXISTS "tenant_id" CASCADE;
--> statement-breakpoint
ALTER TABLE IF EXISTS "report_artifacts" DROP COLUMN IF EXISTS "tenant_id" CASCADE;
--> statement-breakpoint
ALTER TABLE IF EXISTS "report_versions" DROP COLUMN IF EXISTS "tenant_id" CASCADE;
--> statement-breakpoint
ALTER TABLE IF EXISTS "scf_control_metadata" DROP COLUMN IF EXISTS "tenant_id" CASCADE;
--> statement-breakpoint
ALTER TABLE IF EXISTS "scf_controls" DROP COLUMN IF EXISTS "tenant_id" CASCADE;
--> statement-breakpoint
ALTER TABLE IF EXISTS "scf_domains" DROP COLUMN IF EXISTS "tenant_id" CASCADE;
--> statement-breakpoint
ALTER TABLE IF EXISTS "scf_framework_requirements" DROP COLUMN IF EXISTS "tenant_id" CASCADE;
--> statement-breakpoint
ALTER TABLE IF EXISTS "scf_frameworks" DROP COLUMN IF EXISTS "tenant_id" CASCADE;
--> statement-breakpoint
ALTER TABLE IF EXISTS "scf_mappings" DROP COLUMN IF EXISTS "tenant_id" CASCADE;
--> statement-breakpoint
ALTER TABLE IF EXISTS "scf_strm_relationships" DROP COLUMN IF EXISTS "tenant_id" CASCADE;
--> statement-breakpoint
ALTER TABLE IF EXISTS "scf_versions" DROP COLUMN IF EXISTS "tenant_id" CASCADE;
--> statement-breakpoint
ALTER TABLE IF EXISTS "security_events" DROP COLUMN IF EXISTS "tenant_id" CASCADE;
--> statement-breakpoint
ALTER TABLE IF EXISTS "soa_items" DROP COLUMN IF EXISTS "tenant_id" CASCADE;
--> statement-breakpoint
ALTER TABLE IF EXISTS "soa_versions" DROP COLUMN IF EXISTS "tenant_id" CASCADE;
--> statement-breakpoint
ALTER TABLE IF EXISTS "traceability_links" DROP COLUMN IF EXISTS "tenant_id" CASCADE;
--> statement-breakpoint
ALTER TABLE IF EXISTS "usage_records" DROP COLUMN IF EXISTS "tenant_id" CASCADE;
--> statement-breakpoint
ALTER TABLE IF EXISTS "vector_references" DROP COLUMN IF EXISTS "tenant_id" CASCADE;
--> statement-breakpoint
ALTER TABLE IF EXISTS "webhook_endpoints" DROP COLUMN IF EXISTS "tenant_id" CASCADE;
--> statement-breakpoint
ALTER TABLE IF EXISTS "workflow_audit_events" DROP COLUMN IF EXISTS "tenant_id" CASCADE;
--> statement-breakpoint
ALTER TABLE IF EXISTS "workflow_runs" DROP COLUMN IF EXISTS "tenant_id" CASCADE;
--> statement-breakpoint
DROP TABLE IF EXISTS "tenants" CASCADE;
