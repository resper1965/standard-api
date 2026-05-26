/**
 * Standard Platform — k6 Smoke Test (quick validation)
 *
 * Tests the actual production API contract.
 * P95 threshold is 1s for health (includes DB query for operational metrics).
 * For application endpoint P95 (<500ms), use api-gateway.js with auth.
 *
 * Usage:
 *   k6 run scripts/load-test/smoke.js -e BASE_URL=https://standard-api.bekaa.eu
 */

import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'https://standard-api.bekaa.eu';

export const options = {
  vus: 5,
  duration: '1m',
  thresholds: {
    // Health includes DB query for operational metrics — 1s is acceptable
    'http_req_duration': ['p(95)<1000'],
    'http_req_failed': ['rate<0.05'],
  },
};

export default function () {
  // ── Health (no auth required) ─────────────────────────────────────────────
  const health = http.get(`${BASE_URL}/api/v1/health`);
  check(health, {
    'health 200': (r) => r.status === 200,
    // Actual health response: { ok: true, service: "...", timestamp: "..." }
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
  // NOTE: /api/v1/scf/controls does NOT exist; use /api/v1/scf/frameworks
  const scf = http.get(`${BASE_URL}/api/v1/scf/frameworks`);
  check(scf, {
    // SCF may require auth (401) or return data (200) or 404 if not seeded
    'scf 200 or 401 or 404': (r) => [200, 401, 404].includes(r.status),
    'scf < 1s': (r) => r.timings.duration < 1000,
  });
  sleep(0.5);
}
