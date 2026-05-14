-- Synthetic seed for local development only. No real customer data or real SCF mappings.

INSERT INTO roles (id, key, name, description)
VALUES
  ('00000000-0000-4000-8000-000000000101', 'tenant_admin', 'Tenant Admin', 'Synthetic tenant administrator'),
  ('00000000-0000-4000-8000-000000000102', 'assessment_reviewer', 'Assessment Reviewer', 'Synthetic human approval reviewer')
ON CONFLICT DO NOTHING;

INSERT INTO tenants (id, slug, name, status)
VALUES ('00000000-0000-4000-8000-000000000201', 'synthetic-tenant', 'Synthetic Tenant', 'active')
ON CONFLICT DO NOTHING;

INSERT INTO users (id, email, display_name, identity_provider, identity_provider_subject)
VALUES ('00000000-0000-4000-8000-000000000301', 'reviewer.synthetic@example.invalid', 'Synthetic Reviewer', 'synthetic', 'synthetic-reviewer')
ON CONFLICT DO NOTHING;

INSERT INTO organizations (id, tenant_id, slug, name, status)
VALUES ('00000000-0000-4000-8000-000000000401', '00000000-0000-4000-8000-000000000201', 'synthetic-org', 'Synthetic Organization', 'active')
ON CONFLICT DO NOTHING;

INSERT INTO memberships (id, tenant_id, organization_id, user_id, role_id, status)
VALUES (
  '00000000-0000-4000-8000-000000000501',
  '00000000-0000-4000-8000-000000000201',
  '00000000-0000-4000-8000-000000000401',
  '00000000-0000-4000-8000-000000000301',
  '00000000-0000-4000-8000-000000000102',
  'active'
)
ON CONFLICT DO NOTHING;

INSERT INTO scf_versions (id, version, source_uri, content_hash)
VALUES ('00000000-0000-4000-8000-000000000601', 'SYNTHETIC-SCF-0.1', 'synthetic://scf/version/0.1', 'sha256:synthetic-scf-version')
ON CONFLICT DO NOTHING;

INSERT INTO scf_domains (id, scf_version_id, domain_code, name, description)
VALUES ('00000000-0000-4000-8000-000000000701', '00000000-0000-4000-8000-000000000601', 'SYN', 'Synthetic Domain', 'Synthetic domain for local schema validation')
ON CONFLICT DO NOTHING;

INSERT INTO scf_controls (id, scf_version_id, scf_domain_id, control_code, title, description)
VALUES (
  '00000000-0000-4000-8000-000000000801',
  '00000000-0000-4000-8000-000000000601',
  '00000000-0000-4000-8000-000000000701',
  'SYN-001',
  'Synthetic Control',
  'Synthetic control used only to validate relationships'
)
ON CONFLICT DO NOTHING;

INSERT INTO scf_frameworks (id, scf_version_id, framework_id, name, version_label, publisher)
VALUES ('00000000-0000-4000-8000-000000000901', '00000000-0000-4000-8000-000000000601', 'SYN-FW', 'Synthetic Framework', '0.1', 'Standard synthetic fixtures')
ON CONFLICT DO NOTHING;

INSERT INTO scf_framework_requirements (id, scf_version_id, scf_framework_id, requirement_code, title, description)
VALUES (
  '00000000-0000-4000-8000-000000001001',
  '00000000-0000-4000-8000-000000000601',
  '00000000-0000-4000-8000-000000000901',
  'SYN-FW-1',
  'Synthetic Requirement',
  'Synthetic requirement used only to validate mapping structure'
)
ON CONFLICT DO NOTHING;

INSERT INTO scf_mappings (id, scf_version_id, scf_framework_requirement_id, scf_control_id, relationship_type, relationship_strength, mapping_rationale, mapping_source)
VALUES (
  '00000000-0000-4000-8000-000000001101',
  '00000000-0000-4000-8000-000000000601',
  '00000000-0000-4000-8000-000000001001',
  '00000000-0000-4000-8000-000000000801',
  'synthetic_maps_to',
  'strong',
  'Synthetic mapping only; not a real SCF mapping.',
  'consultative'
)
ON CONFLICT DO NOTHING;

INSERT INTO scf_strm_relationships (id, scf_mapping_id, relationship_type, relationship_strength, rationale, source)
VALUES ('00000000-0000-4000-8000-000000001201', '00000000-0000-4000-8000-000000001101', 'synthetic_relationship', 'strong', 'Synthetic STRM fixture.', 'synthetic-fixture')
ON CONFLICT DO NOTHING;

INSERT INTO scf_control_metadata (id, scf_version_id, scf_control_id, risk_weight, threat_tags, maturity_guidance)
VALUES ('00000000-0000-4000-8000-000000001301', '00000000-0000-4000-8000-000000000601', '00000000-0000-4000-8000-000000000801', 1.000, '["synthetic"]'::jsonb, '{"0":"not present","3":"defined"}'::jsonb)
ON CONFLICT DO NOTHING;

INSERT INTO assessments (id, tenant_id, organization_id, name, state, scf_version_id, created_by, trace_id)
VALUES (
  '00000000-0000-4000-8000-000000001401',
  '00000000-0000-4000-8000-000000000201',
  '00000000-0000-4000-8000-000000000401',
  'Synthetic Assessment',
  'draft',
  '00000000-0000-4000-8000-000000000601',
  '00000000-0000-4000-8000-000000000301',
  'trace-synthetic-0001'
)
ON CONFLICT DO NOTHING;

INSERT INTO assessment_frameworks (id, tenant_id, organization_id, assessment_id, scf_framework_id, status, selected_by, selected_at)
VALUES ('00000000-0000-4000-8000-000000001501', '00000000-0000-4000-8000-000000000201', '00000000-0000-4000-8000-000000000401', '00000000-0000-4000-8000-000000001401', '00000000-0000-4000-8000-000000000901', 'approved', '00000000-0000-4000-8000-000000000301', now())
ON CONFLICT DO NOTHING;

INSERT INTO documents (id, tenant_id, organization_id, assessment_id, original_filename, storage_provider, storage_key, content_hash, mime_type, file_size, uploaded_by, classification, document_type, version_label, language)
VALUES ('00000000-0000-4000-8000-000000001601', '00000000-0000-4000-8000-000000000201', '00000000-0000-4000-8000-000000000401', '00000000-0000-4000-8000-000000001401', 'synthetic-policy.pdf', 'r2', 'tenants/synthetic/documents/synthetic-policy.pdf', 'sha256:synthetic-document-hash', 'application/pdf', 1024, '00000000-0000-4000-8000-000000000301', 'internal', 'policy', 'v1', 'en')
ON CONFLICT DO NOTHING;

INSERT INTO document_versions (id, tenant_id, organization_id, assessment_id, document_id, version_number, storage_key, content_hash, status)
VALUES ('00000000-0000-4000-8000-000000001701', '00000000-0000-4000-8000-000000000201', '00000000-0000-4000-8000-000000000401', '00000000-0000-4000-8000-000000001401', '00000000-0000-4000-8000-000000001601', 1, 'tenants/synthetic/documents/synthetic-policy.pdf', 'sha256:synthetic-document-hash', 'approved')
ON CONFLICT DO NOTHING;

INSERT INTO document_chunks (id, tenant_id, organization_id, assessment_id, document_id, document_version_id, chunk_index, text_hash, page_number, approximate_token_count)
VALUES ('00000000-0000-4000-8000-000000001801', '00000000-0000-4000-8000-000000000201', '00000000-0000-4000-8000-000000000401', '00000000-0000-4000-8000-000000001401', '00000000-0000-4000-8000-000000001601', '00000000-0000-4000-8000-000000001701', 0, 'sha256:synthetic-chunk-hash', 1, 120)
ON CONFLICT DO NOTHING;

INSERT INTO document_extraction_jobs (id, tenant_id, organization_id, assessment_id, document_id, status, started_at, completed_at, trace_id)
VALUES ('00000000-0000-4000-8000-000000001901', '00000000-0000-4000-8000-000000000201', '00000000-0000-4000-8000-000000000401', '00000000-0000-4000-8000-000000001401', '00000000-0000-4000-8000-000000001601', 'completed', now(), now(), 'trace-synthetic-0001')
ON CONFLICT DO NOTHING;

INSERT INTO kb_entries (id, tenant_id, organization_id, assessment_id, document_chunk_id, entry_type, content_hash, source_summary)
VALUES ('00000000-0000-4000-8000-000000002001', '00000000-0000-4000-8000-000000000201', '00000000-0000-4000-8000-000000000401', '00000000-0000-4000-8000-000000001401', '00000000-0000-4000-8000-000000001801', 'document_chunk', 'sha256:synthetic-kb-entry-hash', 'Synthetic KB entry')
ON CONFLICT DO NOTHING;

INSERT INTO vector_references (id, tenant_id, organization_id, assessment_id, kb_entry_id, vector_provider, vector_index_name, vector_id, metadata)
VALUES ('00000000-0000-4000-8000-000000002101', '00000000-0000-4000-8000-000000000201', '00000000-0000-4000-8000-000000000401', '00000000-0000-4000-8000-000000001401', '00000000-0000-4000-8000-000000002001', 'cloudflare_vectorize', 'standard-synthetic-index', 'vec_synthetic_001', '{"synthetic":true}'::jsonb)
ON CONFLICT DO NOTHING;

INSERT INTO agent_runs (id, tenant_id, organization_id, assessment_id, agent_name, agent_version, model_provider, model_name, prompt_version, input_hash, output_hash, confidence_score, status, completed_at, trace_id)
VALUES ('00000000-0000-4000-8000-000000002201', '00000000-0000-4000-8000-000000000201', '00000000-0000-4000-8000-000000000401', '00000000-0000-4000-8000-000000001401', 'standard-gap-analyst', '0.1.0', 'synthetic', 'synthetic-model', 'synthetic-v1', 'sha256:synthetic-input-hash', 'sha256:synthetic-output-hash', 0.8200, 'completed', now(), 'trace-synthetic-0001')
ON CONFLICT DO NOTHING;

INSERT INTO agent_decisions (id, tenant_id, organization_id, assessment_id, agent_run_id, decision_type, decision_summary, assumptions, limitations, sources, confidence_score, trace_id)
VALUES ('00000000-0000-4000-8000-000000002301', '00000000-0000-4000-8000-000000000201', '00000000-0000-4000-8000-000000000401', '00000000-0000-4000-8000-000000001401', '00000000-0000-4000-8000-000000002201', 'synthetic_gap_classification', 'Synthetic decision for schema validation.', '["synthetic fixture"]'::jsonb, '["not real assessment output"]'::jsonb, '[{"type":"document_chunk","id":"00000000-0000-4000-8000-000000001801"}]'::jsonb, 0.8200, 'trace-synthetic-0001')
ON CONFLICT DO NOTHING;

INSERT INTO soa_versions (id, tenant_id, organization_id, assessment_id, version_number, status, created_by_agent_run_id)
VALUES ('00000000-0000-4000-8000-000000002401', '00000000-0000-4000-8000-000000000201', '00000000-0000-4000-8000-000000000401', '00000000-0000-4000-8000-000000001401', 1, 'draft', '00000000-0000-4000-8000-000000002201')
ON CONFLICT DO NOTHING;

INSERT INTO soa_items (id, tenant_id, organization_id, assessment_id, soa_version_id, scf_control_id, scf_framework_requirement_id, applicability, justification)
VALUES ('00000000-0000-4000-8000-000000002501', '00000000-0000-4000-8000-000000000201', '00000000-0000-4000-8000-000000000401', '00000000-0000-4000-8000-000000001401', '00000000-0000-4000-8000-000000002401', '00000000-0000-4000-8000-000000000801', '00000000-0000-4000-8000-000000001001', 'applicable', 'Synthetic applicable item.')
ON CONFLICT DO NOTHING;

INSERT INTO evidence_findings (id, tenant_id, organization_id, assessment_id, soa_item_id, scf_control_id, agent_run_id, strength, status, summary, rationale, confidence_score, trace_id)
VALUES ('00000000-0000-4000-8000-000000002601', '00000000-0000-4000-8000-000000000201', '00000000-0000-4000-8000-000000000401', '00000000-0000-4000-8000-000000001401', '00000000-0000-4000-8000-000000002501', '00000000-0000-4000-8000-000000000801', '00000000-0000-4000-8000-000000002201', 'absent', 'not_evidenced', 'Synthetic absence of evidence.', 'No approved synthetic evidence exists.', 0.7000, 'trace-synthetic-0001')
ON CONFLICT DO NOTHING;

INSERT INTO evidence_sources (id, tenant_id, organization_id, assessment_id, evidence_finding_id, document_chunk_id, soa_item_id, source_type, source_hash, excerpt_hash)
VALUES ('00000000-0000-4000-8000-000000002701', '00000000-0000-4000-8000-000000000201', '00000000-0000-4000-8000-000000000401', '00000000-0000-4000-8000-000000001401', '00000000-0000-4000-8000-000000002601', '00000000-0000-4000-8000-000000001801', '00000000-0000-4000-8000-000000002501', 'document_chunk', 'sha256:synthetic-chunk-hash', 'sha256:synthetic-excerpt-hash')
ON CONFLICT DO NOTHING;

INSERT INTO gap_analysis_versions (id, tenant_id, organization_id, assessment_id, version_number, status, created_by_agent_run_id)
VALUES ('00000000-0000-4000-8000-000000002801', '00000000-0000-4000-8000-000000000201', '00000000-0000-4000-8000-000000000401', '00000000-0000-4000-8000-000000001401', 1, 'draft', '00000000-0000-4000-8000-000000002201')
ON CONFLICT DO NOTHING;

INSERT INTO gap_findings (id, tenant_id, organization_id, assessment_id, gap_analysis_version_id, finding_code, framework_requirement_id, scf_control_id, soa_item_id, evidence_finding_id, agent_run_id, trace_id, status, gap_type, summary, rationale, confidence_score)
VALUES ('00000000-0000-4000-8000-000000002901', '00000000-0000-4000-8000-000000000201', '00000000-0000-4000-8000-000000000401', '00000000-0000-4000-8000-000000001401', '00000000-0000-4000-8000-000000002801', 'GAP-001', '00000000-0000-4000-8000-000000001001', '00000000-0000-4000-8000-000000000801', '00000000-0000-4000-8000-000000002501', '00000000-0000-4000-8000-000000002601', '00000000-0000-4000-8000-000000002201', 'trace-synthetic-0001', 'not_evidenced', 'evidence_gap', 'Synthetic evidence gap.', 'Synthetic evidence is absent.', 0.7000)
ON CONFLICT DO NOTHING;

INSERT INTO maturity_assessment_versions (id, tenant_id, organization_id, assessment_id, version_number, status, created_by_agent_run_id)
VALUES ('00000000-0000-4000-8000-000000003001', '00000000-0000-4000-8000-000000000201', '00000000-0000-4000-8000-000000000401', '00000000-0000-4000-8000-000000001401', 1, 'draft', '00000000-0000-4000-8000-000000002201')
ON CONFLICT DO NOTHING;

INSERT INTO maturity_scores (id, tenant_id, organization_id, assessment_id, maturity_assessment_version_id, scf_control_id, score, confidence_score, rationale, evidence_coverage)
VALUES ('00000000-0000-4000-8000-000000003101', '00000000-0000-4000-8000-000000000201', '00000000-0000-4000-8000-000000000401', '00000000-0000-4000-8000-000000001401', '00000000-0000-4000-8000-000000003001', '00000000-0000-4000-8000-000000000801', 2, 0.7400, 'Synthetic maturity score.', 0.3000)
ON CONFLICT DO NOTHING;

INSERT INTO poam_versions (id, tenant_id, organization_id, assessment_id, version_number, status, created_by_agent_run_id)
VALUES ('00000000-0000-4000-8000-000000003201', '00000000-0000-4000-8000-000000000201', '00000000-0000-4000-8000-000000000401', '00000000-0000-4000-8000-000000001401', 1, 'draft', '00000000-0000-4000-8000-000000002201')
ON CONFLICT DO NOTHING;

INSERT INTO poam_items (id, tenant_id, organization_id, assessment_id, poam_version_id, item_code, related_gap_id, scf_control_id, framework_requirement_id, corrective_action, priority, severity, suggested_owner, due_date, dependencies, expected_evidence, acceptance_criteria, status)
VALUES ('00000000-0000-4000-8000-000000003301', '00000000-0000-4000-8000-000000000201', '00000000-0000-4000-8000-000000000401', '00000000-0000-4000-8000-000000001401', '00000000-0000-4000-8000-000000003201', 'POAM-001', '00000000-0000-4000-8000-000000002901', '00000000-0000-4000-8000-000000000801', '00000000-0000-4000-8000-000000001001', 'Create and approve synthetic evidence procedure.', 'medium', 'medium', 'Synthetic Owner', '2026-12-31', '[]'::jsonb, 'Approved synthetic procedure.', 'Procedure is approved and linked to the SoA item.', 'draft')
ON CONFLICT DO NOTHING;

INSERT INTO report_versions (id, tenant_id, organization_id, assessment_id, version_number, report_type, status, created_by_agent_run_id)
VALUES ('00000000-0000-4000-8000-000000003401', '00000000-0000-4000-8000-000000000201', '00000000-0000-4000-8000-000000000401', '00000000-0000-4000-8000-000000001401', 1, 'assessment_summary', 'draft', '00000000-0000-4000-8000-000000002201')
ON CONFLICT DO NOTHING;

INSERT INTO report_artifacts (id, tenant_id, organization_id, assessment_id, report_version_id, storage_provider, storage_key, content_hash, mime_type, file_size)
VALUES ('00000000-0000-4000-8000-000000003501', '00000000-0000-4000-8000-000000000201', '00000000-0000-4000-8000-000000000401', '00000000-0000-4000-8000-000000001401', '00000000-0000-4000-8000-000000003401', 'r2', 'tenants/synthetic/reports/assessment-summary.pdf', 'sha256:synthetic-report-hash', 'application/pdf', 2048)
ON CONFLICT DO NOTHING;

INSERT INTO traceability_links (id, tenant_id, organization_id, assessment_id, source_type, source_id, target_type, target_id, relationship_type, trace_id, metadata)
VALUES
  ('00000000-0000-4000-8000-000000003601', '00000000-0000-4000-8000-000000000201', '00000000-0000-4000-8000-000000000401', '00000000-0000-4000-8000-000000001401', 'gap_finding', '00000000-0000-4000-8000-000000002901', 'evidence_finding', '00000000-0000-4000-8000-000000002601', 'supported_by', 'trace-synthetic-0001', '{"synthetic":true}'::jsonb),
  ('00000000-0000-4000-8000-000000003602', '00000000-0000-4000-8000-000000000201', '00000000-0000-4000-8000-000000000401', '00000000-0000-4000-8000-000000001401', 'poam_item', '00000000-0000-4000-8000-000000003301', 'gap_finding', '00000000-0000-4000-8000-000000002901', 'remediates', 'trace-synthetic-0001', '{"synthetic":true}'::jsonb)
ON CONFLICT DO NOTHING;

INSERT INTO audit_logs (id, actor_id, tenant_id, organization_id, action, resource_type, resource_id, trace_id, metadata)
VALUES ('00000000-0000-4000-8000-000000003701', '00000000-0000-4000-8000-000000000301', '00000000-0000-4000-8000-000000000201', '00000000-0000-4000-8000-000000000401', 'synthetic.seed.loaded', 'assessment', '00000000-0000-4000-8000-000000001401', 'trace-synthetic-0001', '{"synthetic":true,"sensitive_content":false}'::jsonb)
ON CONFLICT DO NOTHING;

