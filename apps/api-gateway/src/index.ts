import "./openapi/registry"; // Must be imported first to extend Zod
import asyncHooks from "node:async_hooks";
if (typeof globalThis !== "undefined") {
  (globalThis as any).AsyncLocalStorage = asyncHooks.AsyncLocalStorage;
}
export type { Env } from "./types/env";
import {
  ensureAppInitialized,
  handleAuthRoute,
  createRequestApp,
} from "./index-helpers";
import type { Env as AppEnv } from "./types/env";
import * as Sentry from "@sentry/cloudflare";

export default Sentry.withSentry(
  (env: AppEnv) => ({
    dsn: (env as any).SENTRY_DSN || "",
    sendDefaultPii: false,
  }),
  {
    async fetch(
      request: Request,
      env: AppEnv,
      ctx: ExecutionContext,
    ): Promise<Response> {
      const url = new URL(request.url);

      let app: ReturnType<typeof ensureAppInitialized>;
      let auth: any = null;

      if (env.DATABASE_URL) {
        const reqScope = createRequestApp(env);
        app = reqScope.app;
        auth = reqScope.auth;
      } else {
        app = ensureAppInitialized(env);
      }

      // Delegate /api/auth/* requests directly to Standard Native Auth.
      try {
        const authResponse = await handleAuthRoute(request, url, auth, env);
        if (authResponse) return authResponse;
      } catch (err: unknown) {
        console.error("[standard:auth] Route Error:", err);
        return new Response(
          JSON.stringify({
            error: "internal_server_error",
            message: "An internal authentication error occurred.",
          }),
          {
            status: 500,
            headers: { "Content-Type": "application/json" },
          },
        );
      }

      return app.fetch(request, ctx);
    },
  } satisfies ExportedHandler<AppEnv>,
);

export { AssessmentSessionDO } from "./durable-objects/assessment-session.do";

