/**
 * @module api-key-crypto
 * @description Centralized API key token generation and hashing.
 * Single source of truth for key format, prefix, and hash algorithm.
 */

const API_KEY_PREFIX = "standard_live_";

export interface GeneratedApiKey {
  fullToken: string;
  keyHash: string;
  maskedKey: string;
}

export async function generateApiKey(): Promise<GeneratedApiKey> {
  const rawSecret = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
  const fullToken = `${API_KEY_PREFIX}${rawSecret}`;
  const maskedKey = `${API_KEY_PREFIX}...${fullToken.slice(-4)}`;
  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(fullToken));
  const keyHash = Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
  return { fullToken, keyHash, maskedKey };
}

export function isApiKeyToken(authHeader: string): boolean {
  return authHeader.startsWith(`Bearer ${API_KEY_PREFIX}`);
}

export function extractApiKeyToken(authHeader: string): string {
  return authHeader.replace("Bearer ", "");
}
