import { createAuthClient } from "better-auth/react"
import { organizationClient } from "better-auth/client/plugins"
import { apiKeyClient } from "@better-auth/api-key/client"

const API_URL = import.meta.env.VITE_API_URL || "https://standard-api-gateway-production.ness.workers.dev"

export const authClient = createAuthClient({
  baseURL: `${API_URL}/api/auth`,
  plugins: [
    organizationClient(),
    apiKeyClient()
  ]
})

export const { useSession, signIn, signOut, signUp, useActiveOrganization } = authClient
