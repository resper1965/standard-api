import { createApp } from "../src/app";

export const ids = {
  actorId: "44444444-4444-4444-8444-444444444444",
  scfVersionId: "55555555-5555-4555-8555-555555555555"
};

export const jsonRequest = (path: string, method: string, body?: unknown, headers: Record<string, string> = {}) =>
  new Request(`https://api.test${path}`, {
    method,
    headers: {
      "content-type": "application/json",
      "x-trace-id": "trace-test-0001",
      ...headers
    },
    body: body === undefined ? undefined : JSON.stringify(body)
  });

export const multipartRequest = (path: string, form: FormData, headers: Record<string, string> = {}) =>
  new Request(`https://api.test${path}`, {
    method: "POST",
    headers: {
      "x-trace-id": "trace-test-0001",
      ...headers
    },
    body: form
  });

export const createTestClient = () => {
  const app = createApp();

  const send = async (path: string, method = "GET", body?: unknown, headers: Record<string, string> = {}) => {
    const response = await app.fetch(jsonRequest(path, method, body, headers));
    return { response, body: await response.json() as any };
  };

  const createTenantOrg = async () => {
    const tenantResult = await send("/api/v1/tenants", "POST", { slug: "tenant-test", name: "Tenant Test" }, {
      "x-aegis-actor-id": ids.actorId
    });
    const tenantId = tenantResult.body.tenant_id as string;
    const orgResult = await send("/api/v1/organizations", "POST", {
      tenant_id: tenantId,
      slug: "org-test",
      name: "Org Test"
    }, {
      "x-aegis-tenant-id": tenantId,
      "x-aegis-actor-id": ids.actorId
    });

    return {
      tenantId,
      organizationId: orgResult.body.organization_id as string
    };
  };

  const createAssessment = async (documentCount = 0) => {
    const { tenantId, organizationId } = await createTenantOrg();
    const result = await send("/api/v1/assessments", "POST", {
      organization_id: organizationId,
      name: "Assessment Test",
      scf_version_id: ids.scfVersionId,
      document_count: documentCount
    }, {
      "x-aegis-tenant-id": tenantId,
      "x-aegis-actor-id": ids.actorId
    });

    return {
      tenantId,
      organizationId,
      assessmentId: result.body.assessment_id as string,
      body: result.body
    };
  };

  const sendMultipart = async (path: string, form: FormData, headers: Record<string, string> = {}) => {
    const response = await app.fetch(multipartRequest(path, form, headers));
    return { response, body: await response.json() as any };
  };

  return { send, sendMultipart, createTenantOrg, createAssessment };
};
