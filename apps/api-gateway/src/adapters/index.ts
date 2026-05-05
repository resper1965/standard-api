import { createInMemoryAgentRuntimeDependencies } from "@aegis/agent-runtime";
import { createInMemoryDocumentIngestionDependencies, CloudflareR2StorageAdapter } from "@aegis/document-ingestion";
import { createInMemoryGapAnalysisDependencies } from "@aegis/gap-analysis";
import { createInMemoryKbDependencies } from "@aegis/kb";
import { createInMemoryObservabilityDependencies } from "@aegis/observability";
import { createInMemoryPoamDependencies } from "@aegis/poam";
import { createInMemoryReportingDependencies } from "@aegis/reporting";
import { createInMemoryScfCore, createScfCoreFromRepository, createDrizzleScfRepository } from "@aegis/scf-core";
import { createInMemorySoaDependencies } from "@aegis/soa";
import { createInMemoryWorkflowDependencies } from "@aegis/workflows";
import type { AppDependencies } from "../http";
import type { Env } from "../index";
import type { DbClient } from "./db";
import { createAssessmentRepository, createDrizzleAssessmentRepository } from "./assessment.repository";
import { createArtifactRepository } from "./artifact.repository";
import { createAuditRepository, createDrizzleAuditRepository } from "./audit.repository";
import { createApprovalRepository, createDrizzleApprovalRepository } from "./approval.repository";
import { createLifecycleEventRepository, createDrizzleLifecycleEventRepository } from "./lifecycle.repository";
import { createOrganizationRepository, createDrizzleOrganizationRepository } from "./organization.repository";
import { createTenantRepository, createDrizzleTenantRepository } from "./tenant.repository";
import { createDrizzleSoaRepositories } from "./soa.repository";
import { createDrizzleGapAnalysisRepositories } from "./gap-analysis.repository";
import { createDrizzlePoamRepositories } from "./poam.repository";
import { createDrizzleReportRepositories } from "./reporting.repository";

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
    observability: createInMemoryObservabilityDependencies()
  };
};

export const createDrizzleRepositories = (db: DbClient, env?: Env): AppDependencies => {
  // --- Document Ingestion (uses R2 when available) ---
  const documentIngestion = createInMemoryDocumentIngestionDependencies(
    env?.AEGIS_DOCUMENTS_BUCKET ? {
      storage: new CloudflareR2StorageAdapter(env.AEGIS_DOCUMENTS_BUCKET),
      storageProvider: "cloudflare_r2",
      bucketName: "AEGIS_DOCUMENTS_BUCKET"
    } : {}
  );

  // --- KB (still in-memory vector store, Drizzle repos for metadata will come in Phase 4) ---
  const kb = createInMemoryKbDependencies(documentIngestion);

  // --- SCF Core (fully Drizzle) ---
  const scf = createScfCoreFromRepository(createDrizzleScfRepository(db as never));

  // --- SoA (Drizzle repositories) ---
  const soaRepositories = createDrizzleSoaRepositories(db);
  const soa = { repositories: soaRepositories, scf, kb };

  // --- Gap Analysis (Drizzle repositories) ---
  const gapRepositories = createDrizzleGapAnalysisRepositories(db);
  const gapAnalysis = { repositories: gapRepositories, soa, kb, scf };

  // --- POA&M (Drizzle repositories) ---
  const poamRepositories = createDrizzlePoamRepositories(db);
  const poam = { repositories: poamRepositories, gapAnalysis, scf };

  // --- Reporting (Drizzle repositories) ---
  const reportRepositories = createDrizzleReportRepositories(db);
  const reporting = { repositories: reportRepositories, soa, gapAnalysis, poam, scf };

  return {
    tenants: createDrizzleTenantRepository(db),
    organizations: createDrizzleOrganizationRepository(db),
    assessments: createDrizzleAssessmentRepository(db),
    approvals: createDrizzleApprovalRepository(db),
    artifacts: createArtifactRepository(), // Still mock — artifact versioning is assessment-engine concern
    lifecycleEvents: createDrizzleLifecycleEventRepository(db),
    audit: createDrizzleAuditRepository(db),
    documentIngestion,
    kb,
    scf,
    soa,
    gapAnalysis,
    poam,
    reporting,
    agentRuntime: createInMemoryAgentRuntimeDependencies(), // Phase 6: LLM integration
    workflows: createInMemoryWorkflowDependencies(),
    observability: createInMemoryObservabilityDependencies()
  };
};
