/**
 * Standard API — TypeScript Client Example
 *
 * Demonstrates how to integrate with the Standard API from a TypeScript/Node.js application.
 *
 * Requirements:
 *   - Node.js 18+ (uses native fetch)
 *   - Set STANDARD_API_KEY environment variable
 *
 * Usage:
 *   npx tsx examples/typescript/client.ts
 */

const BASE_URL = process.env.STANDARD_API_URL ?? "https://standard-api-gateway-production.ness.workers.dev";
const API_KEY = process.env.STANDARD_API_KEY ?? "";

if (!API_KEY) {
  console.error("❌ Set STANDARD_API_KEY environment variable");
  process.exit(1);
}

// ── Minimal typed client ────────────────────────────────

type ApiResponse<T> = {
  data: T;
  trace_id: string;
};

type ApiError = {
  error: {
    code: string;
    message: string;
    details: string[];
    trace_id: string;
  };
};

async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      "Authorization": `ApiKey ${API_KEY}`,
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const err: ApiError = await res.json();
    throw new Error(`[${res.status}] ${err.error.code}: ${err.error.message} (trace: ${err.error.trace_id})`);
  }

  return res.json() as Promise<T>;
}

// ── Example usage ──────────────────────────────────────

async function main() {
  console.log("🔬 Standard API — TypeScript Client Example\n");

  // 1. Health check (no auth required)
  const health = await fetch(`${BASE_URL}/health`).then((r) => r.json());
  console.log("✅ Health:", health.status);

  // 2. Get latest SCF version
  const scf = await api<{ scf_version_id: string; version_label: string }>("/api/v1/scf/versions/latest");
  console.log(`✅ SCF Version: ${scf.version_label} (${scf.scf_version_id})`);

  // 3. List frameworks (first 5)
  const frameworks = await api<{
    data: Array<{ id: string; name: string; requirement_count: number }>;
  }>("/api/v1/scf/frameworks?limit=5");
  console.log(`✅ Frameworks: ${frameworks.data.length} loaded`);
  for (const fw of frameworks.data) {
    console.log(`   - ${fw.name} (${fw.requirement_count} requirements)`);
  }

  // 4. Create assessment
  const assessment = await api<{
    assessment_id: string;
    state: string;
    trace_id: string;
  }>("/api/v1/assessments", {
    method: "POST",
    body: JSON.stringify({
      organization_id: process.env.STANDARD_ORG_ID ?? "your-org-id",
      name: `API Example - ${new Date().toISOString().slice(0, 10)}`,
      scf_version_id: scf.scf_version_id,
    }),
  });
  console.log(`✅ Assessment created: ${assessment.assessment_id} (state: ${assessment.state})`);

  // 5. Check available transitions
  const transitions = await api<{
    current_state: string;
    available_transitions: string[];
  }>(`/api/v1/assessments/${assessment.assessment_id}/available-transitions`);
  console.log(`✅ Available transitions: ${transitions.available_transitions.join(", ")}`);

  console.log("\n🎉 Done! Continue the lifecycle by uploading documents and transitioning states.");
}

main().catch((err) => {
  console.error("❌ Error:", err.message);
  process.exit(1);
});
