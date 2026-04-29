ALTER TYPE approval_gate ADD VALUE IF NOT EXISTS 'report';
ALTER TYPE storage_provider ADD VALUE IF NOT EXISTS 'r2_compatible_mock';

DO $$ BEGIN
  CREATE TYPE report_type AS ENUM ('full_assessment_report', 'executive_summary', 'soa_export', 'gap_analysis_report', 'maturity_report', 'poam_report', 'audit_package', 'machine_readable_export');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE report_artifact_type AS ENUM ('report', 'export', 'evidence_index', 'audit_package', 'appendix', 'summary');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE report_format AS ENUM ('json', 'markdown', 'html', 'docx', 'pdf', 'csv', 'xlsx', 'zip');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE export_job_status AS ENUM ('queued', 'running', 'succeeded', 'failed', 'skipped', 'cancelled', 'retrying');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

ALTER TABLE report_versions
  ADD COLUMN IF NOT EXISTS title text NOT NULL DEFAULT 'Aegis Assessment Report',
  ADD COLUMN IF NOT EXISTS source_scope_id uuid REFERENCES assessment_scope(id),
  ADD COLUMN IF NOT EXISTS source_soa_version_id uuid REFERENCES soa_versions(id),
  ADD COLUMN IF NOT EXISTS source_gap_analysis_version_id uuid REFERENCES gap_analysis_versions(id),
  ADD COLUMN IF NOT EXISTS source_maturity_assessment_version_id uuid REFERENCES maturity_assessment_versions(id),
  ADD COLUMN IF NOT EXISTS source_poam_version_id uuid REFERENCES poam_versions(id),
  ADD COLUMN IF NOT EXISTS framework_id uuid REFERENCES scf_frameworks(id),
  ADD COLUMN IF NOT EXISTS scf_version_id uuid REFERENCES scf_versions(id),
  ADD COLUMN IF NOT EXISTS generated_by_agent_run_id uuid REFERENCES agent_runs(id),
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS submitted_for_review_at timestamptz,
  ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS superseded_by uuid,
  ADD COLUMN IF NOT EXISTS trace_id text NOT NULL DEFAULT 'trace-not-set',
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE report_artifacts
  ADD COLUMN IF NOT EXISTS artifact_type report_artifact_type NOT NULL DEFAULT 'report',
  ADD COLUMN IF NOT EXISTS format report_format NOT NULL DEFAULT 'json',
  ADD COLUMN IF NOT EXISTS storage_bucket text,
  ADD COLUMN IF NOT EXISTS generated_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS report_versions_sources_idx
  ON report_versions(source_soa_version_id, source_gap_analysis_version_id, source_poam_version_id);

CREATE TABLE IF NOT EXISTS export_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  assessment_id uuid NOT NULL REFERENCES assessments(id),
  report_version_id uuid REFERENCES report_versions(id),
  job_type text NOT NULL,
  status export_job_status NOT NULL DEFAULT 'queued',
  requested_format report_format NOT NULL,
  requested_by uuid NOT NULL REFERENCES users(id),
  queued_at timestamptz NOT NULL DEFAULT now(),
  started_at timestamptz,
  completed_at timestamptz,
  error_code text,
  error_message_safe text,
  trace_id text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS export_jobs_assessment_idx
  ON export_jobs(tenant_id, organization_id, assessment_id);

CREATE INDEX IF NOT EXISTS export_jobs_report_idx
  ON export_jobs(report_version_id);

CREATE INDEX IF NOT EXISTS export_jobs_status_idx
  ON export_jobs(status);
