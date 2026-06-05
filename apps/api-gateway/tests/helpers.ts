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
    const response = await app.fetch(jsonRequest(path, method, body, { ...idempotencyHeaders, ...headers }));
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
    const response = await app.fetch(multipartRequest(path, form, { ...idempotencyHeaders, ...headers }));
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

