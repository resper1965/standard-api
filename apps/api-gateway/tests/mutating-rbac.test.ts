/**
 * @module mutating-rbac.test
 * @description Guards that state-changing routes declare an authorization rule.
 *
 * `assertRbac` returns early when a route declares no `permissions`:
 *
 *   if (requiredPermissions.length === 0) return;
 *
 * So a protected route with an empty permission list is authenticated but not
 * authorized — any session that reaches the gateway may call it. On a GET that
 * is merely permissive; on a DELETE of a ROPA record or a risk-register entry
 * it is an audit finding in a product built to survive audits.
 *
 * The list below is the remaining debt, not an allowance. It only shrinks:
 * a new mutating route with no permissions fails this test by name, and a
 * route removed from the list may not return to it.
 */
import { isRouteProtected, routes } from "../src/app";
import { expect, test } from "./test-kit";

/** Routes that still mutate state with no permission declared. Only shrinks. */
const KNOWN_WITHOUT_RBAC = new Set([
  "POST /api/v1/poam/architect-remediation",
  "POST /api/v1/optimizer/compliance-strategy",
  "DELETE /api/v1/auth/sessions/others",
  "POST /api/v1/soc/triage-incident",
  "POST /api/v1/executive/translate-risk",
  "POST /api/v1/tpra/score",
  "PUT /api/v1/assessments/:id/maturity-targets",
  "POST /api/v1/assessments/:id/risk-register",
  "PATCH /api/v1/assessments/:id/risk-register/:entryId",
  "DELETE /api/v1/assessments/:id/risk-register/:entryId",
]);

const mutatingWithoutRbac = () =>
  routes
    .filter(
      (r) =>
        r.method !== "GET" &&
        isRouteProtected(r) &&
        !(r.permissions?.length ?? 0),
    )
    .map((r) => `${r.method} ${r.path}`);

test("RBAC: no new mutating route ships without permissions", () => {
  const unexpected = mutatingWithoutRbac().filter(
    (r) => !KNOWN_WITHOUT_RBAC.has(r),
  );
  expect(unexpected).toEqual([]);
});

test("RBAC: the debt list has no entry that already declares permissions", () => {
  const stillOpen = new Set(mutatingWithoutRbac());
  const stale = [...KNOWN_WITHOUT_RBAC].filter((r) => !stillOpen.has(r));
  expect(stale).toEqual([]);
});

test("RBAC: every privacy mutation declares a permission", () => {
  const open = mutatingWithoutRbac().filter((r) =>
    r.includes("/api/v1/privacy/"),
  );
  expect(open).toEqual([]);
});
