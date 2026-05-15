/**
 * CB-C: Assessment Templates (TPRA, DPIA, Gap)
 *
 * Replaces the legacy tpra.routes.ts.
 */
import type { RouteDefinition } from "../http";
import { json, routeParam } from "../http";
import { ApiError } from "../errors/api-error";
import { flattenI18n } from "../utils/i18n";
import type { AssessmentTemplate } from "@standard/schemas";

const ASSESSMENT_TEMPLATES: AssessmentTemplate[] = [
  {
    id: "tpra_standard_v1",
    type: "tpra",
    name_i18n: { pt: "Questionário Padrão de Avaliação de Terceiros v1", en: "Standard Third-Party Assessment Questionnaire v1" },
    version: "1.0",
    sections: [
      {
        id: "governance",
        name_i18n: { pt: "Governança e Políticas", en: "Governance and Policies" },
        scf_domain: "GOV",
        weight: 0.15,
        questions: [
          { id: "Q01", text_i18n: { pt: "O fornecedor possui política de segurança da informação aprovada pela alta gestão?", en: "Does the vendor have an information security policy approved by management?" }, type: "yes_no", weight: 0.25, scoring: { yes: 5, no: 1, partial: 3 }, scf_controls: ["GOV-01", "GOV-02"], required: true, conditional: null },
          { id: "Q02", text_i18n: { pt: "Existe um responsável formal por segurança da informação?", en: "Is there a formal information security officer?" }, type: "yes_no", weight: 0.25, scoring: { yes: 5, no: 1 }, scf_controls: ["GOV-04"], required: true, conditional: null },
          { id: "Q03", text_i18n: { pt: "O fornecedor possui certificação ISO 27001 ou SOC 2 vigente?", en: "Does the vendor have valid ISO 27001 or SOC 2 certification?" }, type: "multi_select", weight: 0.30, scoring: { iso_27001: 5, soc2_type2: 5, soc2_type1: 4, other: 3, none: 1 }, scf_controls: ["CPL-01", "AIS-01"], required: true, conditional: null },
          { id: "Q04", text_i18n: { pt: "As políticas são revisadas no mínimo anualmente?", en: "Are policies reviewed at least annually?" }, type: "yes_no", weight: 0.20, scoring: { yes: 5, no: 1, partial: 3 }, scf_controls: ["GOV-06"], required: false, conditional: null },
        ]
      },
      {
        id: "access_control",
        name_i18n: { pt: "Controle de Acesso", en: "Access Control" },
        scf_domain: "IAC",
        weight: 0.15,
        questions: [
          { id: "Q05", text_i18n: { pt: "O fornecedor utiliza MFA para acesso a sistemas?", en: "Does the vendor use MFA for system access?" }, type: "scale", weight: 0.30, scoring: { "5": 5, "4": 4, "3": 3, "2": 2, "1": 1 }, scf_controls: ["IAC-15"], required: true, conditional: null },
          { id: "Q06", text_i18n: { pt: "O princípio do menor privilégio é implementado?", en: "Is the principle of least privilege implemented?" }, type: "yes_no", weight: 0.25, scoring: { yes: 5, no: 1, partial: 3 }, scf_controls: ["IAC-06"], required: true, conditional: null },
          { id: "Q07", text_i18n: { pt: "Acessos são revisados periodicamente (mínimo trimestral)?", en: "Are access rights reviewed periodically (at least quarterly)?" }, type: "yes_no", weight: 0.25, scoring: { yes: 5, no: 1, partial: 3 }, scf_controls: ["IAC-20", "IAC-21"], required: true, conditional: null },
          { id: "Q08", text_i18n: { pt: "Existe processo de offboarding com revogação imediata de acessos?", en: "Is there an offboarding process with immediate access revocation?" }, type: "yes_no", weight: 0.20, scoring: { yes: 5, no: 1, partial: 3 }, scf_controls: ["HRS-06"], required: true, conditional: null },
        ]
      },
      {
        id: "data_protection",
        name_i18n: { pt: "Proteção de Dados", en: "Data Protection" },
        scf_domain: "DCH",
        weight: 0.20,
        questions: [
          { id: "Q09", text_i18n: { pt: "Os dados são classificados quanto à sensibilidade?", en: "Is data classified by sensitivity?" }, type: "yes_no", weight: 0.20, scoring: { yes: 5, no: 1, partial: 3 }, scf_controls: ["DCH-01"], required: true, conditional: null },
          { id: "Q10", text_i18n: { pt: "Dados em repouso são criptografados?", en: "Is data at rest encrypted?" }, type: "yes_no", weight: 0.25, scoring: { yes: 5, no: 1 }, scf_controls: ["CRY-01", "CRY-09"], required: true, conditional: null },
          { id: "Q11", text_i18n: { pt: "Dados em trânsito são criptografados?", en: "Is data in transit encrypted?" }, type: "yes_no", weight: 0.25, scoring: { yes: 5, no: 1 }, scf_controls: ["CRY-03"], required: true, conditional: null },
          { id: "Q12", text_i18n: { pt: "Backup é realizado regularmente com teste de restore?", en: "Is backup performed regularly with restore tests?" }, type: "scale", weight: 0.15, scoring: { "5": 5, "4": 4, "3": 3, "2": 2, "1": 1 }, scf_controls: ["BCD-01", "BCD-04"], required: true, conditional: null },
          { id: "Q13", text_i18n: { pt: "Existe processo de destruição segura de dados?", en: "Is there a secure data destruction process?" }, type: "yes_no", weight: 0.15, scoring: { yes: 5, no: 1, partial: 3 }, scf_controls: ["DCH-17", "DCH-18"], required: false, conditional: null },
        ]
      },
      {
        id: "privacy",
        name_i18n: { pt: "Privacidade", en: "Privacy" },
        scf_domain: "PRI",
        weight: 0.10,
        questions: [
          { id: "Q26", text_i18n: { pt: "Existe DPO designado?", en: "Is there a designated DPO?" }, type: "yes_no", weight: 0.25, scoring: { yes: 5, no: 1 }, scf_controls: ["PRI-02"], required: true, conditional: null },
          { id: "Q27", text_i18n: { pt: "O fornecedor mantém ROPA?", en: "Does the vendor maintain a ROPA?" }, type: "yes_no", weight: 0.25, scoring: { yes: 5, no: 1, partial: 3 }, scf_controls: ["PRI-03"], required: true, conditional: null },
          { id: "Q28", text_i18n: { pt: "DPIAs são realizados para tratamentos de alto risco?", en: "Are DPIAs performed for high-risk processing?" }, type: "yes_no", weight: 0.25, scoring: { yes: 5, no: 1, partial: 3 }, scf_controls: ["PRI-06"], required: true, conditional: null },
          { id: "Q29", text_i18n: { pt: "Colaboradores recebem treinamento em privacidade?", en: "Do employees receive privacy training?" }, type: "scale", weight: 0.25, scoring: { "5": 5, "4": 4, "3": 3, "2": 2, "1": 1 }, scf_controls: ["SAT-03"], required: false, conditional: null },
        ]
      }
    ],
    scoring: {
      method: "weighted_average",
      thresholds: [
        { level: "critical", min_score: 0, max_score: 19, action_i18n: { pt: "Não aprovar. Exigir plano de remediação obrigatório.", en: "Do not approve. Require mandatory remediation plan." } },
        { level: "high", min_score: 20, max_score: 39, action_i18n: { pt: "Aprovar condicionalmente. Exigir remediação em 60 dias.", en: "Approve conditionally. Require remediation in 60 days." } },
        { level: "medium", min_score: 40, max_score: 69, action_i18n: { pt: "Aprovar com monitoramento.", en: "Approve with monitoring." } },
        { level: "low", min_score: 70, max_score: 100, action_i18n: { pt: "Aprovar. Revisão periódica.", en: "Approve. Periodic review." } },
      ]
    }
  }
];

const TEMPLATES_INDEX = new Map(ASSESSMENT_TEMPLATES.map(q => [q.id, q]));

export const assessmentsTemplatesRoutes: RouteDefinition[] = [
  {
    method: "GET",
    path: "/api/v1/assessments/templates",
    authRequired: true,
    tenantRequired: false,
    handler: async ({ request, traceId }) => {
      const locale = new URL(request.url).searchParams.get("locale") ?? "";
      const summary = ASSESSMENT_TEMPLATES.map(q => ({
        id: q.id,
        type: q.type,
        name_i18n: q.name_i18n,
        version: q.version,
        section_count: q.sections.length,
        question_count: q.sections.reduce((sum, s) => sum + s.questions.length, 0)
      }));
      return json(flattenI18n({ data: summary, trace_id: traceId }, locale));
    },
  },
  {
    method: "GET",
    path: "/api/v1/assessments/templates/:templateId",
    authRequired: true,
    tenantRequired: false,
    handler: async ({ request, params, traceId }) => {
      const locale = new URL(request.url).searchParams.get("locale") ?? "";
      const q = TEMPLATES_INDEX.get(routeParam(params, "templateId"));
      if (!q) throw new ApiError("NOT_FOUND", "Template not found.", 404);
      return json(flattenI18n({ data: q, trace_id: traceId }, locale));
    },
  }
];
