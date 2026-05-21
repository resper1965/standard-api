CREATE TABLE IF NOT EXISTS agent_tool_calls (
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
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS agent_tool_calls_run_idx
  ON agent_tool_calls(agent_run_id);

CREATE INDEX IF NOT EXISTS agent_tool_calls_assessment_idx
  ON agent_tool_calls(tenant_id, organization_id, assessment_id);

CREATE INDEX IF NOT EXISTS agent_tool_calls_trace_idx
  ON agent_tool_calls(trace_id);
