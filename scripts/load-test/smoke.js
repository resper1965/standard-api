/**
 * Standard Platform — k6 Smoke Test (quick validation)
 * 
 * Use this for a quick ~2 minute sanity check before the full load test.
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
    http_req_duration: ['p(95)<500'],
    http_req_failed: ['rate<0.05'],
  },
};

export default function () {
  // Health
  const health = http.get(`${BASE_URL}/api/v1/health`);
  check(health, {
    'health 200': (r) => r.status === 200,
    'health body ok': (r) => { try { return JSON.parse(r.body).status === 'ok'; } catch { return false; } },
  });
  sleep(0.5);

  // SCF public endpoint (no auth)
  const scf = http.get(`${BASE_URL}/api/v1/scf/controls?limit=5`);
  check(scf, {
    'scf 200 or 401': (r) => r.status === 200 || r.status === 401,
    'scf < 500ms': (r) => r.timings.duration < 500,
  });
  sleep(0.5);
}
