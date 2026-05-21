import { authClient } from "./auth-client"

const API_URL = import.meta.env.VITE_API_URL || "https://api.standard.bekaa.eu"

export async function apiClient<T = unknown>(endpoint: string, options: RequestInit = {}): Promise<T> {
  // Pull active organization for tenant header
  let tenantIdHeader = "";
  try {
    const session = await authClient.getSession();
    if (session?.data?.session?.activeOrganizationId) {
        tenantIdHeader = session.data.session.activeOrganizationId;
    }
  } catch (_e) {
    // silently continue
  }

  const headers = new Headers(options.headers || {})
  
  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }
  
  if (tenantIdHeader) {
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

