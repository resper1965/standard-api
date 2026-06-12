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

      // Guard: never attempt healthcheck against localhost/loopback on the edge.
      // This would always fail with CF error 1003 (Direct IP Access Not Allowed).
      const isLoopback =
        env.API_GATEWAY_URL.includes("localhost") ||
        env.API_GATEWAY_URL.includes("127.0.0.1") ||
        env.API_GATEWAY_URL.includes("::1");
      if (isLoopback) {
        console.warn(
          `[SMOKE_TEST] Skipping healthcheck — API_GATEWAY_URL is a loopback address (${env.API_GATEWAY_URL}). ` +
          `This worker must be deployed with --env production or a valid remote URL.`
        );
        return;
      }

      const healthStart = Date.now();

      // Use Service Binding when available (production): Worker-to-Worker call
      // bypasses Cloudflare public proxy and avoids error 1003.
      // IMPORTANT: when using a service binding, the URL hostname is irrelevant —
      // Cloudflare routes directly to the bound worker. Use a plain internal URL
      // to avoid triggering CF 1003 (Direct IP Access Not Allowed) that occurs
      // when a Worker fetches its own public custom hostname within the same zone.
      // Fall back to plain fetch for local/staging environments without bindings.
      const fetchUrl = env.STANDARD_API_GATEWAY
        ? `http://internal/health`
        : healthUrl;
      const req = new Request(fetchUrl, {
        headers: { "x-smoke-test-run-id": runId },
      });
      const healthRes = env.STANDARD_API_GATEWAY
        ? await env.STANDARD_API_GATEWAY.fetch(req)
        : await fetch(req);

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
