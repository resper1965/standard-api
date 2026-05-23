/**
 * CB-F: Governance Reference Data
 *
 * Dados de referência para governança corporativa:
 * - Maturity Levels (SCR-CMM)
 * - Background Check Types
 * - Clearance Levels
 * - Department Templates
 *
 * Todos linkam ao SCF via scf_controls[].
 */
import type { RouteDefinition } from "../http";
import { json } from "../http";
import {
  MaturityLevelRef,
  BgCheckTypeRef,
  ClearanceLevelRef,
  DepartmentRef,
  MaturityLevelRefSchema,
  BgCheckTypeRefSchema,
  ClearanceLevelRefSchema,
  DepartmentRefSchema
} from "@standard/schemas";

// ── Maturity Levels (SCR-CMM) ───────────────────────────────────────────────

const MATURITY_LEVELS: MaturityLevelRef[] = [
  { 
    level: 1, 
    label_i18n: { pt: "Inicial", en: "Initial" }, 
    description_i18n: { 
      pt: "Processos ad-hoc, reativos. Sem documentação formal. Dependência de indivíduos.",
      en: "Ad-hoc, reactive processes. No formal documentation. Individual dependency."
    } 
  },
  { 
    level: 2, 
    label_i18n: { pt: "Gerenciado", en: "Managed" }, 
    description_i18n: { 
      pt: "Processos básicos documentados. Repetíveis mas inconsistentes entre equipes.",
      en: "Basic processes documented. Repeatable but inconsistent across teams."
    } 
  },
  { 
    level: 3, 
    label_i18n: { pt: "Definido", en: "Defined" }, 
    description_i18n: { 
      pt: "Processos padronizados e institucionalizados. Políticas aprovadas e comunicadas.",
      en: "Standardized and institutionalized processes. Approved and communicated policies."
    } 
  },
  { 
    level: 4, 
    label_i18n: { pt: "Mensurado", en: "Measured" }, 
    description_i18n: { 
      pt: "Métricas e KPIs definidos. Monitoramento contínuo. Decisões baseadas em dados.",
      en: "Defined metrics and KPIs. Continuous monitoring. Data-driven decisions."
    } 
  },
  { 
    level: 5, 
    label_i18n: { pt: "Otimizado", en: "Optimized" }, 
    description_i18n: { 
      pt: "Melhoria contínua. Automação avançada. Benchmarking externo. Inovação em processos.",
      en: "Continuous improvement. Advanced automation. External benchmarking. Process innovation."
    } 
  },
];

// Validate at startup
MATURITY_LEVELS.forEach(item => MaturityLevelRefSchema.parse(item));

// ── Background Check Types ──────────────────────────────────────────────────

const BG_CHECK_TYPES: BgCheckTypeRef[] = [
  { id: "criminal", name_i18n: { pt: "Antecedentes Criminais", en: "Criminal Record" }, scf_controls: ["HRS-04"], required_for_clearance: ["standard", "elevated", "privileged"] },
  { id: "credit", name_i18n: { pt: "Análise de Crédito", en: "Credit Check" }, scf_controls: ["HRS-04"], required_for_clearance: ["elevated", "privileged"] },
  { id: "education", name_i18n: { pt: "Verificação de Escolaridade", en: "Education Verification" }, scf_controls: ["HRS-04"], required_for_clearance: ["privileged"] },
  { id: "employment", name_i18n: { pt: "Verificação de Empregos Anteriores", en: "Employment Verification" }, scf_controls: ["HRS-04"], required_for_clearance: ["elevated", "privileged"] },
  { id: "identity", name_i18n: { pt: "Verificação de Identidade", en: "Identity Verification" }, scf_controls: ["HRS-04", "IAC-01"], required_for_clearance: ["standard", "elevated", "privileged"] },
  { id: "drug_test", name_i18n: { pt: "Teste Toxicológico", en: "Drug Test" }, scf_controls: ["HRS-04"], required_for_clearance: [] },
  { id: "reference", name_i18n: { pt: "Referências Profissionais", en: "Professional References" }, scf_controls: ["HRS-04"], required_for_clearance: ["privileged"] },
  { id: "sanctions", name_i18n: { pt: "Listas de Sanções (PEP/SDN)", en: "Sanctions Lists (PEP/SDN)" }, scf_controls: ["HRS-04", "CPL-01"], required_for_clearance: ["elevated", "privileged"] },
];

BG_CHECK_TYPES.forEach(item => BgCheckTypeRefSchema.parse(item));

// ── Clearance Levels ────────────────────────────────────────────────────────

const CLEARANCE_LEVELS: ClearanceLevelRef[] = [
  { id: "standard", name_i18n: { pt: "Padrão", en: "Standard" }, required_checks: ["identity", "criminal"], scf_controls: ["HRS-04", "IAC-01"] },
  { id: "elevated", name_i18n: { pt: "Elevado", en: "Elevated" }, required_checks: ["identity", "criminal", "credit", "employment", "sanctions"], scf_controls: ["HRS-04", "IAC-01", "IAC-06"] },
  { id: "privileged", name_i18n: { pt: "Privilegiado", en: "Privileged" }, required_checks: ["identity", "criminal", "credit", "employment", "education", "reference", "sanctions"], scf_controls: ["HRS-04", "IAC-01", "IAC-06", "IAC-20"] },
];

CLEARANCE_LEVELS.forEach(item => ClearanceLevelRefSchema.parse(item));

// ── Department Templates ────────────────────────────────────────────────────

const DEPARTMENTS: DepartmentRef[] = [
  { id: "geral", name_i18n: { pt: "Geral / Administrativo", en: "General / Admin" }, typical_data_subjects: ["employee", "visitor"], typical_processing_purposes: ["employment_management"] },
  { id: "ti", name_i18n: { pt: "Tecnologia da Informação", en: "Information Technology" }, typical_data_subjects: ["employee", "contractor"], typical_processing_purposes: ["security_monitoring", "employment_management"] },
  { id: "rh", name_i18n: { pt: "Recursos Humanos", en: "Human Resources" }, typical_data_subjects: ["employee", "candidate", "contractor"], typical_processing_purposes: ["recruitment", "employment_management", "payroll", "benefits_management", "health_safety", "training"] },
  { id: "juridico", name_i18n: { pt: "Jurídico", en: "Legal" }, typical_data_subjects: ["employee", "customer", "supplier"], typical_processing_purposes: ["legal_compliance", "contract_execution"] },
  { id: "compliance", name_i18n: { pt: "Compliance / GRC", en: "Compliance / GRC" }, typical_data_subjects: ["employee", "supplier"], typical_processing_purposes: ["legal_compliance", "audit_governance", "fraud_prevention"] },
  { id: "financeiro", name_i18n: { pt: "Financeiro", en: "Finance" }, typical_data_subjects: ["employee", "customer", "supplier"], typical_processing_purposes: ["payroll", "contract_execution", "legal_compliance"] },
  { id: "operacoes", name_i18n: { pt: "Operações", en: "Operations" }, typical_data_subjects: ["employee", "customer"], typical_processing_purposes: ["contract_execution", "employment_management"] },
  { id: "marketing", name_i18n: { pt: "Marketing", en: "Marketing" }, typical_data_subjects: ["customer"], typical_processing_purposes: ["marketing_direct", "marketing_analytics", "customer_relationship"] },
  { id: "comercial", name_i18n: { pt: "Comercial / Vendas", en: "Sales" }, typical_data_subjects: ["customer", "supplier"], typical_processing_purposes: ["customer_relationship", "contract_execution"] },
  { id: "saude_ocupacional", name_i18n: { pt: "Saúde Ocupacional", en: "Occupational Health" }, typical_data_subjects: ["employee"], typical_processing_purposes: ["health_safety", "employment_management"] },
  { id: "seguranca_patrimonial", name_i18n: { pt: "Segurança Patrimonial", en: "Physical Security" }, typical_data_subjects: ["employee", "visitor", "contractor"], typical_processing_purposes: ["security_monitoring"] },
];

DEPARTMENTS.forEach(item => DepartmentRefSchema.parse(item));

// ── Routes ──────────────────────────────────────────────────────────────────

export const governanceRefRoutes: RouteDefinition[] = [
  {
    method: "GET", path: "/api/v1/governance/maturity-levels",
    authRequired: true, tenantRequired: false,
    handler: async ({ traceId }) => json({ data: MATURITY_LEVELS, trace_id: traceId }),
  },
  {
    method: "GET", path: "/api/v1/governance/bg-check-types",
    authRequired: true, tenantRequired: false,
    handler: async ({ traceId }) => json({ data: BG_CHECK_TYPES, total: BG_CHECK_TYPES.length, trace_id: traceId }),
  },
  {
    method: "GET", path: "/api/v1/governance/clearance-levels",
    authRequired: true, tenantRequired: false,
    handler: async ({ traceId }) => json({ data: CLEARANCE_LEVELS, trace_id: traceId }),
  },
  {
    method: "GET", path: "/api/v1/governance/departments",
    authRequired: true, tenantRequired: false,
    handler: async ({ traceId }) => json({ data: DEPARTMENTS, total: DEPARTMENTS.length, trace_id: traceId }),
  },
];
