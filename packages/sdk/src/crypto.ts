/**
 * crypto.ts — Web Crypto helpers for the Standard SDK
 *
 * Uses the Web Crypto API (globalThis.crypto.subtle) — zero dependencies.
 * Compatible with: Node.js 18+, Cloudflare Workers, Deno, Bun, browsers.
 */

const encoder = new TextEncoder();

/**
 * Compute HMAC-SHA256 of a payload with the given secret.
 * Returns a lowercase hex string identical to what the server generates.
 */
async function hmacSha256(payload: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Timing-safe string comparison to prevent timing attacks.
 * Compares two hex strings of the same expected length.
 */
function timingSafeEqual(a: string, b: string): boolean {
  // Pad both to the same length so the loop always runs a fixed number of iterations
  const maxLen = Math.max(a.length, b.length);
  let result = 0;
  for (let i = 0; i < maxLen; i++) {
    result |= (a.charCodeAt(i) ?? 0) ^ (b.charCodeAt(i) ?? 0);
  }
  // Also compare lengths without short-circuit
  result |= a.length ^ b.length;
  return result === 0;
}

export type WebhookEvent = {
  event_id: string;
  event_type: string;
  timestamp: string;
  trace_id: string;
  data: Record<string, unknown>;
  [key: string]: unknown;
};

/**
 * Verify and parse a Standard webhook event.
 *
 * @param rawBody  - The raw request body as a string (NOT parsed JSON)
 * @param signature - Value of the `X-Standard-Signature` header
 * @param secret   - Your webhook signing secret (from `webhooks.create()`)
 * @returns Parsed WebhookEvent if valid
 * @throws Error with code "WEBHOOK_SIGNATURE_INVALID" if signature does not match
 *
 * @example
 * ```typescript
 * app.post("/webhook", async (req) => {
 *   const event = await client.webhooks.constructEvent(
 *     req.rawBody,
 *     req.headers["x-standard-signature"],
 *     process.env.WEBHOOK_SECRET!,
 *   );
 *   console.log(event.event_type); // "assessment.gap_analysis.approved"
 * });
 * ```
 */
export async function constructEvent(
  rawBody: string,
  signature: string,
  secret: string,
): Promise<WebhookEvent> {
  if (!rawBody || !signature || !secret) {
    const err = new Error(
      "constructEvent requires rawBody, signature, and secret",
    );
    (err as NodeJS.ErrnoException).code = "WEBHOOK_SIGNATURE_INVALID";
    throw err;
  }

  const expected = await hmacSha256(rawBody, secret);

  if (!timingSafeEqual(expected, signature.toLowerCase())) {
    const err = new Error(
      "Webhook signature verification failed. Ensure you are passing the raw request body (not parsed JSON) and the correct signing secret.",
    );
    (err as NodeJS.ErrnoException).code = "WEBHOOK_SIGNATURE_INVALID";
    throw err;
  }

  try {
    return JSON.parse(rawBody) as WebhookEvent;
  } catch {
    const err = new Error("Webhook body is not valid JSON");
    (err as NodeJS.ErrnoException).code = "WEBHOOK_SIGNATURE_INVALID";
    throw err;
  }
}
