import { authClient } from "./auth-client"
import { API_URL } from "./config"

// ─── Tenant cache ────────────────────────────────────────────────────────────

let cachedTenantId: string | null = null;
let sessionFetchPromise: Promise<string> | null = null;

/** Call this immediately after switching or activating an organization. */
function invalidateTenantCache(): void {
  cachedTenantId = null;
  sessionFetchPromise = null;
}

async function getOrFetchTenantId(): Promise<string> {
  if (cachedTenantId !== null) return cachedTenantId;
  if (sessionFetchPromise) return sessionFetchPromise;

  sessionFetchPromise = (async () => {
    try {
      const session = await authClient.getSession();
      const activeOrgId = (session?.data?.session as Record<string, unknown>)?.activeOrganizationId;
      if (typeof activeOrgId === "string") {
        cachedTenantId = activeOrgId;
      } else {
        const isPlatformAdmin =
          ((session?.data?.user as Record<string, unknown> | undefined)
            ?.platformAdmin as boolean | undefined) === true;
        cachedTenantId = isPlatformAdmin ? "bekaa" : "";
      }
      return cachedTenantId;
    } catch {
      // Return empty — request will proceed without tenant header.
      // The server will reject if the route requires tenant isolation.
      return "";
    } finally {
      sessionFetchPromise = null;
    }
  })();

  return sessionFetchPromise;
}

// ─── Structured API Error ────────────────────────────────────────────────────

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string,
    public readonly traceId?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

// ─── Core client ─────────────────────────────────────────────────────────────

const REQUEST_TIMEOUT_MS = 15_000;

export async function api<T = unknown>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const organizationId = await getOrFetchTenantId();

  const headers = new Headers(options.headers ?? {});

  // Only set Content-Type on mutation requests to avoid CORS preflight on GETs
  const method = (options.method ?? "GET").toUpperCase();
  if (!headers.has("Content-Type") && method !== "GET" && method !== "HEAD") {
    headers.set("Content-Type", "application/json");
  }

  // Inject tenant header only on API routes (not on auth routes)
  if (organizationId && !endpoint.includes("/api/auth/")) {
    headers.set("x-standard-tenant-id", organizationId);
  }

  const fetchUrl = endpoint.startsWith("/") ? `${API_URL}${endpoint}` : endpoint;

  // Abort after REQUEST_TIMEOUT_MS to prevent indefinite hangs
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(fetchUrl, {
      ...options,
      headers,
      credentials: "include",
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timeoutId);
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new ApiError("Request timed out", 408, "TIMEOUT");
    }
    throw new ApiError(
      err instanceof Error ? err.message : "Network error",
      0,
      "NETWORK_ERROR"
    );
  } finally {
    clearTimeout(timeoutId);
  }

  // 401 → redirect to login
  if (response.status === 401) {
    invalidateTenantCache();
    window.location.href = "/login";
    throw new ApiError("Unauthorized", 401, "UNAUTHORIZED");
  }

  // Parse error body for structured error details
  if (!response.ok) {
    let code: string | undefined;
    let traceId: string | undefined;
    let message = response.statusText;

    try {
      const body = await response.json() as Record<string, unknown>;
      if (typeof body.message === "string") message = body.message;
      if (typeof body.code === "string") code = body.code;
      if (typeof body.trace_id === "string") traceId = body.trace_id;
    } catch {
      message = await response.text().catch(() => response.statusText);
    }

    throw new ApiError(message, response.status, code, traceId);
  }

  if (response.status === 204) return {} as T;
  return response.json() as Promise<T>;
}

// Legacy alias — prefer importing `api` directly
export const apiClient = api;
