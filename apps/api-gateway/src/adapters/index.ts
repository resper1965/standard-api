import { createInMemoryAgentRuntimeDependencies } from "@aegis/agent-runtime";
import { CloudflareR2StorageAdapter, defaultExtractors } from "@aegis/document-ingestion";
import type { DocumentIngestionServiceDependencies } from "@aegis/document-ingestion";
import { createInMemoryKbDependencies, CloudflareVectorizeStore, CloudflareAiEmbeddingProvider, MockEmbeddingProvider, MockVectorStore, DEFAULT_VECTOR_INDEX_NAME, DEFAULT_VECTOR_PROVIDER } from "@aegis/kb";
import { createInMemoryGapAnalysisDependencies } from "@aegis/gap-analysis";
import { createInMemoryObservabilityDependencies } from "@aegis/observability";
import { createInMemoryPoamDependencies } from "@aegis/poam";
import { createInMemoryReportingDependencies } from "@aegis/reporting";
import { createInMemoryScfCore, createScfCoreFromRepository, createDrizzleScfRepository } from "@aegis/scf-core";
import { createInMemorySoaDependencies } from "@aegis/soa";
import { createInMemoryWorkflowDependencies } from "@aegis/workflows";
import { createInMemoryDocumentIngestionDependencies } from "@aegis/document-ingestion";
import { createDrizzleWorkflowDependencies } from "./workflow.repository";
import { createDrizzleIngestionRepositories } from "./document-ingestion.repository";
import { createDrizzleKbRepositories } from "./kb.repository";
import type { AppDependencies } from "../http";
import type { Env } from "../index";
import type { DbClient } from "./db";
import { createAssessmentRepository, createDrizzleAssessmentRepository } from "./assessment.repository";
import { createArtifactRepository } from "./artifact.repository";
import { createDrizzleArtifactRepository } from "./artifact.drizzle.repository";
import { createDrizzleAssessmentSnapshotBuilder } from "./assessment-engine.adapter";
import { createDrizzleMaturityRepositories } from "./maturity.repository";
import { createAuditRepository, createDrizzleAuditRepository } from "./audit.repository";
import { createApprovalRepository, createDrizzleApprovalRepository } from "./approval.repository";
import { createLifecycleEventRepository, createDrizzleLifecycleEventRepository } from "./lifecycle.repository";
import { createOrganizationRepository, createDrizzleOrganizationRepository } from "./organization.repository";
import { createTenantRepository, createDrizzleTenantRepository } from "./tenant.repository";
import { CloudflareAiGatewayAdapter } from "./ai-gateway.adapter";
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
  // --- Document Ingestion (Drizzle repos + R2 storage) ---
  const ingestionRepositories = createDrizzleIngestionRepositories(db);
  const storage = env?.AEGIS_DOCUMENTS_BUCKET
    ? new CloudflareR2StorageAdapter(env.AEGIS_DOCUMENTS_BUCKET)
    : undefined;
  const documentIngestion: DocumentIngestionServiceDependencies = {
    storage: storage ?? { putObject: async () => {}, getObject: async () => null },
    queue: { enqueue: async () => {} },
    repositories: ingestionRepositories,
    bucketName: "AEGIS_DOCUMENTS_BUCKET",
    storageProvider: storage ? "cloudflare_r2" : "memory",
    vectorIndexName: DEFAULT_VECTOR_INDEX_NAME,
    extractors: defaultExtractors,
    chunking: { max_tokens_estimate: 800, overlap_tokens_estimate: 80, strategy: "by_tokens_estimate", preserve_headings: true, preserve_pages: true },
  };

  // --- KB (Drizzle repos + Vectorize + Workers AI when available) ---
  const kbRepositories = createDrizzleKbRepositories(db);
  const embeddingProvider = env?.AI
    ? new CloudflareAiEmbeddingProvider(env.AI as never)
    : new MockEmbeddingProvider();
  const vectorStore = env?.AEGIS_KB_INDEX
    ? new CloudflareVectorizeStore(env.AEGIS_KB_INDEX as never, DEFAULT_VECTOR_INDEX_NAME)
    : new MockVectorStore(DEFAULT_VECTOR_INDEX_NAME);
  const kb = {
    documentIngestion,
    repositories: kbRepositories,
    embeddingProvider,
    vectorStore,
    queue: { enqueue: async () => {} },
    vectorIndexName: DEFAULT_VECTOR_INDEX_NAME,
    vectorProvider: DEFAULT_VECTOR_PROVIDER,
  };

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
    agentRuntime: {
      ...createInMemoryAgentRuntimeDependencies(),
      llm:
        env?.AI_GATEWAY_BASE_URL && env?.OPENAI_API_KEY
          ? new CloudflareAiGatewayAdapter({
              baseUrl: env.AI_GATEWAY_BASE_URL,
              apiKey: env.OPENAI_API_KEY,
            })
          : createInMemoryAgentRuntimeDependencies().llm,
    },
    workflows: createDrizzleWorkflowDependencies(db),
    observability: createInMemoryObservabilityDependencies()
  };
};
