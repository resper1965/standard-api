ALTER TYPE poam_status ADD VALUE IF NOT EXISTS 'deferred';
ALTER TYPE priority ADD VALUE IF NOT EXISTS 'urgent';

DO $$ BEGIN
  CREATE TYPE poam_action_type AS ENUM (
    'policy_update',
    'procedure_creation',
    'technical_implementation',
    'evidence_collection',
    'governance_improvement',
    'monitoring_improvement',
    'training',
    'third_party_action',
    'risk_acceptance',
    'validation_required',
    'other'
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE poam_effort_estimate AS ENUM ('small', 'medium', 'large', 'extra_large', 'unknown');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE poam_dependency_type AS ENUM ('blocks', 'related_to', 'prerequisite', 'duplicates', 'depends_on_external_party');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

ALTER TABLE poam_versions
  ADD COLUMN IF NOT EXISTS source_gap_analysis_version_id uuid REFERENCES gap_analysis_versions(id),
  ADD COLUMN IF NOT EXISTS source_maturity_assessment_version_id uuid REFERENCES maturity_assessment_versions(id),
  ADD COLUMN IF NOT EXISTS framework_id uuid REFERENCES scf_frameworks(id),
  ADD COLUMN IF NOT EXISTS scf_version_id uuid REFERENCES scf_versions(id),
  ADD COLUMN IF NOT EXISTS generated_by_agent_run_id uuid REFERENCES agent_runs(id),
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS submitted_for_review_at timestamptz,
  ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS superseded_by uuid,
  ADD COLUMN IF NOT EXISTS trace_id text,
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}';

ALTER TABLE poam_items
  ADD COLUMN IF NOT EXISTS related_gap_finding_id uuid REFERENCES gap_findings(id),
  ADD COLUMN IF NOT EXISTS source_maturity_score_id uuid REFERENCES maturity_scores(id),
  ADD COLUMN IF NOT EXISTS soa_item_id uuid REFERENCES soa_items(id),
  ADD COLUMN IF NOT EXISTS framework_id uuid REFERENCES scf_frameworks(id),
  ADD COLUMN IF NOT EXISTS scf_version_id uuid REFERENCES scf_versions(id),
  ADD COLUMN IF NOT EXISTS scf_domain_id uuid REFERENCES scf_domains(id),
  ADD COLUMN IF NOT EXISTS poam_code text,
  ADD COLUMN IF NOT EXISTS action_type poam_action_type,
  ADD COLUMN IF NOT EXISTS risk_rating text,
  ADD COLUMN IF NOT EXISTS effort_estimate poam_effort_estimate NOT NULL DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS owner_role text,
  ADD COLUMN IF NOT EXISTS target_maturity_score integer,
  ADD COLUMN IF NOT EXISTS dependencies_summary text,
  ADD COLUMN IF NOT EXISTS rationale text,
  ADD COLUMN IF NOT EXISTS confidence_score numeric(5,4),
  ADD COLUMN IF NOT EXISTS requires_user_validation boolean NOT NULL DEFAULT false;

-- Backfill das colunas legadas. Num banco criado do zero elas nunca existiram,
-- entao cada UPDATE so e planejado se a coluna de origem estiver presente.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema = 'public' AND table_name = 'poam_items' AND column_name = 'item_code') THEN
    UPDATE poam_items SET poam_code = COALESCE(poam_code, item_code) WHERE poam_code IS NULL;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema = 'public' AND table_name = 'poam_items' AND column_name = 'related_gap_id') THEN
    UPDATE poam_items SET related_gap_finding_id = COALESCE(related_gap_finding_id, related_gap_id) WHERE related_gap_finding_id IS NULL;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema = 'public' AND table_name = 'poam_items' AND column_name = 'severity') THEN
    UPDATE poam_items SET risk_rating = COALESCE(risk_rating, severity::text) WHERE risk_rating IS NULL;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema = 'public' AND table_name = 'poam_items' AND column_name = 'corrective_action') THEN
    UPDATE poam_items SET rationale = COALESCE(rationale, corrective_action) WHERE rationale IS NULL;
  END IF;
END $$;

UPDATE poam_items SET action_type = COALESCE(action_type, 'other'::poam_action_type) WHERE action_type IS NULL;
UPDATE poam_items SET confidence_score = COALESCE(confidence_score, 0.5000) WHERE confidence_score IS NULL;

ALTER TABLE poam_items
  ALTER COLUMN poam_code SET NOT NULL,
  ALTER COLUMN action_type SET NOT NULL,
  ALTER COLUMN risk_rating SET NOT NULL,
  ALTER COLUMN rationale SET NOT NULL,
  ALTER COLUMN confidence_score SET NOT NULL;

ALTER TABLE poam_items
  ALTER COLUMN expected_evidence TYPE jsonb USING to_jsonb(ARRAY[expected_evidence]),
  ALTER COLUMN expected_evidence SET DEFAULT '[]'::jsonb,
  ALTER COLUMN acceptance_criteria TYPE jsonb USING to_jsonb(ARRAY[acceptance_criteria]),
  ALTER COLUMN acceptance_criteria SET DEFAULT '[]'::jsonb;

CREATE INDEX IF NOT EXISTS poam_versions_gap_idx ON poam_versions(source_gap_analysis_version_id);
CREATE INDEX IF NOT EXISTS poam_items_control_idx ON poam_items(scf_control_id);

CREATE TABLE IF NOT EXISTS poam_milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  assessment_id uuid NOT NULL REFERENCES assessments(id),
  poam_item_id uuid NOT NULL REFERENCES poam_items(id),
  milestone_code text NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  due_date date,
  status poam_status NOT NULL DEFAULT 'draft',
  acceptance_criteria jsonb NOT NULL DEFAULT '[]',
  expected_evidence jsonb NOT NULL DEFAULT '[]',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS poam_milestones_item_idx ON poam_milestones(poam_item_id);
CREATE UNIQUE INDEX IF NOT EXISTS poam_milestones_item_code_uidx ON poam_milestones(poam_item_id, milestone_code);

CREATE TABLE IF NOT EXISTS poam_dependencies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  assessment_id uuid NOT NULL REFERENCES assessments(id),
  poam_item_id uuid NOT NULL REFERENCES poam_items(id),
  depends_on_poam_item_id uuid REFERENCES poam_items(id),
  dependency_type poam_dependency_type NOT NULL,
  description text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS poam_dependencies_item_idx ON poam_dependencies(poam_item_id);
CREATE INDEX IF NOT EXISTS poam_dependencies_depends_on_idx ON poam_dependencies(depends_on_poam_item_id);
