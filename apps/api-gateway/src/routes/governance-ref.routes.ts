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

// ── Maturity Levels (SCR-CMM) ───────────────────────────────────────────────

const MATURITY_LEVELS = [
  { level: 1, label_pt: "Inicial", label_en: "Initial", description_pt: "Processos ad-hoc, reativos. Sem documentação formal. Dependência de indivíduos." },
  { level: 2, label_pt: "Gerenciado", label_en: "Managed", description_pt: "Processos básicos documentados. Repetíveis mas inconsistentes entre equipes." },
  { level: 3, label_pt: "Definido", label_en: "Defined", description_pt: "Processos padronizados e institucionalizados. Políticas aprovadas e comunicadas." },
  { level: 4, label_pt: "Mensurado", label_en: "Measured", description_pt: "Métricas e KPIs definidos. Monitoramento contínuo. Decisões baseadas em dados." },
  { level: 5, label_pt: "Otimizado", label_en: "Optimized", description_pt: "Melhoria contínua. Automação avançada. Benchmarking externo. Inovação em processos." },
];

// ── Background Check Types ──────────────────────────────────────────────────

const BG_CHECK_TYPES = [
  { id: "criminal", name_pt: "Antecedentes Criminais", scf_controls: ["HRS-04"], required_for_clearance: ["standard", "elevated", "privileged"] },
  { id: "credit", name_pt: "Análise de Crédito", scf_controls: ["HRS-04"], required_for_clearance: ["elevated", "privileged"] },
  { id: "education", name_pt: "Verificação de Escolaridade", scf_controls: ["HRS-04"], required_for_clearance: ["privileged"] },
  { id: "employment", name_pt: "Verificação de Empregos Anteriores", scf_controls: ["HRS-04"], required_for_clearance: ["elevated", "privileged"] },
  { id: "identity", name_pt: "Verificação de Identidade", scf_controls: ["HRS-04", "IAC-01"], required_for_clearance: ["standard", "elevated", "privileged"] },
  { id: "drug_test", name_pt: "Teste Toxicológico", scf_controls: ["HRS-04"], required_for_clearance: [] },
  { id: "reference", name_pt: "Referências Profissionais", scf_controls: ["HRS-04"], required_for_clearance: ["privileged"] },
  { id: "sanctions", name_pt: "Listas de Sanções (PEP/SDN)", scf_controls: ["HRS-04", "CPL-01"], required_for_clearance: ["elevated", "privileged"] },
];

// ── Clearance Levels ────────────────────────────────────────────────────────

const CLEARANCE_LEVELS = [
  { id: "standard", name_pt: "Padrão", required_checks: ["identity", "criminal"], scf_controls: ["HRS-04", "IAC-01"] },
  { id: "elevated", name_pt: "Elevado", required_checks: ["identity", "criminal", "credit", "employment", "sanctions"], scf_controls: ["HRS-04", "IAC-01", "IAC-06"] },
  { id: "privileged", name_pt: "Privilegiado", required_checks: ["identity", "criminal", "credit", "employment", "education", "reference", "sanctions"], scf_controls: ["HRS-04", "IAC-01", "IAC-06", "IAC-20"] },
];

// ── Department Templates ────────────────────────────────────────────────────

const DEPARTMENTS = [
  { id: "geral", name_pt: "Geral / Administrativo", name_en: "General / Admin", typical_data_subjects: ["employee", "visitor"], typical_processing_purposes: ["employment_management"] },
  { id: "ti", name_pt: "Tecnologia da Informação", name_en: "Information Technology", typical_data_subjects: ["employee", "contractor"], typical_processing_purposes: ["security_monitoring", "employment_management"] },
  { id: "rh", name_pt: "Recursos Humanos", name_en: "Human Resources", typical_data_subjects: ["employee", "candidate", "contractor"], typical_processing_purposes: ["recruitment", "employment_management", "payroll", "benefits_management", "health_safety", "training"] },
  { id: "juridico", name_pt: "Jurídico", name_en: "Legal", typical_data_subjects: ["employee", "customer", "supplier"], typical_processing_purposes: ["legal_compliance", "contract_execution"] },
  { id: "compliance", name_pt: "Compliance / GRC", name_en: "Compliance / GRC", typical_data_subjects: ["employee", "supplier"], typical_processing_purposes: ["legal_compliance", "audit_governance", "fraud_prevention"] },
  { id: "financeiro", name_pt: "Financeiro", name_en: "Finance", typical_data_subjects: ["employee", "customer", "supplier"], typical_processing_purposes: ["payroll", "contract_execution", "legal_compliance"] },
  { id: "operacoes", name_pt: "Operações", name_en: "Operations", typical_data_subjects: ["employee", "customer"], typical_processing_purposes: ["contract_execution", "employment_management"] },
  { id: "marketing", name_pt: "Marketing", name_en: "Marketing", typical_data_subjects: ["customer"], typical_processing_purposes: ["marketing_direct", "marketing_analytics", "customer_relationship"] },
  { id: "comercial", name_pt: "Comercial / Vendas", name_en: "Sales", typical_data_subjects: ["customer", "supplier"], typical_processing_purposes: ["customer_relationship", "contract_execution"] },
  { id: "saude_ocupacional", name_pt: "Saúde Ocupacional", name_en: "Occupational Health", typical_data_subjects: ["employee"], typical_processing_purposes: ["health_safety", "employment_management"] },
  { id: "seguranca_patrimonial", name_pt: "Segurança Patrimonial", name_en: "Physical Security", typical_data_subjects: ["employee", "visitor", "contractor"], typical_processing_purposes: ["security_monitoring"] },
];

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
