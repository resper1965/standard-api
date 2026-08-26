/**
 * @module m2m-scope-coverage.test
 * @description Guards the M2M scope surface of the API.
 *
 * scope.middleware fails closed: a protected route whose required-scope list is
 * empty returns 403 to every machine actor, whatever scopes their key holds.
 * That is correct for platform-admin and human-approval routes and wrong for
 * everything else — and for a long time it was wrong for most of the API,
 * because ROUTE_SCOPE_MAP only ever listed 39 of 390 protected routes.
 *
 * A customer hit it on GET /api/v1/scf/versions/:id/controls:
 *   "This route is protected but has no API key scopes configured.
 *    Access denied for machine-to-machine actors."
 *
 * Scopes are now derived from the `permissions` a route already declares, so
 * these tests assert the derivation holds and that the routes an API-first
 * product must expose to API keys stay reachable.
 */
import { getRequiredScopesForRoute } from "@standard/schemas";
import { routes } from "../src/app";
import { expect, test } from "./test-kit";

const scopesFor = (method: string, path: string, permissions: string[] = []) =>
  getRequiredScopesForRoute(method, path, permissions);

// ─── The route the customer was blocked on ──────────────────────────────

test("M2M scopes: GET /scf/versions/:id/controls resolves to scf:read", () => {
  const scopes = scopesFor(
    "GET",
    "/api/v1/scf/versions/:scfVersionId/controls",
    ["scf:read"],
  );
  expect(scopes).toContain("scf:read");
});

test("M2M scopes: gap evidence evaluation is reachable by an API key", () => {
  expect(
    scopesFor("POST", "/api/v1/gap/evaluate-evidence", ["evidence:run"]),
  ).toContain("gap:write");
});

// ─── Derivation rules ───────────────────────────────────────────────────

test("M2M scopes: write permissions collapse onto a single write scope", () => {
  const scopes = scopesFor("POST", "/api/v1/anything", [
    "assessment:create",
    "assessment:update",
    "assessment:delete",
  ]);
  expect(scopes).toEqual(["assessment:write"]);
});

test("M2M scopes: an explicit ROUTE_SCOPE_MAP entry wins over derivation", () => {
  // POST /mcp declares no permissions of its own and relies on the explicit map.
  const scopes = scopesFor("POST", "/mcp", []);
  expect(scopes).toContain("scf:read");
  expect(scopes).toContain("assessment:read");
});

test("M2M scopes: platform-admin permissions stay unreachable by API keys", () => {
  // admin:* has no M2M equivalent by design — an API key must not be able to
  // ban users or delete organizations.
  expect(scopesFor("GET", "/api/v1/admin/users", ["admin:read"])).toEqual([]);
  expect(
    scopesFor("DELETE", "/api/v1/admin/users/:userId", ["admin:delete"]),
  ).toEqual([]);
});

test("M2M scopes: approval gates stay unreachable by API keys", () => {
  // Approvals require a human actor (lifecycle approval gates, AGENTS.md).
  expect(
    scopesFor("POST", "/api/v1/assessments/:id/soa/approve", ["soa:approve"]),
  ).toEqual([]);
  expect(
    scopesFor("POST", "/api/v1/assessments/:id/poam/approve", ["poam:approve"]),
  ).toEqual([]);
});

// ─── Surface guard ──────────────────────────────────────────────────────

test("M2M scopes: every protected route declaring read permissions is reachable", () => {
  const unreachable: string[] = [];

  for (const route of routes) {
    const permissions = (route.permissions ?? []) as string[];
    // Only assert on routes that declare a plain read permission — those are
    // exactly the ones an API-first integration must be able to call.
    // Account management is console-only by product rule (llms.txt: only the
    // organization administrator signs in to mint API keys). A key must not be
    // able to enumerate keys or webhooks, so those are expected to be closed.
    const consoleOnly = ["admin:", "apikey:", "webhook:"];
    const readPerms = permissions.filter(
      (p) => p.endsWith(":read") && !consoleOnly.some((c) => p.startsWith(c)),
    );
    if (readPerms.length === 0) continue;

    const scopes = getRequiredScopesForRoute(
      route.method,
      route.path,
      permissions,
    );
    if (scopes.length === 0) {
      unreachable.push(`${route.method} ${route.path} [${permissions}]`);
    }
  }

  expect(
    unreachable.length === 0
      ? "all reachable"
      : `unreachable: ${unreachable.join(", ")}`,
  ).toBe("all reachable");
});

// ─── 405 vs 404 ─────────────────────────────────────────────────────────
// A customer reported GET /api/v1/organizations as "documented but 404 in
// production". The route exists — it is POST-only — and the gateway answered
// 404 for the wrong verb, which reads as "this endpoint does not exist".

test("routing: wrong verb on an existing path returns 405 with Allow", async () => {
  const { createTestClient } = await import("./helpers");
  const client = createTestClient();

  const { response } = await client.send("/api/v1/organizations", "GET");
  expect(response.status).toBe(405);
  expect(response.headers.get("Allow") ?? "").toContain("POST");
});

test("routing: an unknown path still returns 404", async () => {
  const { createTestClient } = await import("./helpers");
  const client = createTestClient();

  const { response } = await client.send("/api/v1/no-such-endpoint", "GET");
  expect(response.status).toBe(404);
});
