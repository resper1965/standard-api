import { MockAuthProvider } from "@standard/security";
import type { StandardAuth } from "@standard/auth";
import type { Env } from "./index";
import { ApiError } from "./errors/api-error";
import type { RequestContext, RouteDefinition } from "./http";
import { resolveAuthContext } from "./middleware/auth.middleware";

// ─────────────────────────────────────────────────────────────────────
// CORS helpers
// ─────────────────────────────────────────────────────────────────────

/**
 * Validate and return a list of allowed CORS origins from env or defaults.
 */
export const resolveAllowedOrigins = (env?: Partial<Env>): string[] => {
  const isDevMode = env?.STANDARD_ENV === "development" || env?.STANDARD_ENV === "test";
  // ALLOWED_ORIGINS env var overrides hardcoded list (comma-separated)
  const envOrigins = env?.ALLOWED_ORIGINS?.split(",").map((o: string) => o.trim()).filter(Boolean) ?? [];
  // Validate that no wildcard or malformed origins are in the list
  const validatedOrigins = envOrigins.filter((o: string) => {
    if (o === "*") {
      console.warn("[SECURITY] ALLOWED_ORIGINS contains wildcard '*' — ignoring");
      return false;
    }
    try {
      const url = new URL(o);
      return url.origin === o;
    } catch {
      console.warn(`[SECURITY] ALLOWED_ORIGINS contains invalid origin: ${o} — ignoring`);
      return false;
    }
  });
  return validatedOrigins.length > 0 ? validatedOrigins : [
    "https://standard.bekaa.eu",
    "https://standard-web.pages.dev",
    "https://standard-web-production.pages.dev",
    ...(isDevMode ? ["http://localhost:5173", "http://localhost:3000"] : []),
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
  const isPagesDevAlias = origin.endsWith(".standard-web.pages.dev") || origin.endsWith(".standard-web-production.pages.dev");
  const corsOrigin = allowedOrigins.includes(origin) || isPagesDevAlias ? origin : "";
  return corsOrigin
    ? {
        "Access-Control-Allow-Origin": corsOrigin,
        "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Trace-Id, X-Tenant-Id, x-standard-tenant-id",
        "Access-Control-Allow-Credentials": "true",
        "Access-Control-Max-Age": "86400",
      }
    : {};
};

// ─────────────────────────────────────────────────────────────────────
// Security headers
// ─────────────────────────────────────────────────────────────────────

/**
 * Build the full set of security + CORS headers for a given pathname.
 */
export const buildSecurityHeaders = (
  corsHeaders: Record<string, string>,
  pathname: string,
): Record<string, string> => {
  // Relax CSP for docs/llms routes so Scalar UI, fonts, and scripts load correctly
  const isDocsRoute = pathname.startsWith("/docs") || pathname.startsWith("/llms");
  const cspValue = isDocsRoute
    ? "default-src 'self'; script-src 'self' 'unsafe-inline' cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' fonts.googleapis.com; font-src fonts.gstatic.com; img-src 'self' data:; connect-src 'self';"
    : "default-src 'none'; frame-ancestors 'none';";

  return {
    ...corsHeaders,
    // ── OWASP Enterprise-Grade Security Headers ──────────────
    "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "X-XSS-Protection": "0", // Deprecated; CSP is the modern replacement
    "Content-Security-Policy": cspValue,
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=()",
    "X-Download-Options": "noopen",
    "X-Permitted-Cross-Domain-Policies": "none",
    "Cross-Origin-Opener-Policy": "same-origin",
    "Cross-Origin-Resource-Policy": "same-origin",
  };
};

/**
 * Clone a response and apply security headers.
 */
export const applySecurityHeaders = (
  res: Response,
  securityHeaders: Record<string, string>,
): Response => {
  const newRes = new Response(res.body, res);
  for (const [k, v] of Object.entries(securityHeaders)) {
    newRes.headers.set(k, v);
  }
  return newRes;
};

// ─────────────────────────────────────────────────────────────────────
// Auth context resolution
// ─────────────────────────────────────────────────────────────────────

/**
 * Determine whether auth is required for a given route definition.
 */
export const isAuthRequired = (route: RouteDefinition): boolean =>
  route.authRequired ?? (Boolean(route.protected) || Boolean(route.requireActor) || Boolean(route.permissions?.length));

/**
 * Build a minimal mock session so session.user.role RBAC checks work in dev/test.
 * Encapsulates the role-priority and platform-admin detection logic.
 */
const buildMockSession = (
  legacyActor: string,
  request: Request,
  authRoles: readonly string[],
): NonNullable<RequestContext["session"]> => {
  // Priority: x-standard-mock-role header > role from Bearer header > "admin" default.
  const overrideRole = request.headers.get("x-standard-mock-role");
  const firstAuthRole = authRoles[0] as string | undefined;
  // We pass security-package roles through directly — they match
  // STANDARD_ROLE_PERMISSIONS keys in permissions.ts (GRC roles).
  // Only "system" maps to special handling (platform_admin flag).
  const isPlatAdmin = (authRoles.includes("platform_admin" as any)
    || authRoles.includes("system" as any)
    || overrideRole === "platform_admin")
    && overrideRole !== "owner"
    && overrideRole !== "viewer"
    && overrideRole !== "admin";
  const mockRole = overrideRole ?? firstAuthRole ?? "admin";
  return {
    user: {
      id: legacyActor,
      email: `${legacyActor}@mock.test`,
      name: "Mock Test Actor",
      role: mockRole,
      platformAdmin: isPlatAdmin,
    },
    session: { id: `mock-session-${legacyActor}` },
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

  // ── Standard Native Auth ──────────────────────────────────
  if (auth) {
    await resolveAuthContext(context, auth, authRequired);
    return;
  }

  // ── Legacy header fallback — requires ALLOW_MOCK_AUTH=true AND a non-production STANDARD_ENV. ──
  // Fail-closed: omitting ALLOW_MOCK_AUTH disables mock-auth even in dev.
  if (
    (env?.STANDARD_ENV === "local" || env?.STANDARD_ENV === "development" || env?.STANDARD_ENV === "test") &&
    env?.ALLOW_MOCK_AUTH === "true"
  ) {
    const legacyActor = request.headers.get("x-standard-actor-id") ?? undefined;
    if (legacyActor) {
      context.actorId = legacyActor;
      const mockAuth = new MockAuthProvider("development");
      const authCtx = await mockAuth.authenticate({
        actorId: legacyActor,
        ...(context.organizationId ? { organizationId: context.organizationId } : {}),
        authHeader: request.headers.get("authorization") ?? undefined,
        traceId: context.traceId,
      });
      if (authCtx) context.auth = authCtx;
      // Populate a minimal mock session so session.user.role RBAC checks work in dev/test.
      context.session = buildMockSession(legacyActor, request, authCtx?.roles ?? []);
    }
    if (authRequired && !context.actorId) {
      throw new ApiError("UNAUTHORIZED", "Authentication is required for this operation.", 401);
    }
    return;
  }

  // ── Production without Standard Native Auth = always reject ──
  if (authRequired) {
    throw new ApiError("UNAUTHORIZED", "Authentication provider is not configured.", 401);
  }
};
