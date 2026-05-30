import http from 'k6/http';
import { check, sleep } from 'k6';

// ── Configuration ────────────────────────────────────────────────────────────
export const options = {
  stages: [
    { duration: '10s', target: 10 },  // Ramp up to 10 users
    { duration: '10s', target: 10 },  // Stay at 10 users
    { duration: '10s', target: 50 },  // Ramp up to 50 users
    { duration: '10s', target: 50 },  // Stay at 50 users
    { duration: '10s', target: 0 },   // Ramp down to 0 users
  ],
  thresholds: {
    // 99% of requests must succeed
    http_req_failed: ['rate<0.01'],
    // 95% of requests must respond in less than 200ms
    http_req_duration: ['p(95)<200'],
  },
};

// ── Environment Parameters ───────────────────────────────────────────────────
const BASE_URL = __ENV.TARGET_URL || 'http://localhost:8787';
const API_KEY = __ENV.API_KEY || '';
const TENANT_ID = __ENV.TENANT_ID || '';

export default function () {
  // 1. Load test public endpoint: /health
  const healthRes = http.get(`${BASE_URL}/health`);
  check(healthRes, {
    'health status is 200': (r) => r.status === 200,
    'health body says ok': (r) => {
      try {
        return r.json().ok === true;
      } catch (e) {
        return false;
      }
    },
  });

  // 2. Load test protected endpoint (only if API_KEY is provided)
  if (API_KEY) {
    const headers = {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    };
    if (TENANT_ID) {
      headers['x-standard-tenant-id'] = TENANT_ID;
    }

    const assessmentsRes = http.get(`${BASE_URL}/api/v1/assessments`, { headers });
    check(assessmentsRes, {
      'assessments status is 200': (r) => r.status === 200,
      'assessments trace_id is present': (r) => {
        try {
          return r.json().trace_id !== undefined;
        } catch (e) {
          return false;
        }
      },
    });
  }

  sleep(1);
}
