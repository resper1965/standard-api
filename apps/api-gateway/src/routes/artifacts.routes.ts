import {
  approveArtifactVersion,
  createNextArtifactVersion,
  markArtifactUnderReview,
  supersedeApprovedVersions,
  type ArtifactType
} from "@aegis/assessment-engine";
import {
  ApproveArtifactRequestSchema,
  ArtifactTypeSchema,
  CreateArtifactVersionRequestSchema,
  SubmitArtifactReviewRequestSchema,
  SupersedeArtifactRequestSchema
} from "@aegis/schemas";
import { ApiError } from "../errors/api-error";
import type { RouteDefinition } from "../http";
import { json, newId, parseJson, routeParam } from "../http";
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
    handler: async ({ request, deps, params, tenantId, actorId, traceId }) => {
      const artifactType = parseArtifactType(routeParam(params, "artifactType"));
      const body = await parseJson(request, CreateArtifactVersionRequestSchema);
      const assessment = await deps.assessments.get(routeParam(params, "assessmentId"), tenantId!);
      if (!assessment) throw new ApiError("NOT_FOUND", "Assessment not found.", 404);

      const version = await deps.artifacts.create({
        id: newId(),
        tenantId: assessment.tenant_id,
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
    handler: async ({ deps, params, tenantId, traceId }) => {
      const artifactType = parseArtifactType(routeParam(params, "artifactType"));
      const assessmentId = routeParam(params, "assessmentId");
      const assessment = await deps.assessments.get(assessmentId, tenantId!);
      if (!assessment) throw new ApiError("NOT_FOUND", "Assessment not found.", 404);
      const versions = await deps.artifacts.listByAssessment(assessmentId, artifactType);
      return json({ data: versions.map(artifactVersionResponse), trace_id: traceId });
    }
  },
  {
    method: "GET",
    path: "/api/v1/artifacts/:artifactVersionId",
    protected: true,
    handler: async ({ deps, params, tenantId }) => {
      const version = await deps.artifacts.get(routeParam(params, "artifactVersionId"));
      if (!version || version.tenantId !== tenantId) throw new ApiError("NOT_FOUND", "Artifact version not found.", 404);
      return json(artifactVersionResponse(version));
    }
  },
  {
    method: "POST",
    path: "/api/v1/artifacts/:artifactVersionId/submit-review",
    protected: true,
    requireActor: true,
    handler: async ({ request, deps, params, tenantId, traceId }) => {
      await parseJson(request, SubmitArtifactReviewRequestSchema);
      const version = await deps.artifacts.get(routeParam(params, "artifactVersionId"));
      if (!version || version.tenantId !== tenantId) throw new ApiError("NOT_FOUND", "Artifact version not found.", 404);
      const updated = markArtifactUnderReview(version, {
        tenantId: version.tenantId,
        organizationId: version.organizationId,
        assessmentId: version.assessmentId,
        reason: "submit artifact review",
        traceId,
        occurredAt: new Date().toISOString()
      });
      await deps.artifacts.save(updated);
      return json(artifactVersionResponse(updated));
    }
  },
  {
    method: "POST",
    path: "/api/v1/artifacts/:artifactVersionId/approve",
    protected: true,
    requireActor: true,
    handler: async ({ request, deps, params, tenantId, actorId, traceId }) => {
      const body = await parseJson(request, ApproveArtifactRequestSchema);
      const version = await deps.artifacts.get(routeParam(params, "artifactVersionId"));
      if (!version || version.tenantId !== tenantId) throw new ApiError("NOT_FOUND", "Artifact version not found.", 404);

      const approvalEvent = body.approval_id
        ? await deps.approvals.getForGate(body.approval_id, body.gate)
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
      const siblings = await deps.artifacts.listByAssessment(version.assessmentId, version.artifactType);
      for (const sibling of supersedeApprovedVersions(siblings, approved)) {
        await deps.artifacts.save(sibling);
      }
      await deps.artifacts.save(approved);
      return json(artifactVersionResponse(approved));
    }
  },
  {
    method: "POST",
    path: "/api/v1/artifacts/:artifactVersionId/supersede",
    protected: true,
    requireActor: true,
    handler: async ({ request, deps, params, tenantId, actorId, traceId }) => {
      await parseJson(request, SupersedeArtifactRequestSchema);
      const version = await deps.artifacts.get(routeParam(params, "artifactVersionId"));
      if (!version || version.tenantId !== tenantId) throw new ApiError("NOT_FOUND", "Artifact version not found.", 404);
      const next = createNextArtifactVersion(version, {
        tenantId: version.tenantId,
        organizationId: version.organizationId,
        assessmentId: version.assessmentId,
        actorId: actorId!,
        reason: "supersede artifact version",
        traceId,
        occurredAt: new Date().toISOString()
      }, newId());
      await deps.artifacts.save(next);
      return json(artifactVersionResponse(next), { status: 201 });
    }
  }
];
