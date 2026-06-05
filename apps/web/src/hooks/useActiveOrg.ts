import { useSession } from "@/lib/auth-client"
import { useUserOrgs } from "@/lib/queries"

export function useActiveOrg() {
  const { data: session } = useSession()
  const { data: userOrgsData } = useUserOrgs()

  const isPlatformAdmin =
    ((session?.user as Record<string, unknown> | undefined)
      ?.platformAdmin as boolean | undefined) === true

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
