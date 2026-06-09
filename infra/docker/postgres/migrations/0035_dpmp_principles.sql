-- DPMP: Data Privacy Management Principles catalog
CREATE TYPE dpmp_domain AS ENUM (
  'privacy_by_design',
  'data_minimization',
  'consent_management',
  'data_subject_rights',
  'data_retention',
  'third_party_privacy',
  'cross_border_transfers',
  'privacy_governance',
  'breach_notification',
  'privacy_impact_assessment',
  'business_environment'
);

CREATE TABLE dpmp_principles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scf_version_id uuid REFERENCES scf_versions(id),
  principle_code text NOT NULL,
  domain dpmp_domain NOT NULL,
  title text NOT NULL,
  description text,
  scf_control_codes jsonb NOT NULL DEFAULT '[]'::jsonb,
  sort_order integer NOT NULL DEFAULT 0,
  is_synthetic boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
CREATE INDEX idx_dpmp_principles_version ON dpmp_principles(scf_version_id);
CREATE INDEX idx_dpmp_principles_domain ON dpmp_principles(domain);
CREATE UNIQUE INDEX dpmp_principles_version_code_uidx ON dpmp_principles(scf_version_id, principle_code);

CREATE TABLE dpmp_framework_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scf_version_id uuid REFERENCES scf_versions(id),
  dpmp_principle_id uuid NOT NULL REFERENCES dpmp_principles(id),
  framework_id text NOT NULL,
  requirement_reference text,
  mapping_note text,
  is_synthetic boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_dpmp_fw_mappings_principle ON dpmp_framework_mappings(dpmp_principle_id);
CREATE INDEX idx_dpmp_fw_mappings_framework ON dpmp_framework_mappings(framework_id);
CREATE UNIQUE INDEX dpmp_fw_mappings_principle_fw_req_uidx
  ON dpmp_framework_mappings(dpmp_principle_id, framework_id, requirement_reference);
