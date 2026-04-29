-- Evidence Analysis and Gap Analysis workflow model.
-- This migration aligns the existing placeholder tables with the first functional workflow.

ALTER TYPE evidence_strength ADD VALUE IF NOT EXISTS 'not_checked';
DO $$ BEGIN
  CREATE TYPE evidence_status AS ENUM ('candidate', 'accepted', 'rejected', 'insufficient', 'conflicting', 'not_evidenced');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
ALTER TYPE gap_type ADD VALUE IF NOT EXISTS 'no_gap';
ALTER TYPE gap_type ADD VALUE IF NOT EXISTS 'not_applicable';
ALTER TYPE severity ADD VALUE IF NOT EXISTS 'informational';

ALTER TABLE evidence_findings
  ADD COLUMN IF NOT EXISTS soa_version_id uuid REFERENCES soa_versions(id),
  ADD COLUMN IF NOT EXISTS framework_id uuid REFERENCES scf_frameworks(id),
  ADD COLUMN IF NOT EXISTS framework_requirement_id uuid REFERENCES scf_framework_requirements(id),
  ADD COLUMN IF NOT EXISTS scf_version_id uuid REFERENCES scf_versions(id),
  ADD COLUMN IF NOT EXISTS evidence_strength evidence_strength DEFAULT 'not_checked',
  ADD COLUMN IF NOT EXISTS evidence_status evidence_status DEFAULT 'not_evidenced',
  ADD COLUMN IF NOT EXISTS evidence_summary text,
  ADD COLUMN IF NOT EXISTS evidence_limitations jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS generated_by_agent_run_id uuid REFERENCES agent_runs(id);

ALTER TABLE evidence_sources
  ADD COLUMN IF NOT EXISTS document_id uuid REFERENCES documents(id),
  ADD COLUMN IF NOT EXISTS chunk_id uuid REFERENCES document_chunks(id),
  ADD COLUMN IF NOT EXISTS vector_reference_id uuid REFERENCES vector_references(id),
  ADD COLUMN IF NOT EXISTS source_title text,
  ADD COLUMN IF NOT EXISTS source_location text,
  ADD COLUMN IF NOT EXISTS snippet text,
  ADD COLUMN IF NOT EXISTS retrieval_score numeric(8,6),
  ADD COLUMN IF NOT EXISTS retrieval_method text,
  ADD COLUMN IF NOT EXISTS candidate_evidence boolean DEFAULT true NOT NULL;

ALTER TABLE gap_analysis_versions
  ADD COLUMN IF NOT EXISTS source_soa_version_id uuid REFERENCES soa_versions(id),
  ADD COLUMN IF NOT EXISTS framework_id uuid REFERENCES scf_frameworks(id),
  ADD COLUMN IF NOT EXISTS scf_version_id uuid REFERENCES scf_versions(id),
  ADD COLUMN IF NOT EXISTS generated_by_agent_run_id uuid REFERENCES agent_runs(id),
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS submitted_for_review_at timestamptz,
  ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS superseded_by uuid,
  ADD COLUMN IF NOT EXISTS trace_id text,
  ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb NOT NULL;

ALTER TABLE gap_findings
  ADD COLUMN IF NOT EXISTS soa_version_id uuid REFERENCES soa_versions(id),
  ADD COLUMN IF NOT EXISTS soa_item_id uuid REFERENCES soa_items(id),
  ADD COLUMN IF NOT EXISTS framework_id uuid REFERENCES scf_frameworks(id),
  ADD COLUMN IF NOT EXISTS scf_version_id uuid REFERENCES scf_versions(id),
  ADD COLUMN IF NOT EXISTS gap_code text,
  ADD COLUMN IF NOT EXISTS assessment_status gap_status,
  ADD COLUMN IF NOT EXISTS severity severity,
  ADD COLUMN IF NOT EXISTS impact text,
  ADD COLUMN IF NOT EXISTS likelihood text,
  ADD COLUMN IF NOT EXISTS gap_summary text,
  ADD COLUMN IF NOT EXISTS gap_rationale text,
  ADD COLUMN IF NOT EXISTS recommendation_summary text,
  ADD COLUMN IF NOT EXISTS requires_user_validation boolean DEFAULT true NOT NULL;

CREATE INDEX IF NOT EXISTS evidence_findings_soa_item_idx ON evidence_findings(soa_item_id);
CREATE INDEX IF NOT EXISTS evidence_sources_vector_reference_idx ON evidence_sources(vector_reference_id);
CREATE INDEX IF NOT EXISTS gap_findings_soa_item_idx ON gap_findings(soa_item_id);
