import { z } from "zod";

export const uuidSchema = z.string().uuid();
export const traceIdSchema = z.string().min(8);
export const hashSchema = z.string().min(16);
export const confidenceSchema = z.number().min(0).max(1);

export const AssessmentLifecycleStateSchema = z.enum([
  "draft",
  "documents_uploaded",
  "documents_ingested",
  "scf_pre_analysis_ready",
  "framework_selected",
  "scope_drafted",
  "soa_drafted",
  "soa_under_review",
  "soa_approved",
  "soa_ingested",
  "evidence_analysis_ready",
  "gap_analysis_drafted",
  "gap_analysis_under_review",
  "gap_analysis_approved",
  "maturity_assessed",
  "maturity_under_review",
  "maturity_approved",
  "poam_drafted",
  "poam_under_review",
  "poam_approved",
  "report_generated",
  "closed",
  "archived",
  "failed",
  "cancelled",
  "blocked"
]);

export const ArtifactStatusSchema = z.enum(["draft", "under_review", "approved", "superseded", "archived"]);
export const EvidenceStrengthSchema = z.enum(["strong", "partial", "weak", "absent", "conflicting", "not_checked"]);
export const FindingDispositionSchema = z.enum([
  "implemented",
  "partially_implemented",
  "not_evidenced",
  "not_applicable",
  "requires_human_review"
]);
export const GapStatusSchema = z.enum([
  "met",
  "partially_met",
  "not_met",
  "not_evidenced",
  "not_applicable_justified",
  "not_applicable_not_justified",
  "requires_validation"
]);
export const GapTypeSchema = z.enum([
  "documentation_gap",
  "implementation_gap",
  "evidence_gap",
  "effectiveness_gap",
  "governance_gap",
  "technical_gap",
  "contractual_gap",
  "monitoring_gap",
  "no_gap",
  "not_applicable"
]);
export const PoamStatusSchema = z.enum(["draft", "approved", "in_progress", "blocked", "completed", "cancelled"]);
export const PrioritySchema = z.enum(["low", "medium", "high", "critical"]);
export const SeveritySchema = z.enum(["low", "medium", "high", "critical"]);
export const DocumentClassificationSchema = z.enum(["public", "internal", "confidential", "restricted"]);
export const DocumentTypeSchema = z.enum(["policy", "procedure", "standard", "evidence", "soa", "report", "other"]);

export const TraceContextSchema = z.object({
  organizationId: uuidSchema,
  assessmentId: uuidSchema.optional(),
  scfVersionId: uuidSchema.optional(),
  frameworkId: uuidSchema.optional(),
  agentRunId: uuidSchema.optional(),
  traceId: traceIdSchema
});

export const TenantSchema = z.object({
  id: uuidSchema,
  slug: z.string().min(2),
  name: z.string().min(1),
  status: z.string().default("active")
});

export const OrganizationSchema = z.object({
  id: uuidSchema,
  organizationId: uuidSchema,
  slug: z.string().min(2),
  name: z.string().min(1),
  status: z.string().default("active")
});

export const AssessmentSchema = z.object({
  id: uuidSchema,
  organizationId: uuidSchema,
  name: z.string().min(1),
  state: AssessmentLifecycleStateSchema,
  scfVersionId: uuidSchema,
  traceId: traceIdSchema
});

export const DocumentSchema = z.object({
  id: uuidSchema,
  organizationId: uuidSchema,
  assessmentId: uuidSchema.optional(),
  originalFilename: z.string().min(1),
  storageProvider: z.enum(["r2", "external"]),
  storageKey: z.string().min(1),
  contentHash: hashSchema,
  mimeType: z.string().min(1),
  fileSize: z.number().int().positive(),
  classification: DocumentClassificationSchema,
  documentType: DocumentTypeSchema,
  effectiveDate: z.string().date().optional(),
  versionLabel: z.string().optional(),
  language: z.string().min(2)
});

export const DocumentChunkSchema = z.object({
  id: uuidSchema,
  organizationId: uuidSchema,
  assessmentId: uuidSchema.optional(),
  documentId: uuidSchema,
  chunkIndex: z.number().int().nonnegative(),
  textHash: hashSchema,
  pageNumber: z.number().int().positive().optional(),
  approximateTokenCount: z.number().int().nonnegative().optional()
});

export const VectorReferenceSchema = z.object({
  id: uuidSchema,
  organizationId: uuidSchema,
  assessmentId: uuidSchema,
  kbEntryId: uuidSchema,
  vectorProvider: z.literal("cloudflare_vectorize"),
  vectorIndexName: z.string().min(1),
  vectorId: z.string().min(1)
});

export const ScfControlSchema = z.object({
  id: uuidSchema,
  scfVersionId: uuidSchema,
  scfDomainId: uuidSchema,
  controlCode: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional()
});

export const ScfMappingSchema = z.object({
  id: uuidSchema,
  scfVersionId: uuidSchema,
  scfFrameworkRequirementId: uuidSchema,
  scfControlId: uuidSchema,
  relationshipType: z.string().min(1),
  relationshipStrength: z.string().min(1),
  mappingRationale: z.string().optional(),
  mappingSource: z.enum(["official_scf", "derived", "consultative"])
});

export const SoaItemSchema = z.object({
  id: uuidSchema,
  organizationId: uuidSchema,
  assessmentId: uuidSchema,
  soaVersionId: uuidSchema,
  scfControlId: uuidSchema,
  scfFrameworkRequirementId: uuidSchema.optional(),
  applicability: z.string().min(1),
  justification: z.string().optional()
});

export const EvidenceFindingSchema = z.object({
  id: uuidSchema,
  organizationId: uuidSchema,
  assessmentId: uuidSchema,
  soaItemId: uuidSchema.optional(),
  scfControlId: uuidSchema.optional(),
  agentRunId: uuidSchema.optional(),
  strength: EvidenceStrengthSchema,
  status: z.literal("not_evidenced").or(z.string().min(1)),
  summary: z.string().min(1),
  rationale: z.string().optional(),
  confidenceScore: confidenceSchema.optional(),
  traceId: traceIdSchema
});

export const GapFindingSchema = z.object({
  id: uuidSchema,
  organizationId: uuidSchema,
  assessmentId: uuidSchema,
  findingCode: z.string().regex(/^GAP-\d{3,}$/),
  frameworkRequirementId: uuidSchema,
  scfControlId: uuidSchema,
  soaItemId: uuidSchema.optional(),
  evidenceFindingId: uuidSchema.optional(),
  agentRunId: uuidSchema.optional(),
  traceId: traceIdSchema,
  status: GapStatusSchema,
  gapType: GapTypeSchema,
  summary: z.string().min(1),
  rationale: z.string().min(1),
  confidenceScore: confidenceSchema.optional()
});

export const MaturityScoreSchema = z.object({
  id: uuidSchema,
  organizationId: uuidSchema,
  assessmentId: uuidSchema,
  maturityAssessmentVersionId: uuidSchema,
  scfControlId: uuidSchema,
  score: z.number().int().min(0).max(5),
  confidenceScore: confidenceSchema,
  rationale: z.string().min(1),
  evidenceCoverage: confidenceSchema
});

export const PoamItemSchema = z.object({
  id: uuidSchema,
  organizationId: uuidSchema,
  assessmentId: uuidSchema,
  poamVersionId: uuidSchema,
  itemCode: z.string().regex(/^POAM-\d{3,}$/),
  relatedGapId: uuidSchema,
  scfControlId: uuidSchema,
  frameworkRequirementId: uuidSchema,
  correctiveAction: z.string().min(1),
  priority: PrioritySchema,
  severity: SeveritySchema,
  suggestedOwner: z.string().optional(),
  dueDate: z.string().date().optional(),
  dependencies: z.array(z.string()).default([]),
  expectedEvidence: z.string().min(1),
  acceptanceCriteria: z.string().min(1),
  status: PoamStatusSchema
});

export const AgentRunSchema = z.object({
  id: uuidSchema,
  organizationId: uuidSchema,
  assessmentId: uuidSchema.optional(),
  agentName: z.string().min(1),
  agentVersion: z.string().min(1),
  modelProvider: z.string().optional(),
  modelName: z.string().optional(),
  promptVersion: z.string().min(1),
  inputHash: hashSchema,
  outputHash: hashSchema.optional(),
  confidenceScore: confidenceSchema.optional(),
  status: z.enum(["queued", "running", "completed", "failed", "cancelled"]),
  traceId: traceIdSchema
});

export const AssessmentFindingSchema = TraceContextSchema.extend({
  findingId: z.string().min(1),
  status: FindingDispositionSchema,
  summary: z.string().min(1),
  rationale: z.string().min(1)
});

export type AssessmentLifecycleState = z.infer<typeof AssessmentLifecycleStateSchema>;
export type TraceContext = z.infer<typeof TraceContextSchema>;
export type FindingDisposition = z.infer<typeof FindingDispositionSchema>;
export type AssessmentFinding = z.infer<typeof AssessmentFindingSchema>;
export type Assessment = z.infer<typeof AssessmentSchema>;
export type Document = z.infer<typeof DocumentSchema>;
export type GapFinding = z.infer<typeof GapFindingSchema>;
export type PoamItem = z.infer<typeof PoamItemSchema>;

