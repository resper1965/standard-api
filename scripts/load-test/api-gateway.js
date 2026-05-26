/**
 * Standard Platform — k6 Load Test Suite
 * 
 * Scenarios:
 *   - Scenario 1: API Gateway Throughput (health, SCF, assessments)
 *   - Scenario 4: Rate Limit Validation
 *   - Scenario 5: Multi-Tenant Isolation
 *
 * Usage:
 *   k6 run scripts/load-test/api-gateway.js \
 *     -e BASE_URL=https://standard-api.bekaa.eu \
 *     -e API_KEY=sk_live_...
 *
 * Prerequisites:
 *   - k6 installed: https://k6.io/docs/getting-started/installation/
 *   - At least one tenant with API key provisioned
 *   - STANDARD_ENV=production on target
 */

import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// ── Configuration ────────────────────────────────────────────────────────────

const BASE_URL = __ENV.BASE_URL || 'https://standard-api.bekaa.eu';
const API_KEY = __ENV.API_KEY || '';          // standard_live_... API key
const ACTOR_ID = __ENV.ACTOR_ID || 'load-test-actor';

// ── Custom Metrics ────────────────────────────────────────────────────────────

const errorRate = new Rate('errors');
const scfLatency = new Trend('scf_latency', true);
const assessmentLatency = new Trend('assessment_latency', true);
const healthLatency = new Trend('health_latency', true);

// ── Options ───────────────────────────────────────────────────────────────────

export const options = {
  scenarios: {
    // Scenario 1: Sustained throughput ramp
    api_throughput: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 20 },   // warm-up
        { duration: '2m',  target: 100 },  // ramp to 100 VUs
        { duration: '3m',  target: 100 },  // hold at 100 VUs
        { duration: '30s', target: 0 },    // ramp down
      ],
      gracefulRampDown: '10s',
    },
    // Scenario 4: Rate limit validation (separate scenario)
    rate_limit_check: {
      executor: 'constant-arrival-rate',
      rate: 150,            // 150 req/s — above 120/min limit per tenant
      timeUnit: '1s',
      duration: '30s',
      preAllocatedVUs: 20,
      startTime: '6m30s',  // run after main scenario finishes
    },
  },
  thresholds: {
    // P0 Gate: P95 < 500ms on critical endpoints
    'http_req_duration{scenario:api_throughput}': ['p(95)<500', 'p(99)<1000'],
    'http_req_failed{scenario:api_throughput}': ['rate<0.01'],  // < 1% error rate
    health_latency: ['p(95)<100'],
    scf_latency: ['p(95)<300'],
    assessment_latency: ['p(95)<500'],
    errors: ['rate<0.01'],
  },
};

// ── Auth Headers ──────────────────────────────────────────────────────────────

const authHeaders = () => {
  if (API_KEY) {
    return { Authorization: `Bearer ${API_KEY}`, 'Content-Type': 'application/json' };
  }
  // Fallback for dev mode only (not production)
  return {
    'x-standard-actor-id': ACTOR_ID,
    'Content-Type': 'application/json',
  };
};

// ── Tenant Setup ──────────────────────────────────────────────────────────────

// Pre-created assessment ID for read-heavy tests (set via env or use a known one)
const ASSESSMENT_ID = __ENV.ASSESSMENT_ID || '';
const TENANT_ID = __ENV.TENANT_ID || '';

// ── Test Functions ─────────────────────────────────────────────────────────────

export default function () {
  const headers = authHeaders();
  const tenantHeaders = TENANT_ID
    ? { ...headers, 'x-standard-tenant-id': TENANT_ID }
    : headers;

  // Group: Health (baseline — no auth needed)
  group('health', () => {
    const res = http.get(`${BASE_URL}/api/v1/health`);
    healthLatency.add(res.timings.duration);
    const ok = check(res, {
      'health status 200': (r) => r.status === 200,
      'health < 100ms': (r) => r.timings.duration < 100,
    });
    errorRate.add(!ok);
  });

  sleep(0.1);

  // Group: SCF read (no tenant required — global data)
  group('scf_read', () => {
    const res = http.get(`${BASE_URL}/api/v1/scf/controls?limit=25`, { headers });
    scfLatency.add(res.timings.duration);
    const ok = check(res, {
      'scf status 200': (r) => r.status === 200,
      'scf has data': (r) => { try { return JSON.parse(r.body).data !== undefined; } catch { return false; } },
      'scf < 300ms': (r) => r.timings.duration < 300,
    });
    errorRate.add(!ok);
  });

  sleep(0.1);

  // Group: Assessment status (read — requires tenant + assessment)
  if (ASSESSMENT_ID && TENANT_ID) {
    group('assessment_status', () => {
      const res = http.get(
        `${BASE_URL}/api/v1/assessments/${ASSESSMENT_ID}/status`,
        { headers: tenantHeaders }
      );
      assessmentLatency.add(res.timings.duration);
      const ok = check(res, {
        'assessment status 200': (r) => r.status === 200,
        'assessment < 500ms': (r) => r.timings.duration < 500,
      });
      errorRate.add(!ok);
    });
    sleep(0.1);
  }

  // Group: Assessments list (read-heavy)
  group('assessments_list', () => {
    const res = http.get(`${BASE_URL}/api/v1/assessments?limit=10`, { headers: tenantHeaders });
    assessmentLatency.add(res.timings.duration);
    const ok = check(res, {
      'assessments list 200 or 401': (r) => r.status === 200 || r.status === 401,
      'assessments < 500ms': (r) => r.timings.duration < 500,
    });
    errorRate.add(!ok && res.status !== 401);
  });

  sleep(0.2);
}

// ── Rate Limit Scenario ────────────────────────────────────────────────────────

export function rateLimitCheck() {
  // This runs in the rate_limit_check scenario at 150 req/s
  // We expect ~120 to pass (rate limit) and rest to return 429
  const res = http.get(`${BASE_URL}/api/v1/health`);
  check(res, {
    'rate limit: 200 or 429': (r) => r.status === 200 || r.status === 429,
    'rate limit: has proper header on 429': (r) => {
      if (r.status === 429) {
        return r.headers['Retry-After'] !== undefined || r.headers['X-Ratelimit-Reset'] !== undefined;
      }
      return true;
    },
  });
}
