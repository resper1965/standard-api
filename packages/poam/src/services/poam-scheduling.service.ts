import type { PoamDependencyResponse, PoamEffortEstimate, PoamItemResponse, PoamMilestoneResponse, PoamPriority } from "../types";

const addDays = (days: number): string => {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};

export class PoamSchedulingService {
  suggestDueDate(priority: PoamPriority, effort: PoamEffortEstimate): string {
    const priorityDays: Record<PoamPriority, number> = { urgent: 30, critical: 30, high: 60, medium: 90, low: 180 };
    const effortBuffer: Record<PoamEffortEstimate, number> = { small: 0, medium: 15, large: 30, extra_large: 60, unknown: 30 };
    return addDays(priorityDays[priority] + effortBuffer[effort]);
  }

  generateMilestones(poamItem: PoamItemResponse): PoamMilestoneResponse[] {
    const now = new Date().toISOString();
    return [
      {
        poam_milestone_id: crypto.randomUUID(),
        tenant_id: poamItem.tenant_id,
        organization_id: poamItem.organization_id,
        assessment_id: poamItem.assessment_id,
        poam_item_id: poamItem.poam_item_id,
        milestone_code: `${poamItem.poam_code}-M1`,
        title: "Define remediation approach",
        description: "Confirm owner, remediation approach, and evidence collection path.",
        due_date: poamItem.due_date,
        status: "draft",
        acceptance_criteria: ["Owner and remediation path confirmed."],
        expected_evidence: ["Remediation plan or work item reference."],
        created_at: now,
        updated_at: now
      }
    ];
  }

  detectDependencies(poamItems: PoamItemResponse[]): PoamDependencyResponse[] {
    const dependencies: PoamDependencyResponse[] = [];
    const technicalItems = poamItems.filter((item) => item.action_type === "technical_implementation");
    const evidenceItems = poamItems.filter((item) => item.action_type === "evidence_collection");
    for (const evidenceItem of evidenceItems) {
      const relatedTechnical = technicalItems.find((item) => item.scf_control_id && item.scf_control_id === evidenceItem.scf_control_id);
      if (relatedTechnical) {
        dependencies.push({
          poam_dependency_id: crypto.randomUUID(),
          tenant_id: evidenceItem.tenant_id,
          organization_id: evidenceItem.organization_id,
          assessment_id: evidenceItem.assessment_id,
          poam_item_id: evidenceItem.poam_item_id,
          depends_on_poam_item_id: relatedTechnical.poam_item_id,
          dependency_type: "related_to",
          description: "Evidence collection is related to the technical remediation for the same SCF control.",
          created_at: new Date().toISOString()
        });
      }
    }
    return dependencies;
  }
}
