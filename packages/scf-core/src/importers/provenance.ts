/**
 * Generates a SHA-256 hex hash of raw content bytes to serve
 * as an immutable provenance signature in the database.
 *
 * Uses the Web Crypto API (available in Node 18+, Workers, Deno).
 */
export async function generateProvenanceHash(content: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", content);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
