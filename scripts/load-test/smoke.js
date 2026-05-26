/**
 * Standard Platform — k6 Smoke Test (quick validation)
 *
 * Tests the production API contract. Validates:
 *   - Health endpoint availability (ok:true, service name, < 1s)
 *   - SCF frameworks endpoint (200, 401, or 404 all acceptable)
 *
 * P95 threshold is 1s: health endpoint queries DB for operational metrics
 * (~600ms on Neon over Cloudflare Workers). Application endpoints without
 * metrics aggregation are significantly faster.
 *
 * Usage:
 *   k6 run scripts/load-test/smoke.js -e BASE_URL=https://standard-api.bekaa.eu
 *
 * PASS criteria:
 *   - p(95) < 1s for all requests
 *   - error rate < 5% (404 from unseeded SCF catalog is expected, not an error)
 */

import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'https://standard-api.bekaa.eu';

// Tell k6 that 200-299, 401, and 404 are all "expected" responses (not failures)
// The SCF endpoint returns 404 when the catalog is not yet seeded — this is expected.
http.setResponseCallback(
  http.expectedStatuses({ min: 200, max: 299 }, 401, 404)
);

export const options = {
  vus: 5,
  duration: '1m',
  thresholds: {
    // Health includes DB query for operational metrics — 1s is acceptable
    // Application endpoints without metrics are typically < 200ms
    'http_req_duration': ['p(95)<1000'],
    // 404 from unseeded SCF catalog is expected and configured as not-failed above
    'http_req_failed': ['rate<0.05'],
  },
};

export default function () {
  // ── Health (no auth required) ─────────────────────────────────────────────
  const health = http.get(`${BASE_URL}/api/v1/health`, {
    tags: { endpoint: 'health' },
  });
  check(health, {
    'health 200': (r) => r.status === 200,
    // Actual health response: { ok: true, service: "standard-api-standard", ... }
    'health ok:true': (r) => {
      try { return JSON.parse(r.body).ok === true; } catch { return false; }
    },
    'health has service': (r) => {
      try { return JSON.parse(r.body).service === 'standard-api-standard'; } catch { return false; }
    },
    'health < 1s': (r) => r.timings.duration < 1000,
  });
  sleep(0.5);

  // ── SCF Frameworks (correct path for SCF catalog) ─────────────────────────
  // IMPORTANT: /api/v1/scf/controls does NOT exist; use /api/v1/scf/frameworks
  // Returns 200 if seeded, 401 if auth required, 404 if not seeded yet
  const scf = http.get(`${BASE_URL}/api/v1/scf/frameworks`, {
    tags: { endpoint: 'scf' },
  });
  check(scf, {
    'scf 200 or 401 or 404': (r) => [200, 401, 404].includes(r.status),
    'scf < 1s': (r) => r.timings.duration < 1000,
  });
  sleep(0.5);
}
