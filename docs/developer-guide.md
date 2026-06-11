# Standard API — Developer Guide

Welcome to the **Standard GRC Platform** API documentation. This guide is tailored for developers integrating their applications (B2B, portals, SIEMs) with the Standard API.

The Standard API is an agentic compliance intelligence engine. You send us your documents and raw data; our AI agents analyze them against 231+ frameworks (like SOC 2, ISO 27001, LGPD) and return structured compliance verdicts.

## Core Concepts

Before consuming the API, understand these three pillars:

1. **Organization Isolation (Multi-Tenant)**
   Every assessment, document, and gap analysis belongs to an `organization_id`. The API strictly enforces this isolation. You cannot access or mix data between organizations.

2. **Asynchronous Agentic Workflows (Polling)**
   While simple intelligence queries (like calculating a compliance score) return instantly, deep document analyses (like Gap Analysis or generating a Statement of Applicability) run asynchronously. These endpoints return a `202 Accepted` with a `job_id`. You must poll the job status until it completes.

3. **Human-in-the-Loop (Approvals)**
   Agents propose findings, but they do not make them official. Drafts (like a Draft Gap Analysis) must be explicitly approved via the API to become immutable, versioned artifacts.

---

## Authentication

The Standard API uses Bearer Token authentication. There are two primary ways to authenticate:

### 1. Machine-to-Machine (M2M) API Keys

For backend-to-backend integrations, generate an API Key from your Dashboard. Keys are scoped and follow the format: `standard_live_...` or `standard_test_...`.

**Example Request:**
```bash
curl -X GET https://standard-api.bekaa.eu/api/v1/assessments \
  -H "Authorization: Bearer standard_live_YOUR_API_KEY"
```

### 2. Session Cookies (Frontend Integrations)

If you are building a Single Page Application (SPA) that talks directly to the API, you can use the Native Auth session flow. After a successful login (`POST /api/auth/sign-in/email`), the API sets a `standard-native-auth.session_token` cookie. The browser will automatically include this in subsequent requests.

---

## The Assessment Lifecycle

Most of your interactions will revolve around the Assessment Lifecycle. Here is the typical flow to automate an audit:

1. **Create Assessment:** `POST /api/v1/assessments`
   Define the target framework (e.g., SOC 2) and the organization.

2. **Define Scope:** `POST /api/v1/assessments/{id}/scope`
   Specify what departments, locations, or systems are in scope.

3. **Upload Evidence:** `POST /api/v1/assessments/{id}/documents`
   Upload security policies, architecture diagrams, or raw text excerpts. *(Note: Our agents parse text and markdown. If uploading PDFs, ensure they contain extractable text).*

4. **Run Evidence Analysis:** `POST /api/v1/assessments/{id}/evidence-analysis/run`
   Trigger the AI agents to evaluate the uploaded documents against the chosen framework's controls. **This is an async operation (returns 202).**

5. **Draft Gap Analysis:** `POST /api/v1/assessments/{id}/gap-analysis/draft`
   Aggregate the evidence findings into a structured Gap Analysis.

---

## Handling Async Operations

When you call an endpoint that triggers an AI agent or a long-running workflow, you will receive a `202 Accepted` response.

**Request:**
```bash
curl -X POST https://standard-api.bekaa.eu/api/v1/assessments/123/evidence-analysis/run \
  -H "Authorization: Bearer standard_live_YOUR_KEY"
```

**Response (202):**
```json
{
  "status": "processing",
  "job_id": "job_abc123"
}
```

**Polling for Completion:**
Use the `/api/v1/jobs/{job_id}` endpoint (or the specific resource's status endpoint) to poll for completion. We recommend polling every 3-5 seconds.

---

## Cookbook & Quick Recipes

Need to implement a specific use case quickly? We have ready-to-use recipes for:
- [SOC Incident Triage](api/llms-full.txt)
- [Vendor Contract Scanning (DPA)](api/llms-full.txt)
- [Executive Risk Translation](api/llms-full.txt)

👉 **[View all Recipes in the Cookbook](api/llms-full.txt)**

---

## Next Steps

- **[Explore the OpenAPI Reference](api/openapi.yaml)** for full schema definitions.
- **[Read the Architecture Docs](../architecture/arc42.md)** to understand how data is stored and isolated.
