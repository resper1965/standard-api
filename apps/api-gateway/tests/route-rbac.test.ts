/**
 * @module route-rbac.test
 * @description Guards that every protected route declares an authorization rule.
 *
 * `assertRbac` returns early when a route declares no `permissions`:
 *
 *   if (requiredPermissions.length === 0) return;
 *
 * So a protected route with an empty permission list is authenticated but not
 * authorized — any session that reaches the gateway may call it.
 *
 * It also fails closed the other way. `scope.middleware` denies a machine actor
 * on a route whose required-scope list is empty, and the scopes are derived
 * from `permissions`, so a route declaring none is unreachable by every API
 * key. A customer read the absence of a documented permission as "open to any
 * key", called `GET /api/v1/regulations`, and got 403.
 *
 * One rule, therefore, in both directions: every protected route declares a
 * permission. The exemptions below are routes whose authorization lives in the
 * actor's identity, and each carries its argument.
 */
import { isRouteProtected, routes } from "../src/app";
import { expect, test } from "./test-kit";

/**
 * The routes that stay outside RBAC, and why.
 *
 * Both are about the caller and nobody else. `DELETE /auth/sessions/others`
 * revokes the *calling actor's* other sessions; `GET /users/me` returns the
 * calling actor. Neither accepts a target — each reads the identity out of the
 * session — so the authorization is already there and there is no other user's
 * data they could reach.
 *
 * A permission on either would be decorative, and worse: every human holding a
 * session but not that permission would lose access to their own account.
 *
 * Nothing else belongs in this set. An addition needs the same kind of
 * argument, written here.
 */
const RBAC_BY_IDENTITY = new Set([
  "DELETE /api/v1/auth/sessions/others",
  "GET /api/v1/users/me",
]);

const protectedWithoutRbac = () =>
  routes
    .filter((r) => isRouteProtected(r) && !(r.permissions?.length ?? 0))
    .map((r) => `${r.method} ${r.path}`);

test("RBAC: every protected route declares a permission", () => {
  const unexpected = protectedWithoutRbac().filter(
    (r) => !RBAC_BY_IDENTITY.has(r),
  );
  expect(unexpected).toEqual([]);
});

test("RBAC: no identity-authorized exemption has gone stale", () => {
  const stillOpen = new Set(protectedWithoutRbac());
  const stale = [...RBAC_BY_IDENTITY].filter((r) => !stillOpen.has(r));
  expect(stale).toEqual([]);
});
