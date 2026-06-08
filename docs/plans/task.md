| Task | Status | Description |
| --- | :---: | --- |
| **Cloudflare/Wrangler Resource Isolation** | | |
| - Edit `infra/cloudflare/wrangler.api-gateway.toml` | `[x]` | Separate Dev/Staging KV/R2 |
| - Edit `infra/cloudflare/wrangler.workflows.toml` | `[x]` | Separate Dev/Staging KV/Workflows |
| - Edit `infra/cloudflare/wrangler.queues-worker.toml` | `[x]` | Separate Dev/Staging Queue consumers |
| **SQL Multi-Tenancy Drizzle Adapters** | | |
| - Edit `assessment.repository.ts` | `[x]` | Add organizationId checks to get/listAll/save |
| - Edit `organization.repository.ts` | `[x]` | Add organizationId checks to details fetch |
| - Edit `webhook.repository.ts` | `[x]` | Add organizationId checks to all methods |
| - Edit `approval.repository.ts` | `[x]` | Fix dangling comma and add organizationId filtering |
| - Edit `kb.repository.ts` | `[x]` | Add organizationId checks to job and list queries |
| **DLQ Log Redaction & Security** | | |
| - Edit `soc-monitoring.consumer.ts` | `[x]` | Redact sensitive keys in console error dump |
| **In-Memory SQLite Integration in Test Helpers** | | |
| - Edit `apps/api-gateway/tests/helpers.ts` | `[x]` | Instantiate Drizzle SQLite database for integration client |
| **Verification & Build validation** | | |
| - Run `pnpm typecheck` | `[x]` | Verify compile-time type safety |
| - Run `pnpm test` | `[x]` | Verify all test suites pass |
