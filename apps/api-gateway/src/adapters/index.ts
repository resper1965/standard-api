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
import { createDrizzleMembershipRepository, createMockMembershipRepository } from "./membership.repository";
import { resolveOrganizationContext, provisionOrganizationContext } from "./tenant-mapping";
import { users } from "@standard/schemas";
import { eq } from "drizzle-orm";


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

  const tenants = createTenantRepository();
  const orgsBase = createOrganizationRepository();
  const orgMap = new Map<string, any>();

  const organizations: any = {
    ...orgsBase,
    async create(input: any) {
      const record = await orgsBase.create(input);
      orgMap.set(record.organization_id, record);
      return record;
    },
    async update(orgId: string, patch: any) {
      const record = await orgsBase.update(orgId, patch);
      if (record) orgMap.set(orgId, record);
      return record;
    },
    withOrganization(organizationId: string) {
      const baseTenantDb = orgsBase.withOrganization(organizationId);
      return {
        ...baseTenantDb,
        create: async (input: any) => {
          const record = await baseTenantDb.create(input);
          orgMap.set(record.organization_id, record);
          return record;
        },
        update: async (orgId: string, patch: any) => {
          const record = await baseTenantDb.update(orgId, patch);
          if (record) orgMap.set(orgId, record);
          return record;
        }
      };
    }
  };

  const resolveOrganizationContext = async (baOrgId: string) => {
    let org = orgMap.get(baOrgId);
    if (!org) {
      org = [...orgMap.values()].find((o: any) => o.organization_id === baOrgId);
    }
    if (org) {
      return {
        organization_id: org.organization_id,
        ba_org_id: baOrgId,
        org_name: org.name
      };
    }
    // JIT provision mock tenant + organization
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(baOrgId);
    const tenantPayload = isUuid
      ? { organization_id: baOrgId, name: `Tenant ${baOrgId}`, slug: baOrgId }
      : { name: `Tenant ${baOrgId}`, slug: baOrgId };
    const newTenant = await tenants.create(tenantPayload);
    const newOrg = await orgsBase.create({ organization_id: newTenant.organization_id, name: `Org ${baOrgId}`, slug: baOrgId } as any);
    orgMap.set(newOrg.organization_id, newOrg);
    return {
      organization_id: newOrg.organization_id,
      ba_org_id: baOrgId,
      org_name: newOrg.name
    };
  };

  return {
    tenants,
    organizations,
    members: createMockMembershipRepository(),
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
    webhooks: createInMemoryWebhookRepository(),
    resolveOrganizationContext,
    // In-memory path provisions on resolve; the same creating fn serves both roles.
    provisionOrganizationContext: resolveOrganizationContext,
    resolveUserContext: async (email: string, displayName: string) => ({ id: crypto.randomUUID() })
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
    _db: db,
    tenants: createDrizzleTenantRepository(db),
    organizations: createDrizzleOrganizationRepository(db),
    members: createDrizzleMembershipRepository(db),
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
    webhooks: createDrizzleWebhookRepository(db),
    resolveOrganizationContext: (baOrgId: string) => resolveOrganizationContext(db, baOrgId),
    provisionOrganizationContext: (baOrgId: string) => provisionOrganizationContext(db, baOrgId),
    resolveUserContext: async (email: string, displayName: string) => {
      const [existing] = await db.select().from(users).where(eq(users.email, email)).limit(1);
      if (existing) return { id: existing.id };

      const [inserted] = await db.insert(users).values({
        email,
        displayName,
      }).returning();
      return { id: inserted!.id };
    },
  };
};
