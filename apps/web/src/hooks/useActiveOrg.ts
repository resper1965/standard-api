import { useSession } from "@/lib/auth-client"

/**
 * Centralized hook for accessing the active organization context.
 * Eliminates repeated `(session?.session as any)?.activeOrganizationId` casts across pages.
 */
export function useActiveOrg() {
  const { data: session } = useSession()

  const isPlatformAdmin =
    ((session?.user as Record<string, unknown> | undefined)
      ?.platformAdmin as boolean | undefined) === true

  const orgId =
    ((session?.session as Record<string, unknown> | undefined)
      ?.activeOrganizationId as string | null | undefined)
    ?? null

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
