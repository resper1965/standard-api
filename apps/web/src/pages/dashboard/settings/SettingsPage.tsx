import { useState, useEffect } from "react"
import { useSession, authClient } from "@/lib/auth-client"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Copy, Plus, Users, Building, Key, Check, BookOpen, Trash2, ChevronDown, ChevronRight, ExternalLink } from "lucide-react"

const API_URL = import.meta.env.VITE_API_URL || "https://standard-api-gateway-production.ness.workers.dev"

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
        response: `{ "assessment_id": "uuid", "state": "draft", "name": "...", "tenant_id": "uuid" }`
      },
      { method: "GET", path: "/assessments", desc: "List all assessments for tenant", response: `{ "data": [{ "assessment_id": "uuid", "name": "...", "state": "draft" }] }` },
      { method: "GET", path: "/assessments/:id", desc: "Get assessment by ID", response: `{ "assessment_id": "uuid", "name": "...", "state": "draft", "snapshot": {...} }` },
      { method: "PATCH", path: "/assessments/:id", desc: "Update assessment name", body: `{ "name": "Updated Name" }` },
      { method: "GET", path: "/assessments/:id/status", desc: "Get current lifecycle state" },
      { method: "GET", path: "/assessments/:id/timeline", desc: "Get full timeline of lifecycle events" },
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
    name: "Documents",
    desc: "Upload and manage assessment evidence documents (stored in R2)",
    endpoints: [
      {
        method: "POST", path: "/assessments/:id/documents", desc: "Upload document (multipart/form-data)",
        body: `FormData: file=<binary>, description="Security Policy v3"`,
        response: `{ "document_id": "uuid", "filename": "policy.pdf", "size_bytes": 245760, "status": "uploaded" }`
      },
      { method: "GET", path: "/assessments/:id/documents", desc: "List all documents for assessment" },
      { method: "GET", path: "/assessments/:id/documents/:docId", desc: "Get document metadata" },
      { method: "DELETE", path: "/assessments/:id/documents/:docId", desc: "Delete a document" },
    ]
  },
  {
    name: "SCF Catalog",
    desc: "Query the Secure Controls Framework catalog (1,468 controls, 231 frameworks, 15,717 mappings)",
    endpoints: [
      { method: "GET", path: "/scf/versions", desc: "List SCF versions", response: `{ "data": [{ "scf_version_id": "uuid", "version_label": "SCF 2026.1.1" }] }` },
      { method: "GET", path: "/scf/domains?scf_version=:id", desc: "List SCF domains (33 security domains)" },
      { method: "GET", path: "/scf/controls?scf_version=:id", desc: "List controls (paginated, 1,468 total)" },
      { method: "GET", path: "/scf/controls/:controlId", desc: "Get single control detail" },
      { method: "GET", path: "/scf/frameworks", desc: "List all 231 compliance frameworks" },
      { method: "GET", path: "/scf/frameworks/:frameworkId/requirements", desc: "List requirements for a framework" },
      { method: "GET", path: "/scf/mappings?framework=:id", desc: "Get control-to-requirement crosswalk mappings" },
    ]
  },
  {
    name: "Organizations",
    desc: "Manage tenant organizations",
    endpoints: [
      { method: "GET", path: "/organizations/:id", desc: "Get organization details" },
      { method: "POST", path: "/organizations/:id/api-keys", desc: "Generate a new API key", response: `{ "data": { "key": "sk_live_...", "id": "uuid" } }` },
      { method: "GET", path: "/organizations/:id/api-keys", desc: "List API keys (masked)" },
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
function buildLlmSystemPrompt(tenantId: string): string {
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
  x-standard-tenant-id: ${tenantId}
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
  Body: { "organization_id": "${tenantId}", "name": "LGPD ROPA Analysis", "scf_version_id": "<version_id>" }

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
  GET /api/v1/scf/domains?scf_version=<id> → 33 security domains
  GET /api/v1/scf/controls?scf_version=<id> → 1,468 controls
  GET /api/v1/scf/frameworks → 231 compliance frameworks
  GET /api/v1/scf/frameworks/<id>/requirements → framework-specific requirements
  GET /api/v1/scf/mappings?framework=<id> → crosswalk mappings

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
- Standard provides normative data; your application performs inference and analysis`

  return prompt
}

// ─── Component ───────────────────────────────────────────────
export function SettingsPage() {
  const { data: session } = useSession()
  const hasActiveOrg = !!session?.session?.activeOrganizationId

  const [activeOrg, setActiveOrg] = useState<any>(null)
  const [members, setMembers] = useState<any[]>([])
  const [apiKeys, setApiKeys] = useState<any[]>([])
  const [newKey, setNewKey] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [expandedGroup, setExpandedGroup] = useState<string | null>("Assessments")
  const [keyName, setKeyName] = useState("External System Key")

  const loadApiKeys = async (orgId: string) => {
    try {
      const res = await fetch(`${API_URL}/api/v1/organizations/${orgId}/api-keys`, {
        headers: { "x-standard-tenant-id": orgId },
        credentials: "include"
      })
      if (res.ok) {
        const json = await res.json()
        setApiKeys(json.data || [])
      }
    } catch { /* silent */ }
  }

  useEffect(() => {
    async function load() {
      if (!hasActiveOrg) return
      try {
        const orgData = await authClient.organization.getFullOrganization()
        if (orgData.data) {
          setActiveOrg(orgData.data)
          setMembers(orgData.data.members || [])
          await loadApiKeys(orgData.data.id)
        }
      } catch (e) { console.error("Failed to load organization", e) }
    }
    load()
  }, [hasActiveOrg])

  const copy = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(""), 2000)
  }

  const CopyBtn = ({ text, id, size = "icon" }: { text: string; id: string; size?: "icon" | "sm" }) => (
    <Button variant="outline" size={size} onClick={() => copy(text, id)} className="shrink-0">
      {copiedId === id ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
    </Button>
  )

  const handleGenerateKey = async () => {
    if (!activeOrg?.id) return
    setIsGenerating(true)
    try {
      const res = await fetch(`${API_URL}/api/v1/organizations/${activeOrg.id}/api-keys`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-standard-tenant-id": activeOrg.id },
        credentials: "include",
        body: JSON.stringify({ name: keyName })
      })
      if (res.ok) {
        const json = await res.json()
        setNewKey(json.data.key)
        await loadApiKeys(activeOrg.id)
      }
    } catch (e) { console.error(e) }
    finally { setIsGenerating(false) }
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
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Organization Settings</h2>
        <p className="text-muted-foreground mt-1 text-sm">Manage your tenant, team, API access, and integration documentation.</p>
      </div>

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
                  <CopyBtn text={activeOrg?.id || ""} id="tid" />
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Organization Name</Label>
                <Input value={activeOrg?.name || ""} readOnly className="max-w-md" />
              </div>
              <div className="grid gap-2">
                <Label>API Base URL</Label>
                <div className="flex max-w-lg items-center space-x-2">
                  <Input readOnly value={`${API_URL}/api/v1`} className="font-mono bg-muted/50 text-sm" />
                  <CopyBtn text={`${API_URL}/api/v1`} id="baseurl" />
                </div>
              </div>
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
              <Button disabled className="bg-primary/80"><Plus className="w-4 h-4 mr-2" />Invite Member</Button>
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
                    <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground h-24">Loading members...</TableCell></TableRow>
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

              {newKey && (
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg space-y-2">
                  <div className="text-sm font-semibold text-emerald-600 flex items-center justify-between">
                    <span>⚠ Save this key now — it won't be shown again.</span>
                    <CopyBtn text={newKey} id="newkey" size="sm" />
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
                      <TableHead>Expires</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {apiKeys.map(k => (
                      <TableRow key={k.id}>
                        <TableCell className="font-medium text-sm">{k.name}</TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">{k.maskedKey}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{k.expiresAt ? new Date(k.expiresAt).toLocaleDateString() : "Never"}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" className="text-destructive/60 hover:text-destructive" disabled>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
              {apiKeys.length === 0 && !newKey && (
                <div className="text-center text-muted-foreground text-sm py-8 border border-dashed rounded-md">No API keys generated yet.</div>
              )}
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
