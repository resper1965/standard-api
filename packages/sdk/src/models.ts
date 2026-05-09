/**
 * SDK Domain Types
 *
 * These types mirror the API response shapes.
 * They are NOT imported from @standard/schemas to keep the SDK zero-dependency.
 *
 * @module @standard/sdk/models
 */

// ── Assessments ──────────────────────────────────────────────
export type Assessment = {
  id: string;
  tenant_id: string;
  organization_id: string;
  name: string;
  state: string;
  scf_version_id: string;
  framework_ids?: string[];
  document_count?: number;
  created_at: string;
  updated_at: string;
};

// ── Documents ────────────────────────────────────────────────
export type Document = {
  id: string;
  assessment_id: string;
  filename: string;
  mime_type: string;
  size_bytes: number;
  status: string;
  description?: string | null;
  r2_key?: string;
  created_at: string;
};

export type DocumentChunk = {
  id: string;
  document_id: string;
  chunk_index: number;
  content: string;
  token_count?: number;
};

export type IngestionJob = {
  id: string;
  assessment_id: string;
  status: string;
  total_documents: number;
  processed_documents: number;
  created_at: string;
};

// ── SCF ──────────────────────────────────────────────────────
export type ScfVersion = {
  id: string;
  version: string;
  release_date?: string;
  is_active: boolean;
  control_count?: number;
  domain_count?: number;
};

export type ScfDomain = {
  id: string;
  scf_version_id: string;
  code: string;
  name: string;
  description?: string;
  control_count?: number;
};

export type ScfControl = {
  id: string;
  code: string;
  title: string;
  description: string;
  domain_id: string;
  scf_version_id: string;
  priority?: string;
  methods_to_comply?: string;
  supplemental_guidance?: string;
};

export type ScfFramework = {
  id: string;
  name: string;
  code: string;
  version?: string;
  description?: string;
  requirement_count?: number;
  coverage_percentage?: number;
};

export type ScfMapping = {
  id: string;
  scf_control_id: string;
  scf_framework_requirement_id: string;
  mapping_type?: string;
};

export type ScfRequirement = {
  id: string;
  framework_id: string;
  identifier: string;
  title?: string;
  description?: string;
};

export type ScfCoverage = {
  framework_id: string;
  total_requirements: number;
  mapped_requirements: number;
  coverage_percentage: number;
};

// ── Lifecycle ────────────────────────────────────────────────
export type LifecycleEvent = {
  id: string;
  assessment_id: string;
  from_state: string;
  to_state: string;
  actor_id?: string;
  reason?: string;
  timestamp: string;
};

export type AvailableTransition = {
  next_state: string;
  label: string;
  requires_approval?: boolean;
};

// ── Approvals ────────────────────────────────────────────────
export type ApprovalRecord = {
  id: string;
  assessment_id: string;
  gate: string;
  decision: "approved" | "rejected";
  target_type: string;
  target_id: string;
  actor_id: string;
  reason?: string;
  created_at: string;
};

// ── Artifacts ────────────────────────────────────────────────
export type ArtifactVersion = {
  id: string;
  assessment_id: string;
  artifact_type: string;
  version_number: number;
  status: string;
  source_agent_run_id?: string;
  created_at: string;
  updated_at: string;
};

// ── SoA ──────────────────────────────────────────────────────
export type SoaVersion = {
  id: string;
  assessment_id: string;
  version_number: number;
  status: string;
  created_at: string;
};

export type SoaItem = {
  id: string;
  soa_version_id: string;
  scf_control_id: string;
  applicability: string;
  justification?: string;
  implementation_status?: string;
};

export type SoaValidation = {
  valid: boolean;
  errors: string[];
  warnings: string[];
};

// ── Gap Analysis ─────────────────────────────────────────────
export type GapAnalysisVersion = {
  id: string;
  assessment_id: string;
  version_number: number;
  status: string;
  finding_count?: number;
  created_at: string;
};

export type GapFinding = {
  id: string;
  gap_analysis_version_id: string;
  scf_control_id: string;
  status: string;
  severity: string;
  description: string;
  evidence_sources?: string[];
  remediation_guidance?: string;
};

// ── POA&M ────────────────────────────────────────────────────
export type PoamVersion = {
  id: string;
  assessment_id: string;
  version_number: number;
  status: string;
  item_count?: number;
  created_at: string;
};

export type PoamItem = {
  id: string;
  poam_version_id: string;
  scf_control_id?: string;
  related_gap_finding_id?: string;
  title: string;
  description: string;
  priority: string;
  expected_evidence?: string;
  acceptance_criteria?: string;
  due_date?: string;
  status: string;
};

// ── Reports ──────────────────────────────────────────────────
export type ReportVersion = {
  id: string;
  assessment_id: string;
  version_number: number;
  status: string;
  format?: string;
  created_at: string;
};

export type ReportSection = {
  id: string;
  report_version_id: string;
  section_type: string;
  title: string;
  content: string;
  order_index: number;
};

export type ReportExport = {
  url: string;
  format: string;
  expires_at: string;
};

// ── Knowledge Base ───────────────────────────────────────────
export type KbSearchResult = {
  chunk_id: string;
  document_id: string;
  content: string;
  score: number;
  metadata?: Record<string, unknown>;
};

export type KbChunk = {
  id: string;
  document_id: string;
  content: string;
  token_count?: number;
  embedding_status?: string;
};

// ── Workflows ────────────────────────────────────────────────
export type WorkflowRun = {
  id: string;
  assessment_id: string;
  workflow_type: string;
  status: string;
  started_at: string;
  completed_at?: string;
  error?: string;
};

// ── Agents ───────────────────────────────────────────────────
export type AgentRun = {
  id: string;
  assessment_id: string;
  agent_type: string;
  status: string;
  model?: string;
  started_at: string;
  completed_at?: string;
  confidence?: number;
};

export type AgentToolCall = {
  id: string;
  agent_run_id: string;
  tool_name: string;
  input: Record<string, unknown>;
  output?: Record<string, unknown>;
  status: string;
  called_at: string;
};

// ── Webhooks ─────────────────────────────────────────────────
export type WebhookEndpoint = {
  id: string;
  url: string;
  events: string[];
  description?: string | null;
  enabled: boolean;
  signing_secret_masked: string;
  created_at: string;
  updated_at: string;
};

export type WebhookDelivery = {
  delivery_id: string;
  endpoint_id: string;
  event_id: string;
  event_type: string;
  status: string;
  http_status: number | null;
  attempt_count: number;
  max_attempts: number;
  last_attempted_at: string | null;
  created_at: string;
};

// ── Organizations ────────────────────────────────────────────
export type Organization = {
  organization_id: string;
  tenant_id: string;
  name: string;
  slug: string;
  status: string;
};

export type ApiKey = {
  id: string;
  name: string;
  masked_key: string;
  scopes: string[];
  expires_at: string | null;
  last_used_at: string | null;
  created_at: string;
};

export type ApiKeyCreated = ApiKey & {
  /** Full key — returned only at creation time */
  key: string;
};
