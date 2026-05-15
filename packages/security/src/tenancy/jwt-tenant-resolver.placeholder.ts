/**
 * JWT Tenant Resolver — extracts tenant context from JWT claims.
 *
 * Supports Better Auth session tokens and standard JWT payloads.
 * Decodes the JWT payload (without verification — verification is done
 * by the auth middleware) and extracts tenant/org claims.
 */

export type TenantResolution = {
  tenantId: string;
  organizationId?: string | undefined;
  userId?: string | undefined;
};

export class JwtTenantResolver {
  /**
   * Standard claim paths to look for tenant ID, in priority order.
   */
  private static readonly TENANT_CLAIMS = [
    "tenant_id",
    "tenantId",
    "x-standard-tenant-id",
    "activeOrganizationId",
    "org_id",
    "org",
  ] as const;

  private static readonly ORG_CLAIMS = [
    "organization_id",
    "organizationId",
    "activeOrganizationId",
    "org_id",
  ] as const;

  private static readonly USER_CLAIMS = [
    "sub",
    "user_id",
    "userId",
    "id",
  ] as const;

  /**
   * Resolve tenant context from a JWT token string.
   * Returns null if the token is invalid or has no tenant claim.
   */
  resolve(token: string): TenantResolution | null {
    const payload = this.decodePayload(token);
    if (!payload) return null;

    const tenantId = this.findClaim(payload, JwtTenantResolver.TENANT_CLAIMS);
    if (!tenantId) return null;

    return {
      tenantId,
      organizationId: this.findClaim(payload, JwtTenantResolver.ORG_CLAIMS) ?? undefined,
      userId: this.findClaim(payload, JwtTenantResolver.USER_CLAIMS) ?? undefined,
    };
  }

  /**
   * Resolve from a request's Authorization header.
   */
  resolveFromHeader(authHeader?: string): TenantResolution | null {
    if (!authHeader) return null;
    const match = authHeader.match(/^Bearer\s+(.+)$/i);
    if (!match?.[1]) return null;
    return this.resolve(match[1]);
  }

  /**
   * Decode JWT payload without verification.
   * We only need claims — signature verification is upstream.
   */
  private decodePayload(token: string): Record<string, unknown> | null {
    try {
      const parts = token.split(".");
      if (parts.length !== 3) return null;

      const payload = parts[1]!;
      // Handle base64url → base64
      const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
      const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
      const decoded = atob(padded);
      return JSON.parse(decoded) as Record<string, unknown>;
    } catch {
      return null;
    }
  }

  private findClaim(
    payload: Record<string, unknown>,
    claims: readonly string[]
  ): string | null {
    for (const claim of claims) {
      const value = payload[claim];
      if (typeof value === "string" && value.length > 0) {
        return value;
      }
    }
    return null;
  }
}
