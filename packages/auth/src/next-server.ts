import { jwtVerify, createRemoteJWKSet } from "jose";

export type TenantSession = {
  userId: string;
  tenantId: string;
  tenantName: string;
  role: 'compliance_officer' | 'auditor' | 'manager' | string;
};

/**
 * Creates a shielded Server-Side Component session validator for Next.js.
 * 
 * In your Next.js project (e.g., `lib/auth.ts`):
 * ```ts
 * import { cookies } from "next/headers";
 * import { redirect } from "next/navigation";
 * import { createNextServerAuth } from "@standard/auth";
 *
 * export const requireTenantSession = createNextServerAuth(
 *   process.env.NEON_AUTH_JWKS_URL!,
 *   cookies,
 *   () => redirect('/login')
 * );
 * ```
 * 
 * @param jwksUrl The JWKS endpoint (e.g. from Neon Auth)
 * @param getCookies A function wrapping Next.js `cookies()`
 * @param onUnauthorized A function wrapping Next.js `redirect("/login")`
 * @param tokenCookieName The name of the cookie storing the JWT
 */
export const createNextServerAuth = (
  jwksUrl: string,
  getCookies: () => { get: (name: string) => { value: string } | undefined },
  onUnauthorized: () => never,
  tokenCookieName: string = "neon_auth_token"
) => {
  const jwksFn = createRemoteJWKSet(new URL(jwksUrl));

  return async function requireTenantSession(): Promise<TenantSession> {
    const cookies = getCookies();
    const token = cookies.get(tokenCookieName)?.value;

    if (!token) {
      return onUnauthorized();
    }

    try {
      const { payload } = await jwtVerify(token, jwksFn);

      if (!payload.sub || !payload.activeOrganizationId) {
         return onUnauthorized();
      }

      return {
        userId: payload.sub,
        tenantId: String(payload.activeOrganizationId),
        tenantName: String(payload.organizationName || "Aegis Workspace"),
        role: String(payload.role || "auditor"),
      };
    } catch (err) {
      // Token is invalid, expired, or malformed
      return onUnauthorized();
    }
  };
};
