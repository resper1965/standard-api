/**
 * CB-D: Workflow Templates â€” Process Automation
 *
 * Replaces the legacy flow-templates.routes.ts.
 */
import type { RouteDefinition } from "../http";
import { json, routeParam, routeUuidParam } from "../http";
import { ApiError } from "../errors/api-error";
import { flattenI18n } from "../utils/i18n";
import type { WorkflowTemplate } from "@standard/schemas";

const WORKFLOW_TEMPLATES: WorkflowTemplate[] = [
  {
    id: "dsar_response",
    name_i18n: {
      pt: "Resposta a RequisiÃ§Ã£o de Titular (DSAR)",
      en: "Data Subject Access Request Response",
    },
    domain: "privacy",
    trigger_i18n: {
      pt: "Nova requisiÃ§Ã£o de titular",
      en: "New data subject request",
    },
    regulation_id: "lgpd",
    sla: { value: 15, unit: "days" },
    sla_article: "Art. 18, Â§5Â°",
    scf_controls: ["PRI-06", "PRI-07", "PRI-08"],
    steps: [
      {
        order: 1,
        id: "register",
        name_i18n: { pt: "Receber requisiÃ§Ã£o", en: "Receive request" },
        description_i18n: {
          pt: "Sistema registra DSAR.",
          en: "System logs DSAR.",
        },
        type: "automated",
        role: "system",
        timeout: { value: 1, unit: "hours" },
        ai_assist: true,
        condition: null,
        outputs_i18n: { pt: ["Protocolo gerado"], en: ["Protocol generated"] },
        scf_controls: ["PRI-06"],
      },
      {
        order: 2,
        id: "verify_identity",
        name_i18n: { pt: "Verificar identidade", en: "Verify identity" },
        description_i18n: {
          pt: "Validar solicitante.",
          en: "Validate requester.",
        },
        type: "manual",
        role: "dpo",
        timeout: { value: 24, unit: "hours" },
        ai_assist: true,
        condition: null,
        outputs_i18n: {
          pt: ["Identidade validada"],
          en: ["Identity validated"],
        },
        scf_controls: ["PRI-06", "IAC-01"],
      },
      {
        order: 3,
        id: "classify",
        name_i18n: { pt: "Classificar tipo", en: "Classify type" },
        description_i18n: {
          pt: "Identificar aÃ§Ã£o solicitada.",
          en: "Identify requested action.",
        },
        type: "automated",
        role: "system",
        timeout: { value: 1, unit: "hours" },
        ai_assist: true,
        condition: null,
        outputs_i18n: { pt: ["Classificado"], en: ["Classified"] },
        scf_controls: ["PRI-06"],
      },
      {
        order: 4,
        id: "locate_data",
        name_i18n: { pt: "Localizar dados", en: "Locate data" },
        description_i18n: { pt: "Consultar ROPA.", en: "Consult ROPA." },
        type: "manual",
        role: "it",
        timeout: { value: 48, unit: "hours" },
        ai_assist: true,
        condition: null,
        outputs_i18n: { pt: ["Lista de sistemas"], en: ["Systems list"] },
        scf_controls: ["PRI-07", "DCH-01"],
      },
      {
        order: 5,
        id: "execute",
        name_i18n: { pt: "Executar aÃ§Ã£o", en: "Execute action" },
        description_i18n: {
          pt: "Efetuar exclusÃ£o/portabilidade.",
          en: "Perform deletion/portability.",
        },
        type: "manual",
        role: "it",
        timeout: { value: 96, unit: "hours" },
        ai_assist: false,
        condition: null,
        outputs_i18n: { pt: ["AÃ§Ã£o executada"], en: ["Action executed"] },
        scf_controls: ["PRI-06"],
      },
      {
        order: 6,
        id: "review",
        name_i18n: { pt: "Aprovar resposta", en: "Approve response" },
        description_i18n: {
          pt: "DPO valida resposta.",
          en: "DPO validates response.",
        },
        type: "approval",
        role: "dpo",
        timeout: { value: 24, unit: "hours" },
        ai_assist: false,
        condition: null,
        outputs_i18n: { pt: ["Aprovada"], en: ["Approved"] },
        scf_controls: ["PRI-06"],
      },
      {
        order: 7,
        id: "respond",
        name_i18n: { pt: "Enviar resposta", en: "Send response" },
        description_i18n: {
          pt: "Enviar ao titular.",
          en: "Send to data subject.",
        },
        type: "notification",
        role: "system",
        timeout: { value: 1, unit: "hours" },
        ai_assist: false,
        condition: null,
        outputs_i18n: { pt: ["Enviada"], en: ["Sent"] },
        scf_controls: ["PRI-06"],
      },
    ],
    escalation_rules: [
      {
        trigger_i18n: { pt: "Prazo SLA atingiu 80%", en: "SLA at 80%" },
        action_i18n: { pt: "Notificar DPO", en: "Notify DPO" },
        severity: "warning",
      },
      {
        trigger_i18n: { pt: "Prazo SLA excedido", en: "SLA breached" },
        action_i18n: { pt: "Escalar para VIP", en: "Escalate to VIP" },
        severity: "critical",
      },
    ],
  },
  {
    id: "breach_response",
    name_i18n: {
      pt: "Resposta a Incidente de Dados",
      en: "Data Breach Response",
    },
    domain: "security",
    trigger_i18n: { pt: "Incidente detectado", en: "Breach detected" },
    regulation_id: "gdpr",
    sla: { value: 72, unit: "hours" },
    sla_article: "Art. 33",
    scf_controls: ["IRO-01", "IRO-02", "IRO-09"],
    steps: [
      {
        order: 1,
        id: "detect",
        name_i18n: { pt: "Registrar", en: "Detect" },
        description_i18n: { pt: "Registrar incidente.", en: "Log incident." },
        type: "automated",
        role: "system",
        timeout: { value: 1, unit: "hours" },
        ai_assist: true,
        condition: null,
        outputs_i18n: { pt: ["Registrado"], en: ["Logged"] },
        scf_controls: ["IRO-01"],
      },
      {
        order: 2,
        id: "classify",
        name_i18n: { pt: "Classificar", en: "Classify" },
        description_i18n: { pt: "Definir severity.", en: "Set severity." },
        type: "manual",
        role: "security",
        timeout: { value: 4, unit: "hours" },
        ai_assist: true,
        condition: null,
        outputs_i18n: { pt: ["Classificado"], en: ["Classified"] },
        scf_controls: ["IRO-02"],
      },
      {
        order: 3,
        id: "contain",
        name_i18n: { pt: "Conter", en: "Contain" },
        description_i18n: { pt: "Isolar.", en: "Isolate." },
        type: "manual",
        role: "it",
        timeout: { value: 8, unit: "hours" },
        ai_assist: false,
        condition: null,
        outputs_i18n: { pt: ["Contido"], en: ["Contained"] },
        scf_controls: ["IRO-02"],
      },
      {
        order: 4,
        id: "notify_authority",
        name_i18n: { pt: "Notificar Autoridade", en: "Notify DPA" },
        description_i18n: { pt: "Enviar notificaÃ§Ã£o.", en: "Send notice." },
        type: "manual",
        role: "dpo",
        timeout: { value: 48, unit: "hours" },
        ai_assist: true,
        condition: "severity >= high",
        outputs_i18n: { pt: ["Notificado"], en: ["Notified"] },
        scf_controls: ["IRO-09"],
      },
    ],
    escalation_rules: [
      {
        trigger_i18n: { pt: "SLA Vencendo", en: "SLA expiring" },
        action_i18n: { pt: "Escalar", en: "Escalate" },
        severity: "critical",
      },
    ],
  },
];

const TEMPLATES_INDEX = new Map(WORKFLOW_TEMPLATES.map((t) => [t.id, t]));

export const workflowsTemplatesRoutes: RouteDefinition[] = [
  {
    method: "GET",
    path: "/api/v1/workflows/templates",
    authRequired: true,
    tenantRequired: false,
    permissions: ["scf:read"],
    handler: async ({ request, traceId }) => {
      const locale = new URL(request.url).searchParams.get("locale") ?? "";
      const summary = WORKFLOW_TEMPLATES.map((t) => ({
        id: t.id,
        name_i18n: t.name_i18n,
        domain: t.domain,
        trigger_i18n: t.trigger_i18n,
        regulation_id: t.regulation_id,
        sla: t.sla,
        step_count: t.steps.length,
      }));
      return json(flattenI18n({ data: summary, trace_id: traceId }, locale));
    },
  },
  {
    method: "GET",
    path: "/api/v1/workflows/templates/:templateId",
    authRequired: true,
    tenantRequired: false,
    permissions: ["scf:read"],
    handler: async ({ request, params, traceId }) => {
      const locale = new URL(request.url).searchParams.get("locale") ?? "";
      const t = TEMPLATES_INDEX.get(routeUuidParam(params, "templateId"));
      if (!t) throw new ApiError("NOT_FOUND", "Template not found.", 404);
      return json(flattenI18n({ data: t, trace_id: traceId }, locale));
    },
  },
];
