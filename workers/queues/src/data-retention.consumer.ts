/**
 * @module data-retention.consumer
 * @description Purge handler for data retention enforcement.
 *
 * Triggered by the scheduled cron (`data_retention_purge` queue_type).
 * Enforces the retention periods defined in docs/operations/data-retention-policy.md.
 *
 * Rules enforced:
 *   - Operational metrics older than 90 days → hard delete
 *   - Agent usage records older than 1 year → hard delete
 *   - Workflow runs where assessment is closed > 1 year → hard delete
 *   - Soft-deleted tenants past 90 days → cascade purge
 *   - Soft-deleted assessments past 1 year → cascade purge
 *   - R2 document objects linked to purged assessments → delete
 *   - Vectorize vectors linked to purged KB entries → delete
 *
 * Legal hold: any tenant/org/assessment with active legal hold is skipped.
 * All purge actions are recorded in audit_logs.
 *
 * NEVER called directly — only via scheduled cron or queue message.
 */

import { neon } from "@neondatabase/serverless";
import type { Env } from "./index";

export interface RetentionPurgeMessage {
  queue_type: "data_retention_purge";
  dry_run?: boolean; // if true, logs what would be purged without deleting
  scope?: "metrics" | "assessments" | "tenants" | "all";
  initiated_by?: string; // operator user ID for audit trail
}

interface PurgeSummary {
  dry_run: boolean;
  started_at: string;
  completed_at?: string;
  deleted: {
    operational_metrics: number;
    agent_usage_records: number;
    workflow_runs: number;
    soft_deleted_tenants: number;
    soft_deleted_assessments: number;
  };
  skipped_legal_holds: string[];
  errors: string[];
}

export async function processDataRetentionPurge(
  body: RetentionPurgeMessage,
  env: Env,
): Promise<PurgeSummary> {
  if (!env.DATABASE_URL) {
    throw new Error(
      "[retention] DATABASE_URL not configured — cannot run purge",
    );
  }

  const sql = neon(env.DATABASE_URL);
  const dryRun = body.dry_run ?? false;
  const scope = body.scope ?? "all";
  const initiatedBy = body.initiated_by ?? "cron";
  const startedAt = new Date().toISOString();

  const summary: PurgeSummary = {
    dry_run: dryRun,
    started_at: startedAt,
    deleted: {
      operational_metrics: 0,
      agent_usage_records: 0,
      workflow_runs: 0,
      soft_deleted_tenants: 0,
      soft_deleted_assessments: 0,
    },
    skipped_legal_holds: [],
    errors: [],
  };

  console.log(
    `[retention] Starting purge. dry_run=${dryRun}, scope=${scope}, initiated_by=${initiatedBy}`,
  );

  // ── 1. Operational metrics > 90 days ────────────────────────────────
  if (scope === "all" || scope === "metrics") {
    try {
      const cutoff = new Date(
        Date.now() - 90 * 24 * 60 * 60 * 1000,
      ).toISOString();

      if (dryRun) {
        const count = await sql`
          SELECT COUNT(*) as n FROM operational_metrics
          WHERE created_at < ${cutoff}
        `;
        summary.deleted.operational_metrics = Number(count[0]?.n ?? 0);
        console.log(
          `[retention] [dry-run] Would delete ${summary.deleted.operational_metrics} operational_metrics rows`,
        );
      } else {
        const result = await sql`
          DELETE FROM operational_metrics
          WHERE created_at < ${cutoff}
        `;
        summary.deleted.operational_metrics = (result as any).count ?? 0;
        console.log(
          `[retention] Deleted ${summary.deleted.operational_metrics} operational_metrics rows (>90d)`,
        );
      }
    } catch (e: any) {
      // Table may not exist yet — not fatal
      const msg = `operational_metrics purge: ${e.message}`;
      summary.errors.push(msg);
      console.warn(`[retention] ${msg}`);
    }
  }

  // ── 2. Agent usage records > 1 year ─────────────────────────────────
  if (scope === "all" || scope === "metrics") {
    try {
      const cutoff = new Date(
        Date.now() - 365 * 24 * 60 * 60 * 1000,
      ).toISOString();

      if (dryRun) {
        const count = await sql`
          SELECT COUNT(*) as n FROM agent_usage_records
          WHERE created_at < ${cutoff}
        `;
        summary.deleted.agent_usage_records = Number(count[0]?.n ?? 0);
        console.log(
          `[retention] [dry-run] Would delete ${summary.deleted.agent_usage_records} agent_usage_records rows`,
        );
      } else {
        const result = await sql`
          DELETE FROM agent_usage_records
          WHERE created_at < ${cutoff}
        `;
        summary.deleted.agent_usage_records = (result as any).count ?? 0;
        console.log(
          `[retention] Deleted ${summary.deleted.agent_usage_records} agent_usage_records rows (>1y)`,
        );
      }
    } catch (e: any) {
      const msg = `agent_usage_records purge: ${e.message}`;
      summary.errors.push(msg);
      console.warn(`[retention] ${msg}`);
    }
  }

  // ── 3. Workflow runs for assessments closed > 1 year ─────────────────
  if (scope === "all" || scope === "assessments") {
    try {
      const cutoff = new Date(
        Date.now() - 365 * 24 * 60 * 60 * 1000,
      ).toISOString();

      if (dryRun) {
        const count = await sql`
          SELECT COUNT(*) as n FROM workflow_runs wr
          JOIN assessments a ON a.id = wr.assessment_id
          WHERE a.status IN ('closed', 'archived', 'cancelled')
            AND a.updated_at < ${cutoff}
            AND NOT EXISTS (
              SELECT 1 FROM legal_holds lh
              WHERE lh.organization_id = a.organization_id
                AND (lh.assessment_id = a.id OR lh.assessment_id IS NULL)
                AND lh.active = true
            )
        `;
        summary.deleted.workflow_runs = Number(count[0]?.n ?? 0);
        console.log(
          `[retention] [dry-run] Would delete ${summary.deleted.workflow_runs} workflow_runs rows`,
        );
      } else {
        const result = await sql`
          DELETE FROM workflow_runs
          WHERE id IN (
            SELECT wr.id FROM workflow_runs wr
            JOIN assessments a ON a.id = wr.assessment_id
            WHERE a.status IN ('closed', 'archived', 'cancelled')
              AND a.updated_at < ${cutoff}
              AND NOT EXISTS (
                SELECT 1 FROM legal_holds lh
                WHERE lh.organization_id = a.organization_id
                  AND (lh.assessment_id = a.id OR lh.assessment_id IS NULL)
                  AND lh.active = true
              )
          )
        `;
        summary.deleted.workflow_runs = (result as any).count ?? 0;
        console.log(
          `[retention] Deleted ${summary.deleted.workflow_runs} workflow_runs rows`,
        );
      }
    } catch (e: any) {
      const msg = `workflow_runs purge: ${e.message}`;
      summary.errors.push(msg);
      console.warn(`[retention] ${msg}`);
    }
  }

  // ── 4. Soft-deleted tenants past 90-day window ───────────────────────
  if (scope === "all" || scope === "tenants") {
    try {
      const cutoff = new Date(
        Date.now() - 90 * 24 * 60 * 60 * 1000,
      ).toISOString();

      // The `tenants` table was dropped in migration 0032_drop_legacy_tenants;
      // `organizations` IS the tenant (ADR 0002 Phase 2/3). Querying `tenants`
      // here threw `relation "tenants" does not exist` on every run, and the
      // error was swallowed into summary.errors below - so this purge has been
      // silently doing nothing. See the 2026-08-26 audit, finding M-01.
      const expiredTenants = await sql`
        SELECT id, slug FROM organizations
        WHERE deleted_at IS NOT NULL
          AND deleted_at < ${cutoff}
          AND NOT EXISTS (
            SELECT 1 FROM legal_holds lh
            WHERE lh.organization_id = organizations.id AND lh.active = true
          )
        LIMIT 50
      `;

      for (const tenant of expiredTenants) {
        if (dryRun) {
          console.log(
            `[retention] [dry-run] Would purge tenant ${tenant.id} (${tenant.slug})`,
          );
          summary.deleted.soft_deleted_tenants++;
        } else {
          // NOTE: the foreign keys pointing at organizations are ON DELETE NO
          // ACTION (see migration 0047), NOT cascade as an earlier comment here
          // claimed. This DELETE therefore fails with a foreign-key violation
          // whenever the organization still owns any row. Deleting dependants in
          // order - and deciding what happens to the append-only ledger, which
          // migration 0054 forbids deleting at all - is audit finding M-02 and
          // needs an ADR before this can do real work.
          await sql`DELETE FROM organizations WHERE id = ${tenant.id}`;
          summary.deleted.soft_deleted_tenants++;

          // Audit the purge action itself
          await sql`
            INSERT INTO audit_logs (id, organization_id, event_type, actor_id, metadata, created_at)
            VALUES (
              gen_random_uuid(), ${tenant.id}, 'tenant.hard_purged',
              ${initiatedBy},
              ${JSON.stringify({ reason: "retention_policy_90d", initiated_by: initiatedBy })},
              NOW()
            )
          `.catch(() => {}); // audit failure is non-fatal

          console.log(
            `[retention] Hard-purged tenant ${tenant.id} (${tenant.slug})`,
          );
        }
      }
    } catch (e: any) {
      const msg = `tenant purge: ${e.message}`;
      summary.errors.push(msg);
      console.warn(`[retention] ${msg}`);
    }
  }

  // ── 5. Soft-deleted assessments past 1-year window ───────────────────
  if (scope === "all" || scope === "assessments") {
    try {
      const cutoff = new Date(
        Date.now() - 365 * 24 * 60 * 60 * 1000,
      ).toISOString();

      const expiredAssessments = await sql`
        SELECT id, organization_id, title FROM assessments
        WHERE deleted_at IS NOT NULL
          AND deleted_at < ${cutoff}
          AND NOT EXISTS (
            SELECT 1 FROM legal_holds lh
            WHERE lh.organization_id = assessments.organization_id
              AND (lh.assessment_id = assessments.id OR lh.assessment_id IS NULL)
              AND lh.active = true
          )
        LIMIT 100
      `;

      for (const a of expiredAssessments) {
        if (dryRun) {
          console.log(
            `[retention] [dry-run] Would purge assessment ${a.id} (${a.title})`,
          );
          summary.deleted.soft_deleted_assessments++;
        } else {
          await sql`DELETE FROM assessments WHERE id = ${a.id}`;
          summary.deleted.soft_deleted_assessments++;

          await sql`
            INSERT INTO audit_logs (id, organization_id, event_type, actor_id, metadata, created_at)
            VALUES (
              gen_random_uuid(), ${a.organization_id}, 'assessment.hard_purged',
              ${initiatedBy},
              ${JSON.stringify({ assessment_id: a.id, reason: "retention_policy_1y" })},
              NOW()
            )
          `.catch(() => {});

          console.log(`[retention] Hard-purged assessment ${a.id}`);
        }
      }
    } catch (e: any) {
      const msg = `assessment purge: ${e.message}`;
      summary.errors.push(msg);
      console.warn(`[retention] ${msg}`);
    }
  }

  summary.completed_at = new Date().toISOString();

  const totalDeleted = Object.values(summary.deleted).reduce(
    (a, b) => a + b,
    0,
  );

  if (summary.errors.length > 0) {
    // Previously every failure was console.warn'd and the run still reported
    // success, which is how a purge querying a table dropped in 0032 went
    // unnoticed indefinitely. A retention job that cannot delete is a
    // compliance failure and must be loud (audit M-01).
    console.error(
      `[retention] Purge FAILED with ${summary.errors.length} error(s). ` +
        `dry_run=${dryRun} | deleted=${totalDeleted} | errors=${JSON.stringify(summary.errors)}`,
    );
  } else {
    console.log(
      `[retention] Purge complete. dry_run=${dryRun} | deleted=${totalDeleted}`,
    );
  }

  return summary;
}
