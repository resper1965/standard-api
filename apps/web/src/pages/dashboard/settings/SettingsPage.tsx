import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useState, useEffect } from "react"
import { useSession } from "@/lib/auth-client"
import { useOrgDetail, useOrgMembers, useOrgApiKeys, qk } from "@/lib/queries"
import { useQueryClient } from "@tanstack/react-query"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Copy, Plus, Users, Building, Key, Check, BookOpen, Trash2, ChevronDown, ChevronRight, ExternalLink, Loader2, AlertTriangle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"

import { API_URL } from "@/lib/config"

const AVAILABLE_SCOPES = [
  "assessment:read", "assessment:write", "assessment:transition",
  "document:read", "document:write", "document:delete",
  "scf:read", "soa:read", "soa:write", "gap:read", "gap:write",
  "poam:read", "poam:write", "report:read", "report:write", "report:export",
  "kb:read", "kb:search", "agent:read", "agent:run", "integration:analyze",
  "audit:read", "metrics:read", "usage:read", "workflow:read", "workflow:write",
  "workflow:signal", "artifact:read", "artifact:write", "approval:read"
]

// ─── API Reference Data ─────────────────────────────────────
type Endpoint = {
  method: "GET" | "POST" | "PATCH" | "DELETE"
  path: string
  desc: string
  body?: string
  response?: string
}

type EndpointGroup = {
  name: string
  desc: string
  endpoints: Endpoint[]
}

const API_REFERENCE: EndpointGroup[] = [
  {
    name: "Assessments",
    desc: "Create and manage SCF-based security assessments",
    endpoints: [
      {
        method: "POST", path: "/assessments", desc: "Create a new assessment",
        body: `{ "organization_id": "uuid", "name": "ISO 27001 Gap Analysis", "scf_version_id": "uuid" }`,
        response: `{ "assessment_id": "uuid", "state": "draft", "name": "...", "organization_id": "uuid" }`
      },
      { method: "GET", path: "/assessments", desc: "List all assessments for tenant", response: `{ "data": [{ "assessment_id": "uuid", "name": "...", "state": "draft" }] }` },
      { method: "GET", path: "/assessments/:id", desc: "Get assessment by ID" },
      { method: "PATCH", path: "/assessments/:id", desc: "Update assessment metadata", body: `{ "name": "Updated Name" }` },
      { method: "GET", path: "/assessments/:id/status", desc: "Get current lifecycle state" },
      { method: "GET", path: "/assessments/:id/timeline", desc: "Get full timeline of lifecycle events" },
      { method: "GET", path: "/organizations/:orgId/assessments", desc: "List assessments for an organization" },
    ]
  },
  {
    name: "Lifecycle",
    desc: "Manage assessment state transitions with approval gates",
    endpoints: [
      {
        method: "POST", path: "/assessments/:id/transitions", desc: "Transition assessment to next state",
        body: `{ "next_state": "documents_uploaded", "reason": "Initial documents received" }`,
        response: `{ "previous_state": "draft", "next_state": "documents_uploaded", "event": {...} }`
      },
      { method: "GET", path: "/assessments/:id/available-transitions", desc: "List allowed next states", response: `{ "current_state": "draft", "available_transitions": ["documents_uploaded", "cancelled"] }` },
      { method: "GET", path: "/assessments/:id/lifecycle-events", desc: "List all lifecycle events" },
    ]
  },
  {
    name: "Approvals",
    desc: "Human approval decisions for SoA, Gap Analysis, Maturity, POA&M gates",
    endpoints: [
      {
        method: "POST", path: "/assessments/:id/approvals", desc: "Submit approval or rejection decision",
        body: `{ "gate": "gap_analysis", "decision": "approved", "target_type": "artifact_version", "target_id": "uuid" }`
      },
      { method: "GET", path: "/assessments/:id/approvals", desc: "List assessment approvals" },
      { method: "GET", path: "/approvals/:approvalId", desc: "Get approval by ID" },
    ]
  },
  {
    name: "Artifacts",
    desc: "Versioned assessment artifacts (SoA, Gap Analysis, Maturity, etc.)",
    endpoints: [
      { method: "POST", path: "/assessments/:id/artifacts/:type/versions", desc: "Create artifact version" },
      { method: "GET", path: "/assessments/:id/artifacts/:type/versions", desc: "List artifact versions" },
      { method: "GET", path: "/artifacts/:versionId", desc: "Get artifact version detail" },
      { method: "POST", path: "/artifacts/:versionId/submit-review", desc: "Submit artifact for review" },
      { method: "POST", path: "/artifacts/:versionId/approve", desc: "Approve artifact version" },
      { method: "POST", path: "/artifacts/:versionId/supersede", desc: "Create new version superseding this one" },
    ]
  },
  {
    name: "Documents",
    desc: "Upload and manage assessment evidence documents (stored in R2)",
    endpoints: [
      {
        method: "POST", path: "/assessments/:id/documents", desc: "Upload document (multipart/form-data)",
        body: `FormData: file=<binary>, description="Security Policy v3"`
      },
      { method: "GET", path: "/assessments/:id/documents", desc: "List all documents for assessment" },
      { method: "GET", path: "/documents/:docId", desc: "Get document metadata" },
      { method: "DELETE", path: "/documents/:docId", desc: "Delete a document" },
      { method: "GET", path: "/documents/:docId/chunks", desc: "List document chunks" },
      { method: "POST", path: "/documents/:docId/reprocess", desc: "Queue document reprocessing" },
      { method: "GET", path: "/assessments/:id/ingestion-jobs", desc: "List ingestion jobs" },
    ]
  },
  {
    name: "SCF Catalog",
    desc: "Query the Secure Controls Framework catalog (1,468 controls, 231 frameworks, 15,717 mappings)",
    endpoints: [
      { method: "GET", path: "/scf/versions", desc: "List SCF versions" },
      { method: "GET", path: "/scf/versions/latest", desc: "Get latest SCF version" },
      { method: "GET", path: "/scf/versions/:versionId/domains", desc: "List SCF domains (33 security domains)" },
      { method: "GET", path: "/scf/versions/:versionId/controls", desc: "List controls (paginated, 1,468 total)" },
      { method: "GET", path: "/scf/controls/:controlId", desc: "Get single control detail" },
      { method: "GET", path: "/scf/controls/by-code/:code", desc: "Get control by SCF code (e.g. GOV-01)" },
      { method: "GET", path: "/scf/frameworks", desc: "List all 231 compliance frameworks" },
      { method: "GET", path: "/scf/frameworks/:id", desc: "Get framework detail" },
      { method: "GET", path: "/scf/frameworks/:id/requirements", desc: "List requirements for a framework" },
      { method: "GET", path: "/scf/frameworks/:id/coverage", desc: "Get framework SCF control coverage" },
      { method: "GET", path: "/scf/controls/:id/mappings", desc: "Get crosswalk mappings for a control" },
      { method: "GET", path: "/scf/requirements/:id/mappings", desc: "Get crosswalk mappings for a requirement" },
    ]
  },
  {
    name: "Scope & SoA",
    desc: "Statement of Applicability and scope management",
    endpoints: [
      { method: "POST", path: "/assessments/:id/scope", desc: "Create assessment scope" },
      { method: "GET", path: "/assessments/:id/scope", desc: "Get assessment scope" },
      { method: "POST", path: "/assessments/:id/soa/draft", desc: "Draft Statement of Applicability" },
      { method: "GET", path: "/assessments/:id/soa", desc: "List SoA versions" },
      { method: "GET", path: "/soa/:versionId", desc: "Get SoA version" },
      { method: "GET", path: "/soa/:versionId/items", desc: "List SoA items (controls in scope)" },
      { method: "POST", path: "/soa/:versionId/submit-review", desc: "Submit SoA for review" },
      { method: "POST", path: "/soa/:versionId/approve", desc: "Approve SoA version" },
      { method: "POST", path: "/soa/:versionId/mark-ingested", desc: "Mark SoA as ingested" },
      { method: "GET", path: "/soa/:versionId/validation", desc: "Validate SoA completeness" },
    ]
  },
  {
    name: "Gap Analysis",
    desc: "Gap analysis findings and lifecycle management",
    endpoints: [
      { method: "POST", path: "/assessments/:id/gap-analysis/draft", desc: "Draft gap analysis" },
      { method: "GET", path: "/assessments/:id/gap-analysis", desc: "List gap analysis versions" },
      { method: "GET", path: "/gap-analysis/:versionId", desc: "Get gap analysis version" },
      { method: "GET", path: "/gap-analysis/:versionId/findings", desc: "List gap findings" },
      { method: "POST", path: "/gap-analysis/:versionId/findings", desc: "Add gap finding" },
      { method: "POST", path: "/gap-analysis/:versionId/submit-review", desc: "Submit for review" },
      { method: "POST", path: "/gap-analysis/:versionId/approve", desc: "Approve gap analysis" },
    ]
  },
  {
    name: "POA&M",
    desc: "Plan of Action & Milestones lifecycle",
    endpoints: [
      { method: "POST", path: "/assessments/:id/poam/draft", desc: "Draft POA&M plan" },
      { method: "GET", path: "/assessments/:id/poam", desc: "List POA&M versions" },
      { method: "GET", path: "/poam/:versionId", desc: "Get POA&M version" },
      { method: "GET", path: "/poam/:versionId/items", desc: "List POA&M items" },
      { method: "POST", path: "/poam/:versionId/items", desc: "Add POA&M item" },
      { method: "POST", path: "/poam/:versionId/submit-review", desc: "Submit POA&M for review" },
      { method: "POST", path: "/poam/:versionId/approve", desc: "Approve POA&M" },
    ]
  },
  {
    name: "Reporting",
    desc: "Assessment report generation, review, and export",
    endpoints: [
      { method: "POST", path: "/assessments/:id/reports/draft", desc: "Draft assessment report" },
      { method: "GET", path: "/assessments/:id/reports", desc: "List report versions" },
      { method: "GET", path: "/reports/:versionId", desc: "Get report version" },
      { method: "GET", path: "/reports/:versionId/sections", desc: "List report sections" },
      { method: "POST", path: "/reports/:versionId/submit-review", desc: "Submit report for review" },
      { method: "POST", path: "/reports/:versionId/approve", desc: "Approve report" },
      { method: "POST", path: "/reports/:versionId/export", desc: "Export report (PDF/DOCX)" },
    ]
  },
  {
    name: "Knowledge Base",
    desc: "Evidence retrieval and semantic search",
    endpoints: [
      { method: "POST", path: "/assessments/:id/kb/search", desc: "Semantic search in KB", body: `{ "query": "data retention policy", "limit": 10 }` },
      { method: "GET", path: "/assessments/:id/kb/chunks", desc: "List indexed KB chunks" },
    ]
  },
  {
    name: "Workflows",
    desc: "Durable assessment lifecycle orchestration",
    endpoints: [
      { method: "POST", path: "/assessments/:id/workflows/lifecycle/start", desc: "Start lifecycle workflow" },
      { method: "GET", path: "/assessments/:id/workflows/lifecycle", desc: "Get workflow status" },
      { method: "GET", path: "/workflows/:runId", desc: "Get workflow run detail" },
      { method: "POST", path: "/workflows/:runId/cancel", desc: "Cancel a running workflow" },
      { method: "POST", path: "/workflows/:runId/resume", desc: "Resume a paused workflow" },
      { method: "POST", path: "/workflows/:runId/signals", desc: "Send signal to workflow (e.g. approval)" },
    ]
  },
  {
    name: "Agent Runtime",
    desc: "AI agent execution and monitoring",
    endpoints: [
      { method: "POST", path: "/assessments/:id/agent-runs", desc: "Start an agent run" },
      { method: "GET", path: "/assessments/:id/agent-runs", desc: "List agent runs" },
      { method: "GET", path: "/agent-runs/:runId", desc: "Get agent run status and output" },
      { method: "GET", path: "/agent-runs/:runId/tool-calls", desc: "List tool calls for an agent run" },
    ]
  },
  {
    name: "Integrations",
    desc: "External system integration (M2M)",
    endpoints: [
      {
        method: "POST", path: "/integrations/assessments/:id/analyze-text", desc: "Analyze raw text against SCF framework",
        body: `{ "raw_text": "...", "mode": "consultative", "context_focus": ["GDPR"] }`,
        response: `{ "job": { "agent_run_id": "...", "status": "queued" }, "trace_id": "..." }`
      },
    ]
  },
  {
    name: "Organizations & API Keys",
    desc: "Manage tenant organizations and API key access",
    endpoints: [
      { method: "POST", path: "/organizations", desc: "Create organization" },
      { method: "GET", path: "/organizations/:id", desc: "Get organization details" },
      { method: "POST", path: "/organizations/:id/api-keys", desc: "Generate API key with optional scopes", body: `{ "name": "My Key", "scopes": ["assessment:read", "scf:read"] }`, response: `{ "data": { "key": "standard_live_...", "scopes": [...] } }` },
      { method: "GET", path: "/organizations/:id/api-keys", desc: "List API keys (masked, with scopes)" },
      { method: "DELETE", path: "/organizations/:id/api-keys/:keyId", desc: "Revoke API key" },
    ]
  },
  {
    name: "Webhooks",
    desc: "Outbound event notifications with HMAC-SHA256 signed payloads",
    endpoints: [
      { method: "POST", path: "/organizations/:id/webhooks", desc: "Register webhook endpoint", body: `{ "url": "https://example.com/hooks", "events": ["assessment.created", "gap.approved"] }` },
      { method: "GET", path: "/organizations/:id/webhooks", desc: "List registered webhooks" },
      { method: "GET", path: "/webhooks/:id", desc: "Get webhook details" },
      { method: "PATCH", path: "/webhooks/:id", desc: "Update webhook (URL, events, enabled)" },
      { method: "DELETE", path: "/webhooks/:id", desc: "Delete webhook endpoint" },
      { method: "GET", path: "/webhooks/:id/deliveries", desc: "List delivery attempts with status" },
    ]
  },
  {
    name: "Observability",
    desc: "Audit logs, metrics, security events, and usage tracking",
    endpoints: [
      { method: "GET", path: "/observability/audit-logs", desc: "Query audit logs" },
      { method: "GET", path: "/observability/metrics", desc: "Query operational metrics" },
      { method: "GET", path: "/observability/security-events", desc: "Query security events" },
      { method: "GET", path: "/observability/usage", desc: "Query LLM token usage records" },
    ]
  },
  {
    name: "System",
    desc: "Health and operational endpoints",
    endpoints: [
      { method: "GET", path: "/health", desc: "Health check", response: `{ "status": "ok", "timestamp": "..." }` },
    ]
  }
]

const methodColor: Record<string, string> = {
  GET: "text-emerald-400 bg-emerald-400/10",
  POST: "text-sky-400 bg-sky-400/10",
  PATCH: "text-amber-400 bg-amber-400/10",
  DELETE: "text-red-400 bg-red-400/10",
}

// ─── LLM System Prompt Generator ─────────────────────────────
function buildLlmSystemPrompt(organizationId: string): string {
  let prompt = `# Standard API — System Context for AI Agents

## Identity
You are consuming the Standard API, a compliance intelligence platform based on the Secure Controls Framework (SCF).
The API provides normative security data (controls, frameworks, mappings) and manages the assessment lifecycle.
Your application performs the analysis — Standard provides the authoritative data to analyze against.

## Architecture Model
Standard is a DATA PLATFORM, not an analysis engine. The division of responsibilities:
- Standard provides: SCF controls, framework requirements, crosswalk mappings, document storage, lifecycle management
- Your application provides: LLM inference, evidence analysis, gap detection, report generation
- Standard stores: your analysis results back via the assessment lifecycle API

## Authentication (MANDATORY on every request)
Base URL: ${API_URL}/api/v1
Headers:
  Authorization: Bearer <API_KEY>
  x-standard-tenant-id: ${organizationId}
  Content-Type: application/json

## Available Endpoints\n`

  for (const group of API_REFERENCE) {
    prompt += `\n### ${group.name}\n`
    for (const ep of group.endpoints) {
      prompt += `${ep.method} /api/v1${ep.path} — ${ep.desc}\n`
      if (ep.body) prompt += `  Body: ${ep.body}\n`
      if (ep.response) prompt += `  Response: ${ep.response}\n`
    }
  }

  prompt += `
## Assessment Lifecycle States
draft → documents_uploaded → documents_ingested → scf_pre_analysis_ready → framework_selected → scope_drafted → soa_drafted → soa_under_review → soa_approved → gap_analysis_drafted → gap_analysis_under_review → gap_analysis_approved → maturity_assessed → maturity_under_review → maturity_approved → poam_drafted → poam_under_review → poam_approved → report_generated → closed

## Recipes — How to Compose Endpoints for Real Tasks

### Recipe 1: Privacy/ROPA Compliance Analysis (LGPD, GDPR, CCPA)
Use case: "I have a ROPA document and need to validate it against a privacy law."

Step 1: Find the privacy framework
  GET /api/v1/scf/frameworks
  → Search response for framework_code containing "LGPD", "GDPR", "CCPA", or "HIPAA"
  → Save the framework_id

Step 2: Get the SCF version
  GET /api/v1/scf/versions → use the latest scf_version_id

Step 3: Create an assessment
  POST /api/v1/assessments
  Body: { "organization_id": "${organizationId}", "name": "LGPD ROPA Analysis", "scf_version_id": "<version_id>" }

Step 4: Upload the ROPA document
  POST /api/v1/assessments/<assessment_id>/documents (multipart/form-data)

Step 5: Transition state
  POST /api/v1/assessments/<assessment_id>/transitions
  Body: { "next_state": "documents_uploaded", "reason": "ROPA document uploaded" }

Step 6: Get framework controls for YOUR analysis
  GET /api/v1/scf/frameworks/<framework_id>/requirements → privacy requirements
  GET /api/v1/scf/mappings?framework=<framework_id> → which SCF controls map to each requirement

Step 7: YOUR APPLICATION analyzes the ROPA against these controls
  → Use your own LLM to compare document content vs. control requirements
  → Standard does NOT run the analysis — you do

Step 8: Store results back
  POST /api/v1/assessments/<assessment_id>/transitions → advance lifecycle with results

### Recipe 2: Cybersecurity Contract Review
Use case: "Assess a vendor contract's security clauses against cybersecurity controls."

Step 1: Find relevant framework (NIST-CSF, ISO-27001, SOC-2-TSC)
  GET /api/v1/scf/frameworks

Step 2: Create assessment + upload contract (Steps 2-5 from Recipe 1)

Step 3: Retrieve control data
  GET /api/v1/scf/controls?scf_version=<version_id>
  GET /api/v1/scf/mappings?framework=<framework_id>

Step 4: YOUR APPLICATION compares contract clauses against control requirements
  → For each control: does the contract adequately address it?
  → Flag gaps where the contract is silent or insufficient
  → Standard provides the control descriptions — your app does the comparison

### Recipe 3: ISO 27001 Gap Analysis (Full Assessment)
Step 1: GET /api/v1/scf/frameworks → find "ISO 27001" framework_id
Step 2: GET /api/v1/scf/versions → get latest scf_version_id
Step 3: POST /api/v1/assessments → create assessment
Step 4: POST /api/v1/assessments/<id>/documents → upload all evidence
Step 5: POST /api/v1/assessments/<id>/transitions → { "next_state": "documents_uploaded" }
Step 6: GET /api/v1/scf/frameworks/<id>/requirements → all ISO 27001 requirements
Step 7: GET /api/v1/scf/mappings?framework=<id> → control-to-requirement mappings
Step 8: YOUR APPLICATION runs gap analysis using your own LLM and compute
Step 9: POST /api/v1/assessments/<id>/transitions → store results, advance lifecycle

### Recipe 4: Multi-Framework Comparison
Step 1: GET /api/v1/scf/frameworks → find both framework IDs
Step 2: GET /api/v1/scf/mappings?framework=<A_id> → mappings for framework A
Step 3: GET /api/v1/scf/mappings?framework=<B_id> → mappings for framework B
Step 4: Cross-reference by scf_control_id → controls mapped to BOTH = overlap
Step 5: Controls only in A = unique A requirements; only in B = unique B requirements

### Recipe 5: Raw Data Retrieval (No Assessment Needed)
Use case: "I just need the SCF data to power my own compliance engine."

You can query SCF data directly without creating assessments:
  GET /api/v1/scf/versions → available SCF versions
  GET /api/v1/scf/versions/latest → latest version
  GET /api/v1/scf/versions/<version_id>/domains → 33 security domains
  GET /api/v1/scf/versions/<version_id>/controls → 1,468 controls (paginated)
  GET /api/v1/scf/controls/by-code/GOV-01 → look up control by code
  GET /api/v1/scf/frameworks → 231 compliance frameworks
  GET /api/v1/scf/frameworks/<id>/requirements → framework-specific requirements
  GET /api/v1/scf/frameworks/<id>/coverage → control coverage statistics
  GET /api/v1/scf/controls/<id>/mappings → crosswalk mappings for a control
  GET /api/v1/scf/requirements/<id>/mappings → crosswalk mappings for a requirement

This is the fastest path — no lifecycle, no documents, just data.

## SCF Coverage
- 33 security domains covering the full spectrum of cybersecurity
- 1,468 security controls with detailed descriptions
- 231 compliance frameworks (ISO, NIST, GDPR, LGPD, SOC 2, PCI DSS, HIPAA, etc.)
- 32,903 framework-specific requirements
- 15,717 control-to-requirement crosswalk mappings

## Rules
- Every request MUST include x-standard-tenant-id header
- Approval gates (SoA, Gap Analysis, Maturity, POA&M) require human approval via POST /transitions
- Document uploads use multipart/form-data, not JSON
- SCF catalog queries require scf_version query parameter
- All IDs are UUIDs v4
- Responses include trace_id for debugging
- Call GET /assessments/<id>/available-transitions to see allowed next states
- Absence of evidence does NOT mean absence of implementation — report as "not_evidenced"
- Standard provides normative data; your application performs inference and analysis

## API Key Scopes
Keys can be created with optional scopes to restrict M2M access:
  POST /api/v1/organizations/<org_id>/api-keys
  Body: { "name": "Read-Only Key", "scopes": ["assessment:read", "scf:read", "document:read"] }
Available scopes: assessment:read, assessment:write, assessment:transition, document:read, document:write, document:delete, scf:read, soa:read, soa:write, gap:read, gap:write, poam:read, poam:write, report:read, report:write, report:export, kb:read, kb:search, agent:read, agent:run, integration:analyze, audit:read, metrics:read, usage:read, workflow:read, workflow:write, workflow:signal, artifact:read, artifact:write, approval:read
A key with no scopes has wildcard access (backward compatible).

## Webhooks
Standard sends HMAC-SHA256 signed POST requests to your endpoints for lifecycle events.

### Available events:
assessment.created, document.ingested, kb.indexed, soa.approved, gap.approved, maturity.approved, poam.approved, report.generated, report.approved, assessment.closed, workflow.failed

### Registering a webhook:
  POST /api/v1/organizations/<org_id>/webhooks
  Body: { "url": "https://you.com/webhooks", "events": ["assessment.created", "gap.approved"] }
  Response: { "data": { "id": "uuid", "signing_secret": "whsec_..." } }  ← shown ONCE

### Verifying webhook signatures:
  Headers: X-Standard-Signature (HMAC-SHA256 hex of body using signing_secret)
  Verify: hmac_sha256(signing_secret, raw_body) === X-Standard-Signature`

  return prompt
}


// --- Local Types ---
interface OrgSummary {
  id: string
  name: string
  slug: string
  billing_tier: string
  status?: string
}
interface Member {
  userId?: string
  user?: { id: string; name: string; email: string }
  name?: string
  email?: string
  role: string
  createdAt?: string
}
interface ApiKeySummary {
  id: string
  name: string
  maskedKey?: string
  scopes: string[]
  createdAt: string
  expiresAt?: string | null
  revokedAt?: string | null
  isRevoked?: boolean
  status?: "active" | "expired" | "revoked"
}
// --- Component ---
export function SettingsPage() {
  useDocumentTitle("Settings");
  const { data: session } = useSession()
  const { toast } = useToast()
  const hasActiveOrg = !!session?.session?.activeOrganizationId

  const orgId = (session?.session as Record<string, unknown>)?.activeOrganizationId as string | undefined

  const qc = useQueryClient()
  const { data: orgDetail } = useOrgDetail(orgId)
  const { data: membersData } = useOrgMembers(orgId)
  const { data: apiKeysData } = useOrgApiKeys(orgId)

  const activeOrg = orgDetail as OrgSummary | null | undefined
  const members = (membersData?.data ?? []) as Member[]
  const apiKeys = (apiKeysData?.data ?? []) as ApiKeySummary[]

  const [newKey, setNewKey] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [expandedGroup, setExpandedGroup] = useState<string | null>("Assessments")
  const [keyName, setKeyName] = useState("External System Key")
  const [selectedScopes, setSelectedScopes] = useState<string[]>([])
  const [isRevoking, setIsRevoking] = useState<string | null>(null)
  const [keyToRevoke, setKeyToRevoke] = useState<ApiKeySummary | null>(null)
  const [isRevokeDialogOpen, setIsRevokeDialogOpen] = useState(false)

  // Org settings and faturamento states
  const [orgName, setOrgName] = useState("")
  const [orgSlug, setOrgSlug] = useState("")
  const [billingTier, setBillingTier] = useState("free")
  const [isUpdatingOrg, setIsUpdatingOrg] = useState(false)
  const [isUpdatingBilling, setIsUpdatingBilling] = useState(false)

  // Invite states
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteRole, setInviteRole] = useState("member")
  const [inviteName, setInviteName] = useState("")
  const [isInviting, setIsInviting] = useState(false)
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false)

  const loggedMember = members.find(m => m.userId === session?.user?.id || m.user?.id === session?.user?.id);
  const isOwner = loggedMember?.role === "owner" || session?.user?.role === "owner";

  useEffect(() => {
    if (activeOrg) {
      setOrgName(activeOrg.name || "")
      setOrgSlug(activeOrg.slug || "")
      setBillingTier(activeOrg.billing_tier || "free")
    }
  }, [activeOrg])

  const copy = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(""), 2000)
  }

  const renderCopyBtn = (text: string, id: string, size: "icon" | "sm" = "icon") => (
    <Button variant="outline" size={size} onClick={() => copy(text, id)} className="shrink-0">
      {copiedId === id ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
    </Button>
  )

  const handleUpdateOrg = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeOrg?.id) return
    setIsUpdatingOrg(true)
    try {
      await api<Record<string, unknown>>(`/api/v1/organizations/${activeOrg.id}`, {
        method: "PATCH",
        body: JSON.stringify({ name: orgName, slug: orgSlug })
      })
      toast({ title: "Organization updated", description: "Your organization settings have been updated successfully." })
      if (orgId) qc.invalidateQueries({ queryKey: qk.orgDetail(orgId) })
    } catch (e) {
      toast({ title: "Update failed", description: e instanceof Error ? e.message : "Failed to update organization details." })
    } finally {
      setIsUpdatingOrg(false)
    }
  }

  const handleUpdateBilling = async () => {
    if (!activeOrg?.id) return
    setIsUpdatingBilling(true)
    try {
      await api<Record<string, unknown>>(`/api/v1/organizations/${activeOrg.id}/billing`, {
        method: "PATCH",
        body: JSON.stringify({ billing_tier: billingTier })
      })
      toast({ title: "Plan updated", description: `Organization billing plan updated to ${billingTier.toUpperCase()} successfully.` })
      if (orgId) qc.invalidateQueries({ queryKey: qk.orgDetail(orgId) })
    } catch (e) {
      toast({ title: "Update failed", description: e instanceof Error ? e.message : "Failed to update billing tier." })
    } finally {
      setIsUpdatingBilling(false)
    }
  }

  const handleInviteMember = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeOrg?.id) return
    setIsInviting(true)
    try {
      await api(`/api/v1/organizations/${activeOrg.id}/invites`, {
        method: "POST",
        body: JSON.stringify({
          email: inviteEmail,
          role: inviteRole,
          display_name: inviteName || undefined
        })
      })
      toast({ title: "Member invited", description: `Invitation sent to ${inviteEmail}.` })
      qc.invalidateQueries({ queryKey: qk.orgMembers(activeOrg.id) })
      setInviteEmail("")
      setInviteName("")
      setInviteRole("member")
      setIsInviteDialogOpen(false)
    } catch (e) {
      toast({ title: "Invite failed", description: e instanceof Error ? e.message : "Failed to invite member." })
    } finally {
      setIsInviting(false)
    }
  }

  const handleGenerateKey = async () => {
    if (!activeOrg?.id) return
    setIsGenerating(true)
    try {
      const json = await api<{ data: { key: string } }>(`/api/v1/organizations/${activeOrg.id}/api-keys`, {
        method: "POST",
        body: JSON.stringify({
          name: keyName,
          scopes: selectedScopes.length > 0 ? selectedScopes : undefined
        })
      })
      setNewKey(json.data.key)
      setSelectedScopes([])
      qc.invalidateQueries({ queryKey: qk.orgApiKeys(activeOrg.id) })
    } catch (e) {
      toast({ title: "Generation failed", description: e instanceof Error ? e.message : "Failed to generate key." })
    } finally {
      setIsGenerating(false)
    }
  }

  const handleRevokeKey = async () => {
    if (!activeOrg?.id || !keyToRevoke) return
    setIsRevoking(keyToRevoke.id)
    try {
      await api(`/api/v1/organizations/${activeOrg.id}/api-keys/${keyToRevoke.id}`, { method: "DELETE" })
      toast({ title: "API Key revoked", description: `The key "${keyToRevoke.name}" has been permanently revoked.` })
      setIsRevokeDialogOpen(false)
      setKeyToRevoke(null)
      qc.invalidateQueries({ queryKey: qk.orgApiKeys(activeOrg.id) })
    } catch (e) {
      toast({ variant: "destructive", title: "Revocation failed", description: e instanceof Error ? e.message : "Failed to revoke key." })
    } finally {
      setIsRevoking(null)
    }
  }

  const toggleScope = (scope: string) => {
    setSelectedScopes(prev => prev.includes(scope) ? prev.filter(s => s !== scope) : [...prev, scope])
  }

  if (!hasActiveOrg) {
    return (
      <div className="flex h-[40vh] flex-col items-center justify-center space-y-4">
        <Building className="h-12 w-12 text-muted-foreground" />
        <h2 className="text-xl font-medium">No Organization Active</h2>
        <p className="text-muted-foreground">Select or create an organization to manage settings.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">Manage your tenant, team, API access, and integration documentation.</p>

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="mb-4 bg-muted/50">
          <TabsTrigger value="general"><Building className="w-4 h-4 mr-2" />General</TabsTrigger>
          <TabsTrigger value="members"><Users className="w-4 h-4 mr-2" />Members</TabsTrigger>
          <TabsTrigger value="keys"><Key className="w-4 h-4 mr-2" />API Keys</TabsTrigger>
          <TabsTrigger value="docs"><BookOpen className="w-4 h-4 mr-2" />API Reference</TabsTrigger>
        </TabsList>

        {/* ─── General ─── */}
        <TabsContent value="general" className="space-y-4">
          <Card className="border-border bg-card/60">
            <CardHeader>
              <CardTitle>Tenant Identity</CardTitle>
              <CardDescription>Primary identifiers for API consumption. The Tenant ID is required on every request.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label>Tenant ID</Label>
                <div className="flex max-w-md items-center space-x-2">
                  <Input readOnly value={activeOrg?.id || "..."} className="font-mono bg-muted/50 text-sm" />
                  {renderCopyBtn(activeOrg?.id || "", "tid")}
                </div>
              </div>
              <div className="grid gap-2">
                <Label>API Base URL</Label>
                <div className="flex max-w-lg items-center space-x-2">
                  <Input readOnly value={`${API_URL}/api/v1`} className="font-mono bg-muted/50 text-sm" />
                  {renderCopyBtn(`${API_URL}/api/v1`, "baseurl")}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border bg-card/60">
            <CardHeader>
              <CardTitle>Organization Settings</CardTitle>
              <CardDescription>Update your organization's display name and URL slug.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpdateOrg} className="space-y-4">
                <div className="grid gap-2 max-w-md">
                  <Label htmlFor="orgName">Organization Name</Label>
                  <Input
                    id="orgName"
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    disabled={!isOwner}
                    placeholder="Organization Name"
                  />
                </div>
                <div className="grid gap-2 max-w-md">
                  <Label htmlFor="orgSlug">Organization Slug (URL path)</Label>
                  <Input
                    id="orgSlug"
                    value={orgSlug}
                    onChange={(e) => setOrgSlug(e.target.value)}
                    disabled={!isOwner}
                    placeholder="organization-slug"
                  />
                </div>
                {isOwner && (
                  <Button type="submit" disabled={isUpdatingOrg} className="bg-primary/80">
                    {isUpdatingOrg ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      "Save Settings"
                    )}
                  </Button>
                )}
              </form>
            </CardContent>
          </Card>

          <Card className="border-border bg-card/60">
            <CardHeader>
              <CardTitle>Billing & Subscription</CardTitle>
              <CardDescription>Manage subscription tier for your organization.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2 max-w-md">
                <Label htmlFor="billingTier">Active Plan</Label>
                <select
                  id="billingTier"
                  value={billingTier}
                  onChange={(e) => setBillingTier(e.target.value)}
                  disabled={!isOwner}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="free">Free - SCF & Local Assessments</option>
                  <option value="pro">Pro - Unlimited Assessments & Integrations</option>
                  <option value="enterprise">Enterprise - Dedicated Workspace & Support</option>
                </select>
              </div>
              {isOwner && (
                <Button onClick={handleUpdateBilling} disabled={isUpdatingBilling} className="bg-primary/80">
                  {isUpdatingBilling ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Updating Plan...
                    </>
                  ) : (
                    "Update Plan"
                  )}
                </Button>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── Members ─── */}
        <TabsContent value="members" className="space-y-4">
          <Card className="border-border bg-card/60">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Team Members</CardTitle>
                <CardDescription>Users with access to this organization.</CardDescription>
              </div>
              {isOwner && (
                <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-primary/80"><Plus className="w-4 h-4 mr-2" />Invite Member</Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[425px] border-border bg-card/95 backdrop-blur-md">
                    <DialogHeader>
                      <DialogTitle>Invite Team Member</DialogTitle>
                      <DialogDescription>
                        Send an invitation to join your organization.
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleInviteMember} className="space-y-4 py-2">
                      <div className="grid gap-2">
                        <Label htmlFor="inviteName">Name (Optional)</Label>
                        <Input
                          id="inviteName"
                          value={inviteName}
                          onChange={(e) => setInviteName(e.target.value)}
                          placeholder="e.g. John Doe"
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="inviteEmail">Email Address</Label>
                        <Input
                          id="inviteEmail"
                          type="email"
                          required
                          value={inviteEmail}
                          onChange={(e) => setInviteEmail(e.target.value)}
                          placeholder="e.g. john@company.com"
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="inviteRole">Role</Label>
                        <select
                          id="inviteRole"
                          value={inviteRole}
                          onChange={(e) => setInviteRole(e.target.value)}
                          className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        >
                          <option value="member">Member</option>
                          <option value="admin">Admin</option>
                          <option value="owner">Owner</option>
                        </select>
                      </div>
                      <DialogFooter className="pt-4">
                        <DialogClose asChild>
                          <Button type="button" variant="outline">Cancel</Button>
                        </DialogClose>
                        <Button type="submit" disabled={isInviting} className="bg-primary/80">
                          {isInviting ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Inviting...
                            </>
                          ) : (
                            "Send Invitation"
                          )}
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              )}
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Joined</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell className="font-medium">{m.user?.name || "Pending"}</TableCell>
                      <TableCell>{m.user?.email || "—"}</TableCell>
                      <TableCell><span className="capitalize px-2 py-0.5 bg-primary/10 text-primary rounded text-xs font-semibold">{m.role}</span></TableCell>
                      <TableCell className="text-muted-foreground text-sm">{new Date(m.createdAt).toLocaleDateString()}</TableCell>
                    </TableRow>
                  ))}
                  {members.length === 0 && (
                    <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground h-24">No members yet. Invite your team above.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── API Keys ─── */}
        <TabsContent value="keys" className="space-y-4">
          <Card className="border-border bg-card/60">
            <CardHeader>
              <CardTitle>API Keys</CardTitle>
              <CardDescription>Generate keys for programmatic access. Keys are shown only once — store them securely.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-end gap-3 max-w-lg">
                <div className="flex-1 space-y-1">
                  <Label>Key Name</Label>
                  <Input value={keyName} onChange={e => setKeyName(e.target.value)} placeholder="e.g. CI/CD Pipeline" />
                </div>
                <Button onClick={handleGenerateKey} disabled={isGenerating}>
                  {isGenerating ? "Generating..." : <><Key className="w-4 h-4 mr-2" />Generate</>}
                </Button>
              </div>

              <div className="space-y-2">
                <Label className="text-muted-foreground text-xs font-semibold">Scopes (Optional)</Label>
                <div className="flex flex-wrap gap-1.5 p-3 border border-border/50 rounded-lg bg-muted/20">
                  {AVAILABLE_SCOPES.map(scope => (
                    <Badge 
                      key={scope} 
                      variant={selectedScopes.includes(scope) ? "default" : "outline"}
                      className="cursor-pointer hover:bg-primary/20"
                      onClick={() => toggleScope(scope)}
                    >
                      {scope}
                    </Badge>
                  ))}
                  {selectedScopes.length === 0 && <span className="text-xs text-muted-foreground ml-2 my-auto">Leave empty for full access.</span>}
                </div>
              </div>

              {newKey && (
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg space-y-2">
                  <div className="text-sm font-semibold text-emerald-600 flex items-center justify-between">
                    <span><AlertTriangle className="h-4 w-4 inline mr-1 align-text-bottom" /> Save this key now — it won't be shown again.</span>
                    {renderCopyBtn(newKey, "newkey", "sm")}
                  </div>
                  <code className="text-sm font-mono break-all bg-emerald-500/5 px-2 py-1 rounded block">{newKey}</code>
                </div>
              )}

              {apiKeys.length > 0 && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Key</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Scopes</TableHead>
                      <TableHead>Expires</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {apiKeys.map(k => {
                      const isRevoked = !!(k.isRevoked || k.revokedAt);
                      return (
                        <TableRow key={k.id} className={isRevoked ? "opacity-50" : ""}>
                          <TableCell className="font-medium text-sm">{k.name}</TableCell>
                          <TableCell className="font-mono text-xs text-muted-foreground">{k.maskedKey}</TableCell>
                          <TableCell>
                            {isRevoked ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-destructive/10 text-destructive">
                                revoked
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-500">
                                active
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1 max-w-[200px]">
                              {k.scopes && k.scopes.length > 0 ? (
                                k.scopes.map((s: string) => <Badge key={s} variant="outline" className="text-[9px] px-1 py-0">{s}</Badge>)
                              ) : (
                                <Badge variant="success" className="text-[9px] px-1 py-0">Admin / All Access</Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">{k.expiresAt ? new Date(k.expiresAt).toLocaleDateString() : "Never"}</TableCell>
                          <TableCell>
                            {!isRevoked && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive/60 hover:text-destructive"
                                onClick={() => { setKeyToRevoke(k); setIsRevokeDialogOpen(true); }}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
              {apiKeys.length === 0 && !newKey && (
                <div className="text-center text-muted-foreground text-sm py-8 border border-dashed rounded-md">No API keys generated yet.</div>
              )}

              <Dialog open={isRevokeDialogOpen} onOpenChange={setIsRevokeDialogOpen}>
                <DialogContent className="sm:max-w-[425px] border-border bg-card/95 backdrop-blur-md">
                  <DialogHeader>
                    <DialogTitle>Revoke API Key</DialogTitle>
                    <DialogDescription>
                      Are you sure you want to permanently revoke the key "{keyToRevoke?.name}"? Any systems using this key will immediately lose access.
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter className="pt-4">
                    <DialogClose asChild>
                      <Button type="button" variant="outline">Cancel</Button>
                    </DialogClose>
                    <Button type="button" onClick={handleRevokeKey} disabled={!!isRevoking} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                      {isRevoking ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Revoking...</> : "Yes, Revoke Key"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── API Reference ─── */}
        <TabsContent value="docs" className="space-y-4">
          {/* Auth Contract */}
          <Card className="border-border bg-card/60">
            <CardHeader>
              <CardTitle>Authentication Contract</CardTitle>
              <CardDescription>Every request to the Standard API requires these headers.</CardDescription>
            </CardHeader>
            <CardContent>
              <pre className="p-4 rounded-lg bg-slate-950 text-slate-200 text-xs font-mono overflow-x-auto border border-border leading-relaxed">
{`# Every request requires:
curl -X GET "${API_URL}/api/v1/assessments" \\
  -H "Authorization: Bearer <API_KEY>" \\
  -H "x-standard-tenant-id: ${activeOrg?.id || "<TENANT_ID>"}" \\
  -H "Content-Type: application/json"`}
              </pre>
            </CardContent>
          </Card>

          {/* Endpoint Groups */}
          {API_REFERENCE.map(group => (
            <Card key={group.name} className="border-border bg-card/60">
              <CardHeader
                className="cursor-pointer select-none"
                onClick={() => setExpandedGroup(expandedGroup === group.name ? null : group.name)}
              >
                <CardTitle className="flex items-center justify-between text-base">
                  <span>{group.name}</span>
                  {expandedGroup === group.name ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </CardTitle>
                <CardDescription>{group.desc}</CardDescription>
              </CardHeader>
              {expandedGroup === group.name && (
                <CardContent className="space-y-3 pt-0">
                  {group.endpoints.map((ep, i) => (
                    <div key={i} className="p-3 rounded-lg bg-muted/30 border border-border/50 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${methodColor[ep.method]}`}>{ep.method}</span>
                        <code className="text-sm font-mono text-foreground">/api/v1{ep.path}</code>
                      </div>
                      <p className="text-sm text-muted-foreground">{ep.desc}</p>
                      {ep.body && (
                        <div>
                          <span className="text-xs font-semibold text-muted-foreground">Request:</span>
                          <pre className="mt-1 p-2 rounded bg-slate-950 text-slate-300 text-xs font-mono overflow-x-auto">{ep.body}</pre>
                        </div>
                      )}
                      {ep.response && (
                        <div>
                          <span className="text-xs font-semibold text-muted-foreground">Response:</span>
                          <pre className="mt-1 p-2 rounded bg-slate-950 text-slate-300 text-xs font-mono overflow-x-auto">{ep.response}</pre>
                        </div>
                      )}
                    </div>
                  ))}
                </CardContent>
              )}
            </Card>
          ))}

          {/* LLM System Prompt */}
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <ExternalLink className="w-4 h-4 text-primary" />
                LLM System Prompt — Copy for AI Agents
              </CardTitle>
              <CardDescription>
                Copy this complete system prompt and paste it into any AI agent (Claude, ChatGPT, Cursor, Codex).
                The agent will understand how to authenticate and consume every endpoint.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                onClick={() => copy(buildLlmSystemPrompt(activeOrg?.id || "YOUR_TENANT_ID"), "llm-prompt")}
                className="w-full"
              >
                {copiedId === "llm-prompt" ? <><Check className="w-4 h-4 mr-2" />Copied to Clipboard!</> : <><Copy className="w-4 h-4 mr-2" />Copy Full System Prompt ({Math.round(buildLlmSystemPrompt(activeOrg?.id || "").length / 1000)}KB)</>}
              </Button>
              <details className="text-xs">
                <summary className="cursor-pointer text-muted-foreground hover:text-foreground">Preview system prompt</summary>
                <pre className="mt-2 p-3 rounded-lg bg-slate-950 text-slate-300 font-mono overflow-x-auto max-h-64 overflow-y-auto leading-relaxed whitespace-pre-wrap">
                  {buildLlmSystemPrompt(activeOrg?.id || "YOUR_TENANT_ID")}
                </pre>
              </details>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
