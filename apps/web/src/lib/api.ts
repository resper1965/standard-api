import { authClient } from "./auth-client"

export async function apiClient(endpoint: string, options: RequestInit = {}) {
  // Better Auth guarda auth localmente/cookies automaticamente.
  // Puxar active organization synchronous se disponivel no cache para preencher header de tenant (conforme contratos)
  let tenantIdHeader = "";
  try {
    const session = await authClient.getSession();
    if (session?.data?.session?.activeOrganizationId) {
        tenantIdHeader = session.data.session.activeOrganizationId;
    }
  } catch (e) {
    // silently continue
  }

  const headers = new Headers(options.headers || {})
  
  headers.set('Content-Type', 'application/json')
  
  if (tenantIdHeader) {
     headers.set('x-standard-tenant-id', tenantIdHeader)
  }

  // Base URL configuration for fetching from Cloudflare worker directly instead of domain root
  const API_URL = import.meta.env.VITE_API_URL || "https://standard-api-gateway-production.ness.workers.dev"
  
  // se endpoint for relativo (comeca com /), anexar a raiz
  const fetchUrl = endpoint.startsWith('/') ? `${API_URL}${endpoint}` : endpoint;

  const response = await fetch(fetchUrl, {
    ...options,
    headers,
  })

  // Basic interceptor handling (401 -> forcerefresh/redirect)
  if (response.status === 401) {
    console.warn("API 401 Unauthorized - Re-auth required.")
    // fallback logic pode ser inserida aqui
  }

  return response
}
