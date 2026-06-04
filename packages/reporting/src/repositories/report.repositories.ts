import type { ExportJobResponse, ReportArtifactResponse, ReportVersionResponse } from "../types";

export class InMemoryReportVersionRepository {
  private readonly versions = new Map<string, ReportVersionResponse>();

  async save(version: ReportVersionResponse): Promise<void> {
    this.versions.set(version.report_version_id, version);
  }

  async update(version: ReportVersionResponse): Promise<void> {
    this.versions.set(version.report_version_id, version);
  }

  async get(reportVersionId: string, organizationId: string): Promise<ReportVersionResponse | null> {
    const version = this.versions.get(reportVersionId);
    return version && version.organization_id === organizationId ? version : null;
  }

  async listByAssessment(assessmentId: string, organizationId: string): Promise<ReportVersionResponse[]> {
    return [...this.versions.values()].filter((version) => version.assessment_id === assessmentId && version.organization_id === organizationId);
  }
}

export class InMemoryReportArtifactRepository {
  private readonly artifacts = new Map<string, ReportArtifactResponse>();

  async save(artifact: ReportArtifactResponse): Promise<void> {
    this.artifacts.set(artifact.report_artifact_id, artifact);
  }

  async get(artifactId: string, organizationId: string): Promise<ReportArtifactResponse | null> {
    const artifact = this.artifacts.get(artifactId);
    return artifact && artifact.organization_id === organizationId ? artifact : null;
  }

  async listByReport(reportVersionId: string, organizationId: string): Promise<ReportArtifactResponse[]> {
    return [...this.artifacts.values()].filter((artifact) => artifact.report_version_id === reportVersionId && artifact.organization_id === organizationId);
  }
}

export class InMemoryExportJobRepository {
  private readonly jobs = new Map<string, ExportJobResponse>();

  async save(job: ExportJobResponse): Promise<void> {
    this.jobs.set(job.export_job_id, job);
  }

  async update(job: ExportJobResponse): Promise<void> {
    this.jobs.set(job.export_job_id, job);
  }

  async get(exportJobId: string, organizationId: string): Promise<ExportJobResponse | null> {
    const job = this.jobs.get(exportJobId);
    return job && job.organization_id === organizationId ? job : null;
  }

  async listByAssessment(assessmentId: string, organizationId: string): Promise<ExportJobResponse[]> {
    return [...this.jobs.values()].filter((job) => job.assessment_id === assessmentId && job.organization_id === organizationId);
  }
}

export const createInMemoryReportRepositories = () => ({
  versions: new InMemoryReportVersionRepository(),
  artifacts: new InMemoryReportArtifactRepository(),
  exportJobs: new InMemoryExportJobRepository()
});
