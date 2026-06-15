# Tasks Checklist — Request-Scoped Connection Refactoring

| Task ID | Task Description | Status |
|---|---|---|
| TASK-01 | Modify `http.ts` to add `betterAuth` property to `RequestContext` | Completed |
| TASK-02 | Modify `app.ts` to forward `auth` parameter in `RequestContext` | Completed |
| TASK-03 | Modify `index-helpers.ts` (createRequestApp, handleAuthRoute, banUser closure) | Completed |
| TASK-04 | Modify `index.ts` to dynamically use `createRequestApp` per-request | Completed |
| TASK-05 | Modify `admin-users.routes.ts` to use `context.betterAuth` | Completed |
| TASK-06 | Run local tests (`pnpm test`) to ensure no regressions | Completed |
| TASK-07 | Deploy the API Gateway to Cloudflare production (`pnpm cf:deploy:production`) | Completed |
| TASK-08 | Verify organization activation and API key generation | Awaiting User Verification |
| TASK-09 | Fix soft-revocation logic in `auth.middleware.ts` to bypass caches without throwing 401 | Completed |
| TASK-10 | Run tests and redeploy to production (`pnpm cf:deploy:production`) | Completed |
| TASK-11 | Remove `revokeSession` from `/activate` and set `session_rotated: false` to prevent login loop | Completed |
| TASK-12 | Run tests and redeploy updated gateway to Cloudflare production | Completed |
