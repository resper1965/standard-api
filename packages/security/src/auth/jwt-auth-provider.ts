import type { AuthContext, Role } from "@standard/schemas";
import { jwtVerify, createRemoteJWKSet, importSPKI, type JWTPayload } from "jose";
import type { AuthenticateInput, AuthProvider } from "./auth-provider";

/**
 * @deprecated Use `@standard/auth` (Better Auth) instead.
 * This provider will be removed in v0.3.0.
 *
 * JWT Auth Provider configuration.
 * Supports two verification modes:
 * - JWKS (remote): fetch public keys from a JWKS URL (e.g., Cloudflare Access, Auth0, Clerk)
 * - Symmetric (HS256): secret string for simpler setups
 */
export type JwtAuthConfig =
  | { mode: "jwks"; jwksUrl: string }
  | { mode: "secret"; secret: string }
  | { mode: "decode-only" }; // Non-production fallback: decode without signature verification

const StandardClaimsSymbol = Symbol("standard-claims");

interface StandardClaims extends JWTPayload {
  tenant_id?: string;
  organization_ids?: string[];
  roles?: Role[];
  permissions?: string[];
}

export class JwtAuthProvider implements AuthProvider {
  constructor(private readonly config: JwtAuthConfig = { mode: "decode-only" }) {}

  async authenticate(input: AuthenticateInput): Promise<AuthContext | null> {
    if (!input.authHeader || !input.authHeader.startsWith("Bearer ")) {
      return null;
    }

    const token = input.authHeader.split(" ")[1];
    if (!token) return null;

    let payload: StandardClaims;

    try {
      payload = await this.verify(token);
    } catch {
      return null;
    }

    const actorId = payload.sub || input.actorId || "service-actor";
    const tenantId = payload.tenant_id || input.tenantId;
    const roles = (payload.roles || input.roles || []) as Role[];

    if (!tenantId) {
      // Strict multi-tenancy: deny tokens without tenant scope
      return null;
    }

    return {
      actor_id: actorId,
      actor_type: "user",
      tenant_id: tenantId,
      roles,
      permissions: (payload.permissions as AuthContext["permissions"]) || [],
      organization_ids: payload.organization_ids || input.organizationIds || [],
      auth_method: "jwt",
      issued_at: new Date().toISOString(),
      trace_id: input.traceId || ""
    };
  }

  private async verify(token: string): Promise<StandardClaims> {
    if (this.config.mode === "decode-only") {
      // Non-production fallback: base64 decode only, no signature check
      const payloadBase64 = token.split(".")[1];
      if (!payloadBase64) throw new Error("malformed_token");
      return JSON.parse(atob(payloadBase64)) as StandardClaims;
    }

    if (this.config.mode === "secret") {
      const secret = new TextEncoder().encode(this.config.secret);
      const { payload } = await jwtVerify(token, secret, {
        algorithms: ["HS256"]
      });
      return payload as StandardClaims;
    }

    // JWKS mode: fetch public keys remotely (works in Cloudflare Edge via Web Crypto)
    const JWKS = createRemoteJWKSet(new URL(this.config.jwksUrl));
    const { payload } = await jwtVerify(token, JWKS);
    return payload as StandardClaims;
  }
}

/**
 * Factory: build the correct JwtAuthConfig from Cloudflare Env bindings.
 * Priority: JWKS_URL > JWT_SECRET > decode-only (dev/test fallback).
 */
export const buildJwtConfig = (env: {
  JWT_JWKS_URL?: string;
  JWT_SECRET?: string;
}): JwtAuthConfig => {
  if (env.JWT_JWKS_URL) {
    return { mode: "jwks", jwksUrl: env.JWT_JWKS_URL };
  }
  if (env.JWT_SECRET) {
    return { mode: "secret", secret: env.JWT_SECRET };
  }
  return { mode: "decode-only" };
};

