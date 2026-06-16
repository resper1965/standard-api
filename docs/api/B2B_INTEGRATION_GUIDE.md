# Standard B2B Developer Portal & Integration Guide

Welcome to the **Standard API Developer Portal**. This guide provides the complete blueprint for integrating external applications (Privacy Management Systems, ERPs, GRC platforms, and automated agents) with the Standard GRC Engine.

---

## 🔄 Integration Workflow (Async Pattern)

Since evaluating compliance policies and evidence requires deep LLM analysis, Standard handles heavy operations asynchronously using a **Queue-and-Poll** or **Webhook** pattern to guarantee edge-worker execution limits are never breached.

```mermaid
sequenceDiagram
    autonumber
    participant App as External App (Your SaaS)
    participant GW as Standard API Gateway
    participant Queue as Agent Run Queue
    participant Agent as Agent Runtime (Council)
    participant DB as Neon Database

    App->>GW: POST /api/v1/integrations/assessments/:id/analyze-text (with API Key)
    Note over GW: Validate Key (KV Cache Hit: < 15ms)
    GW->>Queue: Push Job details (UUID)
    GW-->>App: HTTP 202 Accepted { job_id, status: "queued" }
    
    Queue->>Agent: Process Job (async model invocation)
    Note over Agent: Retrieve SCF core mappings & evaluate evidence
    Agent->>DB: Write validated events to Ledger (assessment_control_events)
    Note over Agent: Mark job as "completed"
    
    alt Webhook Pattern (Recommended)
        Agent->>App: POST [Your Webhook URL] Event: mcp.tool.completed (HMAC SHA-256)
    else Polling Pattern
        loop Every 5s
            App->>GW: GET /api/v1/agent-runs/:agentRunId
            GW-->>App: HTTP 200 OK { status: "completed" | "processing" }
        end
    end
```

---

## 🔑 Authentication (Machine-to-Machine)

Standard utilizes secure, low-latency API Keys for B2B system-level access. Requests are stateless and bypass interactive login flows.

### Authorization Header
Attach the API key as a Bearer token in the `Authorization` header of all HTTP requests:
```http
Authorization: Bearer standard_live_your_api_key_hash_here
```

### Try it with cURL
```bash
curl -X GET "https://api.standard.bekaa.eu/api/v1/assessments" \
  -H "Authorization: Bearer standard_live_demo_key_example" \
  -H "Content-Type: application/json"
```

> [!WARNING]
> M2M keys are bound to the issuing Organization's context. They inherit least-privilege scopes and **cannot** create, modify, or revoke other API keys.

---

## 📡 API Endpoint Reference

### 1. Raw Text Analysis
Analyze unstructured privacy statements, ROPAs, or vendor responses without uploading large PDF blobs.

* **Endpoint:** `POST /api/v1/integrations/assessments/:assessmentId/analyze-text`
* **Content-Type:** `application/json`

#### Request Body Schema
```json
{
  "raw_text": "Customer emails are collected via landing pages. Databases are encrypted with AES-256. Access is restricted via OAuth 2.0 with MFA enabled.",
  "mode": "consultative",
  "context_focus": ["GDPR", "Data Protection"]
}
```

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `raw_text` | `string` | **Yes** | — | Unstructured evidence or security control descriptions. |
| `mode` | `string` | No | `"consultative"` | `"strict"` (audits strictly, flags omissions as gaps) or `"consultative"` (infers matching controls and suggests fixes). |
| `context_focus`| `array` | No | `[]` | List of frameworks or keywords to steer LLM focus (e.g. `["GDPR", "ISO 27001"]`). |

#### Response (`202 Accepted`)
```json
{
  "message": "Analysis run started asynchronously.",
  "job": {
    "agent_run_id": "run_982a39d4-c9f1-48bd-a5b6-c3d710127b57",
    "mode": "consultative",
    "status": "queued"
  },
  "trace_id": "trace_88f912c4-8263-4527-9d76-72e7ee11e0ee"
}
```

---

### 2. Poll Job Status
Check the status of an asynchronous analysis run.

* **Endpoint:** `GET /api/v1/agent-runs/:agentRunId`

#### Response (`200 OK` - Processing)
```json
{
  "agent_run_id": "run_982a39d4-c9f1-48bd-a5b6-c3d710127b57",
  "status": "processing",
  "completed_at": null,
  "output": null
}
```

#### Response (`200 OK` - Completed)
```json
{
  "agent_run_id": "run_982a39d4-c9f1-48bd-a5b6-c3d710127b57",
  "status": "completed",
  "completed_at": "2026-06-16T22:48:10Z",
  "output": {
    "compliance_index": 0.85,
    "findings_detected": [
      {
        "control_code": "GOV-01.1",
        "status": "not_met",
        "gap_rationale": "Evidence fails to specify standard MFA criteria for database administrators."
      }
    ]
  }
}
```

---

## 🛠️ Multi-Language SDK Snippets

Copy these code snippets to quickly bootstrap your integration:

````carousel
```typescript
// Node.js (TypeScript) Integration Example
import { StandardClient } from "@standard/sdk";

const client = new StandardClient({
  apiKey: "standard_live_your_key_here",
  organizationId: "your-org-uuid"
});

async function runAnalysis(assessmentId: string, text: string) {
  const { data: job } = await client.integrations.analyzeText(assessmentId, {
    raw_text: text,
    mode: "consultative"
  });
  
  console.log(`Job queued: ${job.agent_run_id}`);
  
  // Polling helper
  const interval = setInterval(async () => {
    const { data: run } = await client.agentRuns.get(job.agent_run_id);
    if (run.status === "completed") {
      clearInterval(interval);
      console.log("Analysis Completed:", run.output);
    }
  }, 5000);
}
```
<!-- slide -->
```python
# Python Integration Example
import time
import requests

API_URL = "https://api.standard.bekaa.eu/v1"
HEADERS = {
    "Authorization": "Bearer standard_live_your_key_here",
    "Content-Type": "application/json"
}

def analyze_evidence(assessment_id, raw_text):
    payload = {"raw_text": raw_text, "mode": "consultative"}
    res = requests.post(f"{API_URL}/integrations/assessments/{assessment_id}/analyze-text", json=payload, headers=HEADERS)
    res.raise_for_status()
    job_id = res.json()["job"]["agent_run_id"]
    
    while True:
        status_res = requests.get(f"{API_URL}/agent-runs/{job_id}", headers=HEADERS)
        status_data = status_res.json()
        if status_data["status"] == "completed":
            return status_data["output"]
        time.sleep(5)
```
<!-- slide -->
```go
// Go Native Integration Example
package main

import (
	"bytes"
	"encoding/json"
	"net/http"
)

type AnalyzeRequest struct {
	RawText string   `json:"raw_text"`
	Mode    string   `json:"mode"`
}

func TriggerAnalysis(assessmentID string, text string) (*http.Response, error) {
	reqBody, _ := json.Marshal(AnalyzeRequest{RawText: text, Mode: "consultative"})
	req, _ := http.NewRequest("POST", "https://api.standard.bekaa.eu/v1/integrations/assessments/"+assessmentID+"/analyze-text", bytes.NewBuffer(reqBody))
	
	req.Header.Set("Authorization", "Bearer standard_live_your_key_here")
	req.Header.Set("Content-Type", "application/json")
	
	client := &http.Client{}
	return client.Do(req)
}
```
````

---

## 📅 Temporal GRC Metadata Fields

Your client database schemas must incorporate the following metadata fields introduced in the Standard GRC Engine to avoid mapping errors:

| Field Name | Type | Context | Description | Example |
| :--- | :--- | :--- | :--- | :--- |
| `observation_start_date` | `ISO 8601 Date` | Assessment | The start date of the period evaluated during audit. | `"2026-01-01"` |
| `observation_end_date` | `ISO 8601 Date` | Assessment | The end date of the period evaluated during audit. | `"2026-06-30"` |
| `risk_acceptance_expires_at`| `ISO 8601 DateTime`| POA&M Item | Expiration timestamp for temporary risk acceptances. | `"2026-12-31T23:59:59Z"` |

---

## 🤖 AI Vibe-Coding Prompt

Copy this template into your AI Development tool (e.g. Cursor, Claude Code, GitHub Copilot) to generate your integration code automatically:

```markdown
@system You are tasked with integrating our application with the Standard GRC Engine (API-First).
We must submit raw unstructured text for compliance analysis, parse the async status, and store GRC temporal metadata fields.

### Integration Parameters:
1. API Domain: `api.standard.bekaa.eu`
2. Authentication: `Authorization: Bearer standard_live_[YOUR_M2M_KEY]`
3. Endpoint: `POST /api/v1/integrations/assessments/[ASSESSMENT_ID]/analyze-text`
4. Polling Endpoint: `GET /api/v1/agent-runs/[AGENT_RUN_ID]`

### Data Contract Requirements:
Ensure our database models and serialization logic map the following new fields:
- `observation_start_date` (Date)
- `observation_end_date` (Date)
- `risk_acceptance_expires_at` (DateTime)

### Task:
Generate a service class in our project language that:
- Triggers the async raw text analysis.
- Handles the HTTP 202 status and grabs the `agent_run_id`.
- Implements a retry-loop or polling mechanism (checking every 5 seconds).
- Persists the final output JSON containing detected compliance gaps into our database.
```
