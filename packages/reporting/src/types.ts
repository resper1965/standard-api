import type { GapAnalysisDependencies } from "@standard/gap-analysis";
import type { PoamDependencies } from "@standard/poam";
import type { ScfCoreServices } from "@standard/scf-core";
import type {
  CreateReportDraftRequest,
  ExportJobResponse,
  ExportRequest,
  ReportArtifactResponse,
  ReportArtifactType,
  ReportFormat,
  ReportSectionResponse,
  ReportSummaryResponse,
  ReportType,
  ReportValidationResponse,
  ReportVersionResponse,
  RenderReportResponse
} from "@standard/schemas";
import type { SoaDependencies } from "@standard/soa";

export type {
  CreateReportDraftRequest,
  ExportJobResponse,
  ExportRequest,
  ReportArtifactResponse,
  ReportArtifactType,
  ReportFormat,
  ReportSectionResponse,
  ReportSummaryResponse,
  ReportType,
  ReportValidationResponse,
  ReportVersionResponse,
  RenderReportResponse
};

export type ReportingContext = {
  tenantId: string;
  organizationId: string;
  assessmentId: string;
  actorId?: string;
  traceId: string;
};

export type MaturityReportProvider = {
  findApprovedByAssessment(assessmentId: string, tenantId: string): Promise<{ maturity_assessment_version_id: string; status: "approved"; summary?: Record<string, unknown> } | null>;
};

export type ReportVersionRepository = {
  save(version: ReportVersionResponse): Promise<void>;
  update(version: ReportVersionResponse): Promise<void>;
  get(reportVersionId: string, tenantId: string): Promise<ReportVersionResponse | null>;
  listByAssessment(assessmentId: string, tenantId: string): Promise<ReportVersionResponse[]>;
};

export type ReportArtifactRepository = {
  save(artifact: ReportArtifactResponse): Promise<void>;
  get(artifactId: string, tenantId: string): Promise<ReportArtifactResponse | null>;
  listByReport(reportVersionId: string, tenantId: string): Promise<ReportArtifactResponse[]>;
};

export type ExportJobRepository = {
  save(job: ExportJobResponse): Promise<void>;
  update(job: ExportJobResponse): Promise<void>;
  get(exportJobId: string, tenantId: string): Promise<ExportJobResponse | null>;
  listByAssessment(assessmentId: string, tenantId: string): Promise<ExportJobResponse[]>;
};

export type ReportRepositories = {
  versions: ReportVersionRepository;
  artifacts: ReportArtifactRepository;
  exportJobs: ExportJobRepository;
};

export type ReportingDependencies = {
  repositories: ReportRepositories;
  soa: SoaDependencies;
  gapAnalysis: GapAnalysisDependencies;
  poam?: PoamDependencies;
  scf?: ScfCoreServices;
  maturity?: MaturityReportProvider;
};

export type CreateReportDraftOptions = Partial<Pick<CreateReportDraftRequest,
  "title" |
  "source_soa_version_id" |
  "source_gap_analysis_version_id" |
  "source_maturity_assessment_version_id" |
  "source_poam_version_id" |
  "allow_unapproved_sources" |
  "exception_rationale"
>>;

export type ReportMetadataPatch = {
  title?: string;
  metadata?: Record<string, unknown>;
};

export type RenderedReportArtifact = {
  artifact_type: ReportArtifactType;
  format: ReportFormat;
  mime_type: string;
  content: string;
};

