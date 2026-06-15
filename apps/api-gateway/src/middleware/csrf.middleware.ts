// @ts-nocheck -- Zod v4 CI type compat
/**
 * CSRF Middleware â€” Double-Submit Cookie Pattern (stateless).
 *
 * How it works:
 * 1. On login, a CSRF token is set as a cookie (__csrf, SameSite=Strict, NOT httpOnly)
 *    so the frontend JS can read it.
 * 2. For state-changing requests (POST/PUT/PATCH/DELETE), the frontend must send
 *    the token value in the `X-CSRF-Token` header.
 * 3. This middleware compares the cookie value vs the header value.
 * 4. M2M API key requests skip CSRF (they use Authorization header, not cookies).
 *
 * Token generation:
 *   HMAC-SHA256(sessionId, BETTER_AUTH_SECRET) â€” deterministic per session,
 *   rotated automatically when session rotates (H4 fix).
 *
 * @module
 */

import type { RequestContext } from "../http";
import { ApiError } from "../errors/api-error";

// Methods that don't modify state â€” exempt from CSRF
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

// Paths exempt from CSRF (auth routes are handled by Better Auth before this middleware)
const CSRF_EXEMPT_PATHS = new Set([
  "/health",
  "/api/health/auth",
  "/api/v1/health",
]);

/**
 * Generates a CSRF token for a given session ID using HMAC-SHA256.
 * Deterministic: same session always produces the same token.
 */
export async function generateCsrfToken(
  sessionId: string,
  secret: string,
): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(sessionId),
  );
  // Convert to hex string
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Extracts a cookie value from the Cookie header.
 */
function getCookieValue(request: Request, name: string): string | null {
  const cookieHeader = request.headers.get("Cookie");
  if (!cookieHeader) return null;

  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

/**
 * Verifies the CSRF token on state-changing requests.
 *
 * Skips verification for:
 * - Safe HTTP methods (GET, HEAD, OPTIONS)
 * - M2M API key requests (no cookie-based auth)
 * - CSRF-exempt paths (health checks)
 *
 * @throws ApiError with 403 if CSRF token is missing or mismatched
 */
export function verifyCsrf(context: RequestContext): void {
  const method = context.request.method;

  // Safe methods don't need CSRF
  if (SAFE_METHODS.has(method)) return;

  // M2M API key requests skip CSRF â€” they authenticate via Authorization header
  if (context.m2mScopes && context.m2mScopes.length > 0) return;

  // Exempt paths
  const url = new URL(context.request.url);
  if (CSRF_EXEMPT_PATHS.has(url.pathname)) return;

  // Unauthenticated requests skip CSRF (they'll fail auth anyway)
  if (!context.session?.session?.id) return;

  // CSRF bypass based on allowed origins:
  // If Origin header is present and matches one of the allowed origins, bypass CSRF verification.
  const origin = context.request.headers.get("origin");
  if (origin) {
    const isDevMode =
      context.env?.STANDARD_ENV === "development" ||
      context.env?.STANDARD_ENV === "test";
    const envOrigins =
      context.env?.ALLOWED_ORIGINS?.split(",")
        .map((o: string) => o.trim())
        .filter(Boolean) ?? [];
    const validatedOrigins = envOrigins.filter((o: string) => {
      if (o === "*") return false;
      try {
        const url = new URL(o);
        return url.origin === o;
      } catch {
        return false;
      }
    });
    const allowed =
      validatedOrigins.length > 0
        ? validatedOrigins
        : [
            "https://standard.bekaa.eu",
            "https://standard-web.pages.dev",
            "https://standard-web-production.pages.dev",
            ...(isDevMode
              ? ["http://localhost:5173", "http://localhost:3000"]
              : []),
          ];

    const isAlwaysAllowed =
      origin === "https://standard.bekaa.eu" ||
      origin === "https://standard-web.pages.dev" ||
      origin === "https://standard-web-production.pages.dev" ||
      origin.endsWith(".standard-web.pages.dev") ||
      origin.endsWith(".standard-web-production.pages.dev");

    if (allowed.includes(origin) || isAlwaysAllowed) {
      return;
    }
  }

  const cookieToken = getCookieValue(context.request, "__csrf");
  const headerToken = context.request.headers.get("x-csrf-token");

  if (!cookieToken || !headerToken) {
    throw new ApiError(
      "FORBIDDEN",
      "CSRF token is required for state-changing operations. Include the __csrf cookie value in the X-CSRF-Token header.",
      403,
    );
  }

  // Constant-time comparison to prevent timing attacks
  if (cookieToken.length !== headerToken.length) {
    throw new ApiError("FORBIDDEN", "CSRF token mismatch.", 403);
  }

  // Manual constant-time comparison (XOR-based)
  const encoder = new TextEncoder();
  const a = encoder.encode(cookieToken);
  const b = encoder.encode(headerToken);
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= (a[i] ?? 0) ^ (b[i] ?? 0);
  }
  if (diff !== 0) {
    throw new ApiError("FORBIDDEN", "CSRF token mismatch.", 403);
  }
}

/**
 * Builds a Set-Cookie header string for the CSRF token.
 * The cookie is:
 * - NOT httpOnly (frontend JS needs to read it)
 * - SameSite=Strict (provides baseline CSRF protection)
 * - Secure (only sent over HTTPS)
 * - Path=/ (available for all API routes)
 */
export function buildCsrfCookie(token: string): string {
  return `__csrf=${token}; Path=/; SameSite=Strict; Secure`;
}

