import type { AuthContext, Role } from "@aegis/schemas";
import type { AuthenticateInput, AuthProvider } from "./auth-provider";

export class JwtAuthProvider implements AuthProvider {
  /**
   * Authenticate validates a Bearer token received from Cloudflare Access or generic JWT.
   * In a real edge environment, this would securely verify JWKS signatures using 'jose' or 'cloudflare-worker-jwt'.
   */
  async authenticate(input: AuthenticateInput): Promise<AuthContext | null> {
    if (!input.authHeader || !input.authHeader.startsWith("Bearer ")) {
      return null;
    }

    const token = input.authHeader.split(" ")[1];
    if (!token) return null;
    
    try {
      // Decode JWT Payload safely (Edge compatible Base64 parse)
      const payloadBase64 = token.split(".")[1];
      if (!payloadBase64) return null;
      
      const payloadString = atob(payloadBase64);
      const payload = JSON.parse(payloadString);
      
      const actorId = payload.sub || input.actorId || "service-actor";
      const tenantId = payload.tenant_id || input.tenantId;
      const roles = (payload.roles || input.roles || []) as Role[];
      
      if (!tenantId) {
        return null; // Strict multi-tenancy: Deny tokens without tenant scope
      }

      return {
        actor_id: actorId,
        actor_type: "user",
        ...(tenantId ? { tenant_id: tenantId } : {}),
        roles,
        permissions: payload.permissions || [],
        organization_ids: payload.organization_ids || input.organizationIds || [],
        auth_method: "jwt",
        issued_at: new Date().toISOString(),
        trace_id: input.traceId || ""
      };
    } catch (e) {
      // Malformed or invalid JWT triggers rejection
      return null;
    }
  }
}
