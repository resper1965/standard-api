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
 * Every mutating route now declares one, with a single exemption below whose
 * authorization lives in the actor's identity rather than in a permission. A
 * new mutating route with no permissions fails this test by name.
 */
import { isRouteProtected, routes } from "../src/app";
import { expect, test } from "./test-kit";

/**
 * The one route that stays outside RBAC, and why.
 *
 * `DELETE /auth/sessions/others` revokes the *calling actor's* other sessions.
 * The handler reads `context.session.user.id` and accepts no target, so the
 * authorization is already in the identity — there is no other user's session
 * it could reach. A permission here would be decorative, and worse: every
 * human holding a session but not that permission would lose the ability to
 * revoke their own.
 *
 * Nothing else belongs in this set. An addition needs the same kind of
 * argument, written here.
 */
const RBAC_BY_IDENTITY = new Set(["DELETE /api/v1/auth/sessions/others"]);

const mutatingWithoutRbac = () =>
  routes
    .filter(
      (r) =>
        r.method !== "GET" &&
        isRouteProtected(r) &&
        !(r.permissions?.length ?? 0),
    )
    .map((r) => `${r.method} ${r.path}`);

test("RBAC: every mutating route declares a permission", () => {
  const unexpected = mutatingWithoutRbac().filter(
    (r) => !RBAC_BY_IDENTITY.has(r),
  );
  expect(unexpected).toEqual([]);
});

test("RBAC: the identity-authorized exemption has not gone stale", () => {
  const stillOpen = new Set(mutatingWithoutRbac());
  const stale = [...RBAC_BY_IDENTITY].filter((r) => !stillOpen.has(r));
  expect(stale).toEqual([]);
});
