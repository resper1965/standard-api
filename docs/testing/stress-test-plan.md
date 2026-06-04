# Stress Test Plan

> Standard Platform — Performance and load testing strategy for Queue throughput, Workers AI concurrency, and API gateway resilience.

## Overview

This document defines the stress testing strategy for the Standard platform. Tests will validate system behavior under sustained load, identify bottlenecks, and establish performance baselines.

**Status**: Planned (P2) — to be executed before first production organization onboarding.

---

## Test Tooling

| Tool | Purpose | Status |
|------|---------|--------|
| [k6](https://k6.io) | HTTP load testing | Recommended |
| [Artillery](https://artillery.io) | Alternative load testing | Alternative |
| Cloudflare Analytics | Worker metrics | Available |
| Neon Dashboard | PostgreSQL monitoring | Available |

---

## Test Scenarios

### Scenario 1: API Gateway Throughput
**Objective**: Validate API gateway handles sustained request volume

```
Target: 500 req/s for 5 minutes
Ramp: 0 → 500 over 60s, hold 240s, ramp down 60s
Endpoints:
  - GET /api/v1/health (baseline)
  - GET /api/v1/scf/controls?limit=25 (read-heavy)
  - POST /api/v1/assessments (write)
  - POST /api/v1/assessments/:id/kb/search (compute)
SLO:
  - p95 latency < 200ms
  - p99 latency < 500ms
  - Error rate < 0.1%
```

### Scenario 2: Document Upload Pipeline
**Objective**: Validate R2 upload + Queue ingestion under concurrent uploads

```
Target: 50 concurrent uploads, 200 total files
File sizes: 100KB, 1MB, 10MB mix
Pipeline: Upload → R2 → Queue → Extraction → KB Indexing
SLO:
  - Upload p95 < 3s
  - Queue processing p95 < 30s
  - Zero lost messages (DLQ = 0)
```

### Scenario 3: Workers AI Concurrency
**Objective**: Validate embedding generation throughput

```
Target: 100 concurrent embedding requests
Model: @cf/baai/bge-base-en-v1.5
Input: 512-token chunks
SLO:
  - Embedding p95 < 500ms
  - AI Gateway rate limit not exceeded
  - Zero timeout errors
```

### Scenario 4: Rate Limiting Validation
**Objective**: Verify KV-backed rate limiting under load

```
Target: 200 req/s from single organization
Expected: 120 req/s allowed, remainder rejected with 429
Validation:
  - 429 responses contain proper headers
  - KV counter accuracy > 99%
  - No request leakage above limit
```

### Scenario 5: Multi-Organization Isolation Under Load
**Objective**: Verify organization isolation under concurrent multi-organization traffic

```
Organizations: 10 concurrent
Each organization: 50 req/s
Validation:
  - Zero cross-organization data leakage
  - Rate limits independent per organization
  - Response times consistent across organizations
```

---

## k6 Script Template

```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '60s', target: 100 },
    { duration: '240s', target: 500 },
    { duration: '60s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<200', 'p(99)<500'],
    http_req_failed: ['rate<0.001'],
  },
};

export default function () {
  const res = http.get('https://standard-api.bekaa.eu/api/v1/health');
  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 200ms': (r) => r.timings.duration < 200,
  });
  sleep(0.1);
}
```

---

## Execution Plan

1. **Pre-requisites**: Ensure production data is seeded and rate limits are active
2. **Baseline run**: Execute Scenario 1 at 10% load to establish baseline
3. **Incremental load**: Gradually increase to target load
4. **Soak test**: Run Scenario 1 at 50% load for 1 hour
5. **Analysis**: Review Cloudflare Analytics, Neon dashboard, and k6 reports
6. **Report**: Document findings, bottlenecks, and recommended tuning
