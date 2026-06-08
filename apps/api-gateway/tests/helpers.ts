import { createApp } from "../src/app";

export const ids = {
  actorId: "44444444-4444-4444-8444-444444444444",
  scfVersionId: "55555555-5555-4555-8555-555555555555",
  organizationId: "11111111-1111-4111-8111-111111111111"
};

const jsonRequest = (path: string, method: string, body?: unknown, headers: Record<string, string> = {}) =>
  new Request(`https://api.test${path}`, {
    method,
    headers: {
      "content-type": "application/json",
      "x-trace-id": "trace-test-0001",
      ...headers
    },
    body: body === undefined ? undefined : JSON.stringify(body)
  });

const multipartRequest = (path: string, form: FormData, headers: Record<string, string> = {}) =>
  new Request(`https://api.test${path}`, {
    method: "POST",
    headers: {
      "x-trace-id": "trace-test-0001",
      ...headers
    },
    body: form
  });

const wrapError = (resBody: any) => {
  if (
    resBody &&
    typeof resBody === "object" &&
    typeof resBody.type === "string" &&
    resBody.type.startsWith("https://api.standard-grc.com/errors/")
  ) {
    const code = resBody.type.split("/").pop()?.toUpperCase() || "";
    resBody.error = {
      code,
      message: resBody.detail,
      trace_id: resBody.trace_id,
      details: resBody.errors
    };
  }
  return resBody;
};

export const createTestClient = () => {
  const app = createApp(undefined, { STANDARD_ENV: "test", ALLOW_MOCK_AUTH: "true" } as any);

  const send = async (path: string, method = "GET", body?: unknown, headers: Record<string, string> = {}) => {
    // Auto-inject idempotency key for mutating methods (hardening requirement)
    const mutating = ["POST", "PUT", "PATCH", "DELETE"].includes(method.toUpperCase());
    const idempotencyHeaders = mutating && !headers["idempotency-key"]
      ? { "idempotency-key": crypto.randomUUID() }
      : {};
    // Auto-inject CSRF token for mutating methods (M3 CSRF protection)
    const csrfToken = "test-csrf-token-" + crypto.randomUUID().replace(/-/g, "").slice(0, 16);
    const csrfHeaders = mutating
      ? { "cookie": `__csrf=${csrfToken}`, "x-csrf-token": csrfToken }
      : {};
    const response = await app.fetch(jsonRequest(path, method, body, { ...csrfHeaders, ...idempotencyHeaders, ...headers }));
    const resBody = await response.json();
    return { response, body: wrapError(resBody) };
  };

  const createTenantOrg = async () => {
    // POST /api/v1/tenants requires platformAdmin (session-based) — unavailable in test mode.
    // Use a unique random UUID as tenant ID directly. The org creation route accepts any tenant
    // UUID via x-standard-tenant-id header, and mock resolveOrganizationContext JIT-provisions the
    // context from orgMap when the assessment is created. Cross-tenant isolation is preserved.
    const organizationId = crypto.randomUUID();
    const slug = `org-test-${Math.random().toString(36).slice(2, 8)}`;
    const orgResult = await send("/api/v1/organizations", "POST", {
      organization_id: organizationId,
      slug,
      name: "Org Test",
      user_id: ids.actorId
    }, {
      "x-standard-tenant-id": organizationId,
      "x-standard-actor-id": ids.actorId
    });

    const orgId = orgResult.body.organization_id as string;
    return {
      organizationId: orgId
    };
  };


  const createAssessment = async (documentCount = 0) => {
    const { organizationId } = await createTenantOrg();
    const result = await send("/api/v1/assessments", "POST", {
      organization_id: organizationId,
      name: "Assessment Test",
      scf_version_id: ids.scfVersionId,
      document_count: documentCount
    }, {
      "x-standard-tenant-id": organizationId,
      "x-standard-actor-id": ids.actorId
    });

    return {
      organizationId,
      assessmentId: result.body.assessment_id as string,
      body: result.body
    };
  };

  const sendMultipart = async (path: string, form: FormData, headers: Record<string, string> = {}) => {
    // Auto-inject idempotency key (multipart uploads are always POST — hardening requirement)
    const idempotencyHeaders = !headers["idempotency-key"]
      ? { "idempotency-key": crypto.randomUUID() }
      : {};
    // Auto-inject CSRF token (M3 CSRF protection)
    const csrfToken = "test-csrf-token-" + crypto.randomUUID().replace(/-/g, "").slice(0, 16);
    const csrfHeaders = { "cookie": `__csrf=${csrfToken}`, "x-csrf-token": csrfToken };
    const response = await app.fetch(multipartRequest(path, form, { ...csrfHeaders, ...idempotencyHeaders, ...headers }));
    const resBody = await response.json();
    return { response, body: wrapError(resBody) };
  };

  // ── API key helpers ──────────────────────────────────────────────
  // Default to an org-admin mock role so RBAC (`organization:update`) passes.
  const authHeaders = (organizationId: string, role = "organization_admin") => ({
    "x-standard-tenant-id": organizationId,
    "x-standard-actor-id": ids.actorId,
    "x-standard-mock-role": role,
  });

  const createApiKey = async (
    organizationId: string,
    body: { name: string; scopes: string[]; expiresAt?: string },
  ) =>
    send(
      `/api/v1/organizations/${organizationId}/api-keys`,
      "POST",
      body,
      authHeaders(organizationId),
    );

  const listApiKeys = async (organizationId: string) =>
    send(
      `/api/v1/organizations/${organizationId}/api-keys`,
      "GET",
      undefined,
      authHeaders(organizationId),
    );

  const revokeApiKey = async (organizationId: string, keyId: string) =>
    send(
      `/api/v1/organizations/${organizationId}/api-keys/${keyId}`,
      "DELETE",
      undefined,
      authHeaders(organizationId),
    );

  return { send, sendMultipart, createTenantOrg, createAssessment, createApiKey, listApiKeys, revokeApiKey, authHeaders };
};

// ─── Drizzle PGlite Integration Database Helper ───────────────────
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import * as schema from "@standard/schemas";
import fs from "node:fs";
import path from "node:path";
import { createDrizzleRepositories } from "../src/adapters";

let globalPgLite: PGlite | null = null;

export const getTestDb = async () => {
  if (globalPgLite) return globalPgLite;
  
  const client = new PGlite();
  
  let currentDir = process.cwd();
  let migrationsFolder = path.resolve(currentDir, "infra/docker/postgres/migrations");
  while (!fs.existsSync(migrationsFolder) && path.dirname(currentDir) !== currentDir) {
    currentDir = path.dirname(currentDir);
    migrationsFolder = path.resolve(currentDir, "infra/docker/postgres/migrations");
  }
  
  // Run Drizzle migrations in order
  const files = fs.readdirSync(migrationsFolder).filter(f => f.endsWith(".sql")).sort();
  for (const file of files) {
    let sql = fs.readFileSync(path.join(migrationsFolder, file), "utf8");
    if (file === "0016_poam_workflow.sql") {
      sql = sql.replace("UPDATE poam_items SET poam_code = COALESCE(poam_code, item_code) WHERE poam_code IS NULL;", "UPDATE poam_items SET poam_code = 'DEFAULT' WHERE poam_code IS NULL;");
      sql = sql.replace("UPDATE poam_items SET related_gap_finding_id = COALESCE(related_gap_finding_id, related_gap_id) WHERE related_gap_finding_id IS NULL;", "UPDATE poam_items SET related_gap_finding_id = NULL WHERE related_gap_finding_id IS NULL;");
    }
    const chunks = sql.split("--> statement-breakpoint");
    for (const chunk of chunks) {
      if (chunk.trim()) {
        await client.exec(chunk.trim());
      }
    }
  }
  
  const db = drizzle(client, { schema });
  
  // Seed basic requirement: default organization and scf version so foreign key constraints pass
  await db.insert(schema.organizations).values({
    id: ids.organizationId,
    name: "Default Test Org",
    slug: "default-test-org",
    userId: "system"
  }).onConflictDoNothing();
  
  await db.insert(schema.scfVersions).values({
    id: ids.scfVersionId,
    version: "2026.1.1",
  }).onConflictDoNothing();

  globalPgLite = client;
  return client;
};

export const createDrizzleTestClient = async () => {
  const client = await getTestDb();
  const db = drizzle(client, { schema });
  
  // Clean up dynamic tables to guarantee test isolation
  const tablesToTruncate = [
    schema.assessments,
    schema.apiKeys,
    schema.approvalEvents,
    schema.documentVersions,
    schema.documents,
    schema.gapFindings,
    schema.poamItems,
  ];
  
  for (const table of tablesToTruncate) {
    await db.delete(table);
  }
  
  const deps = createDrizzleRepositories(db as any, { STANDARD_ENV: "test" } as any);
  const app = createApp(deps, { STANDARD_ENV: "test", ALLOW_MOCK_AUTH: "true" } as any);
  
  const send = async (path: string, method = "GET", body?: unknown, headers: Record<string, string> = {}) => {
    const mutating = ["POST", "PUT", "PATCH", "DELETE"].includes(method.toUpperCase());
    const idempotencyHeaders = mutating && !headers["idempotency-key"]
      ? { "idempotency-key": crypto.randomUUID() }
      : {};
    const csrfToken = "test-csrf-token-" + crypto.randomUUID().replace(/-/g, "").slice(0, 16);
    const csrfHeaders = mutating
      ? { "cookie": `__csrf=${csrfToken}`, "x-csrf-token": csrfToken }
      : {};
    const response = await app.fetch(jsonRequest(path, method, body, { ...csrfHeaders, ...idempotencyHeaders, ...headers }));
    const resBody = await response.json();
    return { response, body: wrapError(resBody) };
  };

  return { send, db };
};


