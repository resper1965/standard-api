/**
 * Framework Projection Endpoint
 *
 * Implements the "controls as truth, frameworks as masks" model.
 * Given an assessment with control statuses, project compliance against ANY framework.
 *
 * Flow:
 *   1. Read control_assessment_status for the assessment
 *   2. Load all scf_mappings for target framework
 *   3. For each framework requirement, look up mapped control statuses
 *   4. Derive gap/compliance per requirement WITHOUT reassessing
 */
import type { RouteDefinition } from "../http";
import { json, routeParam, routeUuidParam } from "../http";
import { ApiError } from "../errors/api-error";

// Projection status derived from control implementation status
type ProjectedRequirementStatus =
  | "compliant"        // All mapped controls are implemented
  | "partially_compliant" // Some mapped controls implemented
  | "non_compliant"    // No mapped controls implemented
  | "not_assessed"     // Mapped controls haven't been assessed yet
  | "not_mapped";      // No SCF controls map to this requirement

type ProjectedRequirement = {
  requirement_id: string;
  requirement_code: string;
  requirement_title: string;
  projected_status: ProjectedRequirementStatus;
  mapped_controls: {
    control_id: string;
    control_code: string;
    implementation_status: string;
    maturity_level: number | null;
    confidence_score: string | null;
  }[];
  control_coverage: {
    total: number;
    implemented: number;
    partially_implemented: number;
    not_implemented: number;
    not_assessed: number;
  };
};

function deriveProjectedStatus(
  statuses: string[]
): ProjectedRequirementStatus {
  if (statuses.length === 0) return "not_mapped";
  
  const implemented = statuses.filter(s => s === "implemented").length;
  const partial = statuses.filter(s => s === "partially_implemented").length;
  const notAssessed = statuses.filter(s => s === "not_assessed").length;
  
  if (notAssessed === statuses.length) return "not_assessed";
  if (implemented === statuses.length) return "compliant";
  if (implemented + partial > 0) return "partially_compliant";
  return "non_compliant";
}

export const projectionRoutes: RouteDefinition[] = [
  {
    method: "GET",
    path: "/api/v1/assessments/:assessmentId/projection/:frameworkId",
    protected: true,
    permissions: ["assessment:read"],
    requireActor: true,
    handler: async ({ deps, params, request, organizationId, traceId }) => {
      const assessmentId = routeUuidParam(params, "assessmentId");
      const frameworkId = routeUuidParam(params, "frameworkId");

      // 1. Validate assessment exists
      const assessment = await deps.assessments.withOrganization(organizationId!).get(assessmentId);
      if (!assessment) throw new ApiError("NOT_FOUND", "Assessment not found.", 404);

      const scfVersionId = assessment.scf_version_id;

      // 2. Validate framework exists
      const framework = await deps.scf.frameworks.getFramework(frameworkId);
      if (!framework)
        throw new ApiError(
          "NOT_FOUND",
          `Framework not found: ${frameworkId}. Use GET /api/v1/scf/frameworks to list available frameworks.`,
          404
        );

      // 3. Get ALL framework requirements
      const requirements = await deps.scf.frameworks.listRequirements(frameworkId);

      // 4. Get ALL mappings for this framework (framework_requirement → scf_control)
      const allMappings = await deps.scf.mappings.mapFrameworkToScf(frameworkId, scfVersionId);

      // Group mappings by requirement
      const mappingsByRequirement = new Map<string, typeof allMappings>();
      for (const m of allMappings) {
        const list = mappingsByRequirement.get(m.scf_framework_requirement_id) ?? [];
        list.push(m);
        mappingsByRequirement.set(m.scf_framework_requirement_id, list);
      }

      // 5. Get all control assessment statuses for this assessment
      const controlStatuses = await getControlStatusesForAssessment(deps, assessmentId);

      // Index by control_id for O(1) lookup
      const statusByControlId = new Map(controlStatuses.map(s => [s.scf_control_id, s]));

      // 6. Project each requirement
      const projectedRequirements: ProjectedRequirement[] = [];
      let totalCompliant = 0;
      let totalPartial = 0;
      let totalNonCompliant = 0;
      let totalNotAssessed = 0;
      let totalNotMapped = 0;

      for (const req of requirements) {
        const reqMappings = mappingsByRequirement.get(req.id) ?? [];
        const mappedControls = reqMappings.map(m => {
          const status = statusByControlId.get(m.scf_control_id);
          return {
            control_id: m.scf_control_id,
            control_code: m.scf_control_id, // Will be enriched below
            implementation_status: status?.implementation_status ?? "not_assessed",
            maturity_level: status?.maturity_level ?? null,
            confidence_score: status?.confidence_score ?? null,
          };
        });

        // Enrich control codes
        for (const mc of mappedControls) {
          const ctrl = await deps.scf.repository.getControl(mc.control_id);
          if (ctrl) mc.control_code = ctrl.control_code;
        }

        const statuses = mappedControls.map(mc => mc.implementation_status);
        const projectedStatus = deriveProjectedStatus(statuses);

        const implemented = statuses.filter(s => s === "implemented").length;
        const partiallyImpl = statuses.filter(s => s === "partially_implemented").length;
        const notImpl = statuses.filter(s => s === "not_implemented" || s === "planned").length;
        const notAssessed = statuses.filter(s => s === "not_assessed").length;

        projectedRequirements.push({
          requirement_id: req.id,
          requirement_code: req.requirement_code,
          requirement_title: req.requirement_title,
          projected_status: projectedStatus,
          mapped_controls: mappedControls,
          control_coverage: {
            total: mappedControls.length,
            implemented,
            partially_implemented: partiallyImpl,
            not_implemented: notImpl,
            not_assessed: notAssessed,
          },
        });

        switch (projectedStatus) {
          case "compliant": totalCompliant++; break;
          case "partially_compliant": totalPartial++; break;
          case "non_compliant": totalNonCompliant++; break;
          case "not_assessed": totalNotAssessed++; break;
          case "not_mapped": totalNotMapped++; break;
        }
      }

      const totalRequirements = requirements.length;
      const compliancePercentage =
        totalRequirements > 0
          ? Math.round(((totalCompliant + totalPartial * 0.5) / totalRequirements) * 100)
          : 0;

      return json({
        data: {
          assessment_id: assessmentId,
          framework: {
            id: frameworkId,
            name: framework.framework_name,
          },
          scf_version_id: scfVersionId,
          summary: {
            total_requirements: totalRequirements,
            compliant: totalCompliant,
            partially_compliant: totalPartial,
            non_compliant: totalNonCompliant,
            not_assessed: totalNotAssessed,
            not_mapped: totalNotMapped,
            compliance_percentage: compliancePercentage,
          },
          interpretation:
            compliancePercentage >= 90
              ? `Strong compliance posture (${compliancePercentage}%). Minor gaps may require attention.`
              : compliancePercentage >= 70
                ? `Moderate compliance (${compliancePercentage}%). Significant remediation effort needed.`
                : compliancePercentage >= 40
                  ? `Weak compliance (${compliancePercentage}%). Major gaps exist across multiple domains.`
                  : `Critical compliance gaps (${compliancePercentage}%). Framework readiness is insufficient.`,
          requirements: projectedRequirements,
        },
        trace_id: traceId,
      });
    },
  },
];

// Helper: fetch control_assessment_status records for an assessment
// Uses the SCF repository's underlying DB connection
async function getControlStatusesForAssessment(
  deps: any,
  assessmentId: string
): Promise<
  {
    scf_control_id: string;
    implementation_status: string;
    maturity_level: number | null;
    confidence_score: string | null;
  }[]
> {
  // If control_assessment_status table doesn't exist yet (migration not run),
  // return empty array gracefully — projection will show "not_assessed" for all
  try {
    const db = deps.scf.repository.db;
    if (!db) return [];

    const { controlAssessmentStatus } = await import("@standard/schemas");
    const { eq } = await import("drizzle-orm");

    const rows = await db
      .select({
        scf_control_id: controlAssessmentStatus.scfControlId,
        implementation_status: controlAssessmentStatus.implementationStatus,
        maturity_level: controlAssessmentStatus.maturityLevel,
        confidence_score: controlAssessmentStatus.confidenceScore,
      })
      .from(controlAssessmentStatus)
      .where(eq(controlAssessmentStatus.assessmentId, assessmentId));

    return rows;
  } catch {
    // Table doesn't exist yet — graceful degradation
    return [];
  }
}
