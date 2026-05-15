/**
 * CB-C: TPRA — Third Party Risk Assessment Questionnaire
 *
 * O SCF tem domínio TPM (Third-Party Management) e SCR (Supply Chain),
 * mas NÃO tem questionário pronto com scoring.
 *
 * Tudo linka ao SCF via scf_controls[].
 */
import type { RouteDefinition } from "../http";
import { json, routeParam } from "../http";
import { ApiError } from "../errors/api-error";

// ── TPRA Questionnaire ──────────────────────────────────────────────────────

const TPRA_QUESTIONNAIRES = [
  {
    id: "standard_v1",
    name_pt: "Questionário Padrão de Avaliação de Terceiros v1",
    description_pt: "Questionário completo para avaliação de segurança e privacidade de fornecedores, alinhado ao SCF.",
    version: "1.0",

    sections: [
      {
        id: "governance",
        name_pt: "Governança e Políticas",
        weight: 0.15,
        questions: [
          { id: "Q01", text_pt: "O fornecedor possui política de segurança da informação aprovada pela alta gestão?", type: "yes_no" as const, weight: 0.25, scoring: { yes: 5, no: 1, partial: 3 }, scf_controls: ["GOV-01", "GOV-02"], required: true },
          { id: "Q02", text_pt: "Existe um responsável formal por segurança da informação (CISO ou equivalente)?", type: "yes_no" as const, weight: 0.25, scoring: { yes: 5, no: 1 }, scf_controls: ["GOV-04"], required: true },
          { id: "Q03", text_pt: "O fornecedor possui certificação ISO 27001 ou SOC 2 vigente?", type: "multi_select" as const, weight: 0.30, scoring: { iso_27001: 5, soc2_type2: 5, soc2_type1: 4, other: 3, none: 1 }, scf_controls: ["CPL-01", "AIS-01"], required: true },
          { id: "Q04", text_pt: "As políticas são revisadas no mínimo anualmente?", type: "yes_no" as const, weight: 0.20, scoring: { yes: 5, no: 1, partial: 3 }, scf_controls: ["GOV-06"], required: false },
        ],
      },
      {
        id: "access_control",
        name_pt: "Controle de Acesso",
        weight: 0.15,
        questions: [
          { id: "Q05", text_pt: "O fornecedor utiliza MFA (autenticação multifator) para acesso a sistemas?", type: "scale_1_5" as const, weight: 0.30, scoring: { "5": 5, "4": 4, "3": 3, "2": 2, "1": 1 }, scf_controls: ["IAC-15"], required: true },
          { id: "Q06", text_pt: "O princípio do menor privilégio é implementado?", type: "yes_no" as const, weight: 0.25, scoring: { yes: 5, no: 1, partial: 3 }, scf_controls: ["IAC-06"], required: true },
          { id: "Q07", text_pt: "Acessos são revisados periodicamente (mínimo trimestral)?", type: "yes_no" as const, weight: 0.25, scoring: { yes: 5, no: 1, partial: 3 }, scf_controls: ["IAC-20", "IAC-21"], required: true },
          { id: "Q08", text_pt: "Existe processo de offboarding com revogação imediata de acessos?", type: "yes_no" as const, weight: 0.20, scoring: { yes: 5, no: 1, partial: 3 }, scf_controls: ["HRS-06"], required: true },
        ],
      },
      {
        id: "data_protection",
        name_pt: "Proteção de Dados",
        weight: 0.20,
        questions: [
          { id: "Q09", text_pt: "Os dados são classificados quanto à sensibilidade?", type: "yes_no" as const, weight: 0.20, scoring: { yes: 5, no: 1, partial: 3 }, scf_controls: ["DCH-01"], required: true },
          { id: "Q10", text_pt: "Dados em repouso são criptografados (AES-256 ou equivalente)?", type: "yes_no" as const, weight: 0.25, scoring: { yes: 5, no: 1 }, scf_controls: ["CRY-01", "CRY-09"], required: true },
          { id: "Q11", text_pt: "Dados em trânsito são criptografados (TLS 1.2+ ou equivalente)?", type: "yes_no" as const, weight: 0.25, scoring: { yes: 5, no: 1 }, scf_controls: ["CRY-03"], required: true },
          { id: "Q12", text_pt: "Backup é realizado regularmente com teste de restore?", type: "scale_1_5" as const, weight: 0.15, scoring: { "5": 5, "4": 4, "3": 3, "2": 2, "1": 1 }, scf_controls: ["BCD-01", "BCD-04"], required: true },
          { id: "Q13", text_pt: "Existe processo de sanitização/destruição segura de dados?", type: "yes_no" as const, weight: 0.15, scoring: { yes: 5, no: 1, partial: 3 }, scf_controls: ["DCH-17", "DCH-18"], required: false },
        ],
      },
      {
        id: "network",
        name_pt: "Segurança de Rede",
        weight: 0.10,
        questions: [
          { id: "Q14", text_pt: "Firewall e IDS/IPS estão implementados?", type: "yes_no" as const, weight: 0.35, scoring: { yes: 5, no: 1, partial: 3 }, scf_controls: ["NET-01", "NET-04"], required: true },
          { id: "Q15", text_pt: "A rede é segmentada entre ambientes (dev/staging/prod)?", type: "yes_no" as const, weight: 0.35, scoring: { yes: 5, no: 1, partial: 3 }, scf_controls: ["NET-01", "NET-03"], required: true },
          { id: "Q16", text_pt: "Qual o nível de monitoramento de rede (logging, SIEM)?", type: "scale_1_5" as const, weight: 0.30, scoring: { "5": 5, "4": 4, "3": 3, "2": 2, "1": 1 }, scf_controls: ["MON-01", "MON-02"], required: true },
        ],
      },
      {
        id: "vulnerability_management",
        name_pt: "Gestão de Vulnerabilidades",
        weight: 0.10,
        questions: [
          { id: "Q17", text_pt: "Scans de vulnerabilidade são executados regularmente?", type: "scale_1_5" as const, weight: 0.35, scoring: { "5": 5, "4": 4, "3": 3, "2": 2, "1": 1 }, scf_controls: ["VUL-01", "VUL-02"], required: true },
          { id: "Q18", text_pt: "Patches críticos são aplicados em até 72h?", type: "yes_no" as const, weight: 0.35, scoring: { yes: 5, no: 1, partial: 3 }, scf_controls: ["VUL-05"], required: true },
          { id: "Q19", text_pt: "Testes de penetração são realizados anualmente?", type: "yes_no" as const, weight: 0.30, scoring: { yes: 5, no: 1 }, scf_controls: ["VUL-06"], required: true },
        ],
      },
      {
        id: "incident_response",
        name_pt: "Resposta a Incidentes",
        weight: 0.10,
        questions: [
          { id: "Q20", text_pt: "Existe plano de resposta a incidentes documentado e testado?", type: "yes_no" as const, weight: 0.35, scoring: { yes: 5, no: 1, partial: 3 }, scf_controls: ["IRO-01", "IRO-02"], required: true },
          { id: "Q21", text_pt: "O fornecedor notifica o contratante sobre incidentes em até 24h?", type: "yes_no" as const, weight: 0.35, scoring: { yes: 5, no: 1, partial: 3 }, scf_controls: ["IRO-09", "IRO-10"], required: true },
          { id: "Q22", text_pt: "Exercícios de tabletop são realizados pelo menos anualmente?", type: "yes_no" as const, weight: 0.30, scoring: { yes: 5, no: 1 }, scf_controls: ["IRO-04"], required: false },
        ],
      },
      {
        id: "bcp_dr",
        name_pt: "Continuidade e Recuperação",
        weight: 0.10,
        questions: [
          { id: "Q23", text_pt: "Existe BCP (Plano de Continuidade de Negócios) documentado?", type: "yes_no" as const, weight: 0.35, scoring: { yes: 5, no: 1, partial: 3 }, scf_controls: ["BCD-01", "BCD-02"], required: true },
          { id: "Q24", text_pt: "Existe DRP (Plano de Recuperação de Desastres) com RPO/RTO definidos?", type: "yes_no" as const, weight: 0.35, scoring: { yes: 5, no: 1, partial: 3 }, scf_controls: ["BCD-11"], required: true },
          { id: "Q25", text_pt: "Os planos são testados pelo menos anualmente?", type: "yes_no" as const, weight: 0.30, scoring: { yes: 5, no: 1 }, scf_controls: ["BCD-08"], required: false },
        ],
      },
      {
        id: "privacy",
        name_pt: "Privacidade",
        weight: 0.10,
        questions: [
          { id: "Q26", text_pt: "Existe DPO (Encarregado de Dados) designado?", type: "yes_no" as const, weight: 0.25, scoring: { yes: 5, no: 1 }, scf_controls: ["PRI-02"], required: true },
          { id: "Q27", text_pt: "O fornecedor mantém ROPA (registro de operações de tratamento)?", type: "yes_no" as const, weight: 0.25, scoring: { yes: 5, no: 1, partial: 3 }, scf_controls: ["PRI-03"], required: true },
          { id: "Q28", text_pt: "DPIAs são realizados para tratamentos de alto risco?", type: "yes_no" as const, weight: 0.25, scoring: { yes: 5, no: 1, partial: 3 }, scf_controls: ["PRI-06"], required: true },
          { id: "Q29", text_pt: "Colaboradores recebem treinamento em privacidade?", type: "scale_1_5" as const, weight: 0.25, scoring: { "5": 5, "4": 4, "3": 3, "2": 2, "1": 1 }, scf_controls: ["SAT-03"], required: false },
        ],
      },
    ],

    tiers: [
      { tier: 1, name_pt: "Crítico", criteria_pt: "Processa dados pessoais/sensíveis ou tem acesso a sistemas core", review_months: 6, min_score: 70 },
      { tier: 2, name_pt: "Alto", criteria_pt: "Acesso a dados corporativos ou integração com sistemas internos", review_months: 12, min_score: 55 },
      { tier: 3, name_pt: "Médio", criteria_pt: "Serviço indireto sem acesso a dados sensíveis", review_months: 18, min_score: 40 },
      { tier: 4, name_pt: "Baixo", criteria_pt: "Sem acesso a dados ou sistemas da organização", review_months: 24, min_score: 0 },
    ],

    scoring: {
      critical_below: 20,
      high_below: 40,
      medium_below: 70,
      interpretation: [
        { range: "0-19", level: "critical", label_pt: "Risco Crítico", action_pt: "Não aprovar. Exigir plano de remediação obrigatório antes do contrato." },
        { range: "20-39", level: "high", label_pt: "Risco Alto", action_pt: "Aprovar condicionalmente. Exigir remediação dos itens críticos em 60 dias." },
        { range: "40-69", level: "medium", label_pt: "Risco Médio", action_pt: "Aprovar com monitoramento. Solicitar roadmap de melhorias." },
        { range: "70-100", level: "low", label_pt: "Risco Baixo", action_pt: "Aprovar. Revisão periódica conforme tier." },
      ],
    },
  },
];

const TPRA_INDEX = new Map(TPRA_QUESTIONNAIRES.map(q => [q.id, q]));

// ── Routes ──────────────────────────────────────────────────────────────────

export const tpraRoutes: RouteDefinition[] = [
  // List all questionnaires
  {
    method: "GET",
    path: "/api/v1/tpra/questionnaires",
    authRequired: true,
    tenantRequired: false,
    handler: async ({ traceId }) => {
      const summary = TPRA_QUESTIONNAIRES.map(q => ({
        id: q.id, name_pt: q.name_pt, version: q.version,
        section_count: q.sections.length,
        question_count: q.sections.reduce((sum, s) => sum + s.questions.length, 0),
        tier_count: q.tiers.length,
      }));
      return json({ data: summary, trace_id: traceId });
    },
  },
  // Full questionnaire
  {
    method: "GET",
    path: "/api/v1/tpra/questionnaires/:questionnaireId",
    authRequired: true,
    tenantRequired: false,
    handler: async ({ params, traceId }) => {
      const q = TPRA_INDEX.get(routeParam(params, "questionnaireId"));
      if (!q) throw new ApiError("NOT_FOUND", "Questionnaire not found. Available: standard_v1", 404);
      return json({ data: q, trace_id: traceId });
    },
  },
  // Specific section
  {
    method: "GET",
    path: "/api/v1/tpra/questionnaires/:questionnaireId/sections/:sectionId",
    authRequired: true,
    tenantRequired: false,
    handler: async ({ params, traceId }) => {
      const q = TPRA_INDEX.get(routeParam(params, "questionnaireId"));
      if (!q) throw new ApiError("NOT_FOUND", "Questionnaire not found.", 404);
      const section = q.sections.find(s => s.id === routeParam(params, "sectionId"));
      if (!section) throw new ApiError("NOT_FOUND", `Section not found. Available: ${q.sections.map(s => s.id).join(", ")}`, 404);
      return json({ data: section, trace_id: traceId });
    },
  },
  // Tiers
  {
    method: "GET",
    path: "/api/v1/tpra/tiers",
    authRequired: true,
    tenantRequired: false,
    handler: async ({ traceId }) => {
      const q = TPRA_QUESTIONNAIRES[0];
      return json({ data: q?.tiers ?? [], scoring: q?.scoring ?? {}, trace_id: traceId });
    },
  },
  // Calculate score from answers
  {
    method: "POST",
    path: "/api/v1/tpra/score",
    authRequired: true,
    tenantRequired: false,
    handler: async ({ request, traceId }) => {
      const body = await request.json() as { questionnaire_id: string; answers: Record<string, string | number> };
      const q = TPRA_INDEX.get(body.questionnaire_id ?? "standard_v1");
      if (!q) throw new ApiError("NOT_FOUND", "Questionnaire not found.", 404);

      const sectionResults = [];
      let totalWeightedScore = 0;

      for (const section of q.sections) {
        let sectionScore = 0;
        let sectionMaxScore = 0;
        const questionResults = [];

        for (const question of section.questions) {
          const answer = body.answers?.[question.id];
          const answerKey = String(answer ?? "").toLowerCase();
          const scoringMap = question.scoring as Record<string, number>;
          const score = scoringMap[answerKey] ?? 0;
          const maxScore = Math.max(...Object.values(scoringMap));
          const weightedScore = score * question.weight;
          const weightedMax = maxScore * question.weight;
          sectionScore += weightedScore;
          sectionMaxScore += weightedMax;
          questionResults.push({ question_id: question.id, answer: answerKey, score, max_score: maxScore, weighted_score: weightedScore });
        }

        const sectionPct = sectionMaxScore > 0 ? Math.round((sectionScore / sectionMaxScore) * 100) : 0;
        totalWeightedScore += sectionPct * section.weight;
        sectionResults.push({ section_id: section.id, name_pt: section.name_pt, weight: section.weight, score_pct: sectionPct, questions: questionResults });
      }

      const finalScore = Math.round(totalWeightedScore);
      const riskLevel =
        finalScore < q.scoring.critical_below ? "critical" :
        finalScore < q.scoring.high_below ? "high" :
        finalScore < q.scoring.medium_below ? "medium" : "low";

      const interpretation = q.scoring.interpretation.find(i => i.level === riskLevel);
      const recommendedTier = q.tiers.find(t => finalScore >= t.min_score) ?? q.tiers[0];

      return json({
        data: {
          final_score: finalScore,
          risk_level: riskLevel,
          interpretation: interpretation?.action_pt ?? "",
          recommended_tier: recommendedTier,
          review_in_months: recommendedTier?.review_months,
          sections: sectionResults,
        },
        trace_id: traceId,
      });
    },
  },
  // SCF control reference for TPRA questions
  {
    method: "GET",
    path: "/api/v1/tpra/scf-mapping",
    authRequired: true,
    tenantRequired: false,
    handler: async ({ traceId }) => {
      const q = TPRA_QUESTIONNAIRES[0];
      if (!q) return json({ data: [], trace_id: traceId });

      const mapping = q.sections.flatMap(s =>
        s.questions.map(question => ({
          question_id: question.id,
          text_pt: question.text_pt,
          section: s.name_pt,
          scf_controls: question.scf_controls,
        }))
      );
      return json({ data: mapping, trace_id: traceId });
    },
  },
];
