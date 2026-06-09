-- MA&D: Mergers, Acquisitions & Divestitures Security Standards (MADSS)
CREATE TYPE mad_transaction_type AS ENUM (
  'acquisition', 'merger', 'divestiture', 'joint_venture', 'spin_off'
);

CREATE TYPE mad_phase AS ENUM (
  'pre_transaction', 'transaction_assessment', 'data_privacy_evaluation',
  'third_party_risk', 'integration_planning', 'inherited_risk',
  'contractual_controls', 'post_transaction_monitoring'
);

CREATE TABLE mad_standards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scf_version_id uuid NOT NULL REFERENCES scf_versions(id),
  standard_number integer NOT NULL,
  code text NOT NULL,
  title text NOT NULL,
  description text,
  phase mad_phase NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  is_synthetic boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX mad_standards_version_idx ON mad_standards(scf_version_id);
CREATE UNIQUE INDEX mad_standards_version_code_uidx ON mad_standards(scf_version_id, code);

CREATE TABLE mad_sub_requirements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scf_version_id uuid NOT NULL REFERENCES scf_versions(id),
  mad_standard_id uuid NOT NULL REFERENCES mad_standards(id),
  requirement_code text NOT NULL,
  title text NOT NULL,
  description text,
  sort_order integer NOT NULL DEFAULT 0,
  is_synthetic boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX mad_subreq_standard_idx ON mad_sub_requirements(mad_standard_id);
CREATE UNIQUE INDEX mad_subreq_version_code_uidx ON mad_sub_requirements(scf_version_id, requirement_code);

CREATE TABLE mad_maturity_criteria (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scf_version_id uuid NOT NULL REFERENCES scf_versions(id),
  mad_sub_requirement_id uuid NOT NULL REFERENCES mad_sub_requirements(id),
  level integer NOT NULL CHECK (level >= 0 AND level <= 5),
  criteria_text text NOT NULL,
  remediation_guidance text,
  is_synthetic boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX mad_mc_subreq_idx ON mad_maturity_criteria(mad_sub_requirement_id);
CREATE UNIQUE INDEX mad_mc_subreq_level_uidx ON mad_maturity_criteria(mad_sub_requirement_id, level);

CREATE TABLE mad_control_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scf_version_id uuid NOT NULL REFERENCES scf_versions(id),
  mad_sub_requirement_id uuid NOT NULL REFERENCES mad_sub_requirements(id),
  scf_control_id uuid NOT NULL REFERENCES scf_controls(id),
  relationship_note text,
  is_synthetic boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX mad_cm_subreq_idx ON mad_control_mappings(mad_sub_requirement_id);
CREATE INDEX mad_cm_control_idx ON mad_control_mappings(scf_control_id);
CREATE UNIQUE INDEX mad_cm_subreq_control_uidx ON mad_control_mappings(mad_sub_requirement_id, scf_control_id);

CREATE TABLE mad_transaction_assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  assessment_id uuid REFERENCES assessments(id),
  transaction_name text NOT NULL,
  transaction_type mad_transaction_type NOT NULL,
  target_entity_name text,
  transaction_date text,
  status text NOT NULL DEFAULT 'draft',
  scf_version_id uuid REFERENCES scf_versions(id),
  created_by uuid REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
CREATE INDEX mad_ta_org_idx ON mad_transaction_assessments(organization_id);
CREATE INDEX mad_ta_assessment_idx ON mad_transaction_assessments(assessment_id);

CREATE TABLE mad_maturity_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  mad_transaction_assessment_id uuid NOT NULL REFERENCES mad_transaction_assessments(id),
  mad_sub_requirement_id uuid NOT NULL REFERENCES mad_sub_requirements(id),
  score integer NOT NULL CHECK (score >= 0 AND score <= 5),
  rationale text,
  assessed_by uuid REFERENCES users(id),
  assessed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX mad_ms_transaction_idx ON mad_maturity_scores(mad_transaction_assessment_id);
CREATE UNIQUE INDEX mad_ms_transaction_subreq_uidx ON mad_maturity_scores(mad_transaction_assessment_id, mad_sub_requirement_id);
