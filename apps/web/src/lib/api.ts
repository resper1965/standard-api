import { authClient } from "./auth-client"

export async function apiClient(endpoint: string, options: RequestInit = {}) {
  // Better Auth guarda auth localmente/cookies automaticamente.
  // Puxar active organization synchronous se disponivel no cache para preencher header de tenant (conforme contratos)
  let tenantIdHeader = "";
  try {
    const $activeOrg = authClient.useActiveOrganization.getState();
    if ($activeOrg.data?.id) {
       tenantIdHeader = $activeOrg.data.id;
    }
  } catch (e) {
    // silently continue se store não tiver state
  }

  const headers = new Headers(options.headers || {})
  
  headers.set('Content-Type', 'application/json')
  
  if (tenantIdHeader) {
     headers.set('x-standard-tenant-id', tenantIdHeader)
  }

  const response = await fetch(endpoint, {
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
