import { MockAuthProvider } from "@standard/security";
import type { StandardAuth } from "@standard/auth";
import type { Env } from "./types/env";
import { ApiError } from "./errors/api-error";
import type { RequestContext, RouteDefinition } from "./http";
import { resolveAuthContext } from "./middleware/auth.middleware";
import { attachTenantDb } from "./middleware/tenant-db.middleware";

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// CORS helpers
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/**
 * Validate and return a list of allowed CORS origins from env or defaults.
 */
export const resolveAllowedOrigins = (env?: Partial<Env>): string[] => {
  const isDevMode =
    env?.STANDARD_ENV === "development" || env?.STANDARD_ENV === "test";
  // ALLOWED_ORIGINS env var overrides hardcoded list (comma-separated)
  const envOrigins =
    env?.ALLOWED_ORIGINS?.split(",")
      .map((o: string) => o.trim())
      .filter(Boolean) ?? [];
  // Validate that no wildcard or malformed origins are in the list
  const validatedOrigins = envOrigins.filter((o: string) => {
    if (o === "*") {
      console.warn(
        "[SECURITY] ALLOWED_ORIGINS contains wildcard '*' â€” ignoring",
      );
      return false;
    }
    try {
      const url = new URL(o);
      return url.origin === o;
    } catch {
      console.warn(
        `[SECURITY] ALLOWED_ORIGINS contains invalid origin: ${o} â€” ignoring`,
      );
      return false;
    }
  });
  return validatedOrigins.length > 0
    ? validatedOrigins
    : [
        "https://standard.bekaa.eu",
        "https://standard-web.pages.dev",
        "https://standard-web-production.pages.dev",
        ...(isDevMode
          ? ["http://localhost:5173", "http://localhost:3000"]
          : []),
      ];
};

/**
 * Compute CORS headers for a request given the resolved allowed origins list.
 * Returns empty object when the origin is not allowed.
 */
export const buildCorsHeaders = (
  request: Request,
  allowedOrigins: string[],
): Record<string, string> => {
  const origin = request.headers.get("Origin") ?? "";
  const isAlwaysAllowed =
    origin === "https://standard.bekaa.eu" ||
    origin === "https://standard-web.pages.dev" ||
    origin === "https://standard-web-production.pages.dev";
  const corsOrigin =
    allowedOrigins.includes(origin) || isAlwaysAllowed ? origin : "";
  return corsOrigin
    ? {
        "Access-Control-Allow-Origin": corsOrigin,
        "Access-Control-Allow-Methods":
          "GET, POST, PUT, PATCH, DELETE, OPTIONS",
        "Access-Control-Allow-Headers":
          "Content-Type, Authorization, X-Trace-Id, X-Tenant-Id, x-standard-tenant-id, X-CSRF-Token",
        "Access-Control-Allow-Credentials": "true",
        "Access-Control-Max-Age": "86400",
      }
    : {};
};

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Security headers
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/**
 * Build the full set of security + CORS headers for a given pathname.
 */
export const buildSecurityHeaders = (
  corsHeaders: Record<string, string>,
  pathname: string,
): Record<string, string> => {
  // Relax CSP for docs/llms routes so Scalar UI, fonts, and scripts load correctly
  const isDocsRoute =
    pathname === "/" ||
    pathname.startsWith("/docs") ||
    pathname.startsWith("/llms");
  const cspValue = isDocsRoute
    ? "default-src 'self' 'unsafe-inline' 'unsafe-eval' https: data: blob:; frame-ancestors 'none';"
    : "default-src 'none'; frame-ancestors 'none';";

  return {
    ...corsHeaders,
    // â”€â”€ OWASP Enterprise-Grade Security Headers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "X-XSS-Protection": "0", // Deprecated; CSP is the modern replacement
    "Content-Security-Policy": cspValue,
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy":
      "camera=(), microphone=(), geolocation=(), payment=()",
    "X-Download-Options": "noopen",
    "X-Permitted-Cross-Domain-Policies": "none",
    "Cross-Origin-Opener-Policy": "same-origin-allow-popups",
    "Cross-Origin-Resource-Policy": "cross-origin",
  };
};

/**
 * Clone a response and apply security headers.
 */
export const applySecurityHeaders = (
  res: Response,
  securityHeaders: Record<string, string>,
): Response => {
  const headers = new Headers(res.headers);
  for (const [k, v] of Object.entries(securityHeaders)) {
    headers.set(k, v);
  }
  return new Response(res.body, {
    status: res.status,
    statusText: res.statusText,
    headers,
  });
};

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Auth context resolution
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/**
 * Determine whether auth is required for a given route definition.
 */
export const isAuthRequired = (route: RouteDefinition): boolean =>
  route.authRequired ??
  (Boolean(route.protected) ||
    Boolean(route.requireActor) ||
    Boolean(route.permissions?.length));

/**
 * Build a minimal mock session so session.user.role RBAC checks work in dev/test.
 * Encapsulates the role-priority and platform-admin detection logic.
 */
const buildMockSession = (
  legacyActor: string,
  request: Request,
  authRoles: readonly string[],
): NonNullable<RequestContext["session"]> => {
  // Priority: x-standard-mock-role header > role from Bearer header > "customer" default.
  const overrideRole = request.headers.get("x-standard-mock-role");
  const firstAuthRole = authRoles[0] as string | undefined;
  // Normalise to 2-role model: platform_admin or customer.
  const isPlatAdmin =
    authRoles.includes("platform_admin" as any) ||
    overrideRole === "platform_admin";
  const mockRole = isPlatAdmin
    ? "platform_admin"
    : (overrideRole ?? firstAuthRole ?? "customer");
  const tenantId =
    request.headers.get("x-standard-tenant-id") ??
    request.headers.get("x-tenant-id") ??
    undefined;
  const allowedOrganizations = tenantId
    ? [
        {
          id: tenantId,
          name: "Mock Org",
          slug: `org-${tenantId.slice(0, 6)}`,
          role: mockRole,
        },
      ]
    : [];

  return {
    user: {
      id: legacyActor,
      email: `${legacyActor}@mock.test`,
      name: "Mock Test Actor",
      platformAdmin: isPlatAdmin,
      approved: true,
      role: (isPlatAdmin ? "platform_admin" : "customer") as
        | "platform_admin"
        | "customer",
    },
    session: {
      id: `mock-session-${legacyActor}`,
      activeOrganizationId: tenantId ?? null,
    },
  };
};

/**
 * Resolve authentication context on the RequestContext.
 * Handles three branches: Standard Native Auth, legacy mock auth (dev/test only),
 * and production without auth (always rejects).
 */
export const resolveAuth = async (
  context: RequestContext,
  request: Request,
  route: RouteDefinition,
  env: Partial<Env> | undefined,
  auth: StandardAuth | undefined,
): Promise<void> => {
  const authRequired = isAuthRequired(route);

  // â”€â”€ Standard Native Auth â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (auth) {
    await resolveAuthContext(context, auth, authRequired);
    // Attach RLS-scoped DB access after org context is resolved
    attachTenantDb(context);
    return;
  }

  // â”€â”€ Legacy header fallback â€” requires ALLOW_MOCK_AUTH=true AND a non-production STANDARD_ENV. â”€â”€
  // Fail-closed: omitting ALLOW_MOCK_AUTH disables mock-auth even in dev.
  if (
    (env?.STANDARD_ENV === "local" ||
      env?.STANDARD_ENV === "development" ||
      env?.STANDARD_ENV === "test") &&
    env?.ALLOW_MOCK_AUTH === "true"
  ) {
    const legacyActor = request.headers.get("x-standard-actor-id") ?? undefined;
    const tenantId =
      request.headers.get("x-standard-tenant-id") ??
      request.headers.get("x-tenant-id") ??
      undefined;
    if (tenantId) {
      context.organizationId = tenantId;
    }
    if (legacyActor) {
      context.actorId = legacyActor;
      const mockAuth = new MockAuthProvider("development");
      const authCtx = await mockAuth.authenticate({
        actorId: legacyActor,
        ...(context.organizationId
          ? { organizationId: context.organizationId }
          : {}),
        authHeader: request.headers.get("authorization") ?? undefined,
        traceId: context.traceId,
      });
      if (authCtx) context.auth = authCtx;
      // Populate a minimal mock session so session.user.role RBAC checks work in dev/test.
      context.session = buildMockSession(
        legacyActor,
        request,
        authCtx?.roles ?? [],
      );
    }
    if (authRequired && !context.actorId) {
      throw new ApiError(
        "UNAUTHORIZED",
        "Authentication is required for this operation.",
        401,
      );
    }
    return;
  }

  // â”€â”€ Production without Standard Native Auth = always reject â”€â”€
  if (authRequired) {
    throw new ApiError(
      "UNAUTHORIZED",
      "Authentication provider is not configured.",
      401,
    );
  }
};
