import { z } from "@standard/schemas";
import type { RouteDefinition } from "../http";
import { json, parseJson, requireOrganizationId } from "../http";
import { ApiError } from "../errors/api-error";
import { flattenI18n } from "../utils/i18n";
import { RISK_TAXONOMY } from "./risk.routes";
import { REGULATIONS } from "./regulations.routes";
import {
  DATA_CATEGORIES,
  VOLUME_SCALE,
  RETENTION_RULES,
} from "./reference-data.routes";
import { IntelligenceService } from "../services/intelligence.service";
import {
  GapAnalysisRequestSchema,
  ComplianceScoreRequestSchema,
  DpiaScoreRequestSchema,
  CrossCoverageRequestSchema,
  RoiPathRequestSchema,
  BlastRadiusRequestSchema,
  RetentionCheckRequestSchema,
  BreachSlaRequestSchema,
  BlastRadiusOutputSchema,
  GapAnalysisOutputSchema,
  ComplianceScoreOutputSchema,
  DpiaScoreOutputSchema,
  CrossCoverageOutputSchema,
  RetentionCheckOutputSchema,
  BreachSlaOutputSchema,
  RoiPathOutputSchema,
} from "../schemas/intelligence.schema";

export const intelligenceRoutes: RouteDefinition[] = [
  {
    method: "POST",
    path: "/api/v1/intelligence/blast-radius",
    authRequired: true,
    tenantRequired: false,
    bodySchema: BlastRadiusRequestSchema,
    openapi: {
      tags: ["Intelligence"],
      summary: "Calculate Control Blast Radius",
      description:
        "Determines the impact radius of a control across risks, regulations, and data categories.",
      responses: {
        200: {
          description: "Blast Radius Results",
          content: {
            "application/json": {
              schema: z.object({
                data: BlastRadiusOutputSchema,
                trace_id: z.string(),
              }),
            },
          },
        },
      },
    },
    handler: async ({ validatedBody, traceId }) => {
      const body = validatedBody as z.infer<typeof BlastRadiusRequestSchema>;
      const result = IntelligenceService.calculateBlastRadius(body.control_id);
      return json({ data: result, trace_id: traceId });
    },
  },
  {
    method: "POST",
    path: "/api/v1/intelligence/gap-analysis",
    authRequired: true,
    tenantRequired: false, // Core rules engine is tenant agnostic
    bodySchema: GapAnalysisRequestSchema,
    openapi: {
      tags: ["Intelligence"],
      summary: "Perform Gap Analysis",
      description:
        "Analyzes implemented controls against a target framework to identify gaps.",
      responses: {
        200: {
          description: "Gap Analysis Results",
          content: {
            "application/json": {
              schema: z.object({
                data: GapAnalysisOutputSchema,
                trace_id: z.string(),
              }),
            },
          },
        },
      },
    },
    handler: async ({ request, validatedBody, traceId, deps }) => {
      const locale = new URL(request.url).searchParams.get("locale") || "pt";
      const body = validatedBody as z.infer<typeof GapAnalysisRequestSchema>;

      // Use DB-backed async method instead of static (which only knows LGPD/GDPR)
      const service = new IntelligenceService(deps);
      const metrics = await service.calculateGapAnalysisAsync(
        body.framework_mask,
        body.scf_controls_implemented,
      );

      const result = {
        framework: body.framework_mask,
        summary: {
          total_required_controls: metrics.totalControls,
          implemented_controls: metrics.implementedCount,
          missing_controls: metrics.missingControls.length,
          compliance_percentage: metrics.compliancePercentage,
        },
        missing_controls: metrics.missingControls,
        actionable_insights_i18n: {
          pt: `Sua conformidade avaliada com ${body.framework_mask} estÃ¡ em ${metrics.compliancePercentage}%. VocÃª possui lacunas em ${metrics.missingControls.length} controles que deverÃ£o ser mitigadas.`,
          en: `Your assessed compliance with ${body.framework_mask} is at ${metrics.compliancePercentage}%. You have gaps in ${metrics.missingControls.length} controls that must be mitigated.`,
        },
      };

      return json({ data: flattenI18n(result, locale), trace_id: traceId });
    },
  },
  {
    method: "POST",
    path: "/api/v1/intelligence/dpia-score",
    authRequired: true,
    tenantRequired: false,
    bodySchema: DpiaScoreRequestSchema,
    openapi: {
      tags: ["Intelligence"],
      summary: "Calculate DPIA Score",
      description:
        "Calculates the DPIA risk score based on data categories and implemented controls.",
      responses: {
        200: {
          description: "DPIA Score Results",
          content: {
            "application/json": {
              schema: z.object({
                data: DpiaScoreOutputSchema,
                trace_id: z.string(),
              }),
            },
          },
        },
      },
    },
    handler: async ({ request, validatedBody, traceId }) => {
      const locale = new URL(request.url).searchParams.get("locale") || "pt";
      const body = validatedBody as z.infer<typeof DpiaScoreRequestSchema>;

      const regulation = REGULATIONS.find((r) => r.id === body.regulation_id);
      if (!regulation)
        throw new ApiError(
          "NOT_FOUND",
          "Regulation not found or not mapped in stateless engine.",
          404,
        );

      let riskScore = 0;
      const triggersHit: string[] = [];

      // Simple DPIA logic:
      // 1. Check data categories sensitivity
      const categories = DATA_CATEGORIES.filter((c: any) =>
        body.data_categories.includes(c.id),
      );
      for (const cat of categories) {
        if (cat.sensitivity === "criminal") {
          riskScore += 30;
          triggersHit.push(`Criminal Data Category: ${cat.id}`);
        } else if (cat.sensitivity === "special") {
          riskScore += 20;
          triggersHit.push(`Special Data Category: ${cat.id}`);
        }
      }

      // 2. Volume Scale risk
      const volume = VOLUME_SCALE.find((v: any) => v.id === body.volume_scale);
      if (volume) {
        riskScore += volume.risk_contribution;
      }

      // 3. Reg DPIA Triggers (mock check - in reality, would map against processing context)
      if (regulation.dpia_triggers && regulation.dpia_triggers.length > 0) {
        // Assume some trigger hits if riskScore > 40
        if (riskScore > 40) {
          triggersHit.push(
            `Triggered by regulation ${regulation.id} default rules`,
          );
        }
      }

      // 4. Mitigating Controls (scf_controls_implemented)
      const mitigationFactor = body.scf_controls_implemented.length * 2; // Arbitrary 2 points mitigation per control
      const finalScore = Math.max(0, riskScore - mitigationFactor);

      let level = "low";
      if (finalScore > 75) level = "critical";
      else if (finalScore > 50) level = "high";
      else if (finalScore > 25) level = "medium";

      const result = {
        regulation: regulation.id,
        base_risk_score: riskScore,
        mitigation_factor: mitigationFactor,
        final_dpia_score: finalScore,
        risk_level: level,
        triggers_hit: triggersHit,
        assessment_required: finalScore > 50,
      };

      return json({ data: flattenI18n(result, locale), trace_id: traceId });
    },
  },
  {
    method: "POST",
    path: "/api/v1/intelligence/compliance-score",
    authRequired: true,
    tenantRequired: false,
    bodySchema: ComplianceScoreRequestSchema,
    openapi: {
      tags: ["Intelligence"],
      summary: "Calculate Compliance Score",
      description:
        "Calculates compliance score against a specific regulation based on implemented controls.",
      responses: {
        200: {
          description: "Compliance Score Results",
          content: {
            "application/json": {
              schema: z.object({
                data: ComplianceScoreOutputSchema,
                trace_id: z.string(),
              }),
            },
          },
        },
      },
    },
    handler: async ({ request, validatedBody, traceId, deps }) => {
      const locale = new URL(request.url).searchParams.get("locale") || "pt";
      const body = validatedBody as z.infer<
        typeof ComplianceScoreRequestSchema
      >;

      const regulation = REGULATIONS.find((r) => r.id === body.regulation_id);
      if (!regulation)
        throw new ApiError("NOT_FOUND", "Regulation not found.", 404);

      const implementedSet = new Set(body.scf_controls_implemented);
      // Use DB-backed instance method instead of static (which only knows LGPD/GDPR)
      const service = new IntelligenceService(deps);
      const requiredControls = await service.getControlsForFramework(
        body.regulation_id,
      );

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
      // This handler has `deps` but the request body only provides scf_controls_implemented
      // as a flat string[] — no SoA items, maturity_level, or STRM mapping data available.
      // Needs request-shape change to accept assessment_id + SoA context, then use
      // computeRealStrmCompliance() pattern from dashboard.routes.ts.
      const score =
        totalControls === 0
          ? 100
          : Math.round((implementedCount / totalControls) * 100);

      const result = {
        regulation_id: body.regulation_id,
        score: score,
        scf_controls_implemented_count: implementedCount,
        total_required_controls: totalControls,
        missing_controls: missingControls,
        message_i18n: {
          pt: `O score de conformidade para ${regulation.name_i18n.pt} Ã© de ${score}%.`,
          en: `The compliance score for ${regulation.name_i18n.en || regulation.name_i18n.pt} is ${score}%.`,
        },
      };

      return json({ data: flattenI18n(result, locale), trace_id: traceId });
    },
  },
  {
    method: "POST",
    path: "/api/v1/intelligence/retention-check",
    authRequired: true,
    tenantRequired: false,
    bodySchema: RetentionCheckRequestSchema,
    openapi: {
      tags: ["Intelligence"],
      summary: "Check Data Retention Rules",
      description:
        "Checks data retention rules based on category, purpose, and jurisdiction.",
      responses: {
        200: {
          description: "Retention Rules Results",
          content: {
            "application/json": {
              schema: z.object({
                data: RetentionCheckOutputSchema,
                trace_id: z.string(),
              }),
            },
          },
        },
      },
    },
    handler: async ({ request, validatedBody, traceId }) => {
      const locale = new URL(request.url).searchParams.get("locale") || "pt";
      const body = validatedBody as z.infer<typeof RetentionCheckRequestSchema>;

      // Find retention rule matching data category & purpose & context
      const rule = RETENTION_RULES.find(
        (r: any) =>
          r.data_category_id === body.data_category &&
          r.context_id === body.processing_purpose &&
          r.jurisdiction === body.jurisdiction,
      );

      if (!rule) {
        return json({
          data: flattenI18n(
            { status: "no_rule_found", assumed_min_months: 60 },
            locale,
          ),
          trace_id: traceId,
        });
      }

      const result = {
        status: "rule_found",
        data_category: rule.data_category_id,
        context: rule.context_id,
        min_months: rule.min_months,
        max_months: rule.max_months,
        legal_basis: rule.legal_basis,
        disposal_method: rule.disposal_method,
        scf_controls: rule.scf_controls,
      };

      return json({ data: flattenI18n(result, locale), trace_id: traceId });
    },
  },
  {
    method: "POST",
    path: "/api/v1/intelligence/breach-sla",
    authRequired: true,
    tenantRequired: false,
    bodySchema: BreachSlaRequestSchema,
    openapi: {
      tags: ["Intelligence"],
      summary: "Check Breach Notification SLA",
      description:
        "Determines breach notification SLA based on regulation and severity.",
      responses: {
        200: {
          description: "Breach SLA Results",
          content: {
            "application/json": {
              schema: z.object({
                data: BreachSlaOutputSchema,
                trace_id: z.string(),
              }),
            },
          },
        },
      },
    },
    handler: async ({ request, validatedBody, traceId }) => {
      const locale = new URL(request.url).searchParams.get("locale") || "pt";
      const body = validatedBody as z.infer<typeof BreachSlaRequestSchema>;

      const regulation = REGULATIONS.find((r) => r.id === body.regulation_id);
      if (!regulation)
        throw new ApiError("NOT_FOUND", "Regulation not found.", 404);

      const severityRule = regulation.breach_rules.severity_levels.find(
        (s) => s.level === body.severity,
      );
      if (!severityRule)
        throw new ApiError(
          "NOT_FOUND",
          "Severity rule not mapped for this regulation.",
          404,
        );

      const result = {
        authority: regulation.breach_rules.authority_name,
        authority_deadline_hours:
          regulation.breach_rules.authority_deadline_hours,
        subject_notification: regulation.breach_rules.subject_notification,
        severity: body.severity,
        auth_notify: severityRule.auth_notify,
        subject_notify: severityRule.subject_notify,
        response_hours_sla: severityRule.response_hours,
        controls_to_activate: regulation.breach_rules.scf_controls,
      };

      return json({ data: flattenI18n(result, locale), trace_id: traceId });
    },
  },
  {
    method: "POST",
    path: "/api/v1/intelligence/cross-coverage",
    authRequired: true,
    tenantRequired: false,
    bodySchema: CrossCoverageRequestSchema,
    openapi: {
      tags: ["Intelligence"],
      summary: "Calculate Cross-Framework Coverage",
      description:
        "Calculates coverage mapping between a source framework and a target framework.",
      responses: {
        200: {
          description: "Cross Coverage Results",
          content: {
            "application/json": {
              schema: z.object({
                data: CrossCoverageOutputSchema,
                trace_id: z.string(),
              }),
            },
          },
        },
      },
    },
    handler: async ({ request, validatedBody, traceId, deps }) => {
      const locale = new URL(request.url).searchParams.get("locale") || "pt";
      const body = validatedBody as z.infer<typeof CrossCoverageRequestSchema>;

      const implementedSet = new Set(body.scf_controls_implemented);

      // Get controls required by target framework (DB-backed)
      const service = new IntelligenceService(deps);
      const targetControls = await service.getControlsForFramework(
        body.target_framework,
      );
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

      const result = {
        source_framework: body.source_framework,
        target_framework: body.target_framework,
        overlap_percentage: overlapPct,
        shared_implementation_count: sharedImplementation,
        total_target_controls: totalTarget,
        missing_controls: missingInTarget,
        interpretation_i18n: {
          pt: `Seus controles implementados cobrem ${overlapPct}% de ${body.target_framework}.`,
          en: `Your implemented controls cover ${overlapPct}% of ${body.target_framework}.`,
        },
      };

      return json({ data: flattenI18n(result, locale), trace_id: traceId });
    },
  },
  {
    method: "POST",
    path: "/api/v1/intelligence/roi-path",
    authRequired: true,
    tenantRequired: false,
    bodySchema: RoiPathRequestSchema,
    openapi: {
      tags: ["Intelligence"],
      summary: "Calculate ROI Path for Controls",
      description:
        "Recommends the most impactful controls to implement based on ROI.",
      responses: {
        200: {
          description: "ROI Path Results",
          content: {
            "application/json": {
              schema: z.object({
                data: RoiPathOutputSchema,
                trace_id: z.string(),
              }),
            },
          },
        },
      },
    },
    handler: async ({ request, validatedBody, traceId, deps }) => {
      const locale = new URL(request.url).searchParams.get("locale") || "pt";
      const body = validatedBody as z.infer<typeof RoiPathRequestSchema>;

      const implementedSet = new Set(body.scf_controls_implemented);
      const service = new IntelligenceService(deps);
      const requiredControls = await service.getControlsForFramework(
        body.target_framework,
      );

      const missingControls = Array.from(requiredControls).filter(
        (c) => !implementedSet.has(c),
      );

      // Calculate ROI Topological Score
      const roiScores = missingControls.map((control) => {
        let score = 0;
        const mitigates: string[] = [];

        // 1. Risks
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

        // 2. Regulations
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
            reg.data_subject_rights.some((r) =>
              r.scf_controls.includes(control),
            )
          )
            hit = true;

          if (hit) {
            score += 1;
            mitigates.push(`Regulation: ${reg.id}`);
          }
        }

        // 3. Data Categories & Retention
        for (const dc of DATA_CATEGORIES) {
          if ((dc as any).scf_controls?.includes(control)) {
            score += 1;
            mitigates.push(`Data Category: ${dc.id}`);
          }
        }

        for (const rr of RETENTION_RULES) {
          if ((rr as any).scf_controls?.includes(control)) {
            score += 1;
            mitigates.push(
              `Retention Rule: ${rr.data_category_id}-${rr.context_id}`,
            );
          }
        }

        return {
          control_id: control,
          roi_score: score,
          mitigations_count: mitigates.length,
          key_mitigations: mitigates.slice(0, 5),
        };
      });

      // Sort by ROI Score DESC
      roiScores.sort((a, b) => b.roi_score - a.roi_score);

      const topControls = roiScores.slice(0, body.top_n);

      const actionPlanPt = `O caminho mais rÃ¡pido para aderir ao framework ${body.target_framework} com o mÃ¡ximo de impacto global Ã© implantar os ${topControls.length} controles listados.`;
      const actionPlanEn = `The fastest path to comply with ${body.target_framework} with the highest global impact is to implement the listed ${topControls.length} controls.`;

      const result = {
        target_framework: body.target_framework,
        top_n_requested: body.top_n,
        total_missing: missingControls.length,
        roi_path: topControls,
        summary_i18n: {
          pt: actionPlanPt,
          en: actionPlanEn,
        },
      };

      return json({ data: flattenI18n(result, locale), trace_id: traceId });
    },
  },
  {
    method: "POST",
    path: "/api/v1/intelligence/council",
    authRequired: true,
    tenantRequired: true,
    bodySchema: z.object({
      assessment_id: z.string().uuid(),
      target_framework_id: z.string().uuid(),
      agents: z.array(z.string()).min(1),
      input: z.record(z.string(), z.unknown()).default({}),
    }),
    handler: async ({
      request,
      validatedBody,
      traceId,
      organizationId,
      deps,
    }) => {
      const body = validatedBody as {
        assessment_id: string;
        target_framework_id: string;
        agents: any[];
        input: Record<string, unknown>;
      };

      if (!deps.agentRuntime) {
        throw new ApiError(
          "INTERNAL_ERROR",
          "Agent Runtime is not configured.",
          500,
        );
      }

      // === Context Injection (RAG) ===
      if (body.input.control_id && deps.scf) {
        const latestVersion = await deps.scf.versions.getLatestVersion();
        if (latestVersion) {
          const control = await deps.scf.controls.getControlByCode(
            latestVersion.id,
            String(body.input.control_id),
          );
          if (control) {
            body.input.regulatoryContext = `[Control ${control.control_code}] ${control.control_question ?? ""}\n${control.implementation_guidance ?? ""}`;
          }
        }
      }

      // Import runtime classes dynamically or use the ones from deps
      const { AgentRuntimeService, AgentExecutor, CouncilOrchestrator } =
        await import("@standard/agent-runtime");

      const runtimeService = new AgentRuntimeService(deps.agentRuntime);
      const executor = new AgentExecutor(runtimeService, deps.agentRuntime);
      const council = new CouncilOrchestrator(runtimeService, executor);

      const job = await council.startCouncilDetached({
        organization_id:
          organizationId || "00000000-0000-0000-0000-000000000000",
        assessment_id: body.assessment_id,
        target_framework_id: body.target_framework_id,
        trace_id: traceId,
        agents: body.agents,
        input: body.input,
      });

      if (deps.COUNCIL_WORKFLOW) {
        await deps.COUNCIL_WORKFLOW.create({
          id: job.run_id,
          params: {
            runId: job.run_id,
            organizationId: requireOrganizationId({ organizationId }),
            agents: body.agents,
            inputData: body.input,
          },
        });
      } else if (deps.AGENT_RUN_QUEUE) {
        await deps.AGENT_RUN_QUEUE.send({
          agent_run_id: job.run_id,
          organization_id: requireOrganizationId({ organizationId }),
          assessment_id: body.assessment_id,
        });
      }

      return json(
        {
          status: "accepted",
          job_id: job.run_id,
          trace_id: traceId,
          message:
            "Council analysis dispatched successfully. Poll /api/v1/jobs/:job_id for status.",
        },
        { status: 202 },
      );
    },
  },
];
