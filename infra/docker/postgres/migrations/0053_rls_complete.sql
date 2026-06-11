-- Complete Row-Level Security (RLS) for all tenant-scoped tables.
-- Migration 0028 covered assessments and documents only.
-- This migration extends RLS to the full tenant data surface.
--
-- Policy design:
--   - Strict tenant tables (no global rows): enforce org_id = current setting
--   - SCF catalog tables (may have null org_id for system records):
--     allow org_id = current setting OR org_id IS NULL
--   - Bypass when app.current_org_id is not set (system jobs, background workers)
--
-- When using the Neon WebSocket Pool driver, set the config before each
-- transaction: SET LOCAL app.current_org_id = '<uuid>'

-- Helper macro (used inline via USING clause):
-- NULLIF(current_setting('app.current_org_id', true), '')::uuid
-- The 'true' arg makes current_setting return NULL instead of error if unset.

-- ── Strict tenant tables ──────────────────────────────────────────────────────

ALTER TABLE "assessment_frameworks" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rls_assessment_frameworks" ON "assessment_frameworks"
  USING (
    organization_id = NULLIF(current_setting('app.current_org_id', true), '')::uuid
    OR NULLIF(current_setting('app.current_org_id', true), '') IS NULL
  );

ALTER TABLE "assessment_events" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rls_assessment_events" ON "assessment_events"
  USING (
    organization_id = NULLIF(current_setting('app.current_org_id', true), '')::uuid
    OR NULLIF(current_setting('app.current_org_id', true), '') IS NULL
  );

ALTER TABLE "approval_events" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rls_approval_events" ON "approval_events"
  USING (
    organization_id = NULLIF(current_setting('app.current_org_id', true), '')::uuid
    OR NULLIF(current_setting('app.current_org_id', true), '') IS NULL
  );

ALTER TABLE "document_versions" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rls_document_versions" ON "document_versions"
  USING (
    organization_id = NULLIF(current_setting('app.current_org_id', true), '')::uuid
    OR NULLIF(current_setting('app.current_org_id', true), '') IS NULL
  );

ALTER TABLE "document_chunks" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rls_document_chunks" ON "document_chunks"
  USING (
    organization_id = NULLIF(current_setting('app.current_org_id', true), '')::uuid
    OR NULLIF(current_setting('app.current_org_id', true), '') IS NULL
  );

ALTER TABLE "document_extraction_jobs" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rls_document_extraction_jobs" ON "document_extraction_jobs"
  USING (
    organization_id = NULLIF(current_setting('app.current_org_id', true), '')::uuid
    OR NULLIF(current_setting('app.current_org_id', true), '') IS NULL
  );

ALTER TABLE "kb_entries" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rls_kb_entries" ON "kb_entries"
  USING (
    organization_id = NULLIF(current_setting('app.current_org_id', true), '')::uuid
    OR NULLIF(current_setting('app.current_org_id', true), '') IS NULL
  );

ALTER TABLE "vector_references" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rls_vector_references" ON "vector_references"
  USING (
    organization_id = NULLIF(current_setting('app.current_org_id', true), '')::uuid
    OR NULLIF(current_setting('app.current_org_id', true), '') IS NULL
  );

ALTER TABLE "kb_embedding_jobs" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rls_kb_embedding_jobs" ON "kb_embedding_jobs"
  USING (
    organization_id = NULLIF(current_setting('app.current_org_id', true), '')::uuid
    OR NULLIF(current_setting('app.current_org_id', true), '') IS NULL
  );

ALTER TABLE "kb_search_logs" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rls_kb_search_logs" ON "kb_search_logs"
  USING (
    organization_id = NULLIF(current_setting('app.current_org_id', true), '')::uuid
    OR NULLIF(current_setting('app.current_org_id', true), '') IS NULL
  );

ALTER TABLE "assessment_scope" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rls_assessment_scope" ON "assessment_scope"
  USING (
    organization_id = NULLIF(current_setting('app.current_org_id', true), '')::uuid
    OR NULLIF(current_setting('app.current_org_id', true), '') IS NULL
  );

ALTER TABLE "soa_versions" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rls_soa_versions" ON "soa_versions"
  USING (
    organization_id = NULLIF(current_setting('app.current_org_id', true), '')::uuid
    OR NULLIF(current_setting('app.current_org_id', true), '') IS NULL
  );

ALTER TABLE "soa_items" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rls_soa_items" ON "soa_items"
  USING (
    organization_id = NULLIF(current_setting('app.current_org_id', true), '')::uuid
    OR NULLIF(current_setting('app.current_org_id', true), '') IS NULL
  );

ALTER TABLE "agent_runs" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rls_agent_runs" ON "agent_runs"
  USING (
    organization_id = NULLIF(current_setting('app.current_org_id', true), '')::uuid
    OR NULLIF(current_setting('app.current_org_id', true), '') IS NULL
  );

ALTER TABLE "agent_decisions" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rls_agent_decisions" ON "agent_decisions"
  USING (
    organization_id = NULLIF(current_setting('app.current_org_id', true), '')::uuid
    OR NULLIF(current_setting('app.current_org_id', true), '') IS NULL
  );

ALTER TABLE "agent_tool_calls" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rls_agent_tool_calls" ON "agent_tool_calls"
  USING (
    organization_id = NULLIF(current_setting('app.current_org_id', true), '')::uuid
    OR NULLIF(current_setting('app.current_org_id', true), '') IS NULL
  );

ALTER TABLE "evidence_findings" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rls_evidence_findings" ON "evidence_findings"
  USING (
    organization_id = NULLIF(current_setting('app.current_org_id', true), '')::uuid
    OR NULLIF(current_setting('app.current_org_id', true), '') IS NULL
  );

ALTER TABLE "evidence_sources" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rls_evidence_sources" ON "evidence_sources"
  USING (
    organization_id = NULLIF(current_setting('app.current_org_id', true), '')::uuid
    OR NULLIF(current_setting('app.current_org_id', true), '') IS NULL
  );

ALTER TABLE "gap_analysis_versions" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rls_gap_analysis_versions" ON "gap_analysis_versions"
  USING (
    organization_id = NULLIF(current_setting('app.current_org_id', true), '')::uuid
    OR NULLIF(current_setting('app.current_org_id', true), '') IS NULL
  );

ALTER TABLE "gap_findings" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rls_gap_findings" ON "gap_findings"
  USING (
    organization_id = NULLIF(current_setting('app.current_org_id', true), '')::uuid
    OR NULLIF(current_setting('app.current_org_id', true), '') IS NULL
  );

ALTER TABLE "maturity_assessment_versions" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rls_maturity_assessment_versions" ON "maturity_assessment_versions"
  USING (
    organization_id = NULLIF(current_setting('app.current_org_id', true), '')::uuid
    OR NULLIF(current_setting('app.current_org_id', true), '') IS NULL
  );

ALTER TABLE "maturity_scores" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rls_maturity_scores" ON "maturity_scores"
  USING (
    organization_id = NULLIF(current_setting('app.current_org_id', true), '')::uuid
    OR NULLIF(current_setting('app.current_org_id', true), '') IS NULL
  );

ALTER TABLE "poam_versions" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rls_poam_versions" ON "poam_versions"
  USING (
    organization_id = NULLIF(current_setting('app.current_org_id', true), '')::uuid
    OR NULLIF(current_setting('app.current_org_id', true), '') IS NULL
  );

ALTER TABLE "poam_items" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rls_poam_items" ON "poam_items"
  USING (
    organization_id = NULLIF(current_setting('app.current_org_id', true), '')::uuid
    OR NULLIF(current_setting('app.current_org_id', true), '') IS NULL
  );

ALTER TABLE "poam_milestones" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rls_poam_milestones" ON "poam_milestones"
  USING (
    organization_id = NULLIF(current_setting('app.current_org_id', true), '')::uuid
    OR NULLIF(current_setting('app.current_org_id', true), '') IS NULL
  );

ALTER TABLE "poam_dependencies" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rls_poam_dependencies" ON "poam_dependencies"
  USING (
    organization_id = NULLIF(current_setting('app.current_org_id', true), '')::uuid
    OR NULLIF(current_setting('app.current_org_id', true), '') IS NULL
  );

ALTER TABLE "report_versions" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rls_report_versions" ON "report_versions"
  USING (
    organization_id = NULLIF(current_setting('app.current_org_id', true), '')::uuid
    OR NULLIF(current_setting('app.current_org_id', true), '') IS NULL
  );

ALTER TABLE "report_artifacts" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rls_report_artifacts" ON "report_artifacts"
  USING (
    organization_id = NULLIF(current_setting('app.current_org_id', true), '')::uuid
    OR NULLIF(current_setting('app.current_org_id', true), '') IS NULL
  );

ALTER TABLE "export_jobs" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rls_export_jobs" ON "export_jobs"
  USING (
    organization_id = NULLIF(current_setting('app.current_org_id', true), '')::uuid
    OR NULLIF(current_setting('app.current_org_id', true), '') IS NULL
  );

ALTER TABLE "traceability_links" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rls_traceability_links" ON "traceability_links"
  USING (
    organization_id = NULLIF(current_setting('app.current_org_id', true), '')::uuid
    OR NULLIF(current_setting('app.current_org_id', true), '') IS NULL
  );

ALTER TABLE "workflow_runs" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rls_workflow_runs" ON "workflow_runs"
  USING (
    organization_id = NULLIF(current_setting('app.current_org_id', true), '')::uuid
    OR NULLIF(current_setting('app.current_org_id', true), '') IS NULL
  );

ALTER TABLE "workflow_audit_events" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rls_workflow_audit_events" ON "workflow_audit_events"
  USING (
    organization_id = NULLIF(current_setting('app.current_org_id', true), '')::uuid
    OR NULLIF(current_setting('app.current_org_id', true), '') IS NULL
  );

ALTER TABLE "audit_logs" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rls_audit_logs" ON "audit_logs"
  USING (
    organization_id = NULLIF(current_setting('app.current_org_id', true), '')::uuid
    OR NULLIF(current_setting('app.current_org_id', true), '') IS NULL
  );

ALTER TABLE "security_events" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rls_security_events" ON "security_events"
  USING (
    organization_id = NULLIF(current_setting('app.current_org_id', true), '')::uuid
    OR NULLIF(current_setting('app.current_org_id', true), '') IS NULL
  );

ALTER TABLE "usage_records" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rls_usage_records" ON "usage_records"
  USING (
    organization_id = NULLIF(current_setting('app.current_org_id', true), '')::uuid
    OR NULLIF(current_setting('app.current_org_id', true), '') IS NULL
  );

ALTER TABLE "agent_usage_records" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rls_agent_usage_records" ON "agent_usage_records"
  USING (
    organization_id = NULLIF(current_setting('app.current_org_id', true), '')::uuid
    OR NULLIF(current_setting('app.current_org_id', true), '') IS NULL
  );

ALTER TABLE "assessment_risk_register" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rls_assessment_risk_register" ON "assessment_risk_register"
  USING (
    organization_id = NULLIF(current_setting('app.current_org_id', true), '')::uuid
    OR NULLIF(current_setting('app.current_org_id', true), '') IS NULL
  );

ALTER TABLE "control_assessment_status" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rls_control_assessment_status" ON "control_assessment_status"
  USING (
    organization_id = NULLIF(current_setting('app.current_org_id', true), '')::uuid
    OR NULLIF(current_setting('app.current_org_id', true), '') IS NULL
  );

-- ── SCF catalog tables (null org_id = system/global record) ──────────────────
-- Allow access to global records (org_id IS NULL) AND tenant-specific overrides.

ALTER TABLE "scf_versions" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rls_scf_versions" ON "scf_versions"
  USING (
    organization_id IS NULL
    OR organization_id = NULLIF(current_setting('app.current_org_id', true), '')::uuid
    OR NULLIF(current_setting('app.current_org_id', true), '') IS NULL
  );

ALTER TABLE "scf_domains" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rls_scf_domains" ON "scf_domains"
  USING (
    organization_id IS NULL
    OR organization_id = NULLIF(current_setting('app.current_org_id', true), '')::uuid
    OR NULLIF(current_setting('app.current_org_id', true), '') IS NULL
  );

ALTER TABLE "scf_controls" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rls_scf_controls" ON "scf_controls"
  USING (
    organization_id IS NULL
    OR organization_id = NULLIF(current_setting('app.current_org_id', true), '')::uuid
    OR NULLIF(current_setting('app.current_org_id', true), '') IS NULL
  );

ALTER TABLE "scf_frameworks" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rls_scf_frameworks" ON "scf_frameworks"
  USING (
    organization_id IS NULL
    OR organization_id = NULLIF(current_setting('app.current_org_id', true), '')::uuid
    OR NULLIF(current_setting('app.current_org_id', true), '') IS NULL
  );

ALTER TABLE "scf_framework_requirements" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rls_scf_framework_requirements" ON "scf_framework_requirements"
  USING (
    organization_id IS NULL
    OR organization_id = NULLIF(current_setting('app.current_org_id', true), '')::uuid
    OR NULLIF(current_setting('app.current_org_id', true), '') IS NULL
  );

ALTER TABLE "scf_mappings" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rls_scf_mappings" ON "scf_mappings"
  USING (
    organization_id IS NULL
    OR organization_id = NULLIF(current_setting('app.current_org_id', true), '')::uuid
    OR NULLIF(current_setting('app.current_org_id', true), '') IS NULL
  );

ALTER TABLE "scf_control_metadata" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rls_scf_control_metadata" ON "scf_control_metadata"
  USING (
    organization_id IS NULL
    OR organization_id = NULLIF(current_setting('app.current_org_id', true), '')::uuid
    OR NULLIF(current_setting('app.current_org_id', true), '') IS NULL
  );

ALTER TABLE "scf_assessment_objectives" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rls_scf_assessment_objectives" ON "scf_assessment_objectives"
  USING (
    organization_id IS NULL
    OR organization_id = NULLIF(current_setting('app.current_org_id', true), '')::uuid
    OR NULLIF(current_setting('app.current_org_id', true), '') IS NULL
  );

ALTER TABLE "scf_evidence_requests" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rls_scf_evidence_requests" ON "scf_evidence_requests"
  USING (
    organization_id IS NULL
    OR organization_id = NULLIF(current_setting('app.current_org_id', true), '')::uuid
    OR NULLIF(current_setting('app.current_org_id', true), '') IS NULL
  );

ALTER TABLE "scf_maturity_criteria" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rls_scf_maturity_criteria" ON "scf_maturity_criteria"
  USING (
    organization_id IS NULL
    OR organization_id = NULLIF(current_setting('app.current_org_id', true), '')::uuid
    OR NULLIF(current_setting('app.current_org_id', true), '') IS NULL
  );

ALTER TABLE "scf_risks" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rls_scf_risks" ON "scf_risks"
  USING (
    organization_id IS NULL
    OR organization_id = NULLIF(current_setting('app.current_org_id', true), '')::uuid
    OR NULLIF(current_setting('app.current_org_id', true), '') IS NULL
  );

ALTER TABLE "scf_risk_control_mappings" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rls_scf_risk_control_mappings" ON "scf_risk_control_mappings"
  USING (
    organization_id IS NULL
    OR organization_id = NULLIF(current_setting('app.current_org_id', true), '')::uuid
    OR NULLIF(current_setting('app.current_org_id', true), '') IS NULL
  );

ALTER TABLE "scf_threats" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rls_scf_threats" ON "scf_threats"
  USING (
    organization_id IS NULL
    OR organization_id = NULLIF(current_setting('app.current_org_id', true), '')::uuid
    OR NULLIF(current_setting('app.current_org_id', true), '') IS NULL
  );

ALTER TABLE "scf_threat_control_mappings" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rls_scf_threat_control_mappings" ON "scf_threat_control_mappings"
  USING (
    organization_id IS NULL
    OR organization_id = NULLIF(current_setting('app.current_org_id', true), '')::uuid
    OR NULLIF(current_setting('app.current_org_id', true), '') IS NULL
  );

-- ── API Keys (per-tenant, but also used for system operations) ────────────────
ALTER TABLE "api_keys" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rls_api_keys" ON "api_keys"
  USING (
    organization_id = NULLIF(current_setting('app.current_org_id', true), '')::uuid
    OR NULLIF(current_setting('app.current_org_id', true), '') IS NULL
  );
