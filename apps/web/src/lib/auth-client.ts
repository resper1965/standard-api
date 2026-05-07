import { createAuthClient } from "better-auth/react"
import { organizationClient } from "better-auth/client/plugins"

export const authClient = createAuthClient({
  baseURL: "/api/v1/auth",
  plugins: [
    organizationClient()
  ]
})

export const { useSession, signIn, signOut, signUp } = authClient
export const { useOrganization, useActiveOrganization } = authClient.organization
