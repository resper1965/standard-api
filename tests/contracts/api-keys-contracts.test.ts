/**
 * API Key golden-path contract tests.
 *
 * These exercise the real HTTP edge (createApp + app.fetch) against the
 * in-memory adapters — no DB, no external infra. They guard the exact class
 * of regression that previously only surfaced in the browser:
 *   - create key returning a one-time raw key (201)
 *   - the created key appearing in the list
 *   - revoke flipping status to revoked
 *   - cross-tenant isolation on the keys collection
 *   - RBAC: a read-only role cannot mint keys
 */
import { createTestClient } from "../../apps/api-gateway/tests/helpers";
import { expect, test } from "../test-kit";

test("create API key returns a one-time raw key (201)", async () => {
  const client = createTestClient();
  const { organizationId } = await client.createTenantOrg();

  const res = await client.createApiKey(organizationId, {
    name: "CI Test Key",
    scopes: ["assessment:read"],
  });

  expect(res.response.status).toBe(201);
  expect(res.body.data).toBeDefined();
  expect(res.body.data.id).toBeDefined();
  // The raw key is returned exactly once on creation.
  expect(typeof res.body.data.key).toBe("string");
  expect(res.body.data.key.startsWith("standard_live_")).toBe(true);
});

test("created key appears in the list (masked)", async () => {
  const client = createTestClient();
  const { organizationId } = await client.createTenantOrg();

  const created = await client.createApiKey(organizationId, {
    name: "Listed Key",
    scopes: ["assessment:read"],
  });
  const keyId = created.body.data.id as string;

  const list = await client.listApiKeys(organizationId);
  expect(list.response.status).toBe(200);
  const found = (list.body.data as Array<{ id: string }>).some(
    (k) => k.id === keyId,
  );
  expect(found).toBe(true);
});

test("revoke flips the key status to revoked", async () => {
  const client = createTestClient();
  const { organizationId } = await client.createTenantOrg();

  const created = await client.createApiKey(organizationId, {
    name: "Revoke Me",
    scopes: ["assessment:read"],
  });
  const keyId = created.body.data.id as string;

  const revoke = await client.revokeApiKey(organizationId, keyId);
  expect(revoke.response.status).toBe(200);

  const list = await client.listApiKeys(organizationId);
  const row = (
    list.body.data as Array<{
      id: string;
      status?: string;
      revokedAt?: string | null;
    }>
  ).find((k) => k.id === keyId);
  expect(row).toBeDefined();
  // Either an explicit status or a revokedAt timestamp marks it revoked.
  const isRevoked = row!.status === "revoked" || Boolean(row!.revokedAt);
  expect(isRevoked).toBe(true);
});

test("[SECURITY] keys are isolated per tenant", async () => {
  const client = createTestClient();
  const a = await client.createTenantOrg();
  const b = await client.createTenantOrg();

  const created = await client.createApiKey(a.organizationId, {
    name: "Tenant A Key",
    scopes: ["assessment:read"],
  });
  expect(created.response.status).toBe(201);

  // Tenant B trying to list Tenant A's org keys must not see them.
  const crossList = await client.send(
    `/api/v1/organizations/${a.organizationId}/api-keys`,
    "GET",
    undefined,
    client.authHeaders(b.organizationId),
  );
  // Acceptable: 403 (forbidden) or 200 with no Tenant A keys leaked.
  if (crossList.response.status === 200) {
    const leaked = (crossList.body.data as Array<{ id: string }>).some(
      (k) => k.id === created.body.data.id,
    );
    if (leaked) {
      throw new Error(
        "CRITICAL: Tenant B listed Tenant A's API keys — cross-tenant leakage!",
      );
    }
  } else {
    expect(crossList.response.status).toBe(403);
  }
});

test("[RBAC] a read-only role cannot mint API keys", async () => {
  const client = createTestClient();
  const { organizationId } = await client.createTenantOrg();

  const res = await client.send(
    `/api/v1/organizations/${organizationId}/api-keys`,
    "POST",
    { name: "Should Fail", scopes: ["assessment:read"] },
    {
      ...client.authHeaders(organizationId, "auditor_readonly"),
      authorization: "Bearer dev:auditor_readonly",
    },
  );

  expect(res.response.status).toBe(403);
});
