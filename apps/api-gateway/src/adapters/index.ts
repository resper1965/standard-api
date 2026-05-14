/**
 * @module adapters/index
 * @description Composition root — assembles all domain dependency graphs.
 *
 * Split into per-domain factories in compose-*.ts for maintainability.
 * This file orchestrates them into a single AppDependencies instance.
 */
import { createInMemoryAgentRuntimeDependencies } from "@standard/agent-runtime";
import { createInMemoryKbDependencies } from "@standard/kb";
import { createInMemoryGapAnalysisDependencies } from "@standard/gap-analysis";
import { createInMemoryObservabilityDependencies, AlertService, SecurityEventService } from "@standard/observability";
import { createInMemoryPoamDependencies } from "@standard/poam";
import { createInMemoryReportingDependencies } from "@standard/reporting";
import { createInMemoryScfCore, createScfCoreFromRepository, createDrizzleScfRepository } from "@standard/scf-core";
import { createInMemorySoaDependencies } from "@standard/soa";
import { createInMemoryPrivacyDependencies } from "@standard/privacy";
import { createInMemoryWorkflowDependencies } from "@standard/workflows";
import { createInMemoryDocumentIngestionDependencies } from "@standard/document-ingestion";
import type { AppDependencies } from "../http";
import type { Env } from "../index";
import type { DbClient } from "./db";

// Per-domain composition factories
import { composeDrizzleDocumentIngestion, composeDrizzleKb } from "./compose-document-ingestion";
import { composeDrizzleObservability } from "./compose-observability";
import { composeDrizzleAgentRuntime } from "./compose-agent-runtime";

// Repository adapters
import { createDrizzleWorkflowDependencies } from "./workflow.repository";
import { createDrizzlePrivacyRepositories } from "./privacy.repository";
import { createAssessmentRepository, createDrizzleAssessmentRepository } from "./assessment.repository";
import { createArtifactRepository } from "./artifact.repository";
import { createDrizzleArtifactRepository } from "./artifact.drizzle.repository";
import { createAuditRepository, createDrizzleAuditRepository } from "./audit.repository";
import { createApprovalRepository, createDrizzleApprovalRepository } from "./approval.repository";
import { createLifecycleEventRepository, createDrizzleLifecycleEventRepository } from "./lifecycle.repository";
import { createOrganizationRepository, createDrizzleOrganizationRepository } from "./organization.repository";
import { createTenantRepository, createDrizzleTenantRepository } from "./tenant.repository";
import { createDrizzleSoaRepositories } from "./soa.repository";
import { createDrizzleGapAnalysisRepositories } from "./gap-analysis.repository";
import { createDrizzlePoamRepositories } from "./poam.repository";
import { createDrizzleReportRepositories } from "./reporting.repository";
import { createMockApiKeysRepository, createDrizzleApiKeysRepository } from "./api-keys.repository";
import { createInMemoryWebhookRepository, createDrizzleWebhookRepository } from "./webhook.repository";

/**
 * Type bridge: NeonHttpDatabase (edge) ↔ PostgresJsDatabase (packages).
 */
const asDb = (db: DbClient) => db as unknown as Parameters<typeof createDrizzleScfRepository>[0];

// ─── In-Memory (mock) composition ──────────────────────────────
export const createMockRepositories = (): AppDependencies => {
  const documentIngestion = createInMemoryDocumentIngestionDependencies();
  const kb = createInMemoryKbDependencies(documentIngestion);
  const scf = createInMemoryScfCore();
  const soa = createInMemorySoaDependencies({ scf, kb });
  const gapAnalysis = createInMemoryGapAnalysisDependencies({ scf, kb, soa });
  const poam = createInMemoryPoamDependencies({ gapAnalysis, scf });
  return {
    tenants: createTenantRepository(),
    organizations: createOrganizationRepository(),
    apiKeys: createMockApiKeysRepository(),
    assessments: createAssessmentRepository(),
    approvals: createApprovalRepository(),
    artifacts: createArtifactRepository(),
    lifecycleEvents: createLifecycleEventRepository(),
    audit: createAuditRepository(),
    documentIngestion,
    kb,
    scf,
    soa,
    gapAnalysis,
    poam,
    reporting: createInMemoryReportingDependencies({ soa, gapAnalysis, poam, scf }),
    agentRuntime: createInMemoryAgentRuntimeDependencies(),
    workflows: createInMemoryWorkflowDependencies(),
    observability: createInMemoryObservabilityDependencies(),
    alerts: new AlertService(new SecurityEventService(createInMemoryObservabilityDependencies())),
    privacy: createInMemoryPrivacyDependencies(),
    webhooks: createInMemoryWebhookRepository()
  };
};

// ─── Drizzle (production) composition ──────────────────────────
export const createDrizzleRepositories = (db: DbClient, env?: Env): AppDependencies => {
  // Composed domain graphs (extracted to per-domain factories)
  const documentIngestion = composeDrizzleDocumentIngestion(db, env);
  const kb = composeDrizzleKb(db, documentIngestion, env);
  const scf = createScfCoreFromRepository(createDrizzleScfRepository(asDb(db)));
  const { observability, alerts } = composeDrizzleObservability(db, env);

  // GRC domain chain: SoA → Gap → POA&M → Reporting
  const soaRepositories = createDrizzleSoaRepositories(db);
  const soa = { repositories: soaRepositories, scf, kb };

  const gapRepositories = createDrizzleGapAnalysisRepositories(db);
  const gapAnalysis = { repositories: gapRepositories, soa, kb, scf };

  const poamRepositories = createDrizzlePoamRepositories(db);
  const poam = { repositories: poamRepositories, gapAnalysis, scf };

  const reportRepositories = createDrizzleReportRepositories(db);
  const reporting = { repositories: reportRepositories, soa, gapAnalysis, poam, scf };

  return {
    tenants: createDrizzleTenantRepository(db),
    organizations: createDrizzleOrganizationRepository(db),
    apiKeys: createDrizzleApiKeysRepository(db),
    assessments: createDrizzleAssessmentRepository(db),
    approvals: createDrizzleApprovalRepository(db),
    artifacts: createDrizzleArtifactRepository(db),
    lifecycleEvents: createDrizzleLifecycleEventRepository(db),
    audit: createDrizzleAuditRepository(db),
    documentIngestion,
    kb,
    scf,
    soa,
    gapAnalysis,
    poam,
    reporting,
    agentRuntime: composeDrizzleAgentRuntime(db, env),
    workflows: createDrizzleWorkflowDependencies(db),
    observability,
    alerts,
    privacy: { repositories: createDrizzlePrivacyRepositories(db) },
    webhooks: createDrizzleWebhookRepository(db)
  };
};
