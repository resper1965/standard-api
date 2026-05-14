import {
  createCompletenessAnalyzer,
  requireRelation,
  requireCoherence,
} from "@standard/domain";
import type { CompletenessResult } from "@standard/domain";
import type { PrivacyActivityResponse } from "@standard/schemas";
import { PrivacyError } from "../errors";
import type { PrivacyDependencies } from "../types";

// ─── Privacy-specific CompletenessAnalyzer ──────────────────────────

const privacyCompletenessAnalyzer = createCompletenessAnalyzer<PrivacyActivityResponse>({
  required_fields: ["name", "purpose", "legal_basis_lgpd", "retention_period"],
  recommended_fields: ["description", "security_measures_summary", "business_process", "risk_level"],
  critical_fields: [
    "legal_basis_lgpd",
    "dpia_required",
    "lia_required",
    "tia_required",
    "retention_period",
    "risk_level",
  ],
  rules: [
    requireRelation("data_subjects"),
    requireRelation("data_categories"),
    requireCoherence<PrivacyActivityResponse>({
      condition: (e) => e.third_party_sharing === true,
      relation: "third_parties",
      code: "SHARING_WITHOUT_THIRD_PARTIES",
      message: "third_party_sharing is true but no third parties registered.",
      severity: "critical",
    }),
    requireCoherence<PrivacyActivityResponse>({
      condition: (e) => e.international_transfer === true,
      relation: "third_parties",
      code: "INTL_TRANSFER_WITHOUT_THIRD_PARTIES",
      message: "international_transfer is true but no third parties registered.",
      severity: "high",
    }),
  ],
});

// ─── Service ────────────────────────────────────────────────────────

export class PrivacyCompletenessService {
  constructor(private readonly deps: PrivacyDependencies) {}

  async analyze(activityId: string, tenantId: string): Promise<CompletenessResult> {
    const activity = await this.deps.repositories.activities.get(activityId, tenantId);
    if (!activity) {
      throw new PrivacyError("ACTIVITY_NOT_FOUND", `Activity ${activityId} not found.`);
    }

    const [dataSubjects, dataCategories, thirdParties, fieldReviews, screenings, scfControls] =
      await Promise.all([
        this.deps.repositories.dataSubjects.listByActivity(activityId, tenantId),
        this.deps.repositories.dataCategories.listByActivity(activityId, tenantId),
        this.deps.repositories.thirdParties.listByActivity(activityId, tenantId),
        this.deps.repositories.fieldReviews.listByActivity(activityId, tenantId),
        this.deps.repositories.screenings.listByActivity(activityId, tenantId),
        this.deps.repositories.scfControls.listByActivity(activityId, tenantId),
      ]);

    return privacyCompletenessAnalyzer.analyze({
      entity: activity,
      relations: {
        data_subjects: dataSubjects,
        data_categories: dataCategories,
        third_parties: thirdParties,
      },
      evidence: [],
      field_reviews: fieldReviews.map((r) => ({
        ...r,
        confidence: "0",
      })),
      screenings: screenings.map((s) => ({
        ...s,
        status: s.result,
        required: s.result === "required",
      })),
      scf_controls: scfControls.map((c) => ({
        ...c,
        validation_status: c.applicability_status === "applicable" ? "validated" as const : "pending" as const,
      })),
      ai_suggestions: [],
    });
  }
}
