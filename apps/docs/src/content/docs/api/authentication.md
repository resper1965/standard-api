---
title: "Standard API: Authentication & Identity Guide"
---

# Standard API: Authentication & Identity Guide

The Standard API is built on a highly secure, zero-trust **Ultra-Native Identity Architecture**. This means that identity is strictly API-First and decoupled from rigid frontend views.

This guide explains how identity works, how to authenticate your requests, and how to properly scope data isolation for your customers (Sub-Tenants).

---

## 1. Identity Architecture Overview

Standard operates on a strictly hierarchical multi-tenant model:

```mermaid
graph TD
    A[Root Tenant / Developer] -->|Owns| B(API Keys)
    B -->|Grants Access to| C[API Gateway]
    C -->|Creates & Scopes| D[Sub-Tenant 1]
    C -->|Creates & Scopes| E[Sub-Tenant 2]
    
    style A fill:#0ea5e9,color:#fff
    style B fill:#22c55e,color:#fff
    style C fill:#f59e0b,color:#fff
```

### The Root Tenant (Developer)
When you create an account on the **Standard Developer Console**, your unique User ID becomes your **Root Tenant ID**. 
- The Web Console is strictly an administrative portal to manage API Keys and billing. 
- It does **not** have access to the GRC data layer.

### Sub-Tenants (Organizations)
Your Root Tenant can create and manage multiple **Organizations** via the API. In the Standard architecture, these organizations function as isolated **Sub-Tenants**. 
- All data (Assessments, Documents, Findings) is completely isolated per Organization.
- It is physically impossible for data to leak between Organizations, as the API Gateway actively enforces scoping based on the Root Tenant's API Key.

---

## 2. API Keys

To interact with the Standard API (or use the Standard MCP Server), you must use an **API Key**.

### Generating an API Key
1. Log in to the [Developer Console](https://standard-web-production.pages.dev/).
2. Navigate to **API Keys**.
3. Click **Generate New Key**.
4. Securely copy the raw key (e.g., `standard_live_8f3a...`). **It will only be shown once.**

### Authenticating Requests
All programmatic requests to the API must include the API Key in the `Authorization` header using the `Bearer` scheme.

```bash
curl -X GET "https://standard-api.bekaa.eu/api/v1/health" \
     -H "Authorization: Bearer standard_live_YOUR_RAW_KEY_HERE"
```

### Security & Data Bleed Protection
When the API Gateway receives your API Key, it automatically:
1. Validates the SHA-256 hash against the identity store.
2. Identifies your **Root Tenant ID**.
3. Locks the request context (`context.tenantId`) to your identity.
4. **Result:** Any downstream query you perform is hard-scoped to your Tenant hierarchy.

---

## 3. Scoping Requests to a Sub-Tenant

While your API Key grants you access to your **Root Tenant**, many GRC endpoints (like creating an assessment or uploading evidence) act upon a specific customer's data (a Sub-Tenant).

For these endpoints, you must specify the target Organization ID in the URL path.

**Example:** Fetching assessments for a specific Organization.
```bash
curl -X GET "https://standard-api.bekaa.eu/api/v1/organizations/org_12345/assessments" \
     -H "Authorization: Bearer standard_live_..."
```

The API Gateway will automatically verify that `org_12345` was created by, and belongs to, your Root Tenant. If you attempt to access an Organization ID belonging to another developer, the request will be instantly rejected with a `404 Not Found` to prevent enumeration attacks.

---

## 4. MCP Server Authentication

If you are using the Standard Model Context Protocol (MCP) Server with an AI assistant (like Claude Desktop or Cursor), the authentication relies on the exact same API Key.

The MCP Server inherits your Root Tenant identity. When your AI agent executes a tool (e.g., `start_assessment`), the MCP server signs the request with your API key, guaranteeing that the AI can only access and modify data within your allowed Sub-Tenants.

```json
{
  "mcpServers": {
    "standard": {
      "command": "npx",
      "args": ["-y", "@standard/mcp"],
      "env": {
        "STANDARD_API_KEY": "standard_live_..."
      }
    }
  }
}
```

> [!CAUTION]
> Treat your `standard_live_...` keys like passwords. Never commit them to version control. If a key is compromised, revoke it immediately via the Developer Console.
