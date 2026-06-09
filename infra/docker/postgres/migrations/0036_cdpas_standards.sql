-- CDPAS: Cybersecurity & Data Protection Assessment Standards
CREATE TYPE cdpas_rating AS ENUM (
  'conforms',
  'significant_deficiency',
  'material_weakness',
  'not_assessed',
  'not_applicable'
);

CREATE TYPE cdpas_method AS ENUM ('examine', 'interview', 'test');

CREATE TABLE cdpas_standards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scf_version_id uuid NOT NULL REFERENCES scf_versions(id),
  standard_number integer NOT NULL,
  code text NOT NULL,
  title text NOT NULL,
  description text,
  sort_order integer NOT NULL DEFAULT 0,
  is_synthetic boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX cdpas_standards_version_idx ON cdpas_standards(scf_version_id);
CREATE UNIQUE INDEX cdpas_standards_version_code_uidx ON cdpas_standards(scf_version_id, code);

CREATE TABLE cdpas_sub_requirements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scf_version_id uuid NOT NULL REFERENCES scf_versions(id),
  cdpas_standard_id uuid NOT NULL REFERENCES cdpas_standards(id),
  requirement_code text NOT NULL,
  title text NOT NULL,
  description text,
  assessment_methods jsonb NOT NULL DEFAULT '[]'::jsonb,
  sort_order integer NOT NULL DEFAULT 0,
  is_synthetic boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX cdpas_subreq_standard_idx ON cdpas_sub_requirements(cdpas_standard_id);
CREATE UNIQUE INDEX cdpas_subreq_version_code_uidx ON cdpas_sub_requirements(scf_version_id, requirement_code);

CREATE TABLE cdpas_control_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scf_version_id uuid NOT NULL REFERENCES scf_versions(id),
  cdpas_sub_requirement_id uuid NOT NULL REFERENCES cdpas_sub_requirements(id),
  scf_control_id uuid NOT NULL REFERENCES scf_controls(id),
  relationship_note text,
  is_synthetic boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX cdpas_cm_subreq_idx ON cdpas_control_mappings(cdpas_sub_requirement_id);
CREATE INDEX cdpas_cm_control_idx ON cdpas_control_mappings(scf_control_id);
CREATE UNIQUE INDEX cdpas_cm_subreq_control_uidx ON cdpas_control_mappings(cdpas_sub_requirement_id, scf_control_id);

CREATE TABLE cdpas_assessment_findings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  assessment_id uuid NOT NULL REFERENCES assessments(id),
  cdpas_sub_requirement_id uuid NOT NULL REFERENCES cdpas_sub_requirements(id),
  rating cdpas_rating NOT NULL DEFAULT 'not_assessed',
  method_used jsonb NOT NULL DEFAULT '[]'::jsonb,
  finding_summary text,
  evidence_summary text,
  assessed_by uuid REFERENCES users(id),
  assessed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX cdpas_findings_assessment_idx ON cdpas_assessment_findings(organization_id, assessment_id);
CREATE INDEX cdpas_findings_subreq_idx ON cdpas_assessment_findings(cdpas_sub_requirement_id);
CREATE UNIQUE INDEX cdpas_findings_assessment_subreq_uidx ON cdpas_assessment_findings(assessment_id, cdpas_sub_requirement_id);
