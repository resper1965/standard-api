/**
 * CB-B: Risk Methodology + Taxonomy (Spec v3 -> V2 TS Schema)
 *
 * Enriched with:
 * - risk_statuses (openâ†’closed)
 * - appetite_levels (conservativeâ†’aggressive)
 * - risk_categories with colors
 * - label_en on scales
 * - id on scale entries
 * - mitre_techniques on risks
 * - estimated_effort on treatment_examples
 * - id + unit on KRIs
 *
 * All link to SCF via scf_controls[] / scf_domains[].
 */
import type {
  RouteDefinition,
  AppDependencies,
  AssessmentRecord,
} from "../http";
import {
  json,
  routeParam,
  routeUuidParam,
  requireOrganizationId,
} from "../http";
import { ApiError } from "../errors/api-error";
import { flattenI18n } from "../utils/i18n";
import { inArray, eq } from "drizzle-orm";
import {
  scfRiskControlMappings,
  scfRisks,
  scfThreatControlMappings,
  scfThreats,
} from "@standard/schemas";

const requireAssessment = async (
  deps: AppDependencies,
  assessmentId: string,
  organizationId: string,
): Promise<AssessmentRecord> => {
  const tenantAssessmentsDb = deps.assessments.withOrganization(organizationId);
  const assessment = await tenantAssessmentsDb.get(assessmentId);
  if (!assessment)
    throw new ApiError("NOT_FOUND", "Assessment not found.", 404);
  return assessment;
};

// â”€â”€ Risk Methodology â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const RISK_METHODOLOGIES = [
  {
    id: "qualitative_5x5",
    name_i18n: { pt: "Matriz Qualitativa 5Ã—5", en: "Qualitative 5x5 Matrix" },

    dimensions: [
      {
        id: "likelihood",
        name_i18n: { pt: "Probabilidade", en: "Likelihood" },
        scale: [
          {
            value: 1,
            id: "rare",
            label_i18n: { pt: "Raro", en: "Rare" },
            description_i18n: { pt: "< 5% de chance em 12 meses" },
          },
          {
            value: 2,
            id: "unlikely",
            label_i18n: { pt: "ImprovÃ¡vel", en: "Unlikely" },
            description_i18n: { pt: "5-20% de chance em 12 meses" },
          },
          {
            value: 3,
            id: "possible",
            label_i18n: { pt: "PossÃ­vel", en: "Possible" },
            description_i18n: { pt: "20-50% de chance em 12 meses" },
          },
          {
            value: 4,
            id: "likely",
            label_i18n: { pt: "ProvÃ¡vel", en: "Likely" },
            description_i18n: { pt: "50-80% de chance em 12 meses" },
          },
          {
            value: 5,
            id: "almost_certain",
            label_i18n: { pt: "Quase Certo", en: "Almost Certain" },
            description_i18n: { pt: "> 80% de chance em 12 meses" },
          },
        ],
      },
      {
        id: "impact",
        name_i18n: { pt: "Impacto", en: "Impact" },
        scale: [
          {
            value: 1,
            id: "negligible",
            label_i18n: { pt: "NegligenciÃ¡vel", en: "Negligible" },
            description_i18n: {
              pt: "Sem impacto significativo nas operaÃ§Ãµes",
            },
          },
          {
            value: 2,
            id: "low",
            label_i18n: { pt: "Baixo", en: "Low" },
            description_i18n: { pt: "Impacto leve, perdas controlÃ¡veis" },
          },
          {
            value: 3,
            id: "medium",
            label_i18n: { pt: "MÃ©dio", en: "Medium" },
            description_i18n: {
              pt: "Impacto moderado, interrupÃ§Ã£o notÃ¡vel",
            },
          },
          {
            value: 4,
            id: "high",
            label_i18n: { pt: "Alto", en: "High" },
            description_i18n: { pt: "Impacto severo, perdas grandes" },
          },
          {
            value: 5,
            id: "critical",
            label_i18n: { pt: "CrÃ­tico", en: "Critical" },
            description_i18n: {
              pt: "Impacto desastroso, ameaÃ§a continuidade",
            },
          },
        ],
      },
    ],

    matrix: [
      {
        min_score: 1,
        max_score: 3,
        level: "low",
        label_i18n: { pt: "Baixo", en: "Low" },
        color: "#22c55e",
        action_i18n: { pt: "Aceitar â€” monitorar periodicamente" },
      },
      {
        min_score: 4,
        max_score: 7,
        level: "medium",
        label_i18n: { pt: "MÃ©dio", en: "Medium" },
        color: "#eab308",
        action_i18n: { pt: "Monitorar â€” aÃ§Ã£o dentro de 90 dias" },
      },
      {
        min_score: 8,
        max_score: 14,
        level: "high",
        label_i18n: { pt: "Alto", en: "High" },
        color: "#f97316",
        action_i18n: { pt: "Mitigar â€” aÃ§Ã£o dentro de 30 dias" },
      },
      {
        min_score: 15,
        max_score: 25,
        level: "critical",
        label_i18n: { pt: "CrÃ­tico", en: "Critical" },
        color: "#ef4444",
        action_i18n: { pt: "Escalar â€” aÃ§Ã£o imediata" },
      },
    ],

    statuses: [
      {
        id: "open",
        name_i18n: { pt: "Aberto", en: "Open" },
        order: 1,
        is_terminal: false,
      },
      {
        id: "mitigating",
        name_i18n: { pt: "Em mitigaÃ§Ã£o", en: "Mitigating" },
        order: 2,
        is_terminal: false,
      },
      {
        id: "accepted",
        name_i18n: { pt: "Aceito", en: "Accepted" },
        order: 3,
        is_terminal: true,
      },
      {
        id: "closed",
        name_i18n: { pt: "Fechado", en: "Closed" },
        order: 4,
        is_terminal: true,
      },
    ],

    appetite_levels: [
      {
        id: "conservative",
        name_i18n: { pt: "Conservador", en: "Conservative" },
        description_i18n: {
          pt: "TolerÃ¢ncia mÃ­nima a riscos. Foco em prevenÃ§Ã£o e compliance rigoroso.",
        },
        default_max_score: 5,
      },
      {
        id: "moderate",
        name_i18n: { pt: "Moderado", en: "Moderate" },
        description_i18n: {
          pt: "Aceita riscos calculados com benefÃ­cio claro. Maioria das organizaÃ§Ãµes.",
        },
        default_max_score: 15,
      },
      {
        id: "aggressive",
        name_i18n: { pt: "Agressivo", en: "Aggressive" },
        description_i18n: {
          pt: "Alta tolerÃ¢ncia a riscos. Foco em inovaÃ§Ã£o e crescimento acelerado.",
        },
        default_max_score: 25,
      },
    ],

    treatment_options: [
      {
        id: "avoid",
        name_i18n: { pt: "Evitar", en: "Avoid" },
        description_i18n: { pt: "Eliminar a atividade que gera o risco" },
        when_i18n: {
          pt: "Quando a atividade pode ser eliminada sem impacto ao negÃ³cio",
        },
        scf_domains: ["RSK"],
      },
      {
        id: "mitigate",
        name_i18n: { pt: "Mitigar", en: "Mitigate" },
        description_i18n: {
          pt: "Implementar controles para reduzir probabilidade ou impacto",
        },
        when_i18n: { pt: "Quando o custo de mitigaÃ§Ã£o < impacto potencial" },
        scf_domains: ["RSK"],
      },
      {
        id: "transfer",
        name_i18n: { pt: "Transferir", en: "Transfer" },
        description_i18n: {
          pt: "Compartilhar o risco com terceiro (seguro, contrato)",
        },
        when_i18n: { pt: "Via seguro ou contrato (ex: ciberseguro)" },
        scf_domains: ["RSK", "TPM"],
      },
      {
        id: "accept",
        name_i18n: { pt: "Aceitar", en: "Accept" },
        description_i18n: {
          pt: "Reconhecer o risco e monitorar sem aÃ§Ã£o adicional",
        },
        when_i18n: {
          pt: "Quando o risco estÃ¡ dentro do apetite e o custo de mitigaÃ§Ã£o Ã© desproporcional",
        },
        scf_domains: ["RSK"],
      },
    ],
  },
];

// â”€â”€ Risk Categories â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const RISK_CATEGORIES = [
  {
    id: "operational",
    name_i18n: { pt: "Operacional", en: "Operational" },
    color: "#f97316",
    applicable_domains: ["operational", "governance", "risk"] as const,
  },
  {
    id: "compliance",
    name_i18n: { pt: "Compliance", en: "Compliance" },
    color: "#8b5cf6",
    applicable_domains: ["governance", "privacy", "health"] as const,
  },
  {
    id: "security",
    name_i18n: { pt: "SeguranÃ§a", en: "Security" },
    color: "#ef4444",
    applicable_domains: ["security", "risk"] as const,
  },
  {
    id: "privacy",
    name_i18n: { pt: "Privacidade", en: "Privacy" },
    color: "#06b6d4",
    applicable_domains: ["privacy"] as const,
  },
  {
    id: "financial",
    name_i18n: { pt: "Financeiro", en: "Financial" },
    color: "#eab308",
    applicable_domains: ["financial", "governance"] as const,
  },
  {
    id: "strategic",
    name_i18n: { pt: "EstratÃ©gico", en: "Strategic" },
    color: "#3b82f6",
    applicable_domains: ["governance"] as const,
  },
];

// â”€â”€ Risk Taxonomy & Methodology â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const RISK_TAXONOMY = {
  categories: [
    {
      id: "cyber",
      name_i18n: { pt: "CibernÃ©tico" },
      risks: [
        {
          id: "ransomware",
          name_i18n: { pt: "Ransomware" },
          description_i18n: {
            pt: "Malware que criptografa dados e exige resgate",
          },
          typical_likelihood: 4,
          typical_impact: 5,
          scf_controls: ["END-04", "IAO-03", "MON-01", "IRO-01", "BCD-01"],
          mitre_techniques: ["T1486", "T1490"],
          kris: [
            {
              id: "kri_patch_compliance",
              name_i18n: { pt: "Taxa de Patch Compliance" },
              formula: "patched / total * 100",
              unit: "%",
              frequency: "mensal",
              thresholds: { green: ">= 95%", yellow: "80-94%", red: "< 80%" },
              scf_controls: ["VUL-05"],
              risk_ids: [],
            },
            {
              id: "kri_edr_coverage",
              name_i18n: { pt: "Cobertura de EDR" },
              formula: "endpoints_with_edr / total_endpoints * 100",
              unit: "%",
              frequency: "semanal",
              thresholds: { green: ">= 98%", yellow: "90-97%", red: "< 90%" },
              scf_controls: ["END-04"],
              risk_ids: [],
            },
            {
              id: "kri_backup_recovery",
              name_i18n: { pt: "Tempo mÃ©dio de backup recovery" },
              formula: "avg(restore_time_minutes)",
              unit: "min",
              frequency: "mensal",
              thresholds: { green: "< 60", yellow: "60-240", red: "> 240" },
              scf_controls: ["BCD-01"],
              risk_ids: [],
            },
          ],
          treatment_examples: [
            {
              strategy: "mitigate",
              action_i18n: { pt: "Implementar EDR em todos os endpoints" },
              scf_control: "END-04",
              estimated_effort: "medium" as const,
            },
            {
              strategy: "mitigate",
              action_i18n: {
                pt: "Backup imutÃ¡vel com teste mensal de restore",
              },
              scf_control: "BCD-01",
              estimated_effort: "medium" as const,
            },
            {
              strategy: "transfer",
              action_i18n: {
                pt: "Contratar ciberseguro com cobertura de ransomware",
              },
              scf_control: "",
              estimated_effort: "low" as const,
            },
          ],
        },
        {
          id: "phishing",
          name_i18n: { pt: "Phishing" },
          description_i18n: {
            pt: "Engenharia social via email para roubo de credenciais",
          },
          typical_likelihood: 5,
          typical_impact: 3,
          scf_controls: ["SAT-01", "SAT-02", "IAC-15", "TDA-01", "MON-06"],
          mitre_techniques: ["T1566", "T1598"],
          kris: [
            {
              id: "kri_phish_click",
              name_i18n: { pt: "Taxa de clique em simulaÃ§Ã£o de phishing" },
              formula: "clicks / recipients * 100",
              unit: "%",
              frequency: "trimestral",
              thresholds: { green: "< 3%", yellow: "3-10%", red: "> 10%" },
              scf_controls: ["SAT-02"],
              risk_ids: [],
            },
            {
              id: "kri_phish_report",
              name_i18n: { pt: "Report rate de phishing" },
              formula: "reports / total_phishing * 100",
              unit: "%",
              frequency: "trimestral",
              thresholds: { green: "> 70%", yellow: "40-70%", red: "< 40%" },
              scf_controls: ["SAT-02"],
              risk_ids: [],
            },
          ],
          treatment_examples: [
            {
              strategy: "mitigate",
              action_i18n: {
                pt: "Programa de conscientizaÃ§Ã£o com simulaÃ§Ãµes trimestrais",
              },
              scf_control: "SAT-02",
              estimated_effort: "medium" as const,
            },
            {
              strategy: "mitigate",
              action_i18n: { pt: "MFA em todas as contas corporativas" },
              scf_control: "IAC-15",
              estimated_effort: "medium" as const,
            },
          ],
        },
        {
          id: "insider_threat",
          name_i18n: { pt: "AmeaÃ§a Interna" },
          description_i18n: {
            pt: "FuncionÃ¡rio malicioso ou negligente causando vazamento",
          },
          typical_likelihood: 3,
          typical_impact: 4,
          scf_controls: ["HRS-04", "HRS-06", "IAC-06", "MON-01", "DLP-01"],
          mitre_techniques: ["T1078", "T1530"],
          kris: [
            {
              id: "kri_dlp_alerts",
              name_i18n: { pt: "Alertas de DLP por mÃªs" },
              formula: "count(dlp_alerts)",
              unit: "count",
              frequency: "mensal",
              thresholds: { green: "< 5", yellow: "5-20", red: "> 20" },
              scf_controls: ["DLP-01"],
              risk_ids: [],
            },
            {
              id: "kri_priv_access",
              name_i18n: { pt: "Acessos privilegiados acima do baseline" },
              formula: "current - baseline",
              unit: "count",
              frequency: "semanal",
              thresholds: { green: "0", yellow: "1-3", red: "> 3" },
              scf_controls: ["IAC-06"],
              risk_ids: [],
            },
          ],
          treatment_examples: [
            {
              strategy: "mitigate",
              action_i18n: {
                pt: "Implementar DLP com monitoramento de exfiltraÃ§Ã£o",
              },
              scf_control: "DLP-01",
              estimated_effort: "high" as const,
            },
            {
              strategy: "mitigate",
              action_i18n: {
                pt: "Background check periÃ³dico para acessos privilegiados",
              },
              scf_control: "HRS-04",
              estimated_effort: "medium" as const,
            },
          ],
        },
        {
          id: "data_breach",
          name_i18n: { pt: "Vazamento de Dados" },
          description_i18n: {
            pt: "ExposiÃ§Ã£o nÃ£o autorizada de dados pessoais ou confidenciais",
          },
          typical_likelihood: 3,
          typical_impact: 5,
          scf_controls: ["DCH-01", "CRY-01", "IAC-06", "PRI-01", "IRO-02"],
          mitre_techniques: ["T1567", "T1537"],
          kris: [
            {
              id: "kri_unencrypted",
              name_i18n: { pt: "Dados sensÃ­veis sem criptografia" },
              formula: "unencrypted / total * 100",
              unit: "%",
              frequency: "mensal",
              thresholds: { green: "0%", yellow: "1-5%", red: "> 5%" },
              scf_controls: ["CRY-01"],
              risk_ids: [],
            },
            {
              id: "kri_breach_detect",
              name_i18n: { pt: "Tempo mÃ©dio de detecÃ§Ã£o de breach" },
              formula: "avg(hours)",
              unit: "h",
              frequency: "trimestral",
              thresholds: { green: "< 24", yellow: "24-72", red: "> 72" },
              scf_controls: ["MON-01"],
              risk_ids: [],
            },
          ],
          treatment_examples: [
            {
              strategy: "mitigate",
              action_i18n: { pt: "Criptografia em repouso e em trÃ¢nsito" },
              scf_control: "CRY-01",
              estimated_effort: "medium" as const,
            },
            {
              strategy: "mitigate",
              action_i18n: { pt: "ClassificaÃ§Ã£o de dados com DLP integrado" },
              scf_control: "DCH-01",
              estimated_effort: "high" as const,
            },
          ],
        },
        {
          id: "ddos",
          name_i18n: { pt: "DDoS" },
          description_i18n: {
            pt: "Ataque de negaÃ§Ã£o de serviÃ§o distribuÃ­do",
          },
          typical_likelihood: 3,
          typical_impact: 3,
          scf_controls: ["NET-13", "NET-01", "BCD-01"],
          mitre_techniques: ["T1498", "T1499"],
          kris: [
            {
              id: "kri_uptime",
              name_i18n: { pt: "Uptime de serviÃ§os crÃ­ticos" },
              formula: "uptime_min / total_min * 100",
              unit: "%",
              frequency: "mensal",
              thresholds: {
                green: ">= 99.9%",
                yellow: "99-99.9%",
                red: "< 99%",
              },
              scf_controls: ["BCD-01"],
              risk_ids: [],
            },
          ],
          treatment_examples: [
            {
              strategy: "mitigate",
              action_i18n: { pt: "CDN com proteÃ§Ã£o anti-DDoS" },
              scf_control: "NET-13",
              estimated_effort: "medium" as const,
            },
          ],
        },
        {
          id: "supply_chain",
          name_i18n: { pt: "Supply Chain Attack" },
          description_i18n: {
            pt: "Comprometimento via fornecedor ou dependÃªncia de software",
          },
          typical_likelihood: 3,
          typical_impact: 4,
          scf_controls: ["TPM-01", "TPM-04", "SCR-01", "VUL-02"],
          mitre_techniques: ["T1195"],
          kris: [
            {
              id: "kri_critical_cves",
              name_i18n: { pt: "DependÃªncias com CVE crÃ­tico" },
              formula: "count(unpatched)",
              unit: "count",
              frequency: "semanal",
              thresholds: { green: "0", yellow: "1-3", red: "> 3" },
              scf_controls: ["VUL-02"],
              risk_ids: [],
            },
            {
              id: "kri_vendor_overdue",
              name_i18n: { pt: "Vendors sem assessment atualizado" },
              formula: "overdue / total * 100",
              unit: "%",
              frequency: "mensal",
              thresholds: { green: "0%", yellow: "1-10%", red: "> 10%" },
              scf_controls: ["TPM-04"],
              risk_ids: [],
            },
          ],
          treatment_examples: [
            {
              strategy: "mitigate",
              action_i18n: { pt: "SBOM + monitoramento de CVEs" },
              scf_control: "SCR-01",
              estimated_effort: "medium" as const,
            },
            {
              strategy: "mitigate",
              action_i18n: { pt: "Assessment periÃ³dico de vendors com TPRA" },
              scf_control: "TPM-04",
              estimated_effort: "medium" as const,
            },
          ],
        },
        {
          id: "zero_day",
          name_i18n: { pt: "Zero-Day" },
          description_i18n: {
            pt: "Vulnerabilidade desconhecida explorada antes de patch",
          },
          typical_likelihood: 2,
          typical_impact: 5,
          scf_controls: ["VUL-01", "VUL-05", "THR-01", "IRO-01"],
          mitre_techniques: ["T1203"],
          kris: [
            {
              id: "kri_emergency_patch",
              name_i18n: { pt: "Tempo mÃ©dio de patches emergenciais" },
              formula: "avg(hours)",
              unit: "h",
              frequency: "por evento",
              thresholds: { green: "< 24", yellow: "24-72", red: "> 72" },
              scf_controls: ["VUL-05"],
              risk_ids: [],
            },
          ],
          treatment_examples: [
            {
              strategy: "mitigate",
              action_i18n: {
                pt: "Threat intelligence feed com correlaÃ§Ã£o automÃ¡tica",
              },
              scf_control: "THR-01",
              estimated_effort: "high" as const,
            },
          ],
        },
        {
          id: "credential_compromise",
          name_i18n: { pt: "Comprometimento de Credenciais" },
          description_i18n: {
            pt: "Roubo ou vazamento de credenciais de acesso",
          },
          typical_likelihood: 4,
          typical_impact: 4,
          scf_controls: ["IAC-01", "IAC-15", "IAC-21", "MON-01"],
          mitre_techniques: ["T1078", "T1110"],
          kris: [
            {
              id: "kri_mfa_coverage",
              name_i18n: { pt: "Cobertura de MFA" },
              formula: "mfa_enabled / total * 100",
              unit: "%",
              frequency: "mensal",
              thresholds: { green: ">= 99%", yellow: "90-99%", red: "< 90%" },
              scf_controls: ["IAC-15"],
              risk_ids: [],
            },
          ],
          treatment_examples: [
            {
              strategy: "mitigate",
              action_i18n: { pt: "MFA obrigatÃ³rio + credential monitoring" },
              scf_control: "IAC-15",
              estimated_effort: "medium" as const,
            },
          ],
        },
      ],
    },
    {
      id: "operational",
      name_i18n: { pt: "Operacional" },
      risks: [
        {
          id: "process_failure",
          name_i18n: { pt: "Falha de Processo" },
          description_i18n: {
            pt: "Erro em processo manual causando inconsistÃªncia",
          },
          typical_likelihood: 4,
          typical_impact: 2,
          scf_controls: ["GOV-02", "PRM-01", "PRM-05"],
          mitre_techniques: [],
          kris: [
            {
              id: "kri_process_incidents",
              name_i18n: { pt: "Incidentes de processo por mÃªs" },
              formula: "count(process_incidents)",
              unit: "count",
              frequency: "mensal",
              thresholds: { green: "< 3", yellow: "3-10", red: "> 10" },
              scf_controls: ["PRM-01"],
              risk_ids: [],
            },
          ],
          treatment_examples: [
            {
              strategy: "mitigate",
              action_i18n: { pt: "Automatizar processos crÃ­ticos" },
              scf_control: "PRM-01",
              estimated_effort: "high" as const,
            },
          ],
        },
        {
          id: "human_error",
          name_i18n: { pt: "Erro Humano" },
          description_i18n: {
            pt: "Falha por desatenÃ§Ã£o ou falta de treinamento",
          },
          typical_likelihood: 4,
          typical_impact: 3,
          scf_controls: ["SAT-01", "HRS-09", "OPS-01"],
          mitre_techniques: [],
          kris: [
            {
              id: "kri_human_err_pct",
              name_i18n: { pt: "Incidentes causados por erro humano" },
              formula: "human_err / total * 100",
              unit: "%",
              frequency: "mensal",
              thresholds: { green: "< 15%", yellow: "15-30%", red: "> 30%" },
              scf_controls: ["SAT-01"],
              risk_ids: [],
            },
          ],
          treatment_examples: [
            {
              strategy: "mitigate",
              action_i18n: { pt: "Treinamento periÃ³dico + checklists" },
              scf_control: "SAT-01",
              estimated_effort: "low" as const,
            },
          ],
        },
        {
          id: "system_outage",
          name_i18n: { pt: "Indisponibilidade de Sistema" },
          description_i18n: { pt: "Falha em sistema crÃ­tico" },
          typical_likelihood: 3,
          typical_impact: 4,
          scf_controls: ["BCD-01", "BCD-11", "OPS-01", "CCC-02"],
          mitre_techniques: [],
          kris: [
            {
              id: "kri_mttr",
              name_i18n: { pt: "MTTR" },
              formula: "avg(recovery_min)",
              unit: "min",
              frequency: "mensal",
              thresholds: { green: "< 30", yellow: "30-120", red: "> 120" },
              scf_controls: ["BCD-11"],
              risk_ids: [],
            },
          ],
          treatment_examples: [
            {
              strategy: "mitigate",
              action_i18n: { pt: "HA com failover automÃ¡tico" },
              scf_control: "BCD-11",
              estimated_effort: "high" as const,
            },
          ],
        },
      ],
    },
    {
      id: "compliance",
      name_i18n: { pt: "Compliance / RegulatÃ³rio" },
      risks: [
        {
          id: "regulatory_fine",
          name_i18n: { pt: "Multa RegulatÃ³ria" },
          description_i18n: { pt: "Penalidade por nÃ£o conformidade" },
          typical_likelihood: 2,
          typical_impact: 4,
          scf_controls: ["GOV-01", "GOV-06", "CPL-01", "CPL-03"],
          mitre_techniques: [],
          kris: [
            {
              id: "kri_open_findings",
              name_i18n: { pt: "Achados de auditoria abertos" },
              formula: "count(open)",
              unit: "count",
              frequency: "mensal",
              thresholds: { green: "0", yellow: "1-5", red: "> 5" },
              scf_controls: ["CPL-01"],
              risk_ids: [],
            },
          ],
          treatment_examples: [
            {
              strategy: "mitigate",
              action_i18n: {
                pt: "Gap analysis contÃ­nuo com remediaÃ§Ã£o automatizada",
              },
              scf_control: "CPL-01",
              estimated_effort: "medium" as const,
            },
          ],
        },
        {
          id: "audit_failure",
          name_i18n: { pt: "Falha em Auditoria" },
          description_i18n: { pt: "Resultado negativo em auditoria" },
          typical_likelihood: 3,
          typical_impact: 3,
          scf_controls: ["AIS-01", "AIS-04", "GOV-05"],
          mitre_techniques: [],
          kris: [
            {
              id: "kri_no_evidence",
              name_i18n: { pt: "Controles sem evidÃªncia" },
              formula: "no_evidence / total * 100",
              unit: "%",
              frequency: "mensal",
              thresholds: { green: "< 5%", yellow: "5-20%", red: "> 20%" },
              scf_controls: ["AIS-04"],
              risk_ids: [],
            },
          ],
          treatment_examples: [
            {
              strategy: "mitigate",
              action_i18n: { pt: "Coleta automatizada de evidÃªncias" },
              scf_control: "AIS-04",
              estimated_effort: "medium" as const,
            },
          ],
        },
      ],
    },
    {
      id: "strategic",
      name_i18n: { pt: "EstratÃ©gico" },
      risks: [
        {
          id: "reputation_damage",
          name_i18n: { pt: "Dano Reputacional" },
          description_i18n: { pt: "Perda de confianÃ§a de stakeholders" },
          typical_likelihood: 2,
          typical_impact: 5,
          scf_controls: ["GOV-01", "IRO-09", "PRI-01"],
          mitre_techniques: [],
          kris: [
            {
              id: "kri_nps",
              name_i18n: { pt: "NPS Score" },
              formula: "nps",
              unit: "score",
              frequency: "mensal",
              thresholds: { green: "> 50", yellow: "20-50", red: "< 20" },
              scf_controls: ["GOV-01"],
              risk_ids: [],
            },
          ],
          treatment_examples: [
            {
              strategy: "mitigate",
              action_i18n: { pt: "Plano de comunicaÃ§Ã£o de crise" },
              scf_control: "IRO-09",
              estimated_effort: "medium" as const,
            },
          ],
        },
      ],
    },
  ],
};

const METHODOLOGY_INDEX = new Map(RISK_METHODOLOGIES.map((m) => [m.id, m]));
const TAXONOMY_CAT_INDEX = new Map(
  RISK_TAXONOMY.categories.map((c) => [c.id, c]),
);

// â”€â”€ Routes â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const riskRoutes: RouteDefinition[] = [
  // Methodology
  {
    method: "GET",
    path: "/api/v1/risk/methodology",
    authRequired: true,
    tenantRequired: false,
    handler: async ({ request, traceId }) => {
      const locale = new URL(request.url).searchParams.get("locale") || "pt";
      const method = RISK_METHODOLOGIES[0];
      return json({ data: flattenI18n(method, locale), trace_id: traceId });
    },
  },
  {
    method: "GET",
    path: "/api/v1/risk/methodologies",
    authRequired: true,
    tenantRequired: false,
    handler: async ({ request, traceId }) => {
      const locale = new URL(request.url).searchParams.get("locale") || "pt";
      const data = RISK_METHODOLOGIES.map((m) => ({
        id: m.id,
        name_i18n: m.name_i18n,
      }));
      return json({ data: flattenI18n(data, locale), trace_id: traceId });
    },
  },
  {
    method: "GET",
    path: "/api/v1/risk/methodologies/:methodId",
    authRequired: true,
    tenantRequired: false,
    handler: async ({ request, params, traceId }) => {
      const locale = new URL(request.url).searchParams.get("locale") || "pt";
      const method = METHODOLOGY_INDEX.get(routeUuidParam(params, "methodId"));
      if (!method)
        throw new ApiError("NOT_FOUND", "Methodology not found.", 404);
      return json({ data: flattenI18n(method, locale), trace_id: traceId });
    },
  },
  {
    method: "GET",
    path: "/api/v1/risk/methodologies/:methodId/matrix",
    authRequired: true,
    tenantRequired: false,
    handler: async ({ request, params, traceId }) => {
      const locale = new URL(request.url).searchParams.get("locale") || "pt";
      const method = METHODOLOGY_INDEX.get(routeUuidParam(params, "methodId"));
      if (!method)
        throw new ApiError("NOT_FOUND", "Methodology not found.", 404);
      const cells = [];
      const likelihoodScale =
        method.dimensions.find((d) => d.id === "likelihood")?.scale || [];
      const impactScale =
        method.dimensions.find((d) => d.id === "impact")?.scale || [];

      for (const l of likelihoodScale) {
        for (const i of impactScale) {
          const score = l.value * i.value;
          const level = method.matrix.find(
            (m: any) => score >= m.min_score && score <= m.max_score,
          );
          cells.push({
            likelihood: l.value,
            impact: i.value,
            score,
            level: level?.level,
            color: level?.color,
            action_i18n: level?.action_i18n,
          });
        }
      }
      return json({
        data: flattenI18n(
          {
            methodology: method.id,
            cells,
            likelihood_scale: likelihoodScale,
            impact_scale: impactScale,
            legend: method.matrix,
          },
          locale,
        ),
        trace_id: traceId,
      });
    },
  },
  // Categories
  {
    method: "GET",
    path: "/api/v1/risk/categories",
    authRequired: true,
    tenantRequired: false,
    handler: async ({ request, traceId }) => {
      const locale = new URL(request.url).searchParams.get("locale") || "pt";
      return json({
        data: flattenI18n(RISK_CATEGORIES, locale),
        trace_id: traceId,
      });
    },
  },
  // Taxonomy
  {
    method: "GET",
    path: "/api/v1/risk/taxonomy",
    authRequired: true,
    tenantRequired: false,
    handler: async ({ request, traceId }) => {
      const locale = new URL(request.url).searchParams.get("locale") || "pt";
      const summary = RISK_TAXONOMY.categories.map((c) => ({
        id: c.id,
        name_i18n: c.name_i18n,
        risk_count: c.risks.length,
        risks: c.risks.map((r) => ({
          id: r.id,
          name_i18n: r.name_i18n,
          typical_likelihood: r.typical_likelihood,
          typical_impact: r.typical_impact,
          scf_control_count: r.scf_controls.length,
          kri_count: r.kris.length,
        })),
      }));
      return json({ data: flattenI18n(summary, locale), trace_id: traceId });
    },
  },
  {
    method: "GET",
    path: "/api/v1/risk/taxonomy/:categoryId",
    authRequired: true,
    tenantRequired: false,
    handler: async ({ request, params, traceId }) => {
      const locale = new URL(request.url).searchParams.get("locale") || "pt";
      const cat = TAXONOMY_CAT_INDEX.get(routeUuidParam(params, "categoryId"));
      if (!cat)
        throw new ApiError(
          "NOT_FOUND",
          `Category not found. Available: ${RISK_TAXONOMY.categories.map((c) => c.id).join(", ")}`,
          404,
        );
      return json({ data: flattenI18n(cat, locale), trace_id: traceId });
    },
  },
  {
    method: "GET",
    path: "/api/v1/risk/taxonomy/:categoryId/:riskId",
    authRequired: true,
    tenantRequired: false,
    handler: async ({ request, params, traceId }) => {
      const locale = new URL(request.url).searchParams.get("locale") || "pt";
      const cat = TAXONOMY_CAT_INDEX.get(routeUuidParam(params, "categoryId"));
      if (!cat) throw new ApiError("NOT_FOUND", "Category not found.", 404);
      const risk = cat.risks.find(
        (r: any) => r.id === routeUuidParam(params, "riskId"),
      );
      if (!risk)
        throw new ApiError(
          "NOT_FOUND",
          `Risk not found in ${cat.id}: ${cat.risks.map((r: any) => r.id).join(", ")}`,
          404,
        );
      const data = {
        ...risk,
        category: { id: cat.id, name_i18n: cat.name_i18n },
      };
      return json({ data: flattenI18n(data, locale), trace_id: traceId });
    },
  },
  // KRIs
  {
    method: "GET",
    path: "/api/v1/risk/kris",
    authRequired: true,
    tenantRequired: false,
    handler: async ({ request, traceId }) => {
      const locale = new URL(request.url).searchParams.get("locale") || "pt";
      const url = new URL(request.url);
      const category = url.searchParams.get("category");
      const frequency = url.searchParams.get("frequency");
      const allKris = [];
      for (const cat of RISK_TAXONOMY.categories) {
        if (category && cat.id !== category) continue;
        for (const risk of cat.risks) {
          for (const kri of risk.kris) {
            if (frequency && kri.frequency !== frequency) continue;
            allKris.push({
              ...kri,
              risk_id: risk.id,
              risk_name_i18n: risk.name_i18n,
              category_id: cat.id,
              category_name_i18n: cat.name_i18n,
            });
          }
        }
      }
      return json({
        data: flattenI18n(allKris, locale),
        total: allKris.length,
        trace_id: traceId,
      });
    },
  },
  // Treatment options
  {
    method: "GET",
    path: "/api/v1/risk/treatment-options",
    authRequired: true,
    tenantRequired: false,
    handler: async ({ request, traceId }) => {
      const locale = new URL(request.url).searchParams.get("locale") || "pt";
      return json({
        data: flattenI18n(
          RISK_METHODOLOGIES[0]?.treatment_options ?? [],
          locale,
        ),
        trace_id: traceId,
      });
    },
  },
  // Controls for risk
  {
    method: "GET",
    path: "/api/v1/risk/controls/:riskId",
    authRequired: true,
    tenantRequired: false,
    handler: async ({ request, params, traceId }) => {
      const locale = new URL(request.url).searchParams.get("locale") || "pt";
      const riskId = routeUuidParam(params, "riskId");
      for (const cat of RISK_TAXONOMY.categories) {
        const risk = cat.risks.find((r: any) => r.id === riskId);
        if (risk) {
          const data = {
            risk: { id: risk.id, name_i18n: risk.name_i18n, category: cat.id },
            scf_controls: risk.scf_controls,
            treatment_examples: risk.treatment_examples,
            kris: risk.kris,
          };
          return json({ data: flattenI18n(data, locale), trace_id: traceId });
        }
      }
      throw new ApiError("NOT_FOUND", "Risk not found.", 404);
    },
  },
  {
    method: "GET",
    path: "/api/v1/assessments/:assessmentId/risk-exposure",
    authRequired: true,
    tenantRequired: true,
    handler: async ({ deps, params, organizationId, traceId }) => {
      const orgId = requireOrganizationId({ organizationId });
      const assessmentId = routeUuidParam(params, "assessmentId");

      const assessment = await requireAssessment(deps, assessmentId, orgId);
      const versions =
        await deps.gapAnalysis.repositories.gapVersions.listByAssessment(
          assessmentId,
          orgId,
        );

      const activeVersion =
        versions.find((v) => v.status === "approved") ||
        versions.find((v) => v.status === "draft") ||
        versions[versions.length - 1];

      if (!activeVersion) {
        return json({
          assessment_id: assessmentId,
          summary: {
            inherent_exposure_score: 0,
            residual_exposure_score: 0,
            risk_mitigation_percentage: 100,
            active_gaps_count: 0,
            mapped_risks_count: 0,
            mapped_threats_count: 0,
          },
          gaps: [],
          mapped_risks: [],
          mapped_threats: [],
          trace_id: traceId,
        });
      }

      const findings =
        await deps.gapAnalysis.repositories.gapFindings.listByVersion(
          activeVersion.gap_analysis_version_id,
          orgId,
        );
      const activeGaps = findings.filter(
        (f) =>
          f.assessment_status === "not_met" ||
          f.assessment_status === "partially_met",
      );

      if (activeGaps.length === 0) {
        return json({
          assessment_id: assessmentId,
          gap_analysis_version_id: activeVersion.gap_analysis_version_id,
          summary: {
            inherent_exposure_score: 0,
            residual_exposure_score: 0,
            risk_mitigation_percentage: 100,
            active_gaps_count: 0,
            mapped_risks_count: 0,
            mapped_threats_count: 0,
          },
          gaps: [],
          mapped_risks: [],
          mapped_threats: [],
          trace_id: traceId,
        });
      }

      const controlIds = activeGaps
        .map((g) => g.scf_control_id)
        .filter((id): id is string => !!id);

      let mappedRisksList: any[] = [];
      let mappedThreatsList: any[] = [];

      if (controlIds.length > 0) {
        const db = deps._db;
        if (!db)
          throw new ApiError("INTERNAL_ERROR", "DB client not available.", 500);

        mappedRisksList = await db
          .select({
            id: scfRisks.id,
            riskCode: scfRisks.riskCode,
            title: scfRisks.title,
            description: scfRisks.description,
            category: scfRisks.category,
            scfControlId: scfRiskControlMappings.scfControlId,
          })
          .from(scfRiskControlMappings)
          .innerJoin(
            scfRisks,
            eq(scfRiskControlMappings.scfRiskId, scfRisks.id),
          )
          .where(inArray(scfRiskControlMappings.scfControlId, controlIds));

        mappedThreatsList = await db
          .select({
            id: scfThreats.id,
            threatCode: scfThreats.threatCode,
            title: scfThreats.title,
            description: scfThreats.description,
            category: scfThreats.category,
            scfControlId: scfThreatControlMappings.scfControlId,
          })
          .from(scfThreatControlMappings)
          .innerJoin(
            scfThreats,
            eq(scfThreatControlMappings.scfThreatId, scfThreats.id),
          )
          .where(inArray(scfThreatControlMappings.scfControlId, controlIds));
      }

      const sevWeights: Record<string, number> = {
        critical: 5,
        high: 4,
        medium: 3,
        low: 2,
      };

      let totalInherent = 0;
      let totalResidual = 0;

      const gapsWithExposure = activeGaps.map((gap) => {
        const likelihood = gap.likelihood ? Number(gap.likelihood) : 3;
        const impact = gap.impact
          ? Number(gap.impact)
          : (sevWeights[gap.severity] ?? 2);
        const inherent = likelihood * impact;
        const factor = gap.assessment_status === "partially_met" ? 0.5 : 1.0;
        const residual = inherent * factor;

        totalInherent += inherent;
        totalResidual += residual;

        return {
          gap_finding_id: gap.gap_finding_id,
          gap_code: gap.gap_code,
          scf_control_id: gap.scf_control_id,
          status: gap.assessment_status,
          severity: gap.severity,
          likelihood,
          impact,
          inherent_score: inherent,
          residual_score: residual,
          associated_risks: mappedRisksList
            .filter((r) => r.scfControlId === gap.scf_control_id)
            .map((r) => ({
              id: r.id,
              code: r.riskCode,
              title: r.title,
              category: r.category,
            })),
          associated_threats: mappedThreatsList
            .filter((t) => t.scfControlId === gap.scf_control_id)
            .map((t) => ({
              id: t.id,
              code: t.threatCode,
              title: t.title,
              category: t.category,
            })),
        };
      });

      const avgInherent =
        activeGaps.length > 0
          ? Number((totalInherent / activeGaps.length).toFixed(2))
          : 0;
      const avgResidual =
        activeGaps.length > 0
          ? Number((totalResidual / activeGaps.length).toFixed(2))
          : 0;
      const mitigationPct =
        totalInherent > 0
          ? Number(((1 - totalResidual / totalInherent) * 100).toFixed(1))
          : 100;

      const uniqueRisksMap = new Map<string, any>();
      const uniqueThreatsMap = new Map<string, any>();

      for (const r of mappedRisksList) {
        if (!uniqueRisksMap.has(r.id)) {
          uniqueRisksMap.set(r.id, {
            id: r.id,
            risk_code: r.riskCode,
            title: r.title,
            category: r.category,
            mapped_controls_count: 0,
          });
        }
        uniqueRisksMap.get(r.id).mapped_controls_count++;
      }

      for (const t of mappedThreatsList) {
        if (!uniqueThreatsMap.has(t.id)) {
          uniqueThreatsMap.set(t.id, {
            id: t.id,
            threat_code: t.threatCode,
            title: t.title,
            category: t.category,
            mapped_controls_count: 0,
          });
        }
        uniqueThreatsMap.get(t.id).mapped_controls_count++;
      }

      return json({
        assessment_id: assessmentId,
        gap_analysis_version_id: activeVersion.gap_analysis_version_id,
        summary: {
          inherent_exposure_score: avgInherent,
          residual_exposure_score: avgResidual,
          risk_mitigation_percentage: mitigationPct,
          active_gaps_count: activeGaps.length,
          mapped_risks_count: uniqueRisksMap.size,
          mapped_threats_count: uniqueThreatsMap.size,
        },
        gaps: gapsWithExposure,
        mapped_risks: Array.from(uniqueRisksMap.values()),
        mapped_threats: Array.from(uniqueThreatsMap.values()),
        trace_id: traceId,
      });
    },
  },
];
