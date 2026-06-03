import { useSession } from "@/lib/auth-client"
import { useUserOrgs } from "@/lib/queries"

/**
 * Centralized hook for accessing the active organization context.
 *
 * Strategy:
 * 1. Try session.activeOrganizationId (set by Better Auth org plugin or additionalFields)
 * 2. Fallback: fetch user's org list via /api/v1/users/me/organizations and pick the first one
 *
 * This fallback is necessary because Better Auth's getSession does NOT return
 * activeOrganizationId unless the organization plugin is enabled server-side.
 * Our server intentionally omits the plugin (org mgmt via custom routes).
 */
export function useActiveOrg() {
  const { data: session } = useSession()
  const { data: userOrgsData } = useUserOrgs()

  const isPlatformAdmin =
    ((session?.user as Record<string, unknown> | undefined)
      ?.platformAdmin as boolean | undefined) === true

  // Primary: Better Auth session field (works if org plugin or additionalFields is active)
  const sessionOrgId =
    ((session?.session as Record<string, unknown> | undefined)
      ?.activeOrganizationId as string | null | undefined)
    ?? null

  // Fallback: pick the first org from the user's membership list
  const fallbackOrgId = userOrgsData?.data?.[0]?.id ?? null

  const orgId = sessionOrgId ?? fallbackOrgId

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
