/* global __ENV, __VU, __ITER */
import http from "k6/http";
import { check, sleep } from "k6";

// Read target URL and credentials from environment variables or use defaults
const BASE_URL = __ENV.BASE_URL || "http://localhost:8787"; // Default local gateway port
const API_KEY = __ENV.K6_API_KEY || "";
const ORG_ID = __ENV.K6_ORG_ID || "";

export const options = {
  stages: [
    { duration: "30s", target: 50 }, // Ramp-up to 50 users
    { duration: "60s", target: 100 }, // Hold/Scale-up to 100 users
    { duration: "30s", target: 0 }, // Ramp-down to 0 users
  ],
  thresholds: {
    // SLO: 95% of requests must complete below 200ms, 99% below 500ms
    http_req_duration: ["p(95)<200", "p(99)<500"],
    // Error rate must be less than 0.1%
    http_req_failed: ["rate<0.001"],
  },
};

export default function () {
  const headers = {
    "Content-Type": "application/json",
  };

  // 1. Test Baseline: Health Check Endpoint (Public)
  const healthRes = http.get(`${BASE_URL}/health`, { headers });
  check(healthRes, {
    "health check status is 200": (r) => r.status === 200,
    "health check response time < 200ms": (r) => r.timings.duration < 200,
  });

  // 2. Test Protected Endpoints (if credentials are provided)
  if (API_KEY && ORG_ID) {
    const authHeaders = {
      ...headers,
      Authorization: `Bearer ${API_KEY}`,
      "x-standard-tenant-id": ORG_ID,
    };

    // Read-heavy: Get SCF Controls List
    const controlsRes = http.get(`${BASE_URL}/api/v1/scf/controls?limit=25`, {
      headers: authHeaders,
    });
    check(controlsRes, {
      "get controls status is 200": (r) => r.status === 200,
      "get controls response time < 300ms": (r) => r.timings.duration < 300,
    });

    // Write: Create Draft Assessment
    const createPayload = JSON.stringify({
      name: `Load Test Assessment ${__VU}-${__ITER}`,
      description: "Performance evaluation draft assessment",
    });
    const createRes = http.post(
      `${BASE_URL}/api/v1/assessments`,
      createPayload,
      { headers: authHeaders },
    );
    check(createRes, {
      "create assessment status is 201": (r) => r.status === 201,
      "create assessment response time < 400ms": (r) =>
        r.timings.duration < 400,
    });
  }

  sleep(0.5); // Pace requests to avoid instant request flood
}
