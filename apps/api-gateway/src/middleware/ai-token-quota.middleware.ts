/**
 * @module ai-token-quota.middleware
 * @description Per-organization monthly AI token budget enforcement.
 *
 * Checks whether the organization has exceeded its monthly AI token quota
 * before allowing MCP tool dispatch. Token usage is recorded by the queue
 * consumer (`workers/queues/src/mcp-tool.consumer.ts`) after each AI
 * Gateway call completes.
 *
 * KV key format: `org:{organizationId}:ai_tokens:{YYYY-MM}`
 *   - Month-scoped keys auto-expire via TTL (~35 days), providing natural
 *     monthly resets without cron jobs.
 *
 * Design decisions:
 *   - Single KV GET per request — no DB queries, minimal latency.
 *   - Gracefully skips if KV is unavailable (local dev / binding missing).
 *   - Gracefully skips if organizationId is not resolved (unauthenticated).
 *   - Default budget: 1,000,000 tokens/month (future: read from org plan).
 *   - Returns standard 429 with `Retry-After` pointing to next month reset.
 *
 * @see workers/queues/src/mcp-tool.consumer.ts  (token recording)
 * @see apps/api-gateway/src/middleware/mcp-quota.middleware.ts  (call-count sibling)
 * @see docs/decisions/IMPLEMENTATION-CONSTRAINTS.md  (KV-first caching rule)
 */

export interface AiTokenQuotaKV {
  get(key: string): Promise<string | null>;
}

export interface AiTokenQuotaConfig {
  /** Maximum AI tokens per month per organization. Default: 1_000_000 */
  budgetPerMonth?: number;
}

export interface AiTokenQuotaResult {
  allowed: boolean;
  used: number;
  budget: number;
  /** ISO date string for the first day of the next month (quota reset). */
  resetDate: string;
}

/**
 * checkAiTokenQuota — check per-org monthly AI token budget.
 *
 * Pure function: reads KV, returns allowed/denied. Does NOT write.
 * Writing (incrementing) happens in the queue consumer after tool execution.
 *
 * @param organizationId  Tenant org ID
 * @param kv              Cloudflare KV namespace binding (STANDARD_CACHE)
 * @param config          Optional quota config — defaults to 1M tokens/month
 */
export async function checkAiTokenQuota(
  organizationId: string,
  kv: AiTokenQuotaKV,
  config: AiTokenQuotaConfig = {},
): Promise<AiTokenQuotaResult> {
  const budget = config.budgetPerMonth ?? 1_000_000;
  const now = new Date();
  const month = now.toISOString().slice(0, 7); // YYYY-MM
  const key = `org:${organizationId}:ai_tokens:${month}`;

  const raw = await kv.get(key);
  const used = raw != null ? parseInt(raw, 10) : 0;

  // Compute reset date: first day of next month at 00:00:00Z
  const nextMonth = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1),
  );
  const resetDate = nextMonth.toISOString();

  return {
    allowed: used < budget,
    used,
    budget,
    resetDate,
  };
}
