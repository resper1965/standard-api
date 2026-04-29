import { createInMemoryAgentRuntimeDependencies } from "@aegis/agent-runtime";
import { createInMemoryDocumentIngestionDependencies } from "@aegis/document-ingestion";
import { createInMemoryGapAnalysisDependencies } from "@aegis/gap-analysis";
import { createInMemoryKbDependencies } from "@aegis/kb";
import { createInMemoryObservabilityDependencies } from "@aegis/observability";
import { createInMemoryPoamDependencies } from "@aegis/poam";
import { createInMemoryReportingDependencies } from "@aegis/reporting";
import { createInMemoryScfCore } from "@aegis/scf-core";
import { createInMemorySoaDependencies } from "@aegis/soa";
import { createInMemoryWorkflowDependencies } from "@aegis/workflows";
import type { AppDependencies } from "../http";
import { createAssessmentRepository } from "./assessment.repository";
import { createArtifactRepository } from "./artifact.repository";
import { createAuditRepository } from "./audit.repository";
import { createApprovalRepository } from "./approval.repository";
import { createLifecycleEventRepository } from "./lifecycle.repository";
import { createOrganizationRepository } from "./organization.repository";
import { createTenantRepository } from "./tenant.repository";

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
