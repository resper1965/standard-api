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
import { flattenI18n } from "../utils/i18n";

// ── TPRA Questionnaire ──────────────────────────────────────────────────────

const TPRA_QUESTIONNAIRES = [
  {
    id: "standard_v1",
    name_i18n: { pt: "Questionário Padrão de Avaliação de Terceiros v1", en: "Standard Third-Party Assessment Questionnaire v1" },
    description_i18n: { pt: "Questionário completo para avaliação de segurança e privacidade de fornecedores, alinhado ao SCF.", en: "Compliance assessment for vendor security and privacy, aligned with SCF." },
    version: "1.0",

    sections: [
      {
        id: "governance",
        name_i18n: { pt: "Governança e Políticas", en: "Governance and Policies" },
        weight: 0.15,
        questions: [
          { id: "Q01", text_i18n: { pt: "O fornecedor possui política de segurança da informação aprovada pela alta gestão?", en: "The vendor has an information security policy approved by senior management?" }, type: "yes_no" as const, weight: 0.25, scoring: { yes: 5, no: 1, partial: 3 }, scf_controls: ["GOV-01", "GOV-02"], required: true },
          { id: "Q02", text_i18n: { pt: "Existe um responsável formal por segurança da informação (CISO ou equivalente)?", en: "Is there a formal information security officer (CISO or equivalent)?" }, type: "yes_no" as const, weight: 0.25, scoring: { yes: 5, no: 1 }, scf_controls: ["GOV-04"], required: true },
          { id: "Q03", text_i18n: { pt: "O fornecedor possui certificação ISO 27001 ou SOC 2 vigente?", en: "The vendor has a current ISO 27001 or SOC 2 certification?" }, type: "multi_select" as const, weight: 0.30, scoring: { iso_27001: 5, soc2_type2: 5, soc2_type1: 4, other: 3, none: 1 }, scf_controls: ["CPL-01", "AIS-01"], required: true },
          { id: "Q04", text_i18n: { pt: "As políticas são revisadas no mínimo anualmente?", en: "Are policies reviewed at least annually?" }, type: "yes_no" as const, weight: 0.20, scoring: { yes: 5, no: 1, partial: 3 }, scf_controls: ["GOV-06"], required: false },
        ],
      },
      {
        id: "access_control",
        name_i18n: { pt: "Controle de Acesso", en: "Access Control" },
        weight: 0.15,
        questions: [
          { id: "Q05", text_i18n: { pt: "O fornecedor utiliza MFA (autenticação multifator) para acesso a sistemas?", en: "Does the vendor use MFA for access to systems?" }, type: "scale_1_5" as const, weight: 0.30, scoring: { "5": 5, "4": 4, "3": 3, "2": 2, "1": 1 }, scf_controls: ["IAC-15"], required: true },
          { id: "Q06", text_i18n: { pt: "O princípio do menor privilégio é implementado?", en: "Is the principle of least privilege implemented?" }, type: "yes_no" as const, weight: 0.25, scoring: { yes: 5, no: 1, partial: 3 }, scf_controls: ["IAC-06"], required: true },
          { id: "Q07", text_i18n: { pt: "Acessos são revisados periodicamente (mínimo trimestral)?", en: "Are accesses reviewed periodically (minimum quarterly)?" }, type: "yes_no" as const, weight: 0.25, scoring: { yes: 5, no: 1, partial: 3 }, scf_controls: ["IAC-20", "IAC-21"], required: true },
          { id: "Q08", text_i18n: { pt: "Existe processo de offboarding com revogação imediata de acessos?", en: "Is there an offboarding process with immediate revocation of access?" }, type: "yes_no" as const, weight: 0.20, scoring: { yes: 5, no: 1, partial: 3 }, scf_controls: ["HRS-06"], required: true },
        ],
      },
      {
        id: "data_protection",
        name_i18n: { pt: "Proteção de Dados", en: "Data Protection" },
        weight: 0.20,
        questions: [
          { id: "Q09", text_i18n: { pt: "Os dados são classificados quanto à sensibilidade?", en: "Is data classified by sensitivity?" }, type: "yes_no" as const, weight: 0.20, scoring: { yes: 5, no: 1, partial: 3 }, scf_controls: ["DCH-01"], required: true },
          { id: "Q10", text_i18n: { pt: "Dados em repouso são criptografados (AES-256 ou equivalente)?", en: "Is data at rest encrypted?" }, type: "yes_no" as const, weight: 0.25, scoring: { yes: 5, no: 1 }, scf_controls: ["CRY-01", "CRY-09"], required: true },
          { id: "Q11", text_i18n: { pt: "Dados em trânsito são criptografados (TLS 1.2+ ou equivalente)?", en: "Is data in transit encrypted?" }, type: "yes_no" as const, weight: 0.25, scoring: { yes: 5, no: 1 }, scf_controls: ["CRY-03"], required: true },
          { id: "Q12", text_i18n: { pt: "Backup é realizado regularmente com teste de restore?", en: "Are backups performed regularly with restore tests?" }, type: "scale_1_5" as const, weight: 0.15, scoring: { "5": 5, "4": 4, "3": 3, "2": 2, "1": 1 }, scf_controls: ["BCD-01", "BCD-04"], required: true },
          { id: "Q13", text_i18n: { pt: "Existe processo de sanitização/destruição segura de dados?", en: "Is there a secure data disposal process?" }, type: "yes_no" as const, weight: 0.15, scoring: { yes: 5, no: 1, partial: 3 }, scf_controls: ["DCH-17", "DCH-18"], required: false },
        ],
      },
      {
        id: "network",
        name_i18n: { pt: "Segurança de Rede", en: "Network Security" },
        weight: 0.10,
        questions: [
          { id: "Q14", text_i18n: { pt: "Firewall e IDS/IPS estão implementados?", en: "Are firewall and IDS/IPS implemented?" }, type: "yes_no" as const, weight: 0.35, scoring: { yes: 5, no: 1, partial: 3 }, scf_controls: ["NET-01", "NET-04"], required: true },
          { id: "Q15", text_i18n: { pt: "A rede é segmentada entre ambientes (dev/staging/prod)?", en: "Is the network segmented by environment?" }, type: "yes_no" as const, weight: 0.35, scoring: { yes: 5, no: 1, partial: 3 }, scf_controls: ["NET-01", "NET-03"], required: true },
          { id: "Q16", text_i18n: { pt: "Qual o nível de monitoramento de rede (logging, SIEM)?", en: "What is the network monitoring level?" }, type: "scale_1_5" as const, weight: 0.30, scoring: { "5": 5, "4": 4, "3": 3, "2": 2, "1": 1 }, scf_controls: ["MON-01", "MON-02"], required: true },
        ],
      },
      {
        id: "vulnerability_management",
        name_i18n: { pt: "Gestão de Vulnerabilidades", en: "Vulnerability Management" },
        weight: 0.10,
        questions: [
          { id: "Q17", text_i18n: { pt: "Scans de vulnerabilidade são executados regularmente?", en: "Are vulnerability scans performed regularly?" }, type: "scale_1_5" as const, weight: 0.35, scoring: { "5": 5, "4": 4, "3": 3, "2": 2, "1": 1 }, scf_controls: ["VUL-01", "VUL-02"], required: true },
          { id: "Q18", text_i18n: { pt: "Patches críticos são aplicados em até 72h?", en: "Are critical patches applied within 72h?" }, type: "yes_no" as const, weight: 0.35, scoring: { yes: 5, no: 1, partial: 3 }, scf_controls: ["VUL-05"], required: true },
          { id: "Q19", text_i18n: { pt: "Testes de penetração são realizados anualmente?", en: "Are penetration tests performed annually?" }, type: "yes_no" as const, weight: 0.30, scoring: { yes: 5, no: 1 }, scf_controls: ["VUL-06"], required: true },
        ],
      },
      {
        id: "incident_response",
        name_i18n: { pt: "Resposta a Incidentes", en: "Incident Response" },
        weight: 0.10,
        questions: [
          { id: "Q20", text_i18n: { pt: "Existe plano de resposta a incidentes documentado e testado?", en: "Is there a documented and tested incident response plan?" }, type: "yes_no" as const, weight: 0.35, scoring: { yes: 5, no: 1, partial: 3 }, scf_controls: ["IRO-01", "IRO-02"], required: true },
          { id: "Q21", text_i18n: { pt: "O fornecedor notifica o contratante sobre incidentes em até 24h?", en: "Does the vendor notify the customer about incidents within 24h?" }, type: "yes_no" as const, weight: 0.35, scoring: { yes: 5, no: 1, partial: 3 }, scf_controls: ["IRO-09", "IRO-10"], required: true },
          { id: "Q22", text_i18n: { pt: "Exercícios de tabletop são realizados pelo menos anualmente?", en: "Are tabletop exercises performed at least annually?" }, type: "yes_no" as const, weight: 0.30, scoring: { yes: 5, no: 1 }, scf_controls: ["IRO-04"], required: false },
        ],
      },
      {
        id: "bcp_dr",
        name_i18n: { pt: "Continuidade e Recuperação", en: "Continuity and Recovery" },
        weight: 0.10,
        questions: [
          { id: "Q23", text_i18n: { pt: "Existe BCP (Plano de Continuidade de Negócios) documentado?", en: "Is there a documented BCP?" }, type: "yes_no" as const, weight: 0.35, scoring: { yes: 5, no: 1, partial: 3 }, scf_controls: ["BCD-01", "BCD-02"], required: true },
          { id: "Q24", text_i18n: { pt: "Existe DRP (Plano de Recuperação de Desastres) com RPO/RTO definidos?", en: "Is there a DRP with defined RPO/RTO?" }, type: "yes_no" as const, weight: 0.35, scoring: { yes: 5, no: 1, partial: 3 }, scf_controls: ["BCD-11"], required: true },
          { id: "Q25", text_i18n: { pt: "Os planos são testados pelo menos anualmente?", en: "Are plans tested at least annually?" }, type: "yes_no" as const, weight: 0.30, scoring: { yes: 5, no: 1 }, scf_controls: ["BCD-08"], required: false },
        ],
      },
      {
        id: "privacy",
        name_i18n: { pt: "Privacidade", en: "Privacy" },
        weight: 0.10,
        questions: [
          { id: "Q26", text_i18n: { pt: "Existe DPO (Encarregado de Dados) designado?", en: "Is there a designated DPO?" }, type: "yes_no" as const, weight: 0.25, scoring: { yes: 5, no: 1 }, scf_controls: ["PRI-02"], required: true },
          { id: "Q27", text_i18n: { pt: "O fornecedor mantém ROPA (registro de operações de tratamento)?", en: "Does the vendor maintain a ROPA?" }, type: "yes_no" as const, weight: 0.25, scoring: { yes: 5, no: 1, partial: 3 }, scf_controls: ["PRI-03"], required: true },
          { id: "Q28", text_i18n: { pt: "DPIAs são realizados para tratamentos de alto risco?", en: "Are DPIAs performed for high-risk processing?" }, type: "yes_no" as const, weight: 0.25, scoring: { yes: 5, no: 1, partial: 3 }, scf_controls: ["PRI-06"], required: true },
          { id: "Q29", text_i18n: { pt: "Colaboradores recebem treinamento em privacidade?", en: "Do employees receive privacy training?" }, type: "scale_1_5" as const, weight: 0.25, scoring: { "5": 5, "4": 4, "3": 3, "2": 2, "1": 1 }, scf_controls: ["SAT-03"], required: false },
        ],
      },
    ],

    tiers: [
      { tier: 1, name_i18n: { pt: "Crítico", en: "Critical" }, criteria_i18n: { pt: "Processa dados pessoais/sensíveis ou tem acesso a sistemas core", en: "Processes personal/sensitive data or has core system access" }, review_months: 6, min_score: 70 },
      { tier: 2, name_i18n: { pt: "Alto", en: "High" }, criteria_i18n: { pt: "Acesso a dados corporativos ou integração com sistemas internos", en: "Access to corporate data or internal system integration" }, review_months: 12, min_score: 55 },
      { tier: 3, name_i18n: { pt: "Médio", en: "Medium" }, criteria_i18n: { pt: "Serviço indireto sem acesso a dados sensíveis", en: "Indirect service with no sensitive data access" }, review_months: 18, min_score: 40 },
      { tier: 4, name_i18n: { pt: "Baixo", en: "Low" }, criteria_i18n: { pt: "Sem acesso a dados ou sistemas da organização", en: "No access to organization data or systems" }, review_months: 24, min_score: 0 },
    ],

    scoring: {
      critical_below: 20,
      high_below: 40,
      medium_below: 70,
      interpretation: [
        { range: "0-19", level: "critical", label_i18n: { pt: "Risco Crítico", en: "Critical Risk" }, action_i18n: { pt: "Não aprovar. Exigir plano de remediação obrigatório antes do contrato.", en: "Do not approve. Require remediation plan before contract." } },
        { range: "20-39", level: "high", label_i18n: { pt: "Risco Alto", en: "High Risk" }, action_i18n: { pt: "Aprovar condicionalmente. Exigir remediação dos itens críticos em 60 dias.", en: "Conditional approval. Require remediation of critical items within 60 days." } },
        { range: "40-69", level: "medium", label_i18n: { pt: "Risco Médio", en: "Medium Risk" }, action_i18n: { pt: "Aprovar com monitoramento. Solicitar roadmap de melhorias.", en: "Approve with monitoring. Request improvement roadmap." } },
        { range: "70-100", level: "low", label_i18n: { pt: "Risco Baixo", en: "Low Risk" }, action_i18n: { pt: "Aprovar. Revisão periódica conforme tier.", en: "Approve. Periodic review based on tier." } },
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
    handler: async ({ request, traceId }) => {
      const locale = (new URL(request.url).searchParams.get("locale") || "pt") as any;
      const summary = flattenI18n(TPRA_QUESTIONNAIRES, locale).map((q: any) => ({
        id: q.id, name: q.name, version: q.version,
        section_count: q.sections.length,
        question_count: q.sections.reduce((sum: any, s: any) => sum + s.questions.length, 0),
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
    handler: async ({ request, params, traceId }) => {
      const locale = (new URL(request.url).searchParams.get("locale") || "pt") as any;
      const q = TPRA_INDEX.get(routeParam(params, "questionnaireId"));
      if (!q) throw new ApiError("NOT_FOUND", "Questionnaire not found. Available: standard_v1", 404);
      return json({ data: flattenI18n(q, locale), trace_id: traceId });
    },
  },
  // Specific section
  {
    method: "GET",
    path: "/api/v1/tpra/questionnaires/:questionnaireId/sections/:sectionId",
    authRequired: true,
    tenantRequired: false,
    handler: async ({ request, params, traceId }) => {
      const locale = (new URL(request.url).searchParams.get("locale") || "pt") as any;
      const q = TPRA_INDEX.get(routeParam(params, "questionnaireId"));
      if (!q) throw new ApiError("NOT_FOUND", "Questionnaire not found.", 404);
      const section = q.sections.find(s => s.id === routeParam(params, "sectionId"));
      if (!section) throw new ApiError("NOT_FOUND", `Section not found. Available: ${q.sections.map(s => s.id).join(", ")}`, 404);
      return json({ data: flattenI18n(section, locale), trace_id: traceId });
    },
  },
  // Tiers
  {
    method: "GET",
    path: "/api/v1/tpra/tiers",
    authRequired: true,
    tenantRequired: false,
    handler: async ({ request, traceId }) => {
      const locale = (new URL(request.url).searchParams.get("locale") || "pt") as any;
      const q = TPRA_QUESTIONNAIRES[0];
      return json({ 
        data: q?.tiers ? flattenI18n(q.tiers, locale) : [], 
        scoring: q?.scoring ? flattenI18n(q.scoring, locale) : {}, 
        trace_id: traceId 
      });
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
        sectionResults.push({ section_id: section.id, name_i18n: section.name_i18n, weight: section.weight, score_pct: sectionPct, questions: questionResults });
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
          interpretation: interpretation?.action_i18n?.pt ?? "",
          recommended_tier: recommendedTier,
          review_in_months: recommendedTier?.review_months,
          sections: flattenI18n(sectionResults, (new URL(request.url).searchParams.get("locale") || "pt") as any),
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
    handler: async ({ request, traceId }) => {
      const q = TPRA_QUESTIONNAIRES[0];
      if (!q) return json({ data: [], trace_id: traceId });

      const mapping = q.sections.flatMap(s =>
        s.questions.map(question => ({
          question_id: question.id,
          text_i18n: question.text_i18n,
          section_name_i18n: s.name_i18n,
          scf_controls: question.scf_controls,
        }))
      );
      return json({ data: flattenI18n(mapping, (new URL(request.url).searchParams.get("locale") || "pt") as any), trace_id: traceId });
    },
  },
];
