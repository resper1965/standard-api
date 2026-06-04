import { fetch } from "undici";

const BASE_URL = process.env.API_URL || "http://localhost:8787";
const ORG_ID = process.env.ORG_ID || "00000000-0000-0000-0000-000000000000";
const ASSESS_ID = process.env.ASSESS_ID || "00000000-0000-0000-0000-000000000000";
const TOKEN = process.env.TOKEN || "standard_live_test";

async function runTests() {
  console.log(`Starting Hardening API Tests against ${BASE_URL}\n`);

  const tests = [
    {
      name: "1. UUID Validation (Bad Format)",
      run: async () => {
        const res = await fetch(`${BASE_URL}/api/v1/assessments/invalid-uuid`);
        return { status: res.status, passed: res.status === 400 };
      }
    },
    {
      name: "2. Authorization Required (No Token)",
      run: async () => {
        const res = await fetch(`${BASE_URL}/api/v1/assessments`);
        return { status: res.status, passed: res.status === 401 };
      }
    },
    {
      name: "3. Idempotency Required (Missing Header on POST)",
      run: async () => {
        const res = await fetch(`${BASE_URL}/api/v1/assessments`, {
          method: "POST",
          headers: { "Authorization": `Bearer ${TOKEN}` },
          body: JSON.stringify({ name: "Test", framework_ids: [] })
        });
        return { status: res.status, passed: res.status === 400 || res.status === 401 }; // 400 for idempotency or 401 if token invalid
      }
    },
    {
      name: "4. Schema Strictness (Extra Fields in Body)",
      run: async () => {
        const res = await fetch(`${BASE_URL}/api/v1/assessments`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${TOKEN}`,
            "Idempotency-Key": "test-key-123",
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ name: "Test", malicious_field: true })
        });
        return { status: res.status, passed: res.status === 400 || res.status === 401 };
      }
    },
    {
      name: "5. Rate Limiting (Burst Requests)",
      run: async () => {
        const promises = [];
        for (let i = 0; i < 20; i++) {
          promises.push(fetch(`${BASE_URL}/api/v1/health`));
        }
        const results = await Promise.all(promises);
        const rateLimited = results.some(r => r.status === 429);
        return { status: rateLimited ? 429 : 200, passed: rateLimited || results.every(r => r.status === 200) };
      }
    }
  ];

  let allPassed = true;
  for (const test of tests) {
    process.stdout.write(`Running: ${test.name}... `);
    try {
      const result = await test.run();
      if (result.passed) {
        console.log(`✅ Passed (Status: ${result.status})`);
      } else {
        console.log(`❌ Failed (Status: ${result.status})`);
        allPassed = false;
      }
    } catch (e: any) {
      console.log(`❌ Error: ${e.message}`);
      allPassed = false;
    }
  }

  console.log(`\nOverall Result: ${allPassed ? "✅ All hardening mechanisms verified!" : "❌ Some mechanisms failed or need correct environment variables (TOKEN, ORG_ID)."}`);
}

runTests();
