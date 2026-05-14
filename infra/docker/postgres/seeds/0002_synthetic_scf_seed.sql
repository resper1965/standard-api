INSERT INTO scf_import_runs (
  id,
  scf_version_id,
  source_type,
  source_filename,
  source_hash,
  status,
  started_at,
  completed_at,
  error_summary_safe,
  import_statistics,
  trace_id
) VALUES (
  '20000000-0000-4000-8000-000000000601',
  NULL,
  'synthetic_fixture',
  'synthetic-scf.fixture.ts',
  'sha256:synthetic-scf-fixture',
  'succeeded',
  '2026-01-01T00:00:00Z',
  '2026-01-01T00:00:00Z',
  NULL,
  '{"versions":1,"domains":2,"controls":4,"frameworks":1,"requirements":2,"mappings":2,"strm_relationships":2,"warnings":0,"synthetic_records":14}'::jsonb,
  'synthetic-trace'
) ON CONFLICT (id) DO NOTHING;
