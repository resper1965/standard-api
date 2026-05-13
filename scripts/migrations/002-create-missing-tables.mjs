// Migration 002: Create 11 missing tables from Drizzle schema
// Idempotent: CREATE TABLE IF NOT EXISTS
const H = 'ep-blue-breeze-anyfua57.c-6.us-east-1.aws.neon.tech';
const CS = 'postgresql://neondb_owner:npg_T8MHv6EoDIGh@' + H + '/neondb?sslmode=require';

async function sql(text) {
  const r = await fetch('https://' + H + '/sql', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Neon-Connection-String': CS },
    body: JSON.stringify({ query: text }),
  });
  const d = await r.json();
  if (d.message) throw new Error(d.message + ' | SQL: ' + text.substring(0, 120));
  return d;
}

const tables = [
  // 1. api_keys
  `CREATE TABLE IF NOT EXISTS api_keys (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id),
    organization_id uuid NOT NULL REFERENCES organizations(id),
    name text NOT NULL,
    key_hash text NOT NULL,
    masked_key text NOT NULL,
    scopes jsonb NOT NULL DEFAULT '[]',
    expires_at timestamptz,
    last_used_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    deleted_at timestamptz
  )`,
  `CREATE INDEX IF NOT EXISTS api_keys_org_idx ON api_keys(organization_id)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS api_keys_hash_uidx ON api_keys(key_hash)`,

  // 2. kb_embedding_jobs
  `CREATE TABLE IF NOT EXISTS kb_embedding_jobs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id),
    organization_id uuid NOT NULL REFERENCES organizations(id),
    assessment_id uuid NOT NULL REFERENCES assessments(id),
    document_id uuid NOT NULL REFERENCES documents(id),
    chunk_id uuid REFERENCES document_chunks(id),
    job_type text NOT NULL,
    status text NOT NULL,
    attempt_count integer NOT NULL DEFAULT 0,
    queued_at timestamptz NOT NULL DEFAULT now(),
    started_at timestamptz,
    completed_at timestamptz,
    error_code text,
    error_message_safe text,
    trace_id text NOT NULL,
    metadata jsonb NOT NULL DEFAULT '{}',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    deleted_at timestamptz
  )`,
  `CREATE INDEX IF NOT EXISTS kb_embedding_jobs_assessment_idx ON kb_embedding_jobs(tenant_id, organization_id, assessment_id)`,
  `CREATE INDEX IF NOT EXISTS kb_embedding_jobs_document_idx ON kb_embedding_jobs(document_id)`,
  `CREATE INDEX IF NOT EXISTS kb_embedding_jobs_status_idx ON kb_embedding_jobs(status)`,
  `CREATE INDEX IF NOT EXISTS kb_embedding_jobs_trace_idx ON kb_embedding_jobs(trace_id)`,

  // 3. kb_search_logs
  `CREATE TABLE IF NOT EXISTS kb_search_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id),
    organization_id uuid NOT NULL REFERENCES organizations(id),
    assessment_id uuid NOT NULL REFERENCES assessments(id),
    actor_id uuid REFERENCES users(id),
    query_hash text NOT NULL,
    search_type text NOT NULL,
    filters jsonb NOT NULL DEFAULT '{}',
    result_count integer NOT NULL DEFAULT 0,
    trace_id text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS kb_search_logs_assessment_idx ON kb_search_logs(tenant_id, organization_id, assessment_id)`,
  `CREATE INDEX IF NOT EXISTS kb_search_logs_trace_idx ON kb_search_logs(trace_id)`,
  `CREATE INDEX IF NOT EXISTS kb_search_logs_query_hash_idx ON kb_search_logs(query_hash)`,

  // 4. agent_tool_calls
  `CREATE TABLE IF NOT EXISTS agent_tool_calls (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id),
    organization_id uuid NOT NULL REFERENCES organizations(id),
    assessment_id uuid NOT NULL REFERENCES assessments(id),
    agent_run_id uuid NOT NULL REFERENCES agent_runs(id),
    tool_name text NOT NULL,
    risk_level text NOT NULL,
    input_hash text NOT NULL,
    output_hash text,
    status text NOT NULL,
    trace_id text NOT NULL,
    metadata jsonb NOT NULL DEFAULT '{}',
    created_at timestamptz NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS agent_tool_calls_run_idx ON agent_tool_calls(agent_run_id)`,
  `CREATE INDEX IF NOT EXISTS agent_tool_calls_assessment_idx ON agent_tool_calls(tenant_id, organization_id, assessment_id)`,
  `CREATE INDEX IF NOT EXISTS agent_tool_calls_trace_idx ON agent_tool_calls(trace_id)`,

  // 5. poam_milestones
  `CREATE TABLE IF NOT EXISTS poam_milestones (
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
  )`,
  `CREATE INDEX IF NOT EXISTS poam_milestones_item_idx ON poam_milestones(poam_item_id)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS poam_milestones_item_code_uidx ON poam_milestones(poam_item_id, milestone_code)`,

  // 6. poam_dependencies
  `CREATE TABLE IF NOT EXISTS poam_dependencies (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id),
    organization_id uuid NOT NULL REFERENCES organizations(id),
    assessment_id uuid NOT NULL REFERENCES assessments(id),
    poam_item_id uuid NOT NULL REFERENCES poam_items(id),
    depends_on_poam_item_id uuid REFERENCES poam_items(id),
    dependency_type poam_dependency_type NOT NULL,
    description text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS poam_dependencies_item_idx ON poam_dependencies(poam_item_id)`,
  `CREATE INDEX IF NOT EXISTS poam_dependencies_depends_on_idx ON poam_dependencies(depends_on_poam_item_id)`,

  // 7. export_jobs
  `CREATE TABLE IF NOT EXISTS export_jobs (
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
    metadata jsonb NOT NULL DEFAULT '{}'
  )`,
  `CREATE INDEX IF NOT EXISTS export_jobs_assessment_idx ON export_jobs(tenant_id, organization_id, assessment_id)`,
  `CREATE INDEX IF NOT EXISTS export_jobs_report_idx ON export_jobs(report_version_id)`,
  `CREATE INDEX IF NOT EXISTS export_jobs_status_idx ON export_jobs(status)`,

  // 8. workflow_runs
  `CREATE TABLE IF NOT EXISTS workflow_runs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id),
    organization_id uuid NOT NULL REFERENCES organizations(id),
    assessment_id uuid NOT NULL REFERENCES assessments(id),
    status workflow_run_status NOT NULL DEFAULT 'pending',
    idempotency_key text NOT NULL,
    state jsonb NOT NULL,
    signal_idempotency_keys jsonb NOT NULL DEFAULT '[]',
    step_idempotency_keys jsonb NOT NULL DEFAULT '[]',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    deleted_at timestamptz
  )`,
  `CREATE INDEX IF NOT EXISTS workflow_runs_assessment_idx ON workflow_runs(tenant_id, organization_id, assessment_id)`,
  `CREATE INDEX IF NOT EXISTS workflow_runs_status_idx ON workflow_runs(status)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS workflow_runs_idempotency_uidx ON workflow_runs(idempotency_key)`,

  // 9. workflow_audit_events
  `CREATE TABLE IF NOT EXISTS workflow_audit_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id),
    organization_id uuid NOT NULL REFERENCES organizations(id),
    assessment_id uuid NOT NULL REFERENCES assessments(id),
    workflow_run_id uuid NOT NULL REFERENCES workflow_runs(id),
    event_type text NOT NULL,
    step_name text,
    actor_id uuid REFERENCES users(id),
    system_actor text,
    trace_id text NOT NULL,
    metadata jsonb NOT NULL DEFAULT '{}',
    created_at timestamptz NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS workflow_audit_events_run_idx ON workflow_audit_events(workflow_run_id)`,
  `CREATE INDEX IF NOT EXISTS workflow_audit_events_assessment_idx ON workflow_audit_events(tenant_id, organization_id, assessment_id)`,
  `CREATE INDEX IF NOT EXISTS workflow_audit_events_trace_idx ON workflow_audit_events(trace_id)`,

  // 10. webhook_endpoints
  `CREATE TABLE IF NOT EXISTS webhook_endpoints (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id),
    organization_id uuid NOT NULL REFERENCES organizations(id),
    url text NOT NULL,
    events jsonb NOT NULL DEFAULT '[]',
    description text,
    enabled boolean NOT NULL DEFAULT true,
    signing_secret_hash text NOT NULL,
    signing_secret_masked text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    deleted_at timestamptz
  )`,
  `CREATE INDEX IF NOT EXISTS webhook_endpoints_tenant_org_idx ON webhook_endpoints(tenant_id, organization_id)`,
  `CREATE INDEX IF NOT EXISTS webhook_endpoints_tenant_idx ON webhook_endpoints(tenant_id)`,

  // 11. webhook_deliveries
  `CREATE TABLE IF NOT EXISTS webhook_deliveries (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    endpoint_id uuid NOT NULL REFERENCES webhook_endpoints(id),
    event_id text NOT NULL,
    event_type text NOT NULL,
    status webhook_delivery_status NOT NULL DEFAULT 'pending',
    http_status integer,
    attempt_count integer NOT NULL DEFAULT 0,
    max_attempts integer NOT NULL DEFAULT 3,
    last_attempted_at timestamptz,
    next_retry_at timestamptz,
    response_body text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    deleted_at timestamptz
  )`,
  `CREATE INDEX IF NOT EXISTS webhook_deliveries_endpoint_idx ON webhook_deliveries(endpoint_id)`,
  `CREATE INDEX IF NOT EXISTS webhook_deliveries_event_id_idx ON webhook_deliveries(event_id)`,
  `CREATE INDEX IF NOT EXISTS webhook_deliveries_status_idx ON webhook_deliveries(status)`,
];

async function main() {
  console.log('[002] Creating missing tables...');
  let ok = 0, fail = 0;
  for (const stmt of tables) {
    try {
      await sql(stmt);
      const label = stmt.replace(/\s+/g, ' ').substring(0, 80);
      console.log('  [ok]', label);
      ok++;
    } catch (e) {
      console.error('  [FAIL]', e.message);
      fail++;
    }
  }
  console.log('\n[002] Done:', ok, 'ok,', fail, 'failed');

  // Verify
  const { rows } = await sql(`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE' ORDER BY table_name`);
  const names = rows.map(r => Array.isArray(r) ? r[0] : r.table_name);
  console.log('\nTotal tables:', names.length);
  const expected = ['api_keys','kb_embedding_jobs','kb_search_logs','agent_tool_calls','poam_milestones','poam_dependencies','export_jobs','workflow_runs','workflow_audit_events','webhook_endpoints','webhook_deliveries'];
  for (const t of expected) {
    console.log('  ' + t + ':', names.includes(t) ? '✓' : '✗ MISSING');
  }
}

main().catch(e => { console.error('[FATAL]', e.message); process.exit(1); });
