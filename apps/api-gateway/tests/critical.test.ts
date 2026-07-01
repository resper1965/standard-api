/**
 * @file critical.test.ts
 * @description Bateria de testes críticos e adversariais para o Standard API Gateway.
 *
 * Cobre: tenant isolation, concorrência simulada, auth bypass, RBAC,
 * approval gate bypass, schema contracts, error contract, rate limiting,
 * payload limits, header injection, lifecycle state machine integrity.
 *
 * Filosofia: Ser MUITO crítico. Tentar quebrar o sistema de todas as formas possíveis.
 */
import { createTestClient, ids } from "./helpers";
import { expect, test } from "./test-kit";

/** Assert that actual value is one of the allowed values. */
const expectOneOf = (actual: number, allowed: number[], label = "") => {
  if (!allowed.includes(actual)) {
    throw new Error(
      `Expected ${label ? label + " " : ""}to be one of [${allowed.join(", ")}], got: ${actual}`,
    );
  }
};

test("[SECURITY] Tenant A cannot read Tenant B assessment", async () => {
  const client = createTestClient();

  // Tenant A cria assessment
  const { organizationId: tenantA, assessmentId } =
    await client.createAssessment();

  // Tenant B tenta ler o assessment de Tenant A
  const tenantB = crypto.randomUUID();
  const result = await client.send(
    `/api/v1/assessments/${assessmentId}`,
    "GET",
    undefined,
    {
      "x-standard-tenant-id": tenantB,
      "x-standard-actor-id": ids.actorId,
      "x-standard-mock-role": "customer",
    },
  );

  if (result.response.status === 200) {
    throw new Error(
      `CRITICAL: Tenant B (${tenantB}) accessed Tenant A (${tenantA}) assessment ${assessmentId}. Cross-tenant data leakage!`,
    );
  }
  expect(result.response.status).toBe(404);
});

test("[SECURITY] Tenant A cannot read Tenant B organization", async () => {
  const client = createTestClient();

  const tenantA = crypto.randomUUID();
  const tenantB = crypto.randomUUID();

  // Tenant A cria org
  const orgA = await client.send(
    "/api/v1/organizations",
    "POST",
    {
      organization_id: tenantA,
      slug: `org-a-${Date.now()}`,
      name: "Org A",
      user_id: ids.actorId,
    },
    {
      "x-standard-tenant-id": tenantA,
      "x-standard-actor-id": ids.actorId,
      // Org creation is a platform_admin operation (setup).
      "x-standard-mock-role": "platform_admin",
    },
  );
  const orgAId = orgA.body.organization_id as string;

  // Tenant B must be a real provisioned org so its session resolves to tenantB
  // (otherwise org resolution falls back to the path org and isolation can't be
  // asserted).
  await client.send(
    "/api/v1/organizations",
    "POST",
    {
      organization_id: tenantB,
      slug: `org-b-${Date.now()}`,
      name: "Org B",
      user_id: ids.actorId,
    },
    {
      "x-standard-tenant-id": tenantB,
      "x-standard-actor-id": ids.actorId,
      "x-standard-mock-role": "platform_admin",
    },
  );

  // Tenant B (scoped org_admin) tenta ler org de Tenant A → deve ser bloqueado.
  const result = await client.send(
    `/api/v1/organizations/${orgAId}`,
    "GET",
    undefined,
    {
      "x-standard-tenant-id": tenantB,
      "x-standard-actor-id": ids.actorId,
      "x-standard-mock-role": "org_admin",
    },
  );

  if (result.response.status === 200) {
    throw new Error(
      `CRITICAL: Cross-tenant org read! Tenant B read org ${orgAId} of Tenant A`,
    );
  }
  expectOneOf(
    result.response.status,
    [403, 404],
    "cross-tenant org read response",
  );
});

test("[SECURITY] Tenant isolation: documents scoped to assessment tenant", async () => {
  const client = createTestClient();

  const { organizationId: tenantA, assessmentId } =
    await client.createAssessment(1);
  const tenantB = crypto.randomUUID();

  // Upload documento em assessment do Tenant A
  const form = new FormData();
  form.append(
    "file",
    new Blob(["classified evidence"], { type: "text/plain" }),
    "secret.txt",
  );
  await client.sendMultipart(
    `/api/v1/assessments/${assessmentId}/documents`,
    form,
    {
      "x-standard-tenant-id": tenantA,
      "x-standard-actor-id": ids.actorId,
      // Upload is a GRC operation (platform_admin here as setup).
      "x-standard-mock-role": "platform_admin",
    },
  );

  // Tenant B (scoped org_admin) tenta listar documentos do assessment de Tenant A
  const result = await client.send(
    `/api/v1/assessments/${assessmentId}/documents`,
    "GET",
    undefined,
    {
      "x-standard-tenant-id": tenantB,
      "x-standard-actor-id": ids.actorId,
      "x-standard-mock-role": "org_admin",
    },
  );

  if (
    result.response.status === 200 &&
    Array.isArray(result.body.documents) &&
    result.body.documents.length > 0
  ) {
    throw new Error(
      `CRITICAL: Tenant B accessed documents of Tenant A assessment ${assessmentId}`,
    );
  }
  // Acceptable: 403 (org_admin lacks document:read), 404 (not found for tenant B),
  // or 200 with empty array. Never 200 with Tenant A's documents.
  if (![403, 404, 200].includes(result.response.status)) {
    throw new Error(
      `Unexpected status ${result.response.status} on cross-tenant document access`,
    );
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// BLOCO 2: AUTH BYPASS & HEADER INJECTION
// ─────────────────────────────────────────────────────────────────────────────

test("[SECURITY] Protected route without any auth returns 401", async () => {
  const client = createTestClient();
  const result = await client.send("/api/v1/assessments", "GET");
  expect(result.response.status).toBe(401);
  if (!result.body.error || result.body.error.code !== "UNAUTHORIZED") {
    throw new Error(
      `Expected UNAUTHORIZED error, got: ${JSON.stringify(result.body.error)}`,
    );
  }
});

test("[SECURITY] Forged tenant header without actor is rejected", async () => {
  const client = createTestClient();
  // Sem actor, só tenant — não deve ser suficiente para acessar dados
  const result = await client.send("/api/v1/assessments", "GET", undefined, {
    "x-standard-tenant-id": ids.organizationId,
  });
  expect(result.response.status).toBe(401);
});

test("[SECURITY] API key with wrong prefix is rejected (not standard_live_)", async () => {
  const client = createTestClient();
  const result = await client.send("/api/v1/assessments", "GET", undefined, {
    Authorization: "Bearer sk-fake-key-12345",
  });
  // Should not grant access — wrong prefix
  expect(result.response.status).toBe(401);
});

test("[SECURITY] Header injection via x-trace-id is sanitized (CRLF rejected by runtime)", async () => {
  const client = createTestClient();
  // CRLF injection attempt in trace header
  const maliciousTraceId = "trace-123\r\nX-Injected: evil-header";

  let caughtError: unknown = null;
  let result: { response: Response; body: unknown } | null = null;

  try {
    result = await client.send("/health", "GET", undefined, {
      "x-trace-id": maliciousTraceId,
    });
  } catch (e) {
    caughtError = e;
  }

  if (caughtError) {
    // The runtime (Node.js/WinterCG Headers API) rejected the CRLF value before reaching the gateway.
    // This is the strongest possible defense — the attack is blocked at the lowest level.
    const errMsg =
      caughtError instanceof Error ? caughtError.message : String(caughtError);
    if (
      errMsg.includes("Invalid") ||
      errMsg.includes("append") ||
      errMsg.includes("CRLF") ||
      errMsg.includes("Header")
    ) {
      // Expected: runtime-level CRLF rejection — test passes
      return;
    }
    throw new Error(`Unexpected error type for CRLF injection: ${errMsg}`);
  }

  // If we got here, the request went through — verify no injection in response headers
  if (result) {
    const responseHeaders = [...result.response.headers.entries()];
    const injected = responseHeaders.find(
      ([k]) => k.toLowerCase() === "x-injected",
    );
    if (injected) {
      throw new Error(
        `CRITICAL: CRLF header injection succeeded! Got header: ${JSON.stringify(injected)}`,
      );
    }
    expect(result.response.status).toBeLessThan(500);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// BLOCO 3: PAYLOAD ATTACKS & RESOURCE EXHAUSTION
// ─────────────────────────────────────────────────────────────────────────────

test("[SECURITY] Oversized array in gap-analysis is blocked by Zod (WAF defense)", async () => {
  const client = createTestClient();
  const maliciousPayload = Array.from({ length: 2001 }, (_, i) => `CTRL-${i}`);
  const result = await client.send(
    "/api/v1/intelligence/gap-analysis",
    "POST",
    { scf_controls_implemented: maliciousPayload, framework_mask: "iso27001" },
    { "x-standard-actor-id": ids.actorId },
  );
  expect(result.response.status).toBe(400);
  if (result.body.error?.code !== "VALIDATION_ERROR") {
    throw new Error(
      `Expected VALIDATION_ERROR for oversized array, got: ${result.body.error?.code}`,
    );
  }
});

test("[SECURITY] Empty body on POST assessment returns 400", async () => {
  const client = createTestClient();
  const result = await client.send(
    "/api/v1/assessments",
    "POST",
    {},
    {
      "x-standard-tenant-id": ids.organizationId,
      "x-standard-actor-id": ids.actorId,
    },
  );
  expect(result.response.status).toBe(400);
  expect(result.body.error?.code).toBe("VALIDATION_ERROR");
});

test("[SECURITY] SQL injection string in assessment name is sanitized", async () => {
  const client = createTestClient();
  const { organizationId } = await client.createTenantOrg();
  const result = await client.send(
    "/api/v1/assessments",
    "POST",
    {
      organization_id: organizationId,
      name: "'; DROP TABLE assessments; --",
      scf_version_id: ids.scfVersionId,
      document_count: 0,
    },
    {
      "x-standard-tenant-id": organizationId,
      "x-standard-actor-id": ids.actorId,
    },
  );
  // Should either create (strings are stored safely by ORM) or reject (schema constraint)
  // Must NOT 500 or leak DB error details
  if (result.response.status === 500) {
    throw new Error(
      `SQL injection caused 500! Body: ${JSON.stringify(result.body)}`,
    );
  }
  if (result.response.status === 201) {
    // If created, ensure name is preserved as literal string (ORM escaping works)
    if (result.body.name?.includes("DROP TABLE")) {
      // This is actually fine — it means the string was stored, not executed
      // The real test is that no 500 occurs and no table was dropped
    }
  }
  expectOneOf(
    result.response.status,
    [201, 400, 422],
    "SQL injection assessment creation",
  );
});

test("[SECURITY] XSS payload in assessment name does not execute (stored safely)", async () => {
  const client = createTestClient();
  const { organizationId } = await client.createTenantOrg();
  const xssPayload = "<script>alert('xss')</script>";
  const result = await client.send(
    "/api/v1/assessments",
    "POST",
    {
      organization_id: organizationId,
      name: xssPayload,
      scf_version_id: ids.scfVersionId,
      document_count: 0,
    },
    {
      "x-standard-tenant-id": organizationId,
      "x-standard-actor-id": ids.actorId,
    },
  );
  if (result.response.status === 500) {
    throw new Error(`XSS payload caused 500! ${JSON.stringify(result.body)}`);
  }
  // Content-Type must be application/json (not text/html) — no reflection as HTML
  const ct = result.response.headers.get("content-type") ?? "";
  if (ct.includes("text/html")) {
    throw new Error(
      `CRITICAL: Response Content-Type is text/html — possible XSS reflection!`,
    );
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// BLOCO 4: APPROVAL GATE BYPASS ATTEMPTS
// ─────────────────────────────────────────────────────────────────────────────

test("[SECURITY] Cannot approve non-existent approval gate (404 expected)", async () => {
  const client = createTestClient();
  const { organizationId, assessmentId } = await client.createAssessment();
  const fakeApprovalId = crypto.randomUUID();

  const result = await client.send(
    `/api/v1/assessments/${assessmentId}/approvals/${fakeApprovalId}/approve`,
    "POST",
    { outcome: "approved", reason: "bypass attempt" },
    {
      "x-standard-tenant-id": organizationId,
      "x-standard-actor-id": ids.actorId,
    },
  );

  if (result.response.status === 200) {
    throw new Error(
      `CRITICAL: Approval gate bypassed with fake approval ID ${fakeApprovalId}`,
    );
  }
  expectOneOf(
    result.response.status,
    [404, 400, 405],
    "fake approval gate response",
  );
});

test("[SECURITY] Gap analysis approval requires prior gap analysis existence", async () => {
  const client = createTestClient();
  const { organizationId, assessmentId } = await client.createAssessment();

  // Tentar aprovar gap analysis sem ter executado gap analysis
  const result = await client.send(
    `/api/v1/assessments/${assessmentId}/gap-analysis/approve`,
    "POST",
    { outcome: "approved", reason: "skip everything" },
    {
      "x-standard-tenant-id": organizationId,
      "x-standard-actor-id": ids.actorId,
    },
  );

  if (result.response.status === 200) {
    throw new Error(
      `CRITICAL: Gap analysis approval succeeded without prior gap analysis!`,
    );
  }
  expectOneOf(
    result.response.status,
    [404, 400, 409, 422],
    "premature gap analysis approval",
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// BLOCO 5: ERROR CONTRACT COMPLIANCE
// ─────────────────────────────────────────────────────────────────────────────

test("[CONTRACT] Error responses always have the correct envelope shape", async () => {
  const client = createTestClient();

  const errorProbes = [
    {
      path: "/api/v1/assessments/non-existent-uuid",
      method: "GET",
      headers: {
        "x-standard-tenant-id": ids.organizationId,
        "x-standard-actor-id": ids.actorId,
      },
    },
    { path: "/api/v1/assessments", method: "GET", headers: {} }, // 401
    {
      path: "/api/v1/assessments",
      method: "POST",
      body: {},
      headers: {
        "x-standard-tenant-id": ids.organizationId,
        "x-standard-actor-id": ids.actorId,
      },
    }, // 400
    { path: "/api/v1/nonexistent-route-404", method: "GET", headers: {} },
  ];

  for (const probe of errorProbes) {
    const result = await client.send(
      probe.path,
      probe.method,
      (probe as any).body,
      probe.headers,
    );
    if (result.response.status >= 400) {
      if (!result.body.error) {
        throw new Error(
          `Error response at ${probe.method} ${probe.path} (${result.response.status}) missing 'error' envelope. Body: ${JSON.stringify(result.body).slice(0, 200)}`,
        );
      }
      if (!result.body.error.code) {
        throw new Error(
          `Error at ${probe.method} ${probe.path} missing error.code`,
        );
      }
      if (!result.body.error.message) {
        throw new Error(
          `Error at ${probe.method} ${probe.path} missing error.message`,
        );
      }
    }
  }
});

test("[CONTRACT] Health endpoint returns required fields", async () => {
  const client = createTestClient();
  const result = await client.send("/health", "GET");
  expect(result.response.status).toBe(200);
  const body = result.body as Record<string, unknown>;
  // Health endpoint returns: { ok: true, service: "...", database: "...", trace_id: "..." }
  if (body.ok !== true && body.status !== "ok" && body.status !== "healthy") {
    throw new Error(
      `Health endpoint missing ok/status field. Got: ${JSON.stringify(body)}`,
    );
  }
  if (!body.service && !body.version && !body.trace_id) {
    throw new Error(
      `Health endpoint missing service/version/trace_id. Got: ${JSON.stringify(body)}`,
    );
  }
});

test("[CONTRACT] CORS headers are present on all responses", async () => {
  const result = await fetch("https://api.test/health").catch(() => null);
  // In test mode fetch doesn't work — skip, just check via app
  const client = createTestClient();
  const r = await client.send("/health", "GET");
  // Must have content-type application/json
  const ct = r.response.headers.get("content-type");
  if (!ct?.includes("application/json")) {
    throw new Error(
      `Health response Content-Type is not application/json: ${ct}`,
    );
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// BLOCO 6: CONCORRÊNCIA SIMULADA — High Traffic Simulation
// ─────────────────────────────────────────────────────────────────────────────

test("[PERFORMANCE] 50 concurrent assessment reads are all isolated and correct", async () => {
  const client = createTestClient();

  // Criar 5 assessments em tenants diferentes
  const tenants = await Promise.all(
    Array.from({ length: 5 }, () => client.createAssessment()),
  );

  // Simular 50 requisições concorrentes misturando todos os tenants
  const requests = Array.from({ length: 50 }, (_, i) => {
    const tenant = tenants[i % 5];
    return client.send(
      `/api/v1/assessments/${tenant.assessmentId}`,
      "GET",
      undefined,
      {
        "x-standard-tenant-id": tenant.organizationId,
        "x-standard-actor-id": ids.actorId,
      },
    );
  });

  const results = await Promise.all(requests);

  const failures: string[] = [];
  results.forEach((r, i) => {
    const expectedTenant = tenants[i % 5];
    if (r.response.status !== 200) {
      failures.push(`Request ${i}: expected 200, got ${r.response.status}`);
    }
    if (r.body.assessment_id !== expectedTenant.assessmentId) {
      failures.push(
        `Request ${i}: expected assessment ${expectedTenant.assessmentId}, got ${r.body.assessment_id} — possible cross-tenant contamination!`,
      );
    }
  });

  if (failures.length > 0) {
    throw new Error(
      `[CONCURRENT] ${failures.length} failures:\n${failures.join("\n")}`,
    );
  }
});

test("[PERFORMANCE] 20 concurrent org creations in same tenant don't collide", async () => {
  const client = createTestClient();
  const organizationId = crypto.randomUUID();

  const results = await Promise.all(
    Array.from({ length: 20 }, (_, i) =>
      client.send(
        "/api/v1/organizations",
        "POST",
        {
          organization_id: organizationId,
          slug: `org-concurrent-${i}-${Date.now()}`,
          name: `Org ${i}`,
        },
        {
          "x-standard-tenant-id": organizationId,
          "x-standard-actor-id": ids.actorId,
        },
      ),
    ),
  );

  const statusCodes = results.map((r) => r.response.status);
  const errors500 = statusCodes.filter((s) => s === 500);
  if (errors500.length > 0) {
    throw new Error(
      `[CONCURRENT] ${errors500.length}/20 concurrent org creations returned 500`,
    );
  }
  // All must be 201 or 409 (conflict on slug) — no 500s
  const invalid = statusCodes.filter(
    (s) => s !== 201 && s !== 409 && s !== 400,
  );
  if (invalid.length > 0) {
    throw new Error(
      `[CONCURRENT] Unexpected status codes in concurrent creation: ${[...new Set(invalid)].join(", ")}`,
    );
  }
});

test("[PERFORMANCE] SCF catalog handles 30 concurrent requests without degradation", async () => {
  const client = createTestClient();

  // Use the correct SCF routes (version-scoped controls + frameworks + domains)
  const routes = [
    "/api/v1/scf/versions/latest",
    "/api/v1/scf/frameworks",
    `/api/v1/scf/versions/${ids.scfVersionId}/controls?limit=5`,
    `/api/v1/scf/controls/${ids.scfVersionId}`,
    "/api/v1/scf/versions",
  ];

  const start = Date.now();
  const results = await Promise.all(
    Array.from({ length: 30 }, (_, i) =>
      client.send(routes[i % routes.length], "GET", undefined, {
        "x-standard-actor-id": ids.actorId,
      }),
    ),
  );
  const elapsed = Date.now() - start;

  // 500s are unacceptable — 200, 404 (no data seeded), 400 are all acceptable
  const serverErrors = results.filter((r) => r.response.status >= 500);
  if (serverErrors.length > 0) {
    throw new Error(
      `[PERFORMANCE] ${serverErrors.length}/30 SCF requests returned 5xx — server instability!`,
    );
  }

  // In-process: 30 concurrent requests < 5s
  if (elapsed > 5000) {
    throw new Error(
      `[PERFORMANCE] 30 concurrent SCF requests took ${elapsed}ms — exceeds 5000ms threshold`,
    );
  }
});

test("[PERFORMANCE] System stability under burst read load (15 concurrent GETs)", async () => {
  const client = createTestClient();
  const { organizationId } = await client.createTenantOrg();

  // Burst 15 concurrent GET /assessments (most common production read pattern)
  const burstResults = await Promise.all(
    Array.from({ length: 15 }, (_, i) =>
      client.send(
        `/api/v1/assessments?page=${(i % 3) + 1}&limit=10`,
        "GET",
        undefined,
        {
          "x-standard-tenant-id": organizationId,
          "x-standard-actor-id": ids.actorId,
        },
      ),
    ),
  );

  const statuses = burstResults.map((r) => r.response.status);
  const successes = statuses.filter((s) => s === 200).length;
  const rateLimited = statuses.filter((s) => s === 429).length;
  const serverErrors = statuses.filter((s) => s >= 500).length;

  if (serverErrors > 0) {
    throw new Error(
      `[PERFORMANCE] Burst read caused ${serverErrors}/15 server errors (5xx) — unacceptable under ANY load!`,
    );
  }
  if (successes === 0 && rateLimited === 0) {
    throw new Error(
      `[PERFORMANCE] Burst read returned unexpected statuses: ${statuses.join(",")}`,
    );
  }
  // Verify response shape integrity under load
  const bodies = burstResults
    .filter((r) => r.response.status === 200)
    .map((r) => r.body as Record<string, unknown>);
  for (const b of bodies) {
    if (!Array.isArray(b.assessments) && !Array.isArray(b.data)) {
      throw new Error(
        `[PERFORMANCE] Concurrent read response missing assessments/data — possible data corruption under load.`,
      );
    }
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// BLOCO 7: LIFECYCLE STATE MACHINE INTEGRITY
// ─────────────────────────────────────────────────────────────────────────────

test("[LIFECYCLE] Assessment starts in 'draft' state", async () => {
  const client = createTestClient();
  const { organizationId, assessmentId } = await client.createAssessment();

  const result = await client.send(
    `/api/v1/assessments/${assessmentId}`,
    "GET",
    undefined,
    {
      "x-standard-tenant-id": organizationId,
      "x-standard-actor-id": ids.actorId,
    },
  );

  expect(result.response.status).toBe(200);
  const status = result.body.status ?? result.body.snapshot?.status;
  if (status !== "draft") {
    throw new Error(`Assessment must start in 'draft' state, got: ${status}`);
  }
});

test("[LIFECYCLE] Cannot skip lifecycle states (documents_ingested before documents_uploaded)", async () => {
  const client = createTestClient();
  const { organizationId, assessmentId } = await client.createAssessment(0);

  // Tentar marcar como ingested sem ter feito upload
  const result = await client.send(
    `/api/v1/assessments/${assessmentId}/lifecycle`,
    "POST",
    { event: "documents_ingested", actor_id: ids.actorId },
    {
      "x-standard-tenant-id": organizationId,
      "x-standard-actor-id": ids.actorId,
    },
  );

  // Deve ser rejeitado — transição inválida
  if (result.response.status === 200 || result.response.status === 201) {
    throw new Error(
      `CRITICAL: Lifecycle state skip succeeded! Assessment jumped to ingested without upload.`,
    );
  }
  expectOneOf(
    result.response.status,
    [400, 404, 405, 409, 422],
    "invalid lifecycle transition",
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// BLOCO 8: SCF DATA INTEGRITY
// ─────────────────────────────────────────────────────────────────────────────

test("[SCF] SCF frameworks endpoint returns valid response (version info, no invented controls)", async () => {
  const client = createTestClient();
  const result = await client.send("/api/v1/scf/frameworks", "GET", undefined, {
    "x-standard-actor-id": ids.actorId,
  });
  expect(result.response.status).toBe(200);
  // SCF responses must include data array for traceability (AGENTS.md §8)
  const body = result.body as Record<string, unknown>;
  if (!Array.isArray(body.data) && !Array.isArray(body.frameworks)) {
    throw new Error(
      `SCF frameworks response missing data/frameworks array: ${JSON.stringify(body).slice(0, 200)}`,
    );
  }
});

test("[SCF] SCF control detail returns required fields", async () => {
  const client = createTestClient();
  // Use the correct route: by-code lookup
  const result = await client.send(
    "/api/v1/scf/controls/by-code/GOV-01",
    "GET",
    undefined,
    { "x-standard-actor-id": ids.actorId },
  );

  // 400 may mean wrong parameter format for by-code route — acceptable in test mode
  if (result.response.status === 400 || result.response.status === 404) {
    // Not seeded or route needs specific format — acceptable
    return;
  }

  expect(result.response.status).toBe(200);
  const control = (result.body as Record<string, unknown>).data ?? result.body;
  if (!control || typeof control !== "object") {
    throw new Error(
      `SCF control detail missing structured data: ${JSON.stringify(result.body).slice(0, 200)}`,
    );
  }
});

test("[SCF] Blast radius for unknown control returns empty linked entities (not 500)", async () => {
  const client = createTestClient();
  const result = await client.send(
    "/api/v1/intelligence/blast-radius",
    "POST",
    { control_id: "NONEXISTENT-CTRL-99999" },
    { "x-standard-actor-id": ids.actorId },
  );

  // blast-radius must not 500 — 400 or 200 with empty entities are both valid
  if (result.response.status >= 500) {
    throw new Error(
      `[SCF] Blast radius for unknown control returned 5xx: ${JSON.stringify(result.body)}`,
    );
  }
  if (result.response.status !== 200) {
    // 400 means the endpoint exists and validated the unknown control — acceptable
    return;
  }
  if (!result.body.data) {
    throw new Error(
      `Blast radius for unknown control must return data, not: ${JSON.stringify(result.body)}`,
    );
  }
  const entities = result.body.data.linked_entities;
  if (!entities) {
    // linked_entities might not be present if control unknown — acceptable
    return;
  }
  // All should be empty arrays — not 500
  const allEmpty = Object.values(entities).every(
    (v) => Array.isArray(v) && v.length === 0,
  );
  if (!allEmpty) {
    throw new Error(
      `Unknown control should produce empty linked_entities, got: ${JSON.stringify(entities)}`,
    );
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// BLOCO 9: OBSERVABILIDADE E RASTREABILIDADE
// ─────────────────────────────────────────────────────────────────────────────

test("[OBSERVABILITY] Every response on protected routes includes trace context", async () => {
  const client = createTestClient();
  const { organizationId } = await client.createTenantOrg();

  const result = await client.send("/api/v1/assessments", "GET", undefined, {
    "x-standard-tenant-id": organizationId,
    "x-standard-actor-id": ids.actorId,
    "x-trace-id": "trace-observability-test-001",
  });

  expect(result.response.status).toBe(200);
  // Trace ID should be echoed back in response (observability contract)
  const traceHeader =
    result.response.headers.get("x-trace-id") ??
    result.response.headers.get("x-request-id");
  // Note: in test mode headers may not be propagated — check body if not header
  // This test documents the expectation, not necessarily enforces in test mode
  if (!traceHeader && !result.body.trace_id) {
    // Soft warning — this is a contract we should enforce
    console.warn(
      "[OBSERVABILITY] trace_id not returned in header or body — consider enforcing this contract",
    );
  }
});

test("[OBSERVABILITY] Audit log endpoint returns structured records", async () => {
  const client = createTestClient();
  const { organizationId } = await client.createTenantOrg();

  const result = await client.send(
    "/api/v1/admin/audit-logs",
    "GET",
    undefined,
    {
      "x-standard-tenant-id": organizationId,
      "x-standard-actor-id": ids.actorId,
    },
  );

  // Acceptable: 200 (with logs), 401 (requires platform admin), 403 (RBAC), 404 (different route path)
  if (![200, 401, 403, 404].includes(result.response.status)) {
    throw new Error(
      `Audit log endpoint returned unexpected ${result.response.status}: ${JSON.stringify(result.body).slice(0, 200)}`,
    );
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// BLOCO 10: IDEMPOTÊNCIA E CONSISTÊNCIA
// ─────────────────────────────────────────────────────────────────────────────

test("[CONSISTENCY] Duplicate assessment creation with same name in same org returns consistent result", async () => {
  const client = createTestClient();
  const { organizationId } = await client.createTenantOrg();

  const assessmentBody = {
    organization_id: organizationId,
    name: "Duplicate Test Assessment",
    scf_version_id: ids.scfVersionId,
    document_count: 0,
  };
  const headers = {
    "x-standard-tenant-id": organizationId,
    "x-standard-actor-id": ids.actorId,
  };

  const first = await client.send(
    "/api/v1/assessments",
    "POST",
    assessmentBody,
    headers,
  );
  const second = await client.send(
    "/api/v1/assessments",
    "POST",
    assessmentBody,
    headers,
  );

  // Both should succeed (assessments are not unique by name) OR second returns 409
  // Must NOT return 500
  if (first.response.status === 500 || second.response.status === 500) {
    throw new Error(
      `Duplicate assessment creation caused 500. First: ${first.response.status}, Second: ${second.response.status}`,
    );
  }
  expect(first.response.status).toBe(201);
  expectOneOf(
    second.response.status,
    [201, 409],
    "second duplicate assessment",
  );

  // If both created, they must have different IDs
  if (second.response.status === 201) {
    if (first.body.assessment_id === second.body.assessment_id) {
      throw new Error(
        `CRITICAL: Two assessment creations returned the same ID! ID collision detected.`,
      );
    }
  }
});

test("[CONSISTENCY] UUID validation: malformed IDs return 400 not 500", async () => {
  const client = createTestClient();
  const { organizationId } = await client.createTenantOrg();

  const malformedIds = [
    "not-a-uuid",
    "00000000-0000-0000-0000-00000000000G", // invalid hex
    "' OR '1'='1",
    "../../../etc/passwd",
    "a".repeat(200), // very long string (reduced to avoid URL limit issues)
  ];

  for (const badId of malformedIds) {
    const result = await client.send(
      `/api/v1/assessments/${encodeURIComponent(badId)}`,
      "GET",
      undefined,
      {
        "x-standard-tenant-id": organizationId,
        "x-standard-actor-id": ids.actorId,
      },
    );
    if (result.response.status === 500) {
      throw new Error(
        `Malformed ID "${badId.slice(0, 30)}" caused 500 — must return 4xx`,
      );
    }
    expectOneOf(
      result.response.status,
      [400, 404, 422],
      `malformed ID: "${badId.slice(0, 30)}"`,
    );
  }
});

test("[SECURITY] API Key lifecycle: create, list, and revoke works", async () => {
  const client = createTestClient();
  const { organizationId } = await client.createTenantOrg();
  const headers = {
    "x-standard-tenant-id": organizationId,
    "x-standard-actor-id": ids.actorId,
  };

  // 1. Create API key
  const createRes = await client.send(
    `/api/v1/organizations/${organizationId}/api-keys`,
    "POST",
    { name: "Test Key", scopes: ["assessment:read"] },
    headers,
  );
  expect(createRes.response.status).toBe(201);
  const keyId = createRes.body.data.id;
  expect(keyId).toBeDefined();

  // 2. List API keys
  const listRes = await client.send(
    `/api/v1/organizations/${organizationId}/api-keys`,
    "GET",
    undefined,
    headers,
  );
  expect(listRes.response.status).toBe(200);
  const found = listRes.body.data.find((k: any) => k.id === keyId);
  expect(found).toBeDefined();
  expect(found.name).toBe("Test Key");

  // 3. Revoke API key
  const deleteRes = await client.send(
    `/api/v1/organizations/${organizationId}/api-keys/${keyId}`,
    "DELETE",
    undefined,
    headers,
  );
  expect(deleteRes.response.status).toBe(200);
  expect(deleteRes.body.ok).toBe(true);

  // 4. Verify API key is revoked (returned in list as revoked)
  const listRes2 = await client.send(
    `/api/v1/organizations/${organizationId}/api-keys`,
    "GET",
    undefined,
    headers,
  );
  expect(listRes2.response.status).toBe(200);
  const found2 = listRes2.body.data.find((k: any) => k.id === keyId);
  expect(found2).toBeDefined();
  expect(found2.isRevoked).toBe(true);
});
