---
title: "F11: Usage Metering and Billing"
description: "Planned feature for API usage metering, plan enforcement, and MercadoPago billing integration"
---

# F11: Usage Metering and Billing

> **Status: Future Implementation** — This feature is planned but not yet implemented. This page documents the architectural design and integration strategy.

## Why This Exists

Standard GRC is an API-first SaaS — every assessment, document upload, and agent execution consumes compute. Without metering, there's no way to enforce plan limits, bill customers accurately, or understand unit economics. F11 establishes the billing foundation: usage metering at the API layer, plan enforcement middleware, and MercadoPago integration for the Brazilian market.

---

## Architecture

```mermaid
flowchart TB
    subgraph "API Gateway"
        MW["Usage Metering Middleware"]
        RL["Rate Limiter"]
    end

    subgraph "Metering Pipeline"
        Q["Cloudflare Queue"]
        AGG["Usage Aggregator Worker"]
        DB["Usage Records DB"]
    end

    subgraph "Billing"
        PLANS["Plan Enforcement"]
        MP["MercadoPago API"]
        INV["Invoice Generator"]
    end

    MW --> Q
    Q --> AGG
    AGG --> DB
    DB --> PLANS
    PLANS --> MW
    DB --> INV
    INV --> MP

    style MW fill:#2d333b,stroke:#6d5dfc,color:#e6edf3
    style RL fill:#2d333b,stroke:#6d5dfc,color:#e6edf3
    style Q fill:#2d333b,stroke:#6d5dfc,color:#e6edf3
    style AGG fill:#2d333b,stroke:#6d5dfc,color:#e6edf3
    style DB fill:#2d333b,stroke:#6d5dfc,color:#e6edf3
    style PLANS fill:#2d333b,stroke:#6d5dfc,color:#e6edf3
    style MP fill:#2d333b,stroke:#6d5dfc,color:#e6edf3
    style INV fill:#2d333b,stroke:#6d5dfc,color:#e6edf3
```

```mermaid
stateDiagram-v2
    [*] --> Free: Signup
    Free --> Starter: Upgrade
    Free --> [*]: Churn
    Starter --> Professional: Upgrade
    Starter --> Free: Downgrade
    Professional --> Enterprise: Upgrade
    Professional --> Starter: Downgrade
    Enterprise --> Professional: Downgrade

    state Free {
        [*] --> Active
        Active --> LimitReached: Usage > 1 assessment
        LimitReached --> Blocked: Hard limit
    }

    state Starter {
        [*] --> Active
        Active --> Warning: Usage > 80%
        Warning --> Overage: Usage > 100%
    }
```

---

## Planned Components

### 1. Usage Metering Middleware

Every API request passes through a metering middleware that records billable events:

| Event | Unit | Weight |
|-------|------|--------|
| `assessment.created` | Assessment | 1 |
| `document.uploaded` | Document | 1 |
| `agent.executed` | Agent Run | 1 |
| `report.generated` | Report | 1 |
| `api.request` | Request | 1 |
| `storage.bytes` | MB | per MB |

**Implementation location:** `apps/api-gateway/src/middleware/usage-metering.ts` (planned)

### 2. Plan Definitions

| Plan | Assessments/mo | Agents/mo | Storage | Price (BRL) |
|------|---------------|-----------|---------|-------------|
| **Free** | 1 | 5 | 100 MB | R$ 0 |
| **Starter** | 5 | 50 | 1 GB | R$ 497/mo |
| **Professional** | 20 | 200 | 10 GB | R$ 1.497/mo |
| **Enterprise** | Unlimited | Unlimited | 100 GB | Custom |

**Implementation location:** `packages/billing/src/plans.ts` (planned)

### 3. MercadoPago Integration

MercadoPago is the primary payment processor for the Brazilian market:

```typescript
// Planned SDK integration
const preference = await mercadopago.preferences.create({
  items: [{
    title: "Standard GRC - Professional Plan",
    unit_price: 1497.00,
    currency_id: "BRL",
    quantity: 1,
  }],
  payer: { email: organization.billing_email },
  back_urls: {
    success: `${BASE}/billing/success`,
    failure: `${BASE}/billing/failure`,
    pending: `${BASE}/billing/pending`,
  },
  notification_url: `${BASE}/webhooks/mercadopago`,
});
```

### 4. Usage Dashboard API

Planned endpoints:

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/organizations/:id/usage` | Current period usage summary |
| GET | `/api/v1/organizations/:id/usage/history` | Usage history by period |
| GET | `/api/v1/organizations/:id/billing/plan` | Current plan details |
| POST | `/api/v1/organizations/:id/billing/upgrade` | Initiate plan upgrade |
| GET | `/api/v1/organizations/:id/billing/invoices` | Invoice history |

---

## Data Model (Planned)

```mermaid
erDiagram
    TENANT ||--o{ USAGE_RECORD : generates
    TENANT ||--|| SUBSCRIPTION : has
    SUBSCRIPTION ||--|| PLAN : references
    SUBSCRIPTION ||--o{ INVOICE : produces
    INVOICE ||--o{ PAYMENT : receives

    TENANT {
        uuid organization_id PK
        string billing_email
        string billing_name
    }

    USAGE_RECORD {
        uuid usage_id PK
        uuid organization_id FK
        string event_type
        int quantity
        timestamp recorded_at
        string period
    }

    PLAN {
        uuid plan_id PK
        string name
        int max_assessments
        int max_agents
        bigint max_storage_bytes
        decimal price_brl
    }

    SUBSCRIPTION {
        uuid subscription_id PK
        uuid organization_id FK
        uuid plan_id FK
        string status
        timestamp current_period_start
        timestamp current_period_end
    }

    INVOICE {
        uuid invoice_id PK
        uuid subscription_id FK
        decimal amount_brl
        string status
        string mercadopago_preference_id
    }

    PAYMENT {
        uuid payment_id PK
        uuid invoice_id FK
        string mercadopago_payment_id
        string status
        timestamp paid_at
    }
```

---

## Implementation Strategy

1. **Phase 1 — Metering only** (no billing): Record usage events via Cloudflare Queue. Display on admin dashboard. No enforcement.
2. **Phase 2 — Plan enforcement**: Add soft limits (warnings) and hard limits (403 responses) based on plan.
3. **Phase 3 — MercadoPago integration**: Checkout flow, webhook handler, invoice generation.
4. **Phase 4 — Self-service billing**: Organization-facing billing dashboard with upgrade/downgrade, invoice download.

---

## Dependencies

| Dependency | Purpose | Status |
|-----------|---------|--------|
| Cloudflare Queues | Async usage event processing | ✅ Available |
| Neon PostgreSQL | Usage records and billing state | ✅ Available |
| MercadoPago SDK | Payment processing | 🔲 Not integrated |
| Cloudflare KV | Usage counters (hot path) | ✅ Available |

---

## References

- [Implementation Plan](file:///C:/Users/resper/.gemini/antigravity/brain/8b7edf93-654e-46ce-9ba7-5bc0083291dc/implementation_plan.md#L65) — F11 noted as future implementation
- [Product Discovery](file:///C:/Users/resper/.gemini/antigravity/brain/8b7edf93-654e-46ce-9ba7-5bc0083291dc/product_discovery.md) — Pricing model context
- [MercadoPago Docs](https://www.mercadopago.com.br/developers/pt/docs) — Payment API reference
