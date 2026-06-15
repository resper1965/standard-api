// @ts-nocheck -- Zod v4 CI type compat
import type { PrivacyActivityStatus } from "@standard/schemas";
import { PrivacyError } from "../errors";
import type { PrivacyDependencies, PrivacyContext } from "../types";
import { PrivacyCompletenessService } from "./privacy-completeness.service";

// â”€â”€â”€ Allowed Transitions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const ALLOWED_TRANSITIONS: Record<PrivacyActivityStatus, PrivacyActivityStatus[]> = {
  draft: ["needs_information", "under_review", "archived"],
  needs_information: ["draft", "under_review", "archived"],
  under_review: ["approved", "rejected", "needs_information"],
  rejected: ["draft", "needs_information", "archived"],
  approved: ["archived"],
  archived: ["draft"],
};

// â”€â”€â”€ Service â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export class PrivacyStatusService {
  constructor(private readonly deps: PrivacyDependencies) {}

  async transition(
    activityId: string,
    targetStatus: PrivacyActivityStatus,
    context: PrivacyContext,
    reason?: string
  ): Promise<{ status: PrivacyActivityStatus; previous_status: PrivacyActivityStatus }> {
    const activity = await this.deps.repositories.activities.get(activityId, context.organizationId);
    if (!activity) {
      throw new PrivacyError("ACTIVITY_NOT_FOUND", `Activity ${activityId} not found.`);
    }

    const currentStatus = activity.status;
    const allowed = ALLOWED_TRANSITIONS[currentStatus];
    if (!allowed || !allowed.includes(targetStatus)) {
      throw new PrivacyError("INVALID_STATUS_TRANSITION", `Cannot transition from '${currentStatus}' to '${targetStatus}'.`, {
        current_status: currentStatus,
        target_status: targetStatus,
        allowed_transitions: allowed ?? [],
      });
    }

    // Gate: under_review requires completeness check
    if (targetStatus === "under_review") {
      const completenessService = new PrivacyCompletenessService(this.deps);
      const result = await completenessService.analyze(activityId, context.organizationId);
      if (!result.can_be_submitted_for_review) {
        throw new PrivacyError("COMPLETENESS_CHECK_FAILED", "Activity cannot be submitted for review. Missing required fields or has blocking issues.", {
          completeness_score: result.completeness_score,
          missing_required_fields: result.missing_required_fields,
          blocking_issues_count: result.blocking_issues.length,
          blocking_issues: result.blocking_issues.slice(0, 5).map((i) => ({
            code: i.code,
            message: i.message,
            severity: i.severity,
          })),
        });
      }
    }

    const updated = {
      ...activity,
      status: targetStatus,
      updated_at: new Date().toISOString(),
      metadata: {
        ...(activity.metadata as Record<string, unknown>),
        last_status_change: {
          from: currentStatus,
          to: targetStatus,
          reason: reason ?? null,
          actor: context.actorId ?? null,
          at: new Date().toISOString(),
        },
      },
    };

    await this.deps.repositories.activities.update(updated);

    return { status: targetStatus, previous_status: currentStatus };
  }

  getAllowedTransitions(currentStatus: PrivacyActivityStatus): PrivacyActivityStatus[] {
    return ALLOWED_TRANSITIONS[currentStatus] ?? [];
  }
}

