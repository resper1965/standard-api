import type { ReportArtifactResponse, RenderReportResponse } from "@standard/schemas";
import { assertActor, assertContext, ReportingWorkflowError } from "../errors";
import type { ReportingContext, ReportingDependencies } from "../types";

const sha256Hex = async (value: string): Promise<string> => {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
};

export class ReportStorageService {
  constructor(private readonly deps: ReportingDependencies) {}

  async storeArtifact(reportVersionId: string, artifact: RenderReportResponse, context: ReportingContext): Promise<ReportArtifactResponse> {
    assertContext(context);
    assertActor(context);
    const report = await this.deps.repositories.versions.get(reportVersionId, context.organizationId);
    if (!report || report.assessment_id !== context.assessmentId) throw new ReportingWorkflowError("REPORT_NOT_FOUND", "Report version not found.");
    const now = new Date().toISOString();
    const storageKey = [
      "tenants",
      context.organizationId,
      "organizations",
      context.organizationId,
      "assessments",
      context.assessmentId,
      "reports",
      reportVersionId,
      `${artifact.artifact_type}.${artifact.format}`
    ].join("/");
    const stored: ReportArtifactResponse = {
      report_artifact_id: crypto.randomUUID(),
      organization_id: context.organizationId,
      assessment_id: context.assessmentId,
      report_version_id: reportVersionId,
      artifact_type: artifact.artifact_type,
      format: artifact.format,
      storage_provider: "r2_compatible_mock",
      storage_bucket: "standard-reporting-local",
      storage_key: storageKey,
      content_hash: await sha256Hex(artifact.content),
      file_size: new TextEncoder().encode(artifact.content).byteLength,
      mime_type: artifact.mime_type,
      generated_at: now,
      created_at: now,
      metadata: { contains_full_evidence_documents: false, trace_id: context.traceId }
    };
    await this.deps.repositories.artifacts.save(stored);
    return stored;
  }

  async getArtifact(artifactId: string, context: ReportingContext): Promise<ReportArtifactResponse> {
    assertContext(context);
    const artifact = await this.deps.repositories.artifacts.get(artifactId, context.organizationId);
    if (!artifact || artifact.assessment_id !== context.assessmentId) throw new ReportingWorkflowError("REPORT_ARTIFACT_NOT_FOUND", "Report artifact not found.");
    return artifact;
  }

  async listArtifacts(reportVersionId: string, context: ReportingContext): Promise<ReportArtifactResponse[]> {
    assertContext(context);
    return this.deps.repositories.artifacts.listByReport(reportVersionId, context.organizationId);
  }

  async generateDownloadUrl(artifactId: string, context: ReportingContext): Promise<string> {
    const artifact = await this.getArtifact(artifactId, context);
    return `standard-r2://download/${artifact.report_artifact_id}?organization_id=${context.organizationId}&assessment_id=${context.assessmentId}&expires_in=900`;
  }
}


