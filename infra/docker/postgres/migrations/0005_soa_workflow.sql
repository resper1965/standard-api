ALTER TABLE assessment_scope
  ADD COLUMN IF NOT EXISTS scope_version integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS title text,
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS business_units jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS processes jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS systems jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS locations jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS legal_entities jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS data_types jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS third_parties jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS constraints jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES users(id);

ALTER TABLE soa_versions
  ADD COLUMN IF NOT EXISTS source_framework_id uuid REFERENCES scf_frameworks(id),
  ADD COLUMN IF NOT EXISTS scf_version_id uuid REFERENCES scf_versions(id),
  ADD COLUMN IF NOT EXISTS source_scope_id uuid REFERENCES assessment_scope(id),
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS submitted_for_review_at timestamptz,
  ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS superseded_by uuid,
  ADD COLUMN IF NOT EXISTS trace_id text,
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE soa_items
  ALTER COLUMN scf_control_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS framework_id uuid REFERENCES scf_frameworks(id),
  ADD COLUMN IF NOT EXISTS framework_requirement_id uuid REFERENCES scf_framework_requirements(id),
  ADD COLUMN IF NOT EXISTS scf_version_id uuid REFERENCES scf_versions(id),
  ADD COLUMN IF NOT EXISTS applicability_status text NOT NULL DEFAULT 'requires_validation',
  ADD COLUMN IF NOT EXISTS implementation_status text NOT NULL DEFAULT 'not_assessed',
  ADD COLUMN IF NOT EXISTS applicability_rationale text,
  ADD COLUMN IF NOT EXISTS non_applicability_rationale text,
  ADD COLUMN IF NOT EXISTS scope_rationale text,
  ADD COLUMN IF NOT EXISTS evidence_summary text,
  ADD COLUMN IF NOT EXISTS evidence_coverage text NOT NULL DEFAULT 'not_checked',
  ADD COLUMN IF NOT EXISTS confidence_score numeric(5,4),
  ADD COLUMN IF NOT EXISTS requires_user_validation boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS validation_notes text,
  ADD COLUMN IF NOT EXISTS source_mapping_id uuid REFERENCES scf_mappings(id),
  ADD COLUMN IF NOT EXISTS mapping_status text NOT NULL DEFAULT 'official_mapping',
  ADD COLUMN IF NOT EXISTS relationship_type text,
  ADD COLUMN IF NOT EXISTS relationship_strength text;

CREATE INDEX IF NOT EXISTS assessment_scope_status_idx
  ON assessment_scope (tenant_id, organization_id, assessment_id, status);

CREATE INDEX IF NOT EXISTS soa_versions_status_idx
  ON soa_versions (tenant_id, organization_id, assessment_id, status);

CREATE INDEX IF NOT EXISTS soa_items_requirement_idx
  ON soa_items (framework_requirement_id);

CREATE INDEX IF NOT EXISTS soa_items_mapping_idx
  ON soa_items (source_mapping_id);
