/**
 * Standard MCP Server â€” Intelligence Tools
 *
 * Phase 1: Expose the stateless Intelligence Engine via MCP.
 * These tools wrap existing REST endpoints in /api/v1/intelligence/*.
 */
import type { RequestContext } from "../../http";
import type { McpToolResult } from "./assessment.tools";
import { IntelligenceService } from "../../services/intelligence.service";
import { RISK_TAXONOMY } from "../../routes/risk.routes";
import { REGULATIONS } from "../../routes/regulations.routes";
import {
  DATA_CATEGORIES,
  VOLUME_SCALE,
  RETENTION_RULES,
} from "../../routes/reference-data.routes";

function ok(data: unknown): McpToolResult {
  return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
}
function err(message: string): McpToolResult {
  return {
    content: [{ type: "text", text: `Error: ${message}` }],
    isError: true,
  };
}

// â”€â”€ Blast Radius â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export async function handleCalculateBlastRadius(
  args: Record<string, unknown>,
  _ctx: RequestContext,
): Promise<McpToolResult> {
  try {
    const controlId = args["control_id"] as string;
    if (!controlId)
      return err("control_id is required (e.g. 'GOV-01', 'CRY-02').");

    const result = IntelligenceService.calculateBlastRadius(controlId);
    return ok({
      ...result,
      control_id: controlId,
      _hint:
        "This shows which risks, regulations, and data retention rules would be compromised if this control fails.",
    });
  } catch (e) {
    return err(e instanceof Error ? e.message : String(e));
  }
}

// â”€â”€ ROI Path â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export async function handleCalculateRoiPath(
  args: Record<string, unknown>,
  ctx: RequestContext,
): Promise<McpToolResult> {
  try {
    const targetFramework = args["target_framework"] as string;
    if (!targetFramework)
      return err(
        "target_framework is required (e.g. 'iso27001', 'lgpd', 'gdpr').",
      );

    const implementedRaw = args["scf_controls_implemented"] as
      | string[]
      | string
      | undefined;
    const implemented: string[] = Array.isArray(implementedRaw)
      ? implementedRaw
      : typeof implementedRaw === "string"
        ? implementedRaw
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
        : [];

    const topN = Math.min(Number(args["top_n"] ?? 10), 50);

    const implementedSet = new Set(implemented);
    // Use DB-backed instance method instead of static (which only knows LGPD/GDPR)
    const service = new IntelligenceService(ctx.deps);
    const requiredControls =
      await service.getControlsForFramework(targetFramework);
    const missingControls = Array.from(requiredControls).filter(
      (c) => !implementedSet.has(c),
    );

    // Calculate ROI topological score
    const roiScores = missingControls.map((control) => {
      let score = 0;
      const mitigates: string[] = [];

      for (const cat of RISK_TAXONOMY.categories) {
        for (const r of cat.risks) {
          if (r.scf_controls.includes(control)) {
            score += 1;
            mitigates.push(
              `Risk: ${(r.name_i18n as any).en || (r.name_i18n as any).pt || r.id}`,
            );
          }
        }
      }

      for (const reg of REGULATIONS) {
        let hit = false;
        if (reg.dpia_triggers.some((t) => t.scf_controls.includes(control)))
          hit = true;
        if (reg.consent_rules.scf_controls.includes(control)) hit = true;
        if (reg.breach_rules.scf_controls.includes(control)) hit = true;
        if (reg.legal_bases.some((lb) => lb.scf_controls.includes(control)))
          hit = true;
        if (
          reg.sensitive_legal_bases.some((lb) =>
            lb.scf_controls.includes(control),
          )
        )
          hit = true;
        if (
          reg.data_subject_rights.some((r) => r.scf_controls.includes(control))
        )
          hit = true;
        if (hit) {
          score += 1;
          mitigates.push(`Regulation: ${reg.id}`);
        }
      }

      return {
        control_id: control,
        roi_score: score,
        mitigations_count: mitigates.length,
        key_mitigations: mitigates.slice(0, 5),
      };
    });

    roiScores.sort((a, b) => b.roi_score - a.roi_score);
    const topControls = roiScores.slice(0, topN);

    return ok({
      target_framework: targetFramework,
      total_missing: missingControls.length,
      top_controls: topControls,
      summary: `Implement these ${topControls.length} controls for maximum global risk mitigation toward ${targetFramework}.`,
    });
  } catch (e) {
    return err(e instanceof Error ? e.message : String(e));
  }
}

// â”€â”€ Compliance Score â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export async function handleCalculateComplianceScore(
  args: Record<string, unknown>,
  ctx: RequestContext,
): Promise<McpToolResult> {
  try {
    const regulationId = args["regulation_id"] as string;
    if (!regulationId)
      return err(
        "regulation_id is required (e.g. 'lgpd', 'gdpr', 'iso27001').",
      );

    const implementedRaw = args["scf_controls_implemented"] as
      | string[]
      | string
      | undefined;
    const implemented: string[] = Array.isArray(implementedRaw)
      ? implementedRaw
      : typeof implementedRaw === "string"
        ? implementedRaw
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
        : [];

    const regulation = REGULATIONS.find((r) => r.id === regulationId);
    if (!regulation) return err(`Regulation '${regulationId}' not found.`);

    const implementedSet = new Set(implemented);
    // Use DB-backed instance method instead of static (which only knows LGPD/GDPR)
    const service = new IntelligenceService(ctx.deps);
    const requiredControls =
      await service.getControlsForFramework(regulationId);

    const missingControls: string[] = [];
    let implementedCount = 0;
    const totalControls = requiredControls.size;

    for (const reqControl of requiredControls) {
      if (implementedSet.has(reqControl)) {
        implementedCount++;
      } else {
        missingControls.push(reqControl);
      }
    }

    // TODO(ADR-001): migrate to STRM-weighted compliance (computeComplianceIndex).
    // This MCP tool has `ctx.deps` but only receives scf_controls_implemented as a flat
    // string[] — no SoA items, maturity_level, or STRM mapping data available.
    // Needs tool input change to accept assessment_id + SoA context, then use
    // computeRealStrmCompliance() pattern from dashboard.routes.ts.
    const score =
      totalControls === 0
        ? 100
        : Math.round((implementedCount / totalControls) * 100);

    return ok({
      regulation_id: regulationId,
      compliance_score_percent: score,
      implemented_count: implementedCount,
      total_required: totalControls,
      missing_controls: missingControls.slice(0, 30),
      missing_total: missingControls.length,
    });
  } catch (e) {
    return err(e instanceof Error ? e.message : String(e));
  }
}

// â”€â”€ DPIA Score â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export async function handleCalculateDpiaScore(
  args: Record<string, unknown>,
  _ctx: RequestContext,
): Promise<McpToolResult> {
  try {
    const regulationId = args["regulation_id"] as string;
    if (!regulationId) return err("regulation_id is required.");

    const dataCategories = (args["data_categories"] as string[]) ?? [];
    const volumeScale = (args["volume_scale"] as string) ?? "medium";
    const implementedRaw = args["scf_controls_implemented"] as
      | string[]
      | string
      | undefined;
    const implemented: string[] = Array.isArray(implementedRaw)
      ? implementedRaw
      : [];

    const regulation = REGULATIONS.find((r) => r.id === regulationId);
    if (!regulation) return err(`Regulation '${regulationId}' not found.`);

    let riskScore = 0;
    const triggersHit: string[] = [];

    const categories = DATA_CATEGORIES.filter((c: any) =>
      dataCategories.includes(c.id),
    );
    for (const cat of categories) {
      if ((cat as any).sensitivity === "criminal") {
        riskScore += 30;
        triggersHit.push(`Criminal Data: ${cat.id}`);
      } else if ((cat as any).sensitivity === "special") {
        riskScore += 20;
        triggersHit.push(`Special Data: ${cat.id}`);
      }
    }

    const volume = VOLUME_SCALE.find((v: any) => v.id === volumeScale);
    if (volume) riskScore += (volume as any).risk_contribution ?? 0;

    if (regulation.dpia_triggers?.length > 0 && riskScore > 40) {
      triggersHit.push(`Regulation ${regulation.id} default triggers`);
    }

    const mitigationFactor = implemented.length * 2;
    const finalScore = Math.max(0, riskScore - mitigationFactor);

    let level = "low";
    if (finalScore > 75) level = "critical";
    else if (finalScore > 50) level = "high";
    else if (finalScore > 25) level = "medium";

    return ok({
      regulation_id: regulationId,
      base_risk_score: riskScore,
      mitigation_factor: mitigationFactor,
      final_dpia_score: finalScore,
      risk_level: level,
      triggers_hit: triggersHit,
      assessment_required: finalScore > 50,
    });
  } catch (e) {
    return err(e instanceof Error ? e.message : String(e));
  }
}

// â”€â”€ Breach SLA â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export async function handleCheckBreachSla(
  args: Record<string, unknown>,
  _ctx: RequestContext,
): Promise<McpToolResult> {
  try {
    const regulationId = args["regulation_id"] as string;
    const severity = args["severity"] as string;
    if (!regulationId) return err("regulation_id is required.");
    if (!severity)
      return err("severity is required (critical, high, medium, low).");

    const regulation = REGULATIONS.find((r) => r.id === regulationId);
    if (!regulation) return err(`Regulation '${regulationId}' not found.`);

    const severityRule = regulation.breach_rules.severity_levels.find(
      (s) => s.level === severity,
    );
    if (!severityRule)
      return err(`Severity '${severity}' not mapped for ${regulationId}.`);

    return ok({
      regulation_id: regulationId,
      authority: regulation.breach_rules.authority_name,
      authority_deadline_hours:
        regulation.breach_rules.authority_deadline_hours,
      subject_notification: regulation.breach_rules.subject_notification,
      severity,
      auth_notify: severityRule.auth_notify,
      subject_notify: severityRule.subject_notify,
      response_hours_sla: severityRule.response_hours,
      controls_to_activate: regulation.breach_rules.scf_controls,
    });
  } catch (e) {
    return err(e instanceof Error ? e.message : String(e));
  }
}

// â”€â”€ Cross-Coverage â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export async function handleCalculateCrossCoverage(
  args: Record<string, unknown>,
  ctx: RequestContext,
): Promise<McpToolResult> {
  try {
    const sourceFramework = args["source_framework"] as string;
    const targetFramework = args["target_framework"] as string;
    if (!sourceFramework || !targetFramework)
      return err("source_framework and target_framework are required.");

    const implementedRaw = args["scf_controls_implemented"] as
      | string[]
      | string
      | undefined;
    const implemented: string[] = Array.isArray(implementedRaw)
      ? implementedRaw
      : typeof implementedRaw === "string"
        ? implementedRaw
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
        : [];

    const implementedSet = new Set(implemented);
    // Use DB-backed instance method instead of static (which only knows LGPD/GDPR)
    const service = new IntelligenceService(ctx.deps);
    const targetControls =
      await service.getControlsForFramework(targetFramework);
    const totalTarget = targetControls.size;

    let sharedImplementation = 0;
    const missingInTarget: string[] = [];

    for (const ctrl of targetControls) {
      if (implementedSet.has(ctrl)) {
        sharedImplementation++;
      } else {
        missingInTarget.push(ctrl);
      }
    }

    const overlapPct =
      totalTarget === 0
        ? 0
        : Math.round((sharedImplementation / totalTarget) * 100);

    return ok({
      source_framework: sourceFramework,
      target_framework: targetFramework,
      overlap_percentage: overlapPct,
      shared_count: sharedImplementation,
      total_target: totalTarget,
      missing_controls: missingInTarget.slice(0, 30),
      missing_total: missingInTarget.length,
    });
  } catch (e) {
    return err(e instanceof Error ? e.message : String(e));
  }
}
