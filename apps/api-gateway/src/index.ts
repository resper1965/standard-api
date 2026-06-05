import "./openapi/registry"; // Must be imported first to extend Zod
export type { Env } from "./types/env";
import { ensureAppInitialized, handleAuthRoute } from "./index-helpers";
import type { Env } from "./types/env";

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const app = ensureAppInitialized(env);
    const url = new URL(request.url);

    // ── Standard Native Auth route handler ────────────────────────────
    // Delegate /api/auth/* requests directly to Standard Native Auth.
    // This MUST happen before the standard API router runs.
    const authResponse = await handleAuthRoute(request, url);
    if (authResponse) return authResponse;

    return app.fetch(request, ctx);
  }
};
