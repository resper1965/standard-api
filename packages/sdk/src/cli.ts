#!/usr/bin/env node
/**
 * Standard CLI — Command-line interface for the Standard GRC Platform
 *
 * Usage:
 *   standard gate --assessment-id <uuid>
 *   standard assess --framework soc2
 *   standard login
 *
 * Environment variables:
 *   STANDARD_API_KEY   — API key (starts with "standard_live_")
 *   STANDARD_TENANT_ID — Tenant UUID
 *   STANDARD_API_URL   — Base URL (optional, defaults to production)
 */

import { StandardClient, type StandardClientConfig } from "./client.js";

// ── Helpers ─────────────────────────────────────────────────

const env = (name: string, fallback?: string): string => {
  const value = process.env[name] ?? fallback;
  if (!value) {
    console.error(`❌ Missing required env var: ${name}`);
    process.exit(1);
  }
  return value;
};

const createClient = (): StandardClient => {
  const config: StandardClientConfig = {
    apiKey: env("STANDARD_API_KEY"),
    tenantId: env("STANDARD_TENANT_ID"),
  };
  const baseUrl = process.env["STANDARD_API_URL"];
  if (baseUrl) config.baseUrl = baseUrl;
  return new StandardClient(config);
};

const flag = (args: string[], name: string): string | undefined => {
  const idx = args.indexOf(`--${name}`);
  return idx !== -1 ? args[idx + 1] : undefined;
};

// ── Commands ────────────────────────────────────────────────

async function cmdGate(args: string[]) {
  const assessmentId = flag(args, "assessment-id");
  if (!assessmentId) {
    console.error("Usage: standard gate --assessment-id <uuid>");
    process.exit(1);
    return;
  }

  const client = createClient();
  const gate = await client.assessments.complianceGate(assessmentId);

  console.log("");
  console.log(`  ╔══════════════════════════════════════╗`);
  console.log(`  ║     Standard Compliance Gate         ║`);
  console.log(`  ╚══════════════════════════════════════╝`);
  console.log("");
  console.log(`  Status:     ${gate.status === "pass" ? "✅ PASS" : gate.status === "fail" ? "❌ FAIL" : `⏳ ${gate.status.toUpperCase()}`}`);
  console.log(`  Critical:   ${gate.critical_findings}`);
  console.log(`  High:       ${gate.high_findings}`);
  console.log(`  Total:      ${gate.total_findings}`);
  console.log(`  Summary:    ${gate.findings_summary}`);
  console.log(`  Checked at: ${gate.checked_at}`);
  console.log("");

  if (gate.status === "fail") process.exit(1);
}

async function cmdAssess(args: string[]) {
  const framework = flag(args, "framework") ?? "all";
  const client = createClient();
  const { data } = await client.assessments.list();

  console.log("");
  console.log(`  📋 Assessments (${data.length} found):`);
  console.log("");
  for (const a of data) {
    console.log(`  • ${a.name} [${a.state}] — ${a.id}`);
  }
  console.log("");

  if (framework !== "all") {
    console.log(`  Filter: framework=${framework} (note: server-side filtering not yet implemented)`);
  }
}

function cmdLogin() {
  console.log("");
  console.log("  🔑 Standard CLI Login");
  console.log("");
  console.log("  Set the following environment variables:");
  console.log("");
  console.log("    export STANDARD_API_KEY=\"standard_live_...\"");
  console.log("    export STANDARD_TENANT_ID=\"your-tenant-uuid\"");
  console.log("    export STANDARD_API_URL=\"https://api.standard.dev\"  # optional");
  console.log("");
  console.log("  Then run: standard gate --assessment-id <uuid>");
  console.log("");
}

function cmdHelp() {
  console.log(`
  Standard CLI — The "Stripe for Compliance" command line

  Commands:
    gate    Check compliance gate for an assessment
    assess  List assessments
    login   Show login instructions
    help    Show this help

  Options:
    --assessment-id <uuid>   Assessment ID (for gate command)
    --framework <name>       Framework filter (for assess command)

  Examples:
    standard gate --assessment-id abc-123
    standard assess --framework soc2
    standard login
`);
}

// ── Router ──────────────────────────────────────────────────

const [, , command, ...args] = process.argv;

switch (command) {
  case "gate":
    cmdGate(args).catch((err) => { console.error("❌", err.message ?? err); process.exit(1); });
    break;
  case "assess":
    cmdAssess(args).catch((err) => { console.error("❌", err.message ?? err); process.exit(1); });
    break;
  case "login":
    cmdLogin();
    break;
  case "help":
  case "--help":
  case "-h":
  case undefined:
    cmdHelp();
    break;
  default:
    console.error(`Unknown command: ${command}. Run "standard help" for usage.`);
    process.exit(1);
}
