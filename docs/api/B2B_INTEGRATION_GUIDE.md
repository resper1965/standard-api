# Standard B2B Integration Guide

This guide details how external applications (such as independent Privacy Systems, ERPs, and specialized SaaS) can connect to the Standard API to consume the GRC Agentic Engine programmatically.

> [!IMPORTANT]
> **Boundary Limits (What we do vs What you do):** Before writing any code, you and your development team must read our [Shared Responsibility Model](file:///docs/architecture/SHARED_RESPONSIBILITY_MODEL.md). Standard is a headless analytical engine. We do not provide UI dashboards, we do not calculate custom risk matrices (Probability x Impact), and we do not trigger email notifications. Your application must handle the Human-in-the-Loop workflows, UI rendering, and business-specific automations.

## Autonomous LLM Documentation (New!)

To rapidly onboard your internal AI agents (like Claude Code, Cursor, or Aider), simply point them to our raw markdown definitions.
* Provide your agent with the URL to our full LLM spec: `GET /docs/api/llms-full.txt` (or if you have the repo, point to `docs/api/llms-full.txt`).
* This file contains the complete OpenAPI schemas, endpoints, and data limits, preventing AI hallucinations regarding new fields like `observation_start_date` and `risk_acceptance_expires_at`.

## Authentication (Machine-to-Machine)

The Standard API assumes secure external B2B integration using **API Keys**. It is strictly a Machine-to-Machine (M2M) flow, meaning there are no interactive login prompts or redirect flows required.

1.  **Obtain a Key:** Generates an API key via the Developer Console (`Settings > Developers > API Keys`) or using the core `/api/v1/api-keys` route with a valid interactive Administrator token.
2.  **Pass the Token:** External systems must pass the token precisely in the `Authorization` header as a Bearer token.
    *   *Example prefix:* `Bearer standard_live_...`

> [!WARNING]
> Requests authenticated via this method resolve the actor natively as `m2m-agent` and inherit the Organization context directly from the Key issuing authority. Because of this security restriction, M2M agents **cannot** modify or generate other API keys.

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
> **Token Cost Tracking**: Standard records metric limits (`integration_text_analysis_requests`) based on API Key volume. LLM tokens expended through M2M integrations are charged globally per Organization via the native Cloudflare AI Gateway telemetry logs. Keep polling intervals logical (e.g., every 5 seconds) until `status` equals `completed`. 

## SaaS Management API: Tenants & Organizations

For platforms that white-label Standard or need to provision SaaS isolation dynamically without human intervention, Standard provides a master core API. 
*(Note: These routes require a root Administrator or Service Account with provisioning permission).*

### 1. Provisioning a Subscription (Tenant)
A **Tenant** (represented by `organization_id`) is the root billing and administrative unit.
```http
POST /api/v1/tenants
Content-Type: application/json

{
  "name": "Customer Corp LLC",
  "slug": "customer-corp"
}
```

### 2. Issuing an Organization (Sub-Organization)
Organizations group assessments beneath a Tenant. Assessments are bound to specific Organizations.
```http
POST /api/v1/organizations
Content-Type: application/json

{
  "organization_id": "00000000-0000-0000-0000-000000000000",
  "slug": "hq",
  "name": "Headquarters",
  "user_id": "user_12345"
}
```

### 3. Key Governance
Administrators can programmatically list, issue, and revoke keys mapped to their Root Organization. M2M endpoints themselves are forbidden from creating new keys to prevent privilege escalation.
```http
GET    /api/v1/api-keys
POST   /api/v1/api-keys
DELETE /api/v1/api-keys/:keyId
```

## RBAC Levels & Security Borders

Standard enforces strict Role-Based Access Control out-of-the-box. There are two primary domains of administrative visibility:

1. **Global Superadmin (`resper@bekaa.eu`)**: Operates on the absolute Top-Level. Capable of executing Cross-Organization queries, registering new Tenants (subscriptions), injecting Official SCF Catalogs, and overseeing the entire Master Infrastructure.
2. **Organization Admin**: This is the owner of a specific customer instance (e.g., the CISO of *Customer Corp LLC*). This administrator focuses solely on their isolated domain. They have access to:
   * View Subscription status and expiration.
   * Provision Organization-specific **M2M API Keys**.
   * Retrieve Integration Documentation.
   * Manage users mapped to their specific `organizationId`.

---

## 🤖 AI Vibe-Coding Prompt (Integration Fast-Track)

If a **Organization Admin** wishes to integrate their internal system (e.g., an internal Privacy App or GRC tool) with Standard using an AI Coding Assistant (Cursor, Claude Code, GitHub Copilot), they can simply copy and paste the universal prompt below into their AI dev tool to instantly generate the correct boilerplate.

<details>
<summary><b>Click to copy the AI Prompt Template</b></summary>

```markdown
@system You are tasked with refactoring and integrating our internal system with the Standard Corporate GRC Engine (API-First). 
We need to pipe raw unstructured text (like a ROPA or policy document) into their automated analyzer, handle asynchronous results, and map new GRC temporal fields.

### 1. Context Acquisition
Before writing any code, fetch and read their absolute OpenAPI and System definitions to avoid hallucinations. You can retrieve their absolute context at:
- `https://[STANDARD_API_DOMAIN]/docs/api/llms-full.txt`
Read that file completely to understand the available endpoints, the `AssessmentRecord` schemas, and the `PoamItem` schemas.

### 2. Authentication Pattern
They use pure Machine-to-Machine API Keys. You must attach this header to all outgoing requests to their API:
`Authorization: Bearer standard_live_[YOUR_KEY_HERE]`
DO NOT try to implement OAuth flows, it is purely Bearer API Key based.

### 3. Target Endpoint (Fire-and-Forget Text Analysis)
URL: `POST https://[STANDARD_API_DOMAIN]/api/v1/integrations/assessments/[YOUR_ASSESSMENT_ID]/analyze-text`

Payload Schema (JSON):
```json
{
  "raw_text": "YOUR EXTRACTED TEXT OR ROPA CONTENT",
  "mode": "consultative", // Use 'consultative' for inferences, 'strict' for pure auditing
  "context_focus": ["GDPR", "Data Privacy"]
}
```

### 4. New GRC Fields (Action Required)
Their API has recently introduced two critical fields that we must handle on our side. Update our database and API mappers to respect them:
1. `observation_start_date` and `observation_end_date` inside the Assessment endpoints.
2. `risk_acceptance_expires_at` inside the POA&M item endpoints.
Make sure you parse these dates correctly and expose them in our UI for the final auditor.

### 5. Action Items for you:
1. Fetch and digest `llms-full.txt`.
2. Refactor `StandardIntegrationService` to accommodate the new GRC fields (`observation_start_date`, `risk_acceptance_expires_at`).
3. Handle a `202 Accepted` response from the text analysis endpoint. Extract the `job.agent_run_id`.
4. Implement a polling mechanism pointing to `GET /api/v1/agent-runs/[agent_run_id]` every 5 seconds until `status` is `completed`.
5. Return the resulting mapped gaps and use them to power our own UX. Maintain strict error handling for 403 Forbidden (API Key invalid).
```
</details>


