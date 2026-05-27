#!/usr/bin/env node
/**
 * Standard Platform — Tenant Onboarding Script
 *
 * Provisions a new tenant with:
 *   1. Tenant creation
 *   2. Organization creation
 *   3. Admin user invitation
 *   4. API key generation
 *   5. Validation smoke test
 *
 * Usage:
 *   node scripts/onboard-tenant.mjs \
 *     --base-url https://standard-api.bekaa.eu \
 *     --admin-key standard_live_XXXX \
 *     --tenant-name "ACME Corp" \
 *     --tenant-slug acme-corp \
 *     --admin-email admin@acme.com
 *
 * Prerequisites:
 *   - Platform admin API key (standard_live_...)
 *   - Node.js >= 18
 *
 * @module scripts/onboard-tenant
 */

import { parseArgs } from "node:util";
import { randomUUID } from "node:crypto";

// ── Parse CLI args ────────────────────────────────────────────────────────────

const { values: args } = parseArgs({
  options: {
    "base-url":      { type: "string", default: "https://standard-api.bekaa.eu" },
    "admin-key":     { type: "string" },
    "tenant-name":   { type: "string" },
    "tenant-slug":   { type: "string" },
    "admin-email":   { type: "string" },
    "dry-run":       { type: "boolean", default: false },
  },
  strict: true,
});

const BASE_URL    = args["base-url"];
const ADMIN_KEY   = args["admin-key"];
const TENANT_NAME = args["tenant-name"];
const TENANT_SLUG = args["tenant-slug"];
const ADMIN_EMAIL = args["admin-email"];
const DRY_RUN     = args["dry-run"];

// ── Validation ────────────────────────────────────────────────────────────────

const missing = ["admin-key", "tenant-name", "tenant-slug", "admin-email"]
  .filter(k => !args[k]);

if (missing.length) {
  console.error(`\n❌  Missing required arguments: ${missing.map(k => `--${k}`).join(", ")}\n`);
  console.error(`Usage: node scripts/onboard-tenant.mjs \\`);
  console.error(`  --base-url https://standard-api.bekaa.eu \\`);
  console.error(`  --admin-key standard_live_XXXX \\`);
  console.error(`  --tenant-name "ACME Corp" \\`);
  console.error(`  --tenant-slug acme-corp \\`);
  console.error(`  --admin-email admin@acme.com\n`);
  process.exit(1);
}

// ── HTTP Helper ───────────────────────────────────────────────────────────────

async function api(method, path, body) {
  const url = `${BASE_URL}${path}`;
  if (DRY_RUN) {
    console.log(`\n[DRY RUN] ${method} ${url}`);
    if (body) console.log("  Body:", JSON.stringify(body, null, 2));
    return { ok: true, data: { id: `dry-run-${randomUUID()}` } };
  }

  const res = await fetch(url, {
    method,
    headers: {
      "Authorization": `Bearer ${ADMIN_KEY}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = { error: text }; }

  if (!res.ok) {
    throw new Error(`${method} ${path} → HTTP ${res.status}: ${JSON.stringify(json)}`);
  }
  return json;
}

// ── Steps ─────────────────────────────────────────────────────────────────────

async function step(label, fn) {
  process.stdout.write(`  ${label}... `);
  try {
    const result = await fn();
    console.log("✅");
    return result;
  } catch (err) {
    console.log("❌");
    throw err;
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

console.log("\n🚀  Standard Platform — Tenant Onboarding");
console.log("─".repeat(50));
console.log(`  Base URL:    ${BASE_URL}`);
console.log(`  Tenant:      ${TENANT_NAME} (${TENANT_SLUG})`);
console.log(`  Admin Email: ${ADMIN_EMAIL}`);
if (DRY_RUN) console.log("  Mode:        DRY RUN (no changes will be made)");
console.log("─".repeat(50));

try {
  // ── 1. Verify platform admin access ──────────────────────────────────────
  console.log("\n[1/5] Verifying platform admin access...");
  await step("GET /api/v1/health", () => api("GET", "/api/v1/health"));

  // ── 2. Create tenant ──────────────────────────────────────────────────────
  console.log("\n[2/5] Creating tenant...");
  const tenantResult = await step(
    `POST /api/v1/tenants`,
    () => api("POST", "/api/v1/tenants", {
      name: TENANT_NAME,
      slug: TENANT_SLUG,
    })
  );
  const tenantId = tenantResult?.data?.id;
  console.log(`         Tenant ID: ${tenantId}`);

  // ── 3. Create organization within tenant ──────────────────────────────────
  console.log("\n[3/5] Creating organization...");
  const orgResult = await step(
    `POST /api/v1/organizations`,
    () => api("POST", "/api/v1/organizations", {
      name: TENANT_NAME,
      slug: TENANT_SLUG,
    })
  );
  const orgId = orgResult?.data?.id;
  console.log(`         Organization ID: ${orgId}`);

  // ── 4. Generate API key for the organization ──────────────────────────────
  console.log("\n[4/5] Generating API key...");
  const keyResult = await step(
    `POST /api/v1/organizations/${orgId}/api-keys`,
    () => api("POST", `/api/v1/organizations/${orgId}/api-keys`, {
      name: `${TENANT_NAME} Production Key`,
      scopes: ["assessment:read", "assessment:write", "document:upload", "kb:search"],
    })
  );
  const apiKey = keyResult?.data?.key;
  const keyId  = keyResult?.data?.id;
  console.log(`         Key ID: ${keyId}`);
  if (apiKey) {
    console.log(`\n  ⚠️   API Key (copy now — shown only once):`);
    console.log(`         ${apiKey}`);
  }

  // ── 5. Smoke test: create assessment as the new tenant ────────────────────
  console.log("\n[5/5] Smoke test — creating test assessment...");
  const asmResult = await step(
    `POST /api/v1/assessments (using new API key)`,
    () => fetch(`${BASE_URL}/api/v1/assessments`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey || "dry-run-key"}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: "Onboarding Smoke Test Assessment",
        description: "Created by onboard-tenant.mjs — safe to delete",
        framework_hint: "iso27001",
      }),
    }).then(r => r.json())
  );
  const asmId = asmResult?.data?.id;
  console.log(`         Assessment ID: ${asmId}`);

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log("\n" + "─".repeat(50));
  console.log("✅  Onboarding complete!\n");
  console.log("  Summary:");
  console.log(`    Tenant ID:       ${tenantId}`);
  console.log(`    Organization ID: ${orgId}`);
  console.log(`    API Key ID:      ${keyId}`);
  console.log(`    Test Assessment: ${asmId}`);
  console.log("\n  Next steps:");
  console.log("    1. Share the API key securely with the tenant (never via email)");
  console.log("    2. Send API documentation: ${BASE_URL}/docs");
  console.log("    3. Delete the smoke test assessment via DELETE /api/v1/assessments/" + asmId);
  console.log("    4. Monitor audit logs for first 24h: docs/operations/go-live-status.md §13");
  console.log("");

} catch (err) {
  console.error("\n❌  Onboarding failed:", err.message);
  console.error("\n  Troubleshooting:");
  console.error("    - Verify ADMIN_KEY is a valid platform_admin key");
  console.error("    - Verify BASE_URL is reachable");
  console.error("    - Check audit logs: GET /api/v1/admin/audit-logs");
  process.exit(1);
}
