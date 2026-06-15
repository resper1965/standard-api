/**
 * TPRA Routes — Third-Party Risk Assessment
 *
 * Static catalogue:
 *   GET  /api/v1/tpra/questionnaires
 *   GET  /api/v1/tpra/questionnaires/:id
 *   GET  /api/v1/tpra/questionnaires/:id/sections/:sectionId
 *   GET  /api/v1/tpra/tiers
 *   POST /api/v1/tpra/score
 *   GET  /api/v1/tpra/scf-mapping
 *
 * Persistence (Surgery 4):
 *   POST /api/v1/tpra/vendors                             — create vendor
 *   GET  /api/v1/tpra/vendors                             — list vendors
 *   GET  /api/v1/tpra/vendors/:vendorId                   — get vendor
 *   POST /api/v1/tpra/vendors/:vendorId/assessments       — create TPRA assessment
 *   GET  /api/v1/tpra/vendors/:vendorId/assessments       — list TPRA assessments
 *   POST /api/v1/tpra/assessments/:id/submit              — submit responses
 *   POST /api/v1/tpra/assessments/:id/risk-score          — persist risk score
 *   GET  /api/v1/tpra/vendors/:vendorId/risk-scores       — risk score history
 */
import type { RouteDefinition } from "../http";
import { json, newId, routeUuidParam, requireOrganizationId } from "../http";
import { ApiError } from "../errors/api-error";
import { flattenI18n } from "../utils/i18n";
import { categoriseRisk } from "./tpra-score-service";

// ── TPRA Questionnaire Data ─────────────────────────────────────────────────

const TPRA_QUESTIONNAIRES = [
  {
    id: "standard_v1",
    name_i18n: {
      pt: "Questionário Padrão de Avaliação de Terceiros v1",
      en: "Standard Third-Party Assessment Questionnaire v1",
    },
    description_i18n: {
      pt: "Questionário completo para avaliação de segurança e privacidade de fornecedores, alinhado ao SCF.",
      en: "Compliance assessment for vendor security and privacy, aligned with SCF.",
    },
    version: "1.0",
    sections: [
      {
        id: "governance",
        name_i18n: {
          pt: "Governança e Políticas",
          en: "Governance and Policies",
        },
        weight: 0.15,
        questions: [
          {
            id: "Q01",
            text_i18n: {
              pt: "O fornecedor possui política de segurança aprovada pela alta gestão?",
              en: "Has the vendor an information security policy approved by senior management?",
            },
            type: "yes_no" as const,
            weight: 0.25,
            scoring: { yes: 5, no: 1, partial: 3 },
            scf_controls: ["GOV-01", "GOV-02"],
            required: true,
          },
          {
            id: "Q02",
            text_i18n: {
              pt: "Existe um responsável formal por segurança (CISO ou equivalente)?",
              en: "Is there a formal CISO or equivalent?",
            },
            type: "yes_no" as const,
            weight: 0.25,
            scoring: { yes: 5, no: 1 },
            scf_controls: ["GOV-04"],
            required: true,
          },
          {
            id: "Q03",
            text_i18n: {
              pt: "O fornecedor possui certificação ISO 27001 ou SOC 2 vigente?",
              en: "Does the vendor have current ISO 27001 or SOC 2 certification?",
            },
            type: "multi_select" as const,
            weight: 0.3,
            scoring: {
              iso_27001: 5,
              soc2_type2: 5,
              soc2_type1: 4,
              other: 3,
              none: 1,
            },
            scf_controls: ["CPL-01", "AIS-01"],
            required: true,
          },
          {
            id: "Q04",
            text_i18n: {
              pt: "As políticas são revisadas no mínimo anualmente?",
              en: "Are policies reviewed at least annually?",
            },
            type: "yes_no" as const,
            weight: 0.2,
            scoring: { yes: 5, no: 1, partial: 3 },
            scf_controls: ["GOV-06"],
            required: false,
          },
        ],
      },
      {
        id: "access_control",
        name_i18n: { pt: "Controle de Acesso", en: "Access Control" },
        weight: 0.15,
        questions: [
          {
            id: "Q05",
            text_i18n: {
              pt: "O fornecedor utiliza MFA para acesso a sistemas?",
              en: "Does the vendor use MFA?",
            },
            type: "scale_1_5" as const,
            weight: 0.3,
            scoring: { "5": 5, "4": 4, "3": 3, "2": 2, "1": 1 },
            scf_controls: ["IAC-15"],
            required: true,
          },
          {
            id: "Q06",
            text_i18n: {
              pt: "O princípio do menor privilégio é implementado?",
              en: "Is least privilege implemented?",
            },
            type: "yes_no" as const,
            weight: 0.25,
            scoring: { yes: 5, no: 1, partial: 3 },
            scf_controls: ["IAC-06"],
            required: true,
          },
          {
            id: "Q07",
            text_i18n: {
              pt: "Acessos são revisados periodicamente (mínimo trimestral)?",
              en: "Are accesses reviewed quarterly?",
            },
            type: "yes_no" as const,
            weight: 0.25,
            scoring: { yes: 5, no: 1, partial: 3 },
            scf_controls: ["IAC-20", "IAC-21"],
            required: true,
          },
          {
            id: "Q08",
            text_i18n: {
              pt: "Existe processo de offboarding com revogação imediata?",
              en: "Is there an offboarding process with immediate revocation?",
            },
            type: "yes_no" as const,
            weight: 0.2,
            scoring: { yes: 5, no: 1, partial: 3 },
            scf_controls: ["HRS-06"],
            required: true,
          },
        ],
      },
      {
        id: "data_protection",
        name_i18n: { pt: "Proteção de Dados", en: "Data Protection" },
        weight: 0.2,
        questions: [
          {
            id: "Q09",
            text_i18n: {
              pt: "Os dados são classificados quanto à sensibilidade?",
              en: "Is data classified by sensitivity?",
            },
            type: "yes_no" as const,
            weight: 0.2,
            scoring: { yes: 5, no: 1, partial: 3 },
            scf_controls: ["DCH-01"],
            required: true,
          },
          {
            id: "Q10",
            text_i18n: {
              pt: "Dados em repouso são criptografados (AES-256)?",
              en: "Is data at rest encrypted?",
            },
            type: "yes_no" as const,
            weight: 0.25,
            scoring: { yes: 5, no: 1 },
            scf_controls: ["CRY-01", "CRY-09"],
            required: true,
          },
          {
            id: "Q11",
            text_i18n: {
              pt: "Dados em trânsito são criptografados (TLS 1.2+)?",
              en: "Is data in transit encrypted?",
            },
            type: "yes_no" as const,
            weight: 0.25,
            scoring: { yes: 5, no: 1 },
            scf_controls: ["CRY-03"],
            required: true,
          },
          {
            id: "Q12",
            text_i18n: {
              pt: "Backup é realizado com teste de restore?",
              en: "Are backups tested with restore?",
            },
            type: "scale_1_5" as const,
            weight: 0.15,
            scoring: { "5": 5, "4": 4, "3": 3, "2": 2, "1": 1 },
            scf_controls: ["BCD-01", "BCD-04"],
            required: true,
          },
          {
            id: "Q13",
            text_i18n: {
              pt: "Existe processo de destruição segura de dados?",
              en: "Is there a secure data disposal process?",
            },
            type: "yes_no" as const,
            weight: 0.15,
            scoring: { yes: 5, no: 1, partial: 3 },
            scf_controls: ["DCH-17", "DCH-18"],
            required: false,
          },
        ],
      },
      {
        id: "network",
        name_i18n: { pt: "Segurança de Rede", en: "Network Security" },
        weight: 0.1,
        questions: [
          {
            id: "Q14",
            text_i18n: {
              pt: "Firewall e IDS/IPS estão implementados?",
              en: "Are firewall and IDS/IPS implemented?",
            },
            type: "yes_no" as const,
            weight: 0.35,
            scoring: { yes: 5, no: 1, partial: 3 },
            scf_controls: ["NET-01", "NET-04"],
            required: true,
          },
          {
            id: "Q15",
            text_i18n: {
              pt: "A rede é segmentada entre ambientes?",
              en: "Is the network segmented by environment?",
            },
            type: "yes_no" as const,
            weight: 0.35,
            scoring: { yes: 5, no: 1, partial: 3 },
            scf_controls: ["NET-01", "NET-03"],
            required: true,
          },
          {
            id: "Q16",
            text_i18n: {
              pt: "Qual o nível de monitoramento de rede?",
              en: "What is the network monitoring level?",
            },
            type: "scale_1_5" as const,
            weight: 0.3,
            scoring: { "5": 5, "4": 4, "3": 3, "2": 2, "1": 1 },
            scf_controls: ["MON-01", "MON-02"],
            required: true,
          },
        ],
      },
      {
        id: "vulnerability_management",
        name_i18n: {
          pt: "Gestão de Vulnerabilidades",
          en: "Vulnerability Management",
        },
        weight: 0.1,
        questions: [
          {
            id: "Q17",
            text_i18n: {
              pt: "Scans de vulnerabilidade são executados regularmente?",
              en: "Are vulnerability scans performed regularly?",
            },
            type: "scale_1_5" as const,
            weight: 0.35,
            scoring: { "5": 5, "4": 4, "3": 3, "2": 2, "1": 1 },
            scf_controls: ["VUL-01", "VUL-02"],
            required: true,
          },
          {
            id: "Q18",
            text_i18n: {
              pt: "Patches críticos são aplicados em até 72h?",
              en: "Are critical patches applied within 72h?",
            },
            type: "yes_no" as const,
            weight: 0.35,
            scoring: { yes: 5, no: 1, partial: 3 },
            scf_controls: ["VUL-05"],
            required: true,
          },
          {
            id: "Q19",
            text_i18n: {
              pt: "Testes de penetração são realizados anualmente?",
              en: "Are penetration tests performed annually?",
            },
            type: "yes_no" as const,
            weight: 0.3,
            scoring: { yes: 5, no: 1 },
            scf_controls: ["VUL-06"],
            required: true,
          },
        ],
      },
      {
        id: "incident_response",
        name_i18n: { pt: "Resposta a Incidentes", en: "Incident Response" },
        weight: 0.1,
        questions: [
          {
            id: "Q20",
            text_i18n: {
              pt: "Existe plano de resposta a incidentes documentado e testado?",
              en: "Is there a documented and tested IRP?",
            },
            type: "yes_no" as const,
            weight: 0.4,
            scoring: { yes: 5, no: 1, partial: 3 },
            scf_controls: ["IRO-01", "IRO-02"],
            required: true,
          },
          {
            id: "Q21",
            text_i18n: {
              pt: "Incidentes são notificados em até 72h?",
              en: "Are incidents notified within 72h?",
            },
            type: "yes_no" as const,
            weight: 0.35,
            scoring: { yes: 5, no: 1, partial: 3 },
            scf_controls: ["IRO-07"],
            required: true,
          },
          {
            id: "Q22",
            text_i18n: {
              pt: "Existe equipa dedicada para resposta a incidentes?",
              en: "Is there a dedicated incident response team?",
            },
            type: "yes_no" as const,
            weight: 0.25,
            scoring: { yes: 5, no: 1 },
            scf_controls: ["IRO-01"],
            required: false,
          },
        ],
      },
      {
        id: "business_continuity",
        name_i18n: {
          pt: "Continuidade de Negócios",
          en: "Business Continuity",
        },
        weight: 0.1,
        questions: [
          {
            id: "Q23",
            text_i18n: {
              pt: "Existe BCP/DRP testado?",
              en: "Is there a tested BCP/DRP?",
            },
            type: "yes_no" as const,
            weight: 0.5,
            scoring: { yes: 5, no: 1, partial: 3 },
            scf_controls: ["BCD-01", "BCD-02"],
            required: true,
          },
          {
            id: "Q24",
            text_i18n: {
              pt: "O RTO/RPO é definido e monitorado?",
              en: "Is RTO/RPO formally defined and monitored?",
            },
            type: "yes_no" as const,
            weight: 0.5,
            scoring: { yes: 5, no: 1, partial: 3 },
            scf_controls: ["BCD-03"],
            required: true,
          },
        ],
      },
      {
        id: "privacy",
        name_i18n: {
          pt: "Privacidade e LGPD/GDPR",
          en: "Privacy and LGPD/GDPR",
        },
        weight: 0.1,
        questions: [
          {
            id: "Q25",
            text_i18n: {
              pt: "O fornecedor possui DPO designado?",
              en: "Does the vendor have a designated DPO?",
            },
            type: "yes_no" as const,
            weight: 0.35,
            scoring: { yes: 5, no: 1, partial: 3 },
            scf_controls: ["PRI-01", "PRI-02"],
            required: true,
          },
          {
            id: "Q26",
            text_i18n: {
              pt: "Existe política de privacidade e processo de consentimento?",
              en: "Is there a privacy policy and consent process?",
            },
            type: "yes_no" as const,
            weight: 0.35,
            scoring: { yes: 5, no: 1, partial: 3 },
            scf_controls: ["PRI-03"],
            required: true,
          },
          {
            id: "Q27",
            text_i18n: {
              pt: "O fornecedor possui ROPA?",
              en: "Does the vendor have a ROPA?",
            },
            type: "yes_no" as const,
            weight: 0.3,
            scoring: { yes: 5, no: 1, partial: 3 },
            scf_controls: ["PRI-06"],
            required: false,
          },
        ],
      },
    ],
    tiers: [
      {
        tier: 1,
        name_i18n: { pt: "Crítico", en: "Critical" },
        min_score: 0,
        max_score: 100,
        review_months: 6,
      },
      {
        tier: 2,
        name_i18n: { pt: "Alto", en: "High" },
        min_score: 60,
        max_score: 100,
        review_months: 12,
      },
      {
        tier: 3,
        name_i18n: { pt: "Médio", en: "Medium" },
        min_score: 75,
        max_score: 100,
        review_months: 18,
      },
      {
        tier: 4,
        name_i18n: { pt: "Baixo", en: "Low" },
        min_score: 85,
        max_score: 100,
        review_months: 24,
      },
    ],
    scoring: {
      critical_below: 40,
      high_below: 60,
      medium_below: 75,
      interpretation: [
        {
          level: "critical",
          action_i18n: {
            pt: "Não contratar ou exigir remediação imediata com prazo de 30 dias.",
            en: "Do not engage or require immediate remediation within 30 days.",
          },
        },
        {
          level: "high",
          action_i18n: {
            pt: "Contratar com plano de remediação formal e revisão em 6 meses.",
            en: "Engage with formal remediation plan and review in 6 months.",
          },
        },
        {
          level: "medium",
          action_i18n: {
            pt: "Contratar com monitoramento e revisão anual.",
            en: "Engage with monitoring and annual review.",
          },
        },
        {
          level: "low",
          action_i18n: {
            pt: "Contratar normalmente com revisão bienal.",
            en: "Engage normally with biennial review.",
          },
        },
      ],
    },
  },
];

const TPRA_INDEX = new Map(TPRA_QUESTIONNAIRES.map((q) => [q.id, q]));

// ── Routes ──────────────────────────────────────────────────────────────────

export const tpraRoutes: RouteDefinition[] = [
  // ── Static Catalogue ─────────────────────────────────────────────────────

  {
    method: "GET",
    path: "/api/v1/tpra/questionnaires",
    authRequired: true,
    tenantRequired: false,
    handler: async ({ request, traceId }) => {
      const locale = (new URL(request.url).searchParams.get("locale") ||
        "pt") as any;
      const summary = flattenI18n(TPRA_QUESTIONNAIRES, locale).map(
        (q: any) => ({
          id: q.id,
          name: q.name,
          version: q.version,
          section_count: q.sections.length,
          question_count: q.sections.reduce(
            (sum: any, s: any) => sum + s.questions.length,
            0,
          ),
        }),
      );
      return json({ data: summary, trace_id: traceId });
    },
  },
  {
    method: "GET",
    path: "/api/v1/tpra/questionnaires/:questionnaireId",
    authRequired: true,
    tenantRequired: false,
    handler: async ({ request, params, traceId }) => {
      const locale = (new URL(request.url).searchParams.get("locale") ||
        "pt") as any;
      const q = TPRA_INDEX.get(params["questionnaireId"] ?? "");
      if (!q)
        throw new ApiError(
          "NOT_FOUND",
          "Questionnaire not found. Available: standard_v1",
          404,
        );
      return json({ data: flattenI18n(q, locale), trace_id: traceId });
    },
  },
  {
    method: "GET",
    path: "/api/v1/tpra/questionnaires/:questionnaireId/sections/:sectionId",
    authRequired: true,
    tenantRequired: false,
    handler: async ({ request, params, traceId }) => {
      const locale = (new URL(request.url).searchParams.get("locale") ||
        "pt") as any;
      const q = TPRA_INDEX.get(params["questionnaireId"] ?? "");
      if (!q) throw new ApiError("NOT_FOUND", "Questionnaire not found.", 404);
      const section = q.sections.find((s) => s.id === params["sectionId"]);
      if (!section)
        throw new ApiError(
          "NOT_FOUND",
          `Section not found. Available: ${q.sections.map((s) => s.id).join(", ")}`,
          404,
        );
      return json({ data: flattenI18n(section, locale), trace_id: traceId });
    },
  },
  {
    method: "GET",
    path: "/api/v1/tpra/tiers",
    authRequired: true,
    tenantRequired: false,
    handler: async ({ request, traceId }) => {
      const locale = (new URL(request.url).searchParams.get("locale") ||
        "pt") as any;
      const q = TPRA_QUESTIONNAIRES[0];
      return json({
        data: q?.tiers ? flattenI18n(q.tiers, locale) : [],
        scoring: q?.scoring ?? {},
        trace_id: traceId,
      });
    },
  },
  {
    method: "POST",
    path: "/api/v1/tpra/score",
    authRequired: true,
    tenantRequired: false,
    handler: async ({ request, traceId }) => {
      const body = (await request.json()) as {
        questionnaire_id: string;
        answers: Record<string, string | number>;
      };
      const q = TPRA_INDEX.get(body.questionnaire_id ?? "standard_v1");
      if (!q) throw new ApiError("NOT_FOUND", "Questionnaire not found.", 404);

      let totalWeightedScore = 0;
      const sectionResults = [];

      for (const section of q.sections) {
        let sectionScore = 0;
        let sectionMaxScore = 0;
        const questionResults = [];
        for (const question of section.questions) {
          const answer = body.answers?.[question.id];
          const answerKey = String(answer ?? "").toLowerCase();
          const scoringMap = question.scoring as unknown as Record<
            string,
            number
          >;
          const score = scoringMap[answerKey] ?? 0;
          const maxScore = Math.max(...Object.values(scoringMap));
          sectionScore += score * question.weight;
          sectionMaxScore += maxScore * question.weight;
          questionResults.push({
            question_id: question.id,
            answer: answerKey,
            score,
            max_score: maxScore,
            weighted_score: score * question.weight,
          });
        }
        const sectionPct =
          sectionMaxScore > 0
            ? Math.round((sectionScore / sectionMaxScore) * 100)
            : 0;
        totalWeightedScore += sectionPct * section.weight;
        sectionResults.push({
          section_id: section.id,
          name_i18n: section.name_i18n,
          weight: section.weight,
          score_pct: sectionPct,
          questions: questionResults,
        });
      }

      const finalScore = Math.round(totalWeightedScore);
      // Usa categoriseRisk do tpra-score-service (DRY — mesma lógica de thresholds)
      const riskLevel = categoriseRisk(finalScore);

      const interpretation = q.scoring.interpretation.find(
        (i) => i.level === riskLevel,
      );
      const recommendedTier =
        q.tiers.find((t) => finalScore >= t.min_score) ?? q.tiers[0];
      const locale = (new URL(request.url).searchParams.get("locale") ||
        "pt") as any;

      return json({
        data: {
          final_score: finalScore,
          risk_level: riskLevel,
          interpretation: interpretation?.action_i18n?.pt ?? "",
          recommended_tier: recommendedTier,
          review_in_months: recommendedTier?.review_months,
          sections: flattenI18n(sectionResults, locale),
        },
        trace_id: traceId,
      });
    },
  },
  {
    method: "GET",
    path: "/api/v1/tpra/scf-mapping",
    authRequired: true,
    tenantRequired: false,
    handler: async ({ request, traceId }) => {
      const q = TPRA_QUESTIONNAIRES[0];
      if (!q) return json({ data: [], trace_id: traceId });
      const locale = (new URL(request.url).searchParams.get("locale") ||
        "pt") as any;
      const mapping = q.sections.flatMap((s) =>
        s.questions.map((question) => ({
          question_id: question.id,
          text_i18n: question.text_i18n,
          section_name_i18n: s.name_i18n,
          scf_controls: question.scf_controls,
        })),
      );
      return json({ data: flattenI18n(mapping, locale), trace_id: traceId });
    },
  },

  // ── Persistence: Vendors ─────────────────────────────────────────────────

  {
    method: "POST",
    path: "/api/v1/tpra/vendors",
    protected: true,
    permissions: ["assessment:create"],
    handler: async ({ request, deps, organizationId, traceId }) => {
      const orgId = requireOrganizationId({ organizationId });
      const body = (await request.json()) as {
        vendor_name: string;
        vendor_type?: string;
        contact_email?: string;
        metadata?: Record<string, unknown>;
      };
      if (!body.vendor_name)
        throw new ApiError("VALIDATION_ERROR", "vendor_name is required.", 400);
      const vendor = await deps.tpra.vendors.create({
        organization_id: orgId,
        vendor_name: body.vendor_name,
        vendor_type: body.vendor_type ?? null,
        contact_email: body.contact_email ?? null,
        metadata: body.metadata ?? {},
        trace_id: traceId,
      });
      // Best-effort webhook dispatch for TPRA vendor creation
      if (deps.webhooks) {
        try {
          const subscribers = await deps.webhooks.findSubscribers(
            orgId,
            "tpra.vendor.created",
          );
          for (const endpoint of subscribers) {
            if (!endpoint.enabled) continue;
            await deps.webhooks.logDelivery({
              delivery_id: newId(),
              endpoint_id: endpoint.id,
              event_id: newId(),
              event_type: "tpra.vendor.created",
              status: "pending",
              http_status: null,
              attempt_count: 0,
              max_attempts: 3,
              last_attempted_at: null,
              next_retry_at: new Date().toISOString(),
              response_body: null,
              created_at: new Date().toISOString(),
            });
          }
        } catch {
          // Non-blocking — webhook delivery is best-effort
        }
      }

      return json({ data: vendor, trace_id: traceId }, { status: 201 });
    },
  },
  {
    method: "GET",
    path: "/api/v1/tpra/vendors",
    protected: true,
    permissions: ["assessment:read"],
    handler: async ({ deps, organizationId, traceId }) => {
      const orgId = requireOrganizationId({ organizationId });
      const vendors = await deps.tpra.vendors.list(orgId);
      return json({ data: vendors, total: vendors.length, trace_id: traceId });
    },
  },
  {
    method: "GET",
    path: "/api/v1/tpra/vendors/:vendorId",
    protected: true,
    permissions: ["assessment:read"],
    handler: async ({ params, deps, organizationId, traceId }) => {
      const orgId = requireOrganizationId({ organizationId });
      const vendor = await deps.tpra.vendors.get(
        routeUuidParam(params, "vendorId"),
        orgId,
      );
      if (!vendor) throw new ApiError("NOT_FOUND", "Vendor not found.", 404);
      return json({ data: vendor, trace_id: traceId });
    },
  },

  // ── Persistence: Assessments ────────────────────────────────────────────

  {
    method: "POST",
    path: "/api/v1/tpra/vendors/:vendorId/assessments",
    protected: true,
    permissions: ["assessment:create"],
    handler: async ({ request, params, deps, organizationId, traceId }) => {
      const orgId = requireOrganizationId({ organizationId });
      const vendorId = routeUuidParam(params, "vendorId");
      const vendor = await deps.tpra.vendors.get(vendorId, orgId);
      if (!vendor) throw new ApiError("NOT_FOUND", "Vendor not found.", 404);
      const body = (await request.json()) as {
        assessment_id?: string;
        scf_version_id: string;
      };
      if (!body.scf_version_id)
        throw new ApiError(
          "VALIDATION_ERROR",
          "scf_version_id is required.",
          400,
        );
      const assessment = await deps.tpra.assessments.create({
        organization_id: orgId,
        vendor_id: vendorId,
        assessment_id: body.assessment_id ?? null,
        scf_version_id: body.scf_version_id,
        trace_id: traceId,
      });
      return json({ data: assessment, trace_id: traceId }, { status: 201 });
    },
  },
  {
    method: "GET",
    path: "/api/v1/tpra/vendors/:vendorId/assessments",
    protected: true,
    permissions: ["assessment:read"],
    handler: async ({ params, deps, organizationId, traceId }) => {
      const orgId = requireOrganizationId({ organizationId });
      const assessments = await deps.tpra.assessments.listByVendor(
        routeUuidParam(params, "vendorId"),
        orgId,
      );
      return json({
        data: assessments,
        total: assessments.length,
        trace_id: traceId,
      });
    },
  },
  {
    method: "POST",
    path: "/api/v1/tpra/assessments/:id/submit",
    protected: true,
    permissions: ["assessment:create"],
    handler: async ({ request, params, deps, organizationId, traceId }) => {
      const orgId = requireOrganizationId({ organizationId });
      const body = (await request.json()) as {
        responses: Record<string, unknown>;
      };
      if (!body.responses)
        throw new ApiError("VALIDATION_ERROR", "responses is required.", 400);
      const updated = await deps.tpra.assessments.submit(
        routeUuidParam(params, "id"),
        orgId,
        body.responses,
      );
      if (!updated)
        throw new ApiError("NOT_FOUND", "TPRA assessment not found.", 404);

      // Best-effort webhook dispatch for TPRA assessment submission
      if (deps.webhooks) {
        try {
          const subscribers = await deps.webhooks.findSubscribers(
            orgId,
            "tpra.assessment.submitted",
          );
          for (const endpoint of subscribers) {
            if (!endpoint.enabled) continue;
            await deps.webhooks.logDelivery({
              delivery_id: newId(),
              endpoint_id: endpoint.id,
              event_id: newId(),
              event_type: "tpra.assessment.submitted",
              status: "pending",
              http_status: null,
              attempt_count: 0,
              max_attempts: 3,
              last_attempted_at: null,
              next_retry_at: new Date().toISOString(),
              response_body: null,
              created_at: new Date().toISOString(),
            });
          }
        } catch {
          // Non-blocking — webhook delivery is best-effort
        }
      }

      return json({ data: updated, trace_id: traceId });
    },
  },

  // ── Persistence: Risk Scores (append-only) ──────────────────────────────

  {
    method: "POST",
    path: "/api/v1/tpra/assessments/:id/risk-score",
    protected: true,
    permissions: ["assessment:create"],
    handler: async ({ request, params, deps, organizationId, traceId }) => {
      const orgId = requireOrganizationId({ organizationId });
      const assessment = await deps.tpra.assessments.get(
        routeUuidParam(params, "id"),
        orgId,
      );
      if (!assessment)
        throw new ApiError("NOT_FOUND", "TPRA assessment not found.", 404);
      const body = (await request.json()) as {
        raw_score: number;
        risk_category: string;
        scf_domain_failures?: string[];
      };
      if (body.raw_score == null || !body.risk_category)
        throw new ApiError(
          "VALIDATION_ERROR",
          "raw_score and risk_category are required.",
          400,
        );
      const validCategories = ["low", "medium", "high", "critical"];
      if (!validCategories.includes(body.risk_category))
        throw new ApiError(
          "VALIDATION_ERROR",
          `risk_category must be one of: ${validCategories.join(", ")}.`,
          400,
        );
      const riskScore = await deps.tpra.riskScores.append({
        organization_id: orgId,
        tpra_assessment_id: assessment.id,
        vendor_id: assessment.vendor_id,
        raw_score: String(
          Math.max(0, Math.min(100, body.raw_score)).toFixed(2),
        ),
        risk_category: body.risk_category as
          | "low"
          | "medium"
          | "high"
          | "critical",
        scf_domain_failures: body.scf_domain_failures ?? [],
        scf_version_id: assessment.scf_version_id,
        trace_id: traceId,
      });
      // Best-effort webhook dispatch for TPRA risk score creation
      if (deps.webhooks) {
        try {
          const subscribers = await deps.webhooks.findSubscribers(
            orgId,
            "tpra.risk_score.created",
          );
          for (const endpoint of subscribers) {
            if (!endpoint.enabled) continue;
            await deps.webhooks.logDelivery({
              delivery_id: newId(),
              endpoint_id: endpoint.id,
              event_id: newId(),
              event_type: "tpra.risk_score.created",
              status: "pending",
              http_status: null,
              attempt_count: 0,
              max_attempts: 3,
              last_attempted_at: null,
              next_retry_at: new Date().toISOString(),
              response_body: null,
              created_at: new Date().toISOString(),
            });
          }
        } catch {
          // Non-blocking — webhook delivery is best-effort
        }
      }

      // M3: Reverse Mapping — dispatch workflow to inherit vendor controls into SoA ledger
      // The workflow maps approved TPRA controls back into assessment_control_events (ADR-002).
      // Only dispatch when risk score is acceptable (raw_score >= 70) — same gate as inheritVendorControls.
      if (deps.TPRA_APPROVAL_WORKFLOW && body.raw_score >= 70) {
        try {
          const runId = newId();
          // Map scf_domain_failures (list of SCF control IDs) → vendorControls payload
          const vendorControls = (body.scf_domain_failures ?? []).map(
            (scfControlId) => ({ scfControlId }),
          );
          await deps.TPRA_APPROVAL_WORKFLOW.create({
            id: runId,
            params: {
              organizationId: orgId,
              assessmentId: assessment.assessment_id ?? assessment.id,
              tpraAssessmentId: assessment.id,
              vendorId: assessment.vendor_id,
              scfVersionId: assessment.scf_version_id,
              tpraRiskScore: body.raw_score,
              vendorControls,
              traceId,
            },
          });
          console.log(
            `[standard:tpra] Dispatched TPRA_APPROVAL_WORKFLOW run=${runId} for assessment=${assessment.id}`,
          );
        } catch (wfErr) {
          console.error(
            `[standard:tpra] Failed to dispatch workflow: ${wfErr instanceof Error ? wfErr.message : String(wfErr)}`,
          );
          // Non-blocking: we still return the created risk score
        }
      }

      return json({ data: riskScore, trace_id: traceId }, { status: 201 });
    },
  },
  {
    method: "GET",
    path: "/api/v1/tpra/vendors/:vendorId/risk-scores",
    protected: true,
    permissions: ["assessment:read"],
    handler: async ({ params, deps, organizationId, traceId }) => {
      const orgId = requireOrganizationId({ organizationId });
      const scores = await deps.tpra.riskScores.listByVendor(
        routeUuidParam(params, "vendorId"),
        orgId,
      );
      return json({ data: scores, total: scores.length, trace_id: traceId });
    },
  },
];
