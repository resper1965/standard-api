import { eq, type Column } from "drizzle-orm";
import type { AuthProvider, AuthenticateInput } from "./auth-provider";
import type { AuthContext, Permission } from "@standard/schemas";
import { DEFAULT_ROLE_PERMISSIONS } from "../constants";

/**
 * Minimal contract for the API keys database table.
 * Structural typing lets this work with any Drizzle table that has these columns.
 */
type ApiKeysTableRef = {
  keyHash: Column;
  id: Column;
};

/**
 * Minimal contract for the database client.
 * Compatible with any Drizzle instance that supports relational queries.
 */
type ApiKeysDbClient = {
  query: {
    apiKeys: {
      findFirst: (opts: { where: ReturnType<typeof eq> }) => Promise<{
        id: string;
        organizationId: string;
        keyHash: string;
        scopes: string[] | null;
        expiresAt: string | null;
        deletedAt: string | null;
      } | null>;
    };
  };
  update: (table: ApiKeysTableRef) => {
    set: (values: Record<string, unknown>) => {
      where: (condition: ReturnType<typeof eq>) => Promise<void>;
    };
  };
};

/**
 * API Key Auth Provider — validates hashed API keys against the database.
 *
 * Security:
 * - Keys are stored as SHA-256 hashes (never plaintext).
 * - Comparison uses constant-time equality to prevent timing attacks.
 * - Expired keys are rejected.
 * - `lastUsedAt` is updated on successful auth for audit trail.
 *
 * Runtime: Uses Web Crypto API (works in Cloudflare Workers, Deno, Node 18+).
 */
export class ApiKeyAuthProvider implements AuthProvider {
  constructor(
    private readonly db: ApiKeysDbClient,
    private readonly apiKeysTable: ApiKeysTableRef
  ) {}

  async authenticate(input: AuthenticateInput): Promise<AuthContext | null> {
    const rawKey = input.apiKey || this.extractBearerKey(input.authHeader);
    if (!rawKey) return null;

    // Hash the incoming key (SHA-256) using Web Crypto API
    const keyHash = await this.sha256Hex(rawKey);

    // Look up the key by hash
    const record = await this.db.query.apiKeys.findFirst({
      where: eq(this.apiKeysTable.keyHash, keyHash),
    });

    if (!record) return null;

    // Check expiration
    if (record.expiresAt && new Date(record.expiresAt) < new Date()) {
      return null;
    }

    // Check soft-delete
    if (record.deletedAt) return null;

    // Constant-time hash comparison (defense in depth)
    if (!this.timingSafeCompare(record.keyHash, keyHash)) return null;

    // Update lastUsedAt (fire-and-forget, don't block auth)
    this.db
      .update(this.apiKeysTable)
      .set({ lastUsedAt: new Date() })
      .where(eq(this.apiKeysTable.id, record.id))
      .catch(() => {});

    return {
      actor_id: `apikey:${record.id}`,
      actor_type: "service_account",
      organization_id: record.organizationId,
      organization_ids: [record.organizationId],
      roles: ["integration_service"],
      permissions: this.resolvePermissions(record.scopes ?? []),
      auth_method: "api_key",
      issued_at: new Date().toISOString(),
      trace_id: input.traceId,
    };
  }

  /**
   * SHA-256 hash using Web Crypto API (Workers/Deno/Node 18+ compatible).
   */
  private async sha256Hex(data: string): Promise<string> {
    const encoder = new TextEncoder();
    const buffer = await crypto.subtle.digest("SHA-256", encoder.encode(data));
    const hashArray = Array.from(new Uint8Array(buffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  /**
   * Constant-time string comparison.
   * Prevents timing attacks by always comparing all characters.
   */
  private timingSafeCompare(a: string, b: string): boolean {
    if (a.length !== b.length) return false;
    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    return result === 0;
  }

  /**
   * Extract API key from Authorization header.
   * Supports: `Bearer sk-xxx` and `ApiKey sk-xxx` formats.
   */
  private extractBearerKey(header?: string): string | undefined {
    if (!header) return undefined;
    const match = header.match(/^(?:Bearer|ApiKey)\s+(.+)$/i);
    return match?.[1];
  }

  /**
   * Map scopes to permissions.
   * Empty scopes = wildcard (backward compatible with existing keys).
   */
  private resolvePermissions(
    scopes: string[]
  ): Permission[] {
    if (scopes.length === 0) {
      // Default: integration_service permissions
      return [...DEFAULT_ROLE_PERMISSIONS.integration_service];
    }
    const allPerms = DEFAULT_ROLE_PERMISSIONS.integration_service;
    const result: Permission[] = [];
    for (const perm of allPerms) {
      const [resource] = perm.split(":");
      if (resource && scopes.some((s) => perm.startsWith(s) || s === resource)) {
        result.push(perm);
      }
    }
    return result.length > 0 ? result : ["assessment:read" as Permission];
  }
}
