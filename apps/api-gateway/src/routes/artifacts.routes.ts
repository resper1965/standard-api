import {
  approveArtifactVersion,
  createNextArtifactVersion,
  markArtifactUnderReview,
  supersedeApprovedVersions,
  type ArtifactType
} from "@standard/assessment-engine";
import {
  ApproveArtifactRequestSchema,
  ArtifactTypeSchema,
  CreateArtifactVersionRequestSchema,
  SubmitArtifactReviewRequestSchema,
  SupersedeArtifactRequestSchema
} from "@standard/schemas";
import { ApiError } from "../errors/api-error";
import type { RouteDefinition } from "../http";
import { json, newId, parseJson, routeParam, routeUuidParam } from "../http";
import { artifactVersionResponse } from "../presenters";

const parseArtifactType = (value: string): ArtifactType => {
  const parsed = ArtifactTypeSchema.safeParse(value);
  if (!parsed.success) throw new ApiError("VALIDATION_ERROR", "Invalid artifact type.", 400, parsed.error.issues);
  return parsed.data;
};

export const artifactsRoutes: RouteDefinition[] = [
  {
    method: "POST",
    path: "/api/v1/assessments/:assessmentId/artifacts/:artifactType/versions",
    protected: true,
    requireActor: true,
    permissions: ["artifact:create"],
    handler: async ({ request, deps, params, organizationId, actorId, traceId }) => {
      const artifactType = parseArtifactType(routeUuidParam(params, "artifactType"));
      const body = await parseJson(request, CreateArtifactVersionRequestSchema);
      const tenantAssessmentsDb = deps.assessments.withOrganization(organizationId!);
      const assessment = await tenantAssessmentsDb.get(routeUuidParam(params, "assessmentId"));
      if (!assessment) throw new ApiError("NOT_FOUND", "Assessment not found.", 404);

      const tenantArtifactsDb = deps.artifacts.withOrganization(organizationId!);
      const version = await tenantArtifactsDb.create({
        id: newId(),
        organizationId: assessment.organization_id,
        assessmentId: assessment.assessment_id,
        artifactType,
        createdBy: actorId!,
        createdAt: new Date().toISOString(),
        traceId,
        ...(body.source_agent_run_id ? { sourceAgentRunId: body.source_agent_run_id } : {})
      });

      return json(artifactVersionResponse(version), { status: 201 });
    }
  },
  {
    method: "GET",
    path: "/api/v1/assessments/:assessmentId/artifacts/:artifactType/versions",
    protected: true,
    permissions: ["artifact:read"],
    handler: async ({ deps, params, organizationId, traceId }) => {
      const artifactType = parseArtifactType(routeUuidParam(params, "artifactType"));
      const assessmentId = routeUuidParam(params, "assessmentId");
      const tenantAssessmentsDb = deps.assessments.withOrganization(organizationId!);
      const assessment = await tenantAssessmentsDb.get(assessmentId);
      if (!assessment) throw new ApiError("NOT_FOUND", "Assessment not found.", 404);
      const tenantArtifactsDb = deps.artifacts.withOrganization(organizationId!);
      const versions = await tenantArtifactsDb.listByAssessment(assessmentId, artifactType);
      return json({ data: versions.map(artifactVersionResponse), trace_id: traceId });
    }
  },
  {
    method: "GET",
    path: "/api/v1/artifacts/:artifactVersionId",
    protected: true,
    permissions: ["artifact:read"],
    handler: async ({ deps, params, organizationId }) => {
      const tenantArtifactsDb = deps.artifacts.withOrganization(organizationId!);
      const version = await tenantArtifactsDb.get(routeUuidParam(params, "artifactVersionId"));
      if (!version) throw new ApiError("NOT_FOUND", "Artifact version not found.", 404);
      return json(artifactVersionResponse(version));
    }
  },
  {
    method: "POST",
    path: "/api/v1/artifacts/:artifactVersionId/submit-review",
    protected: true,
    requireActor: true,
    permissions: ["artifact:update"],
    handler: async ({ request, deps, params, organizationId, traceId }) => {
      await parseJson(request, SubmitArtifactReviewRequestSchema);
      const tenantArtifactsDb = deps.artifacts.withOrganization(organizationId!);
      const version = await tenantArtifactsDb.get(routeUuidParam(params, "artifactVersionId"));
      if (!version) throw new ApiError("NOT_FOUND", "Artifact version not found.", 404);
      const updated = markArtifactUnderReview(version, {
        organizationId: version.organizationId,
        assessmentId: version.assessmentId,
        reason: "submit artifact review",
        traceId,
        occurredAt: new Date().toISOString()
      });
      await tenantArtifactsDb.save(updated);
      return json(artifactVersionResponse(updated));
    }
  },
  {
    method: "POST",
    path: "/api/v1/artifacts/:artifactVersionId/approve",
    protected: true,
    requireActor: true,
    permissions: ["artifact:approve"],
    handler: async ({ request, deps, params, organizationId, actorId, traceId }) => {
      const body = await parseJson(request, ApproveArtifactRequestSchema);
      const tenantArtifactsDb = deps.artifacts.withOrganization(organizationId!);
      const version = await tenantArtifactsDb.get(routeUuidParam(params, "artifactVersionId"));
      if (!version) throw new ApiError("NOT_FOUND", "Artifact version not found.", 404);

      const tenantApprovalsDb = deps.approvals.withOrganization(organizationId!);
      const approvalEvent = body.approval_id
        ? await tenantApprovalsDb.getForGate(body.approval_id, body.gate)
        : {
            id: newId(),
            gate: body.gate,
            decision: "approved" as const,
            approvedBy: actorId!,
            approvedAt: new Date().toISOString(),
            traceId
          };

      if (!approvalEvent) throw new ApiError("APPROVAL_REQUIRED", "Approved approval event is required.", 409);

      const approved = approveArtifactVersion(version, approvalEvent);
      const siblings = await tenantArtifactsDb.listByAssessment(version.assessmentId, version.artifactType);
      for (const sibling of supersedeApprovedVersions(siblings, approved)) {
        await tenantArtifactsDb.save(sibling);
      }
      await tenantArtifactsDb.save(approved);
      return json(artifactVersionResponse(approved));
    }
  },
  {
    method: "POST",
    path: "/api/v1/artifacts/:artifactVersionId/supersede",
    protected: true,
    requireActor: true,
    permissions: ["artifact:create"],
    handler: async ({ request, deps, params, organizationId, actorId, traceId }) => {
      await parseJson(request, SupersedeArtifactRequestSchema);
      const tenantArtifactsDb = deps.artifacts.withOrganization(organizationId!);
      const version = await tenantArtifactsDb.get(routeUuidParam(params, "artifactVersionId"));
      if (!version) throw new ApiError("NOT_FOUND", "Artifact version not found.", 404);
      const next = createNextArtifactVersion(version, {
        organizationId: version.organizationId,
        assessmentId: version.assessmentId,
        actorId: actorId!,
        reason: "supersede artifact version",
        traceId,
        occurredAt: new Date().toISOString()
      }, newId());
      await tenantArtifactsDb.save(next);
      return json(artifactVersionResponse(next), { status: 201 });
    }
  }
];

