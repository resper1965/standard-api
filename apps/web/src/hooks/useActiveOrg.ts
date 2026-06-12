import { useSession } from "@/lib/auth-client"
import { useUserOrgs, useUserMe } from "@/lib/queries"

export function useActiveOrg() {
  const { data: session } = useSession()
  const { data: userOrgsData } = useUserOrgs()
  // Read platformAdmin from API (reads DB directly) — not from Better Auth
  // session, which coerces boolean additionalFields to undefined in the proxy.
  const { data: meData } = useUserMe()

  const isPlatformAdmin = meData?.data?.platformAdmin === true

  const sessionOrgId =
    ((session?.session as Record<string, unknown> | undefined)
      ?.activeOrganizationId as string | null | undefined)

  const fallbackOrgId = userOrgsData?.data?.[0]?.id

  const orgId = sessionOrgId ?? fallbackOrgId ?? null

  const userId = session?.user?.id ?? null
  const userEmail = session?.user?.email ?? null
  const userName = session?.user?.name ?? null

  const isAuthenticated = !!session?.user

  return {
    orgId,
    userId,
    userEmail,
    userName,
    isPlatformAdmin,
    isAuthenticated,
    session,
  }
}
