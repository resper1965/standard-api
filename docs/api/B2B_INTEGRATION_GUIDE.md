# Standard B2B Integration Guide

This guide details how external applications (such as independent Privacy Systems, ERPs, and specialized SaaS) can connect to the Standard API to consume the GRC Agentic Engine programmatically.

## Authentication (Machine-to-Machine)

The Standard API assumes secure external B2B integration using **API Keys**. It is strictly a Machine-to-Machine (M2M) flow, meaning there are no interactive login prompts or redirect flows required.

1.  **Obtain a Key:** Generates an API key via the dashboard (`Settings > Developers > API Keys`) or using the core `/api/v1/organizations/:orgId/api-keys` route with a valid interactive Administrator token.
2.  **Pass the Token:** External systems must pass the token precisely in the `Authorization` header as a Bearer token.
    *   *Example prefix:* `Bearer standard_live_...`

> [!WARNING]
> Requests authenticated via this method resolve the actor natively as `m2m-agent` and inherit the Organization/Tenant context directly from the Key issuing authority. Because of this security restriction, M2M agents **cannot** modify or generate other API keys.

## Raw Text Analysis (ROPA & Privacy Data Integration)

A core feature for consuming platforms is analyzing unstructured raw text (such as privacy workflows or Records of Processing Activities) rapidly via AI mapped against official frameworks context.

### POST `/api/v1/integrations/assessments/:assessmentId/analyze-text`

This endpoint accepts a direct payload of unstructured text, bypassing the lengthy blob document chunking phase, and pipes it straight into the Agent Runtime models. 

**Payload (JSON)**
```json
{
  "raw_text": "This application collects lead emails directly via a landing page form which is protected by TLS 1.3... (Full text from Privacy System here)",
  "mode": "consultative",
  "context_focus": ["GDPR", "Data Subject Constraints"]
}
```

**Parameters Explained:**
*   `raw_text`: The stringified raw context to be semantically verified.
*   `mode`: **Critical architectural flag**.
    *   If `"strict"`: The output behaves as an unforgiving auditor. If security factors are not explicitly stated, the result is marked as an `"evidence_gap"`.
    *   If `"consultative"`: The agent uses inference to hypothesize the most likely security implementations mapping to standard controls, outputting high-probability fields directly meant for your Privacy System to prompt the end-user (E.g. "Do you have an active DPA?").
*   `context_focus`: Allows your external app to force the LLM evaluation to steer towards specific domains.

**Response (202 Accepted)**
Because parsing extensive privacy processes relies on high-tier LLM tokenization, the route operates via queue polling to prevent HTTP timeouts.

```json
{
  "message": "Analysis run started asynchronously.",
  "job": {
    "agent_run_id": "run_01j72q...",
    "mode": "consultative",
    "status": "queued"
  },
  "trace_id": "req_88f91..."
}
```

## Polling for Run Results

Once the `analyze-text` response is received, external systems shall retrieve the validated mappings asynchronously using the returned `agent_run_id`.

### GET `/api/v1/agent-runs/:agentRunId`

Your external systems invoke this using the M2M Key to fetch the final Output JSON containing `not_met` gaps or fully mapped findings ready for consumption in your native UI.

> [!TIP]
> **Token Cost Tracking**: Standard records metric limits (`integration_text_analysis_requests`) based on API Key volume. LLM tokens expended through M2M integrations are charged globally per Tenant via the native Cloudflare AI Gateway telemetry logs. Keep polling intervals logical (e.g., every 5 seconds) until `status` equals `completed`. 

## SaaS Management API: Tenants, Organizations & Subscriptions

For platforms that white-label Standard or need to provision SaaS isolation dynamically without human intervention, Standard provides a master core API. 
*(Note: These routes require a root Administrator or Service Account with provisioning permission).*

### 1. Provisioning a Subscription (Tenant)
A **Tenant** represents an isolated instance of billing, configuration, and data isolation.
```http
POST /api/v1/tenants
{
  "name": "Customer Corp LLC",
  "slug": "customer-corp",
  "status": "active" // Controls the subscription state
}
```

### 2. Issuing an Organization
Organizations group assessments beneath a Tenant. M2M API Keys are issued bound to a specific Organization.
```http
POST /api/v1/organizations
{
  "tenant_id": "<uuid>",
  "name": "Headquarters",
  "slug": "hq"
}
```

### 3. Key Governance
Administrators can programmatically list, issue, and revoke keys (the "Chaves") mapped to organizations. M2M endpoints themselves are forbidden from creating new keys to prevent privilege escalation.
```http
GET    /api/v1/organizations/:orgId/api-keys
POST   /api/v1/organizations/:orgId/api-keys
DELETE /api/v1/organizations/:orgId/api-keys/:keyId
```

## RBAC Levels & Security Borders

Standard enforces strict Role-Based Access Control out-of-the-box. There are two primary domains of administrative visibility:

1. **Global Superadmin (`resper@bekaa.eu`)**: Operates on the absolute Top-Level. Capable of executing Cross-Tenant queries, registering new Tenants (subscriptions), injecting Official SCF Catalogs, and overseeing the entire Master Infrastructure.
2. **Organization/Tenant Admin**: This is the owner of a specific customer instance (e.g., the CISO of *Customer Corp LLC*). This administrator focuses solely on their isolated domain. They have access to:
   * View Subscription status and expiration.
   * Provision Organization-specific **M2M API Keys**.
   * Retrieve Integration Documentation.
   * Manage users mapped to their specific `tenantId`/`organizationId`.

---

## 🤖 AI Vibe-Coding Prompt (Integration Fast-Track)

If a **Tenant Admin** wishes to integrate their internal system (e.g., an internal Privacy App or GRC tool) with Standard using an AI Coding Assistant (Cursor, Claude Code, GitHub Copilot), they can simply copy and paste the universal prompt below into their AI dev tool to instantly generate the correct boilerplate.

<details>
<summary><b>Click to copy the AI Prompt Template</b></summary>

```markdown
@system You are tasked with integrating our system with the Standard Corporate GRC Engine (API-First). 
We need to pipe raw unstructured text (like a ROPA or policy document) into their automated SCF analyzer.

### Authentication Pattern
They use pure Machine-to-Machine API Keys. You must attach this header to all outgoing requests to their API:
`Authorization: Bearer standard_live_[YOUR_KEY_HERE]`
DO NOT try to implement OAuth flows, it is purely Bearer API Key based.

### Target Endpoint (Fire-and-Forget Text Analysis)
URL: `POST https://standard.bekaa.eu/api/v1/integrations/assessments/[YOUR_ASSESSMENT_ID]/analyze-text`

Payload Schema (JSON):
```json
{
  "raw_text": "YOUR EXTRACTED TEXT OR ROPA CONTENT",
  "mode": "consultative", // Use 'consultative' for inferences, 'strict' for pure auditing
  "context_focus": ["GDPR", "Data Privacy"]
}
```

### Action Items for you:
1. Create a service or utility in our codebase named `StandardIntegrationService`.
2. Implement an async function that dispatches the `raw_text` to the Standard API.
3. Handle a `202 Accepted` response. Extract the `job.agent_run_id` from the response.
4. Implement a polling mechanism pointing to `GET /api/v1/agent-runs/[agent_run_id]` every 5 seconds until `status` is `completed`.
5. Return the resulting mapped gaps and use them to power our own UX. Maintain strict error handling for 403 Forbidden (API Key invalid).
```
</details>


