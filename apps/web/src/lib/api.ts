import { authClient } from "./auth-client"

import { API_URL } from "./config"

let cachedTenantId: string | null = null;
let sessionFetchPromise: Promise<string> | null = null;

async function getOrFetchTenantId(): Promise<string> {
  if (cachedTenantId !== null) {
    return cachedTenantId;
  }
  if (sessionFetchPromise) {
    return sessionFetchPromise;
  }

  sessionFetchPromise = (async () => {
    try {
      const session = await authClient.getSession();
      const activeOrgId = session?.data?.session?.activeOrganizationId;
      cachedTenantId = activeOrgId || "";
      return cachedTenantId;
    } catch (_e) {
      return "";
    } finally {
      sessionFetchPromise = null;
    }
  })();

  return sessionFetchPromise;
}

export async function apiClient<T = unknown>(endpoint: string, options: RequestInit = {}): Promise<T> {
  // Pull active organization for tenant header
  const tenantIdHeader = await getOrFetchTenantId();

  const headers = new Headers(options.headers || {})
  
  // Only set Content-Type on requests with a body (POST/PUT/PATCH).
  // Setting it on GET triggers an avoidable CORS preflight.
  const method = (options.method || "GET").toUpperCase();
  if (!headers.has('Content-Type') && method !== "GET" && method !== "HEAD") {
    headers.set('Content-Type', 'application/json')
  }
  
  // Only add tenant header to /api/v1/* routes — standard-native-auth routes (/api/auth/*) 
  // don't allow this custom header and it causes CORS preflight failures
  if (tenantIdHeader && !endpoint.includes('/api/auth/')) {
     headers.set('x-standard-tenant-id', tenantIdHeader)
  }

  // Resolve relative endpoints against API gateway
  const fetchUrl = endpoint.startsWith('/') ? `${API_URL}${endpoint}` : endpoint;

  const response = await fetch(fetchUrl, {
    ...options,
    headers,
    credentials: 'include',
  })

  // 401 → redirect to login
  if (response.status === 401) {
    console.warn("API 401 Unauthorized - Re-auth required.")
    window.location.href = "/login";
    throw new Error("Unauthorized");
  }

  // Non-OK responses throw
  if (!response.ok) {
    const errorBody = await response.text().catch(() => "");
    throw new Error(`API ${response.status}: ${errorBody || response.statusText}`);
  }

  // Parse JSON (fallback to empty object for 204 no-content)
  if (response.status === 204) {
    return {} as T;
  }

  return response.json() as Promise<T>;
}

// Alias used by page components
export const api = apiClient;

