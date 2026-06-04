import { createTestClient, ids } from "./helpers";
import { expect, test } from "./test-kit";

test("PATCH /api/v1/organizations/:id/billing - sucesso como owner", async () => {
  const client = createTestClient();
  const { organizationId } = await client.createTenantOrg();

  const { response, body } = await client.send(
    `/api/v1/organizations/${organizationId}/billing`,
    "PATCH",
    { billing_tier: "enterprise" },
    {
      "x-standard-tenant-id": organizationId,
      "x-standard-actor-id": ids.actorId,
      "authorization": "Bearer dev:owner"
    }
  );

  expect(response.status).toBe(200);
  expect(body.billing_tier).toBe("enterprise");
});

test("PATCH /api/v1/organizations/:id/billing - falha como não-owner (viewer)", async () => {
  const client = createTestClient();
  const { organizationId } = await client.createTenantOrg();

  const { response } = await client.send(
    `/api/v1/organizations/${organizationId}/billing`,
    "PATCH",
    { billing_tier: "enterprise" },
    {
      "x-standard-tenant-id": organizationId,
      "x-standard-actor-id": ids.actorId,
      "authorization": "Bearer dev:viewer"
    }
  );

  expect(response.status).toBe(403);
});

test("PATCH /api/v1/organizations/:id - atualiza nome/slug como owner com sucesso", async () => {
  const client = createTestClient();
  const { organizationId } = await client.createTenantOrg();

  const { response, body } = await client.send(
    `/api/v1/organizations/${organizationId}`,
    "PATCH",
    { name: "Updated Org Name", slug: "updated-org-slug" },
    {
      "x-standard-tenant-id": organizationId,
      "x-standard-actor-id": ids.actorId,
      "authorization": "Bearer dev:owner"
    }
  );

  expect(response.status).toBe(200);
  expect(body.name).toBe("Updated Org Name");
  expect(body.slug).toBe("updated-org-slug");
});

test("PATCH /api/v1/organizations/:id - falha ao atualizar nome/slug como não-owner (viewer)", async () => {
  const client = createTestClient();
  const { organizationId } = await client.createTenantOrg();

  const { response } = await client.send(
    `/api/v1/organizations/${organizationId}`,
    "PATCH",
    { name: "Updated Org Name", slug: "updated-org-slug" },
    {
      "x-standard-tenant-id": organizationId,
      "x-standard-actor-id": ids.actorId,
      "authorization": "Bearer dev:viewer"
    }
  );

  expect(response.status).toBe(403);
});

test("POST /api/v1/organizations/:id/invites - envia convite com sucesso", async () => {
  const client = createTestClient();
  const { organizationId } = await client.createTenantOrg();

  const { response, body } = await client.send(
    `/api/v1/organizations/${organizationId}/invites`,
    "POST",
    { email: "invitee@test.com", role: "member", display_name: "Invitee Person" },
    {
      "x-standard-tenant-id": organizationId,
      "x-standard-actor-id": ids.actorId,
      // Requires membership:manage permission which is held by admin/owner/platform_admin.
      // MockAuthProvider grants platform_admin if no header, or owner if Bearer dev:owner is used.
      "authorization": "Bearer dev:owner"
    }
  );

  expect(response.status).toBe(201);
  expect(body.email).toBe("invitee@test.com");
  expect(body.role).toBe("member");
  expect(body.status).toBe("invited");
});

test("POST /api/v1/organizations/:id/invites - falha ao enviar convite duplicado", async () => {
  const client = createTestClient();
  const { organizationId } = await client.createTenantOrg();

  // First invite
  await client.send(
    `/api/v1/organizations/${organizationId}/invites`,
    "POST",
    { email: "invitee-dup@test.com", role: "member" },
    {
      "x-standard-tenant-id": organizationId,
      "x-standard-actor-id": ids.actorId,
      "authorization": "Bearer dev:owner"
    }
  );

  // Second invite (duplicate)
  const { response } = await client.send(
    `/api/v1/organizations/${organizationId}/invites`,
    "POST",
    { email: "invitee-dup@test.com", role: "member" },
    {
      "x-standard-tenant-id": organizationId,
      "x-standard-actor-id": ids.actorId,
      "authorization": "Bearer dev:owner"
    }
  );

  expect(response.status).toBe(409);
});
