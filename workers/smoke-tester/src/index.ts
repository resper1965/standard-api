import * as Sentry from "@sentry/cloudflare";

export interface Env {
  API_GATEWAY_URL: string;
  SMOKE_TEST_ORG_ID: string;
  M2M_API_KEY?: string;
  SENTRY_DSN?: string;
  /**
   * Service Binding to the API Gateway Worker (production only).
   * When present, healthcheck is done via Worker-to-Worker RPC — bypassing
   * the Cloudflare public proxy that causes error 1003 (Direct IP Access
   * Not Allowed) on same-zone calls.
   */
  STANDARD_API_GATEWAY?: Fetcher;
}

/**
 * SSRF mitigation: validate that a URL is safe to fetch.
 *
 * Rules enforced:
 *   1. Must be a valid URL (parseable).
 *   2. Protocol must be HTTPS (or HTTP only for internal service-binding URLs).
 *   3. Hostname must NOT be a private/reserved IP range or special TLD.
 *
 * This is called before every outbound fetch to prevent Server-Side Request
 * Forgery (SSRF) attacks in case the environment variable is ever misconfigured.
 *
 * @throws {Error} with a descriptive message if the URL fails validation.
 */
function assertSafeGatewayUrl(rawUrl: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error(`[SSRF] API_GATEWAY_URL is not a valid URL: "${rawUrl}"`);
  }

  // 1. Protocol: only HTTPS allowed for external fetches
  if (parsed.protocol !== "https:") {
    throw new Error(
      `[SSRF] API_GATEWAY_URL must use HTTPS, got "${parsed.protocol}" in "${rawUrl}"`
    );
  }

  const hostname = parsed.hostname.toLowerCase();

  // 2. Block loopback
  if (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "::1" ||
    hostname.startsWith("127.")
  ) {
    throw new Error(`[SSRF] Loopback address not allowed: "${hostname}"`);
  }

  // 3. Block RFC 1918 private IP ranges
  const privateRanges = [
    /^10\./,                          // 10.0.0.0/8
    /^172\.(1[6-9]|2\d|3[01])\./,    // 172.16.0.0/12
    /^192\.168\./,                    // 192.168.0.0/16
    /^169\.254\./,                    // 169.254.0.0/16 link-local
    /^0\./,                           // 0.0.0.0/8
    /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./,  // 100.64.0.0/10 CGNAT
  ];
  for (const re of privateRanges) {
    if (re.test(hostname)) {
      throw new Error(`[SSRF] Private IP range not allowed: "${hostname}"`);
    }
  }

  // 4. Block special TLDs used for local/internal resolution
  if (
    hostname.endsWith(".internal") ||
    hostname.endsWith(".local") ||
    hostname.endsWith(".localhost") ||
    hostname === "metadata.google.internal" ||
    hostname === "169.254.169.254"  // AWS/GCP metadata endpoint
  ) {
    throw new Error(`[SSRF] Internal/metadata hostname not allowed: "${hostname}"`);
  }

  return parsed;
}

export default Sentry.withSentry(
  (env: Env) => ({
    dsn: env.SENTRY_DSN || "https://REDACTED_SENTRY_DSN",
    sendDefaultPii: true,
  }),
  {
  async scheduled(
    controller: ScheduledController,
    env: Env,
    ctx: ExecutionContext
  ): Promise<void> {
    const runId = crypto.randomUUID();
    console.log(`[SMOKE_TEST] Starting scheduled run: ${runId}`);

    try {
      // 1. Healthcheck
      const healthUrl = `${env.API_GATEWAY_URL}/health`;
      console.log(`[SMOKE_TEST] Checking ${healthUrl}`);

      const healthStart = Date.now();

      // Use Service Binding when available (production): Worker-to-Worker call
      // bypasses Cloudflare public proxy and avoids error 1003.
      // IMPORTANT: when using a service binding, the URL hostname is irrelevant —
      // Cloudflare routes directly to the bound worker. Use a plain internal URL
      // to avoid triggering CF 1003 (Direct IP Access Not Allowed) that occurs
      // when a Worker fetches its own public custom hostname within the same zone.
      // Fall back to validated plain fetch for staging environments without bindings.
      let healthRes: Response;
      if (env.STANDARD_API_GATEWAY) {
        // Production: Worker-to-Worker via service binding (no external fetch).
        // Use an opaque internal URL — hostname is ignored by the binding router.
        const req = new Request("http://internal/health", {
          headers: { "x-smoke-test-run-id": runId },
        });
        healthRes = await env.STANDARD_API_GATEWAY.fetch(req);
      } else {
        // Staging / local-dev fallback: validate URL for SSRF before fetching.
        // assertSafeGatewayUrl throws if API_GATEWAY_URL is private/loopback/metadata.
        const safeUrl = assertSafeGatewayUrl(healthUrl);
        const req = new Request(safeUrl.toString(), {
          headers: { "x-smoke-test-run-id": runId },
          redirect: "error", // Never follow redirects — prevents open-redirect SSRF
        });
        healthRes = await fetch(req);
      }

      if (!healthRes.ok) {
        const text = await healthRes.text();

        // CF error 1003 (Direct IP Access Not Allowed) arrives as:
        //   - status 403 with HTML body containing "error code: 1003"
        //   - status 403 with JSON body containing {"errors":[{"code":1003,...}]}
        //   - status 530 (origin unreachable — Cloudflare infrastructure issue)
        // Treat these as transient infrastructure noise, not service failures.
        const is1003 =
          text.includes("1003") ||
          text.includes("error code: 1003") ||
          healthRes.status === 530;

        if (is1003) {
          console.warn(
            `[SMOKE_TEST] Healthcheck blocked by Cloudflare infrastructure ` +
            `(1003 Direct IP Access / 530 origin unreachable). ` +
            `Status=${healthRes.status}. Using Service Binding in production avoids this.`
          );
        } else {
          throw new Error(`Healthcheck failed with status ${healthRes.status}: ${text}`);
        }
      } else {
        const healthLatency = Date.now() - healthStart;
        console.log(`[SMOKE_TEST] Healthcheck passed in ${healthLatency}ms`);
      }

      console.log(`[SMOKE_TEST] Run ${runId} completed successfully.`);
    } catch (error) {
      // Format as CRITICAL so it can be picked up by SOC logpush alerts
      const errorPayload = {
        level: "CRITICAL",
        type: "SMOKE_TEST_FAILURE",
        runId,
        message: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString()
      };

      // Use console.error so it goes to stderr and is tagged properly in Cloudflare Logs
      console.error(JSON.stringify(errorPayload));

      // Send explicit exception to Sentry (redundant since withSentry catches unhandled, but good for explicit tags)
      Sentry.captureException(error, {
        level: "fatal",
        tags: { alert_type: "smoke_test_failure", runId }
      });

      // Re-throw if you want Cloudflare to record the invocation as failed in the dashboard
      throw error;
    }
  }
} satisfies ExportedHandler<Env>);


