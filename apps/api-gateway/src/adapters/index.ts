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
  const documentIngestion = createInMemoryDocumentIngestionDependencies(
    env?.AEGIS_DOCUMENTS_BUCKET ? {
      storage: new CloudflareR2StorageAdapter(env.AEGIS_DOCUMENTS_BUCKET),
      storageProvider: "cloudflare_r2",
      bucketName: "AEGIS_DOCUMENTS_BUCKET"
    } : {}
  );
  const kb = createInMemoryKbDependencies(documentIngestion);
  const scf = createScfCoreFromRepository(createDrizzleScfRepository(db as never));
  const soa = createInMemorySoaDependencies({ scf, kb });
  const gapAnalysis = createInMemoryGapAnalysisDependencies({ scf, kb, soa });
  const poam = createInMemoryPoamDependencies({ gapAnalysis, scf });
  
  return {
    tenants: createDrizzleTenantRepository(db),
    organizations: createDrizzleOrganizationRepository(db),
    assessments: createDrizzleAssessmentRepository(db),
    approvals: createDrizzleApprovalRepository(db),
    artifacts: createArtifactRepository(), // Still mock until Phase 5
    lifecycleEvents: createDrizzleLifecycleEventRepository(db),
    audit: createDrizzleAuditRepository(db),
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
