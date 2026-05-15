/**
 * CB-A: Privacy Regulations Catalog (Spec v3)
 *
 * Full regulation objects with all sub-schemas per spec:
 * - legal_bases + sensitive_legal_bases
 * - data_subject_rights with can_be_denied + denial_grounds
 * - dsar_statuses + breach_statuses (workflow)
 * - breach_rules with authority_name + severity + scf_controls
 * - international_transfer with safeguards
 * - dpa_requirements with article + scf_controls
 * - consent_rules with consent_types + proof_types
 * - dpia_triggers with scf_controls
 * - penalties with max_fine_pct_revenue + article
 *
 * All fields link to SCF via scf_controls[] or scf_domain.
 */
import type { RouteDefinition } from "../http";
import { json, routeParam } from "../http";
import { ApiError } from "../errors/api-error";
import { flattenI18n } from "../utils/i18n";

// ── Regulations ─────────────────────────────────────────────────────────────

export const REGULATIONS = [
  {
    id: "lgpd",
    name: "Lei Geral de Proteção de Dados",
    name_en: "Brazil General Data Protection Law",
    jurisdiction: "BR",
    authority: "ANPD",
    effective_date: "2020-09-18",
    scf_domain: "PRI",
    version: "2018",

    legal_bases: [
      { id: "consent", code: "Art.7,I", name_i18n: { pt: "Consentimento", en: "Consent" }, article: "Art. 7°, inciso I", applicable_data_types: "non_sensitive" as const, requires_lia: false, requires_dpia: false, requires_consent_record: true, conditions_i18n: { pt: "Livre, informado, inequívoco e para finalidade determinada" }, scf_controls: ["PRI-01", "PRI-03"] },
      { id: "legal_obligation", code: "Art.7,II", name_i18n: { pt: "Obrigação legal ou regulatória", en: "Legal obligation" }, article: "Art. 7°, inciso II", applicable_data_types: "non_sensitive" as const, requires_lia: false, requires_dpia: false, requires_consent_record: false, conditions_i18n: { pt: "Cumprimento de obrigação legal ou regulatória pelo controlador" }, scf_controls: ["PRI-01", "CPL-01"] },
      { id: "public_administration", code: "Art.7,III", name_i18n: { pt: "Administração pública", en: "Public administration" }, article: "Art. 7°, inciso III", applicable_data_types: "non_sensitive" as const, requires_lia: false, requires_dpia: false, requires_consent_record: false, conditions_i18n: { pt: "Tratamento e uso compartilhado pela administração pública" }, scf_controls: ["PRI-01"] },
      { id: "research", code: "Art.7,IV", name_i18n: { pt: "Pesquisa", en: "Research" }, article: "Art. 7°, inciso IV", applicable_data_types: "non_sensitive" as const, requires_lia: false, requires_dpia: false, requires_consent_record: false, conditions_i18n: { pt: "Realização de estudos por órgão de pesquisa, garantida anonimização" }, scf_controls: ["PRI-01"] },
      { id: "contract", code: "Art.7,V", name_i18n: { pt: "Execução de contrato", en: "Contract execution" }, article: "Art. 7°, inciso V", applicable_data_types: "non_sensitive" as const, requires_lia: false, requires_dpia: false, requires_consent_record: false, conditions_i18n: { pt: "Necessário para execução de contrato ou procedimentos preliminares" }, scf_controls: ["PRI-01"] },
      { id: "judicial", code: "Art.7,VI", name_i18n: { pt: "Exercício de direitos em processo", en: "Exercise of rights in proceedings" }, article: "Art. 7°, inciso VI", applicable_data_types: "non_sensitive" as const, requires_lia: false, requires_dpia: false, requires_consent_record: false, conditions_i18n: { pt: "Exercício regular de direitos em processo judicial, administrativo ou arbitral" }, scf_controls: ["PRI-01"] },
      { id: "life_protection", code: "Art.7,VII", name_i18n: { pt: "Proteção da vida", en: "Protection of life" }, article: "Art. 7°, inciso VII", applicable_data_types: "all" as const, requires_lia: false, requires_dpia: false, requires_consent_record: false, conditions_i18n: { pt: "Proteção da vida ou da incolumidade física do titular ou de terceiro" }, scf_controls: ["PRI-01"] },
      { id: "health", code: "Art.7,VIII", name_i18n: { pt: "Tutela da saúde", en: "Health protection" }, article: "Art. 7°, inciso VIII", applicable_data_types: "all" as const, requires_lia: false, requires_dpia: false, requires_consent_record: false, conditions_i18n: { pt: "Tutela da saúde, exclusivamente, em procedimento realizado por profissionais de saúde" }, scf_controls: ["PRI-01"] },
      { id: "legitimate_interest", code: "Art.7,IX", name_i18n: { pt: "Legítimo interesse", en: "Legitimate interest" }, article: "Art. 7°, inciso IX", applicable_data_types: "non_sensitive" as const, requires_lia: true, requires_dpia: true, requires_consent_record: false, conditions_i18n: { pt: "Necessário para atender interesses legítimos do controlador ou de terceiro, exceto se prevalecerem direitos do titular" }, scf_controls: ["PRI-01", "PRI-05"] },
      { id: "credit_protection", code: "Art.7,X", name_i18n: { pt: "Proteção ao crédito", en: "Credit protection" }, article: "Art. 7°, inciso X", applicable_data_types: "non_sensitive" as const, requires_lia: false, requires_dpia: false, requires_consent_record: false, conditions_i18n: { pt: "Proteção do crédito, inclusive quanto ao disposto na legislação pertinente" }, scf_controls: ["PRI-01"] },
    ],

    sensitive_legal_bases: [
      { id: "specific_consent", code: "Art.11,I", name_i18n: { pt: "Consentimento específico e destacado", en: "Specific and prominent consent" }, article: "Art. 11, inciso I", applicable_data_types: "sensitive" as const, requires_lia: false, requires_dpia: true, requires_consent_record: true, conditions_i18n: { pt: "Consentimento de forma específica e destacada, para finalidades específicas" }, scf_controls: ["PRI-01", "PRI-05"] },
      { id: "legal_obligation_sensitive", code: "Art.11,II,a", name_i18n: { pt: "Obrigação legal ou regulatória", en: "Legal obligation (sensitive)" }, article: "Art. 11, inciso II, alínea a", applicable_data_types: "sensitive" as const, requires_lia: false, requires_dpia: false, requires_consent_record: false, conditions_i18n: { pt: "Sem consentimento quando indispensável para cumprir obrigação legal" }, scf_controls: ["PRI-01", "CPL-01"] },
      { id: "public_policy", code: "Art.11,II,b", name_i18n: { pt: "Políticas públicas", en: "Public policies" }, article: "Art. 11, inciso II, alínea b", applicable_data_types: "sensitive" as const, requires_lia: false, requires_dpia: false, requires_consent_record: false, conditions_i18n: { pt: "Tratamento compartilhado necessário à execução de políticas públicas" }, scf_controls: ["PRI-01"] },
      { id: "research_sensitive", code: "Art.11,II,c", name_i18n: { pt: "Pesquisa (anonimizado quando possível)", en: "Research (anonymized when possible)" }, article: "Art. 11, inciso II, alínea c", applicable_data_types: "sensitive" as const, requires_lia: false, requires_dpia: false, requires_consent_record: false, conditions_i18n: { pt: "Realização de estudos por órgão de pesquisa" }, scf_controls: ["PRI-01"] },
      { id: "contract_sensitive", code: "Art.11,II,d", name_i18n: { pt: "Exercício de direitos em contrato", en: "Exercise of rights (contract)" }, article: "Art. 11, inciso II, alínea d", applicable_data_types: "sensitive" as const, requires_lia: false, requires_dpia: false, requires_consent_record: false, conditions_i18n: { pt: "Exercício regular de direitos, inclusive em contrato e processo" }, scf_controls: ["PRI-01"] },
      { id: "life_protection_sensitive", code: "Art.11,II,e", name_i18n: { pt: "Proteção da vida", en: "Protection of life (sensitive)" }, article: "Art. 11, inciso II, alínea e", applicable_data_types: "sensitive" as const, requires_lia: false, requires_dpia: false, requires_consent_record: false, conditions_i18n: { pt: "Proteção da vida ou incolumidade física do titular ou de terceiro" }, scf_controls: ["PRI-01"] },
      { id: "health_sensitive", code: "Art.11,II,f", name_i18n: { pt: "Tutela da saúde", en: "Health protection (sensitive)" }, article: "Art. 11, inciso II, alínea f", applicable_data_types: "sensitive" as const, requires_lia: false, requires_dpia: false, requires_consent_record: false, conditions_i18n: { pt: "Tutela da saúde em procedimento por profissionais de saúde ou autoridade sanitária" }, scf_controls: ["PRI-01"] },
      { id: "fraud_prevention", code: "Art.11,II,g", name_i18n: { pt: "Prevenção à fraude", en: "Fraud prevention" }, article: "Art. 11, inciso II, alínea g", applicable_data_types: "sensitive" as const, requires_lia: false, requires_dpia: false, requires_consent_record: false, conditions_i18n: { pt: "Garantia da prevenção à fraude e à segurança do titular, nos processos de identificação e autenticação" }, scf_controls: ["PRI-01", "IAC-01"] },
    ],

    data_subject_rights: [
      { id: "confirmation", name_i18n: { pt: "Confirmação do tratamento" }, article: "Art. 18, I", sla_days: 15, can_be_denied: false, denial_grounds_i18n: { pt: [] }, scf_controls: ["PRI-06", "PRI-07"] },
      { id: "access", name_i18n: { pt: "Acesso aos dados" }, article: "Art. 18, II", sla_days: 15, can_be_denied: false, denial_grounds_i18n: { pt: [] }, scf_controls: ["PRI-06", "PRI-07"] },
      { id: "correction", name_i18n: { pt: "Correção de dados" }, article: "Art. 18, III", sla_days: 15, can_be_denied: false, denial_grounds_i18n: { pt: [] }, scf_controls: ["PRI-06"] },
      { id: "anonymization", name_i18n: { pt: "Anonimização/bloqueio/eliminação" }, article: "Art. 18, IV", sla_days: 15, can_be_denied: true, denial_grounds_i18n: { pt: ["obrigação legal de retenção"] }, scf_controls: ["PRI-06", "DCH-17"] },
      { id: "portability", name_i18n: { pt: "Portabilidade" }, article: "Art. 18, V", sla_days: 15, can_be_denied: true, denial_grounds_i18n: { pt: ["segredo comercial ou industrial"] }, scf_controls: ["PRI-06"] },
      { id: "deletion", name_i18n: { pt: "Eliminação (consentimento)" }, article: "Art. 18, VI", sla_days: 15, can_be_denied: true, denial_grounds_i18n: { pt: ["obrigação legal", "interesse público"] }, scf_controls: ["PRI-06", "DCH-17"] },
      { id: "information", name_i18n: { pt: "Informação sobre compartilhamento" }, article: "Art. 18, VII", sla_days: 15, can_be_denied: false, denial_grounds_i18n: { pt: [] }, scf_controls: ["PRI-06"] },
      { id: "consent_info", name_i18n: { pt: "Informação sobre não consentir" }, article: "Art. 18, VIII", sla_days: 15, can_be_denied: false, denial_grounds_i18n: { pt: [] }, scf_controls: ["PRI-06"] },
      { id: "revocation", name_i18n: { pt: "Revogação do consentimento" }, article: "Art. 18, IX", sla_days: 15, can_be_denied: false, denial_grounds_i18n: { pt: [] }, scf_controls: ["PRI-06", "PRI-03"] },
    ],

    dsar_statuses: [
      { id: "received", name_i18n: { pt: "Recebido" }, order: 1, is_terminal: false },
      { id: "verified", name_i18n: { pt: "Verificado" }, order: 2, is_terminal: false },
      { id: "in_progress", name_i18n: { pt: "Em processamento" }, order: 3, is_terminal: false },
      { id: "awaiting_info", name_i18n: { pt: "Aguardando informação" }, order: 4, is_terminal: false },
      { id: "completed", name_i18n: { pt: "Concluído" }, order: 5, is_terminal: true },
      { id: "denied", name_i18n: { pt: "Negado" }, order: 6, is_terminal: true },
      { id: "cancelled", name_i18n: { pt: "Cancelado" }, order: 7, is_terminal: true },
    ],

    breach_rules: {
      authority_deadline_hours: 48,
      authority_name: "ANPD",
      subject_notification: "when_high_risk" as const,
      required_report_fields: ["nature", "categories_affected", "number_of_subjects", "measures_taken", "risks", "measures_to_mitigate"],
      severity_levels: [
        { level: "critical" as const, criteria_i18n: { pt: "Dados sensíveis expostos em larga escala" }, auth_notify: true, subject_notify: true, response_hours: 24 },
        { level: "high" as const, criteria_i18n: { pt: "Dados pessoais de volume significativo" }, auth_notify: true, subject_notify: true, response_hours: 48 },
        { level: "medium" as const, criteria_i18n: { pt: "Dados pessoais limitados" }, auth_notify: true, subject_notify: false, response_hours: 72 },
        { level: "low" as const, criteria_i18n: { pt: "Dados não sensíveis, escopo limitado" }, auth_notify: false, subject_notify: false, response_hours: 168 },
      ],
      scf_controls: ["IRO-01", "IRO-02", "IRO-09", "IRO-10", "PRI-01"],
    },

    breach_statuses: [
      { id: "open", name_i18n: { pt: "Aberto" }, order: 1, is_terminal: false },
      { id: "investigating", name_i18n: { pt: "Em investigação" }, order: 2, is_terminal: false },
      { id: "contained", name_i18n: { pt: "Contido" }, order: 3, is_terminal: false },
      { id: "notified", name_i18n: { pt: "Notificado à autoridade" }, order: 4, is_terminal: false },
      { id: "closed", name_i18n: { pt: "Encerrado" }, order: 5, is_terminal: true },
    ],

    international_transfer: {
      adequacy_countries: [] as string[],
      mechanisms: [
        { id: "scc", name_i18n: { pt: "Cláusulas Contratuais Padrão" }, article: "Art. 33, II, b", requires_authority_approval: false, scf_controls: ["PRI-09"] },
        { id: "bcr", name_i18n: { pt: "Normas Corporativas Globais" }, article: "Art. 33, II, c", requires_authority_approval: true, scf_controls: ["PRI-09"] },
        { id: "specific_consent", name_i18n: { pt: "Consentimento específico e destacado" }, article: "Art. 33, VIII", requires_authority_approval: false, scf_controls: ["PRI-09", "PRI-03"] },
        { id: "international_cooperation", name_i18n: { pt: "Cooperação jurídica internacional" }, article: "Art. 33, III", requires_authority_approval: false, scf_controls: ["PRI-09"] },
        { id: "adequacy_decision", name_i18n: { pt: "Decisão de adequação da ANPD" }, article: "Art. 33, I", requires_authority_approval: false, scf_controls: ["PRI-09"] },
      ],
      safeguards: [
        { id: "encryption", name_i18n: { pt: "Criptografia em trânsito e repouso" }, article: "Art. 46" },
        { id: "access_control", name_i18n: { pt: "Controle de acesso restrito" }, article: "Art. 46" },
        { id: "audit_trail", name_i18n: { pt: "Trilha de auditoria" }, article: "Art. 46" },
      ],
    },

    dpa_requirements: {
      mandatory: true,
      minimum_clauses_i18n: { pt: ["limitação de finalidade", "medidas de segurança", "regras de subcontratação", "eliminação de dados", "direitos de auditoria"] },
      article: "Art. 39",
      scf_controls: ["PRI-09", "TPM-02"],
    },

    consent_rules: {
      validity_criteria_i18n: { pt: ["livre", "informado", "inequívoco", "finalidade específica"] },
      children_age_threshold: 12,
      withdrawal_i18n: { pt: "Mesma facilidade que a concessão", en: "Same ease as granting" },
      article: "Art. 8°",
      scf_controls: ["PRI-01", "PRI-03"],
      consent_types: [
        { id: "general", name_i18n: { pt: "Geral" }, requires_opt_in: true, requires_double_opt_in: false, renewal_months: null },
        { id: "marketing", name_i18n: { pt: "Marketing" }, requires_opt_in: true, requires_double_opt_in: true, renewal_months: 12 },
        { id: "cookies", name_i18n: { pt: "Cookies" }, requires_opt_in: true, requires_double_opt_in: false, renewal_months: 12 },
        { id: "sharing", name_i18n: { pt: "Compartilhamento" }, requires_opt_in: true, requires_double_opt_in: false, renewal_months: null },
        { id: "sensitive", name_i18n: { pt: "Dados sensíveis" }, requires_opt_in: true, requires_double_opt_in: true, renewal_months: 6 },
      ],
      proof_types: [
        { id: "checkbox", name_i18n: { pt: "Checkbox" }, legal_strength: "medium" as const, recommended_for: ["general", "cookies"] },
        { id: "signature", name_i18n: { pt: "Assinatura" }, legal_strength: "strong" as const, recommended_for: ["sensitive", "sharing"] },
        { id: "double_opt_in", name_i18n: { pt: "Dupla confirmação" }, legal_strength: "strong" as const, recommended_for: ["marketing", "sensitive"] },
        { id: "verbal", name_i18n: { pt: "Verbal (gravado)" }, legal_strength: "weak" as const, recommended_for: ["general"] },
        { id: "document", name_i18n: { pt: "Documento assinado" }, legal_strength: "strong" as const, recommended_for: ["sharing", "sensitive"] },
      ],
    },

    dpia_triggers: [
      { id: "large_scale_sensitive", description_i18n: { pt: "Tratamento em larga escala de dados sensíveis" }, article: "Art. 38", scf_controls: ["PRI-05", "PRI-06"] },
      { id: "profiling", description_i18n: { pt: "Decisões automatizadas com efeitos legais" }, article: "Art. 20", scf_controls: ["PRI-05"] },
      { id: "surveillance", description_i18n: { pt: "Monitoramento sistemático de área pública" }, article: "Art. 38", scf_controls: ["PRI-05"] },
      { id: "legitimate_interest", description_i18n: { pt: "Tratamento baseado em interesse legítimo" }, article: "Art. 10, §3°", scf_controls: ["PRI-05", "PRI-01"] },
    ],

    penalties: {
      max_fine_pct_revenue: 2,
      max_fine_absolute_i18n: { pt: "R$50.000.000,00 por infração" },
      other_sanctions_i18n: { pt: ["advertência", "publicização da infração", "bloqueio dos dados", "eliminação dos dados", "suspensão do tratamento", "suspensão do banco de dados"] },
      article: "Art. 52",
    },
  },
  {
    id: "gdpr",
    name: "General Data Protection Regulation",
    name_en: "General Data Protection Regulation",
    jurisdiction: "EU",
    authority: "National DPAs",
    effective_date: "2018-05-25",
    scf_domain: "PRI",
    version: "2016",

    legal_bases: [
      { id: "consent", code: "Art.6(1)(a)", name_i18n: { pt: "Consentimento", en: "Consent" }, article: "Art. 6(1)(a)", applicable_data_types: "non_sensitive" as const, requires_lia: false, requires_dpia: false, requires_consent_record: true, conditions_i18n: { pt: "Consentimento inequívoco, livre, específico, informado" }, scf_controls: ["PRI-01", "PRI-03"] },
      { id: "contract", code: "Art.6(1)(b)", name_i18n: { pt: "Execução de contrato", en: "Contract performance" }, article: "Art. 6(1)(b)", applicable_data_types: "non_sensitive" as const, requires_lia: false, requires_dpia: false, requires_consent_record: false, conditions_i18n: { pt: "Necessário para execução de contrato do qual o titular é parte" }, scf_controls: ["PRI-01"] },
      { id: "legal_obligation", code: "Art.6(1)(c)", name_i18n: { pt: "Obrigação legal", en: "Legal obligation" }, article: "Art. 6(1)(c)", applicable_data_types: "non_sensitive" as const, requires_lia: false, requires_dpia: false, requires_consent_record: false, conditions_i18n: { pt: "Cumprimento de obrigação legal" }, scf_controls: ["PRI-01", "CPL-01"] },
      { id: "vital_interests", code: "Art.6(1)(d)", name_i18n: { pt: "Interesses vitais", en: "Vital interests" }, article: "Art. 6(1)(d)", applicable_data_types: "all" as const, requires_lia: false, requires_dpia: false, requires_consent_record: false, conditions_i18n: { pt: "Proteção dos interesses vitais do titular ou de terceiro" }, scf_controls: ["PRI-01"] },
      { id: "public_interest", code: "Art.6(1)(e)", name_i18n: { pt: "Interesse público", en: "Public interest" }, article: "Art. 6(1)(e)", applicable_data_types: "non_sensitive" as const, requires_lia: false, requires_dpia: false, requires_consent_record: false, conditions_i18n: { pt: "Execução de missão de interesse público" }, scf_controls: ["PRI-01"] },
      { id: "legitimate_interest", code: "Art.6(1)(f)", name_i18n: { pt: "Interesse legítimo", en: "Legitimate interest" }, article: "Art. 6(1)(f)", applicable_data_types: "non_sensitive" as const, requires_lia: true, requires_dpia: true, requires_consent_record: false, conditions_i18n: { pt: "Interesses legítimos do responsável ou de terceiro, exceto quando prevaleçam os interesses do titular" }, scf_controls: ["PRI-01", "PRI-05"] },
    ],

    sensitive_legal_bases: [
      { id: "explicit_consent", code: "Art.9(2)(a)", name_i18n: { pt: "Consentimento explícito", en: "Explicit consent" }, article: "Art. 9(2)(a)", applicable_data_types: "sensitive" as const, requires_lia: false, requires_dpia: true, requires_consent_record: true, conditions_i18n: { pt: "Consentimento explícito para finalidades específicas" }, scf_controls: ["PRI-01", "PRI-05"] },
      { id: "employment_social", code: "Art.9(2)(b)", name_i18n: { pt: "Emprego e segurança social", en: "Employment and social security" }, article: "Art. 9(2)(b)", applicable_data_types: "sensitive" as const, requires_lia: false, requires_dpia: false, requires_consent_record: false, conditions_i18n: { pt: "Necessário para cumprir obrigações de direito laboral" }, scf_controls: ["PRI-01", "HRS-01"] },
      { id: "vital_interests_sensitive", code: "Art.9(2)(c)", name_i18n: { pt: "Interesses vitais", en: "Vital interests (sensitive)" }, article: "Art. 9(2)(c)", applicable_data_types: "sensitive" as const, requires_lia: false, requires_dpia: false, requires_consent_record: false, conditions_i18n: { pt: "Proteção de interesses vitais quando titular incapaz de consentir" }, scf_controls: ["PRI-01"] },
      { id: "public_health", code: "Art.9(2)(i)", name_i18n: { pt: "Saúde pública", en: "Public health" }, article: "Art. 9(2)(i)", applicable_data_types: "sensitive" as const, requires_lia: false, requires_dpia: false, requires_consent_record: false, conditions_i18n: { pt: "Interesse público na área da saúde pública" }, scf_controls: ["PRI-01"] },
    ],

    data_subject_rights: [
      { id: "access", name_i18n: { pt: "Direito de acesso", en: "Right of access" }, article: "Art. 15", sla_days: 30, can_be_denied: false, denial_grounds_i18n: { pt: [] }, scf_controls: ["PRI-06", "PRI-07"] },
      { id: "rectification", name_i18n: { pt: "Direito de retificação", en: "Right to rectification" }, article: "Art. 16", sla_days: 30, can_be_denied: false, denial_grounds_i18n: { pt: [] }, scf_controls: ["PRI-06"] },
      { id: "erasure", name_i18n: { pt: "Direito ao apagamento", en: "Right to erasure" }, article: "Art. 17", sla_days: 30, can_be_denied: true, denial_grounds_i18n: { pt: ["liberdade de expressão", "obrigação legal", "interesse público em saúde", "arquivo de interesse público", "defesa de direitos"] }, scf_controls: ["PRI-06", "DCH-17"] },
      { id: "restriction", name_i18n: { pt: "Limitação do tratamento", en: "Right to restriction of processing" }, article: "Art. 18", sla_days: 30, can_be_denied: false, denial_grounds_i18n: { pt: [] }, scf_controls: ["PRI-06"] },
      { id: "portability", name_i18n: { pt: "Portabilidade", en: "Right to data portability" }, article: "Art. 20", sla_days: 30, can_be_denied: true, denial_grounds_i18n: { pt: ["interesse público"] }, scf_controls: ["PRI-06"] },
      { id: "objection", name_i18n: { pt: "Oposição", en: "Right to object" }, article: "Art. 21", sla_days: 30, can_be_denied: true, denial_grounds_i18n: { pt: ["fundamentos legítimos prevalecentes"] }, scf_controls: ["PRI-06"] },
      { id: "automated_decisions", name_i18n: { pt: "Decisões automatizadas", en: "Automated individual decision-making" }, article: "Art. 22", sla_days: 30, can_be_denied: true, denial_grounds_i18n: { pt: ["necessário para contrato", "autorizado por lei", "consentimento explícito"] }, scf_controls: ["PRI-06"] },
    ],

    dsar_statuses: [
      { id: "received", name_i18n: { pt: "Recebido", en: "Received" }, order: 1, is_terminal: false },
      { id: "verified", name_i18n: { pt: "Verificado", en: "Verified" }, order: 2, is_terminal: false },
      { id: "in_progress", name_i18n: { pt: "Em processamento", en: "In progress" }, order: 3, is_terminal: false },
      { id: "awaiting_info", name_i18n: { pt: "Aguardando informação", en: "Awaiting info" }, order: 4, is_terminal: false },
      { id: "completed", name_i18n: { pt: "Concluído", en: "Completed" }, order: 5, is_terminal: true },
      { id: "denied", name_i18n: { pt: "Negado", en: "Denied" }, order: 6, is_terminal: true },
      { id: "cancelled", name_i18n: { pt: "Cancelado", en: "Cancelled" }, order: 7, is_terminal: true },
    ],

    breach_rules: {
      authority_deadline_hours: 72,
      authority_name: "National DPA",
      subject_notification: "when_high_risk" as const,
      required_report_fields: ["nature", "categories_affected", "number_of_subjects", "likely_consequences", "measures_taken", "dpo_contact"],
      severity_levels: [
        { level: "critical" as const, criteria_i18n: { pt: "Large-scale breach of special categories" }, auth_notify: true, subject_notify: true, response_hours: 24 },
        { level: "high" as const, criteria_i18n: { pt: "Significant personal data exposure" }, auth_notify: true, subject_notify: true, response_hours: 72 },
        { level: "medium" as const, criteria_i18n: { pt: "Limited personal data" }, auth_notify: true, subject_notify: false, response_hours: 72 },
        { level: "low" as const, criteria_i18n: { pt: "No risk to individuals" }, auth_notify: false, subject_notify: false, response_hours: 0 },
      ],
      scf_controls: ["IRO-01", "IRO-02", "IRO-09", "IRO-10", "PRI-01"],
    },

    breach_statuses: [
      { id: "open", name_i18n: { pt: "Aberto" }, order: 1, is_terminal: false },
      { id: "investigating", name_i18n: { pt: "Em investigação" }, order: 2, is_terminal: false },
      { id: "contained", name_i18n: { pt: "Contido" }, order: 3, is_terminal: false },
      { id: "notified", name_i18n: { pt: "Notificado à autoridade" }, order: 4, is_terminal: false },
      { id: "closed", name_i18n: { pt: "Encerrado" }, order: 5, is_terminal: true },
    ],

    international_transfer: {
      adequacy_countries: ["ar", "jp", "uk", "ch", "nz", "il", "uy", "kr", "ca", "ad", "fo", "gg", "im", "je"],
      mechanisms: [
        { id: "adequacy_decision", name_i18n: { pt: "Decisão de adequação" }, article: "Art. 45", requires_authority_approval: false, scf_controls: ["PRI-09"] },
        { id: "scc", name_i18n: { pt: "Cláusulas Contratuais Padrão" }, article: "Art. 46(2)(c)", requires_authority_approval: false, scf_controls: ["PRI-09"] },
        { id: "bcr", name_i18n: { pt: "Regras Corporativas Vinculantes" }, article: "Art. 47", requires_authority_approval: true, scf_controls: ["PRI-09"] },
        { id: "codes_of_conduct", name_i18n: { pt: "Códigos de conduta" }, article: "Art. 46(2)(e)", requires_authority_approval: false, scf_controls: ["PRI-09"] },
        { id: "certification", name_i18n: { pt: "Certificação" }, article: "Art. 46(2)(f)", requires_authority_approval: false, scf_controls: ["PRI-09"] },
        { id: "explicit_consent", name_i18n: { pt: "Consentimento explícito" }, article: "Art. 49(1)(a)", requires_authority_approval: false, scf_controls: ["PRI-09", "PRI-03"] },
      ],
      safeguards: [
        { id: "encryption", name_i18n: { pt: "Criptografia em trânsito e repouso" }, article: "Art. 32" },
        { id: "pseudonymization", name_i18n: { pt: "Pseudonimização" }, article: "Art. 32" },
        { id: "access_control", name_i18n: { pt: "Controle de acesso restrito" }, article: "Art. 32" },
      ],
    },

    dpa_requirements: {
      mandatory: true,
      minimum_clauses_i18n: { pt: ["objeto e duração", "finalidade", "tipos de dados", "obrigações e direitos", "regras de subprocessador", "eliminação", "direitos de auditoria", "assistência em DPIA"] },
      article: "Art. 28",
      scf_controls: ["PRI-09", "TPM-02"],
    },

    consent_rules: {
      validity_criteria_i18n: { pt: ["livre", "específico", "informado", "inequívoco", "demonstrável"] },
      children_age_threshold: 16,
      withdrawal_i18n: { pt: "Mesma facilidade que a concessão", en: "Same ease as granting" },
      article: "Art. 7",
      scf_controls: ["PRI-01", "PRI-03"],
      consent_types: [
        { id: "general", name_i18n: { pt: "Geral" }, requires_opt_in: true, requires_double_opt_in: false, renewal_months: null },
        { id: "marketing", name_i18n: { pt: "Marketing" }, requires_opt_in: true, requires_double_opt_in: true, renewal_months: 12 },
        { id: "cookies", name_i18n: { pt: "Cookies" }, requires_opt_in: true, requires_double_opt_in: false, renewal_months: 12 },
        { id: "sharing", name_i18n: { pt: "Compartilhamento" }, requires_opt_in: true, requires_double_opt_in: false, renewal_months: null },
        { id: "sensitive", name_i18n: { pt: "Dados sensíveis" }, requires_opt_in: true, requires_double_opt_in: true, renewal_months: 6 },
      ],
      proof_types: [
        { id: "checkbox", name_i18n: { pt: "Checkbox" }, legal_strength: "medium" as const, recommended_for: ["general", "cookies"] },
        { id: "signature", name_i18n: { pt: "Assinatura" }, legal_strength: "strong" as const, recommended_for: ["sensitive", "sharing"] },
        { id: "double_opt_in", name_i18n: { pt: "Dupla confirmação" }, legal_strength: "strong" as const, recommended_for: ["marketing", "sensitive"] },
        { id: "verbal", name_i18n: { pt: "Verbal (gravado)" }, legal_strength: "weak" as const, recommended_for: ["general"] },
        { id: "document", name_i18n: { pt: "Documento assinado" }, legal_strength: "strong" as const, recommended_for: ["sharing", "sensitive"] },
      ],
    },

    dpia_triggers: [
      { id: "systematic_evaluation", description_i18n: { pt: "Avaliação sistemática e extensiva de aspectos pessoais, incluindo profiling" }, article: "Art. 35(3)(a)", scf_controls: ["PRI-05"] },
      { id: "large_scale_sensitive", description_i18n: { pt: "Tratamento em larga escala de categorias especiais" }, article: "Art. 35(3)(b)", scf_controls: ["PRI-05"] },
      { id: "systematic_monitoring", description_i18n: { pt: "Monitoramento sistemático de áreas públicas em larga escala" }, article: "Art. 35(3)(c)", scf_controls: ["PRI-05"] },
    ],

    penalties: {
      max_fine_pct_revenue: 4,
      max_fine_absolute_i18n: { pt: "€20.000.000" },
      other_sanctions_i18n: { pt: ["warning", "reprimand", "processing ban", "data flow suspension"] },
      article: "Art. 83",
    },
  },
  {
    id: "hipaa_privacy",
    name: "HIPAA Privacy Rule",
    name_en: "Health Insurance Portability and Accountability Act — Privacy Rule",
    jurisdiction: "US",
    authority: "HHS / OCR",
    effective_date: "2003-04-14",
    scf_domain: "PRI",
    version: "1996",

    legal_bases: [
      { id: "treatment", code: "§164.506", name_i18n: { pt: "Tratamento/Pagamento/Operações", en: "Treatment/Payment/Operations" }, article: "§164.506", applicable_data_types: "all" as const, requires_lia: false, requires_dpia: false, requires_consent_record: false, conditions_i18n: { pt: "PHI for treatment, payment, or healthcare operations" }, scf_controls: ["PRI-01"] },
      { id: "authorization", code: "§164.508", name_i18n: { pt: "Autorização individual", en: "Individual authorization" }, article: "§164.508", applicable_data_types: "all" as const, requires_lia: false, requires_dpia: false, requires_consent_record: true, conditions_i18n: { pt: "Written authorization from individual" }, scf_controls: ["PRI-01", "PRI-03"] },
      { id: "public_health", code: "§164.512(b)", name_i18n: { pt: "Saúde pública", en: "Public health activities" }, article: "§164.512(b)", applicable_data_types: "all" as const, requires_lia: false, requires_dpia: false, requires_consent_record: false, conditions_i18n: { pt: "Public health activities" }, scf_controls: ["PRI-01"] },
    ],

    sensitive_legal_bases: [],

    data_subject_rights: [
      { id: "access", name_i18n: { pt: "Acesso ao PHI" }, article: "§164.524", sla_days: 30, can_be_denied: true, denial_grounds_i18n: { pt: ["psychotherapy notes", "information compiled for legal proceedings"] }, scf_controls: ["PRI-06"] },
      { id: "amendment", name_i18n: { pt: "Emenda ao PHI" }, article: "§164.526", sla_days: 60, can_be_denied: true, denial_grounds_i18n: { pt: ["information is accurate", "not created by covered entity"] }, scf_controls: ["PRI-06"] },
      { id: "accounting", name_i18n: { pt: "Contabilização de divulgações" }, article: "§164.528", sla_days: 60, can_be_denied: false, denial_grounds_i18n: { pt: [] }, scf_controls: ["PRI-06"] },
      { id: "restriction", name_i18n: { pt: "Restrições ao uso" }, article: "§164.522", sla_days: 30, can_be_denied: true, denial_grounds_i18n: { pt: ["not required to agree to restriction"] }, scf_controls: ["PRI-06"] },
      { id: "confidential_comm", name_i18n: { pt: "Comunicações confidenciais" }, article: "§164.522(b)", sla_days: 30, can_be_denied: false, denial_grounds_i18n: { pt: [] }, scf_controls: ["PRI-06"] },
    ],

    dsar_statuses: [
      { id: "received", name_i18n: { pt: "Recebido" }, order: 1, is_terminal: false },
      { id: "in_progress", name_i18n: { pt: "Em processamento" }, order: 2, is_terminal: false },
      { id: "completed", name_i18n: { pt: "Concluído" }, order: 3, is_terminal: true },
      { id: "denied", name_i18n: { pt: "Negado" }, order: 4, is_terminal: true },
    ],

    breach_rules: {
      authority_deadline_hours: 1440,
      authority_name: "HHS / OCR",
      subject_notification: "always" as const,
      required_report_fields: ["description", "phi_types_involved", "unauthorized_access_details", "mitigation_steps", "actions_to_protect"],
      severity_levels: [
        { level: "critical" as const, criteria_i18n: { pt: "500+ individuals affected" }, auth_notify: true, subject_notify: true, response_hours: 1440 },
        { level: "high" as const, criteria_i18n: { pt: "PHI with high sensitivity" }, auth_notify: true, subject_notify: true, response_hours: 1440 },
        { level: "medium" as const, criteria_i18n: { pt: "Limited PHI exposure" }, auth_notify: true, subject_notify: true, response_hours: 1440 },
      ],
      scf_controls: ["IRO-01", "IRO-02", "IRO-09", "PRI-01"],
    },

    breach_statuses: [
      { id: "open", name_i18n: { pt: "Aberto" }, order: 1, is_terminal: false },
      { id: "investigating", name_i18n: { pt: "Em investigação" }, order: 2, is_terminal: false },
      { id: "notified", name_i18n: { pt: "Notificado" }, order: 3, is_terminal: false },
      { id: "closed", name_i18n: { pt: "Encerrado" }, order: 4, is_terminal: true },
    ],

    international_transfer: {
      adequacy_countries: [],
      mechanisms: [
        { id: "baa", name_i18n: { pt: "Business Associate Agreement" }, article: "§164.504(e)", requires_authority_approval: false, scf_controls: ["PRI-09", "TPM-02"] },
      ],
      safeguards: [
        { id: "encryption", name_i18n: { pt: "Encryption per HIPAA Security Rule" }, article: "§164.312(a)(2)(iv)" },
      ],
    },

    dpa_requirements: {
      mandatory: true,
      minimum_clauses_i18n: { pt: ["usos permitidos", "safeguards", "notificação de breach", "requisitos de subcontratação", "devolução ou destruição"] },
      article: "§164.504(e)",
      scf_controls: ["TPM-02", "PRI-09"],
    },

    consent_rules: {
      validity_criteria_i18n: { pt: ["escrito", "específico", "assinado"] },
      children_age_threshold: 18,
      withdrawal_i18n: { pt: "Revogação escrita", en: "Written revocation" },
      article: "§164.508",
      scf_controls: ["PRI-01", "PRI-03"],
      consent_types: [
        { id: "authorization", name_i18n: { pt: "Autorização HIPAA" }, requires_opt_in: true, requires_double_opt_in: false, renewal_months: null },
      ],
      proof_types: [
        { id: "signed_form", name_i18n: { pt: "Formulário assinado" }, legal_strength: "strong" as const, recommended_for: ["authorization"] },
      ],
    },

    dpia_triggers: [],

    penalties: {
      max_fine_pct_revenue: null,
      max_fine_absolute_i18n: { pt: "$2.134.831 per violation category per year (adjusted annually)" },
      other_sanctions_i18n: { pt: ["corrective action plan", "resolution agreement", "exclusion from Medicare/Medicaid"] },
      article: "§1176",
    },
  },
];

const REGULATION_INDEX = new Map(REGULATIONS.map(r => [r.id, r]));

// ── Routes ──────────────────────────────────────────────────────────────────

export const regulationsRoutes: RouteDefinition[] = [
  {
    method: "GET",
    path: "/api/v1/regulations",
    authRequired: true,
    tenantRequired: false,
    handler: async ({ request, traceId }) => {
      const locale = new URL(request.url).searchParams.get("locale") || "pt";
      const summary = REGULATIONS.map(r => ({
        id: r.id, name: r.name, name_en: r.name_en, jurisdiction: r.jurisdiction,
        authority: r.authority, effective_date: r.effective_date, scf_domain: r.scf_domain,
        version: r.version,
        legal_base_count: r.legal_bases.length,
        sensitive_legal_base_count: r.sensitive_legal_bases.length,
        rights_count: r.data_subject_rights.length,
        transfer_mechanism_count: r.international_transfer.mechanisms.length,
        dpia_trigger_count: r.dpia_triggers.length,
      }));
      return json({ data: flattenI18n(summary, locale), trace_id: traceId });
    },
  },
  {
    method: "GET",
    path: "/api/v1/regulations/:regulationId",
    authRequired: true,
    tenantRequired: false,
    handler: async ({ request, params, traceId }) => {
      const locale = new URL(request.url).searchParams.get("locale") || "pt";
      const reg = REGULATION_INDEX.get(routeParam(params, "regulationId"));
      if (!reg) throw new ApiError("NOT_FOUND", `Regulation not found. Available: ${REGULATIONS.map(r => r.id).join(", ")}`, 404);
      return json({ data: flattenI18n(reg, locale), trace_id: traceId });
    },
  },
  {
    method: "GET",
    path: "/api/v1/regulations/:regulationId/legal-bases",
    authRequired: true,
    tenantRequired: false,
    handler: async ({ request, params, traceId }) => {
      const locale = new URL(request.url).searchParams.get("locale") || "pt";
      const reg = REGULATION_INDEX.get(routeParam(params, "regulationId"));
      if (!reg) throw new ApiError("NOT_FOUND", "Regulation not found.", 404);
      const data = { legal_bases: reg.legal_bases, sensitive_legal_bases: reg.sensitive_legal_bases };
      return json({ data: flattenI18n(data, locale), regulation: reg.id, trace_id: traceId });
    },
  },
  {
    method: "GET",
    path: "/api/v1/regulations/:regulationId/rights",
    authRequired: true,
    tenantRequired: false,
    handler: async ({ request, params, traceId }) => {
      const locale = new URL(request.url).searchParams.get("locale") || "pt";
      const reg = REGULATION_INDEX.get(routeParam(params, "regulationId"));
      if (!reg) throw new ApiError("NOT_FOUND", "Regulation not found.", 404);
      return json({ data: flattenI18n(reg.data_subject_rights, locale), regulation: reg.id, trace_id: traceId });
    },
  },
  {
    method: "GET",
    path: "/api/v1/regulations/:regulationId/dsar-statuses",
    authRequired: true,
    tenantRequired: false,
    handler: async ({ request, params, traceId }) => {
      const locale = new URL(request.url).searchParams.get("locale") || "pt";
      const reg = REGULATION_INDEX.get(routeParam(params, "regulationId"));
      if (!reg) throw new ApiError("NOT_FOUND", "Regulation not found.", 404);
      return json({ data: flattenI18n(reg.dsar_statuses, locale), regulation: reg.id, trace_id: traceId });
    },
  },
  {
    method: "GET",
    path: "/api/v1/regulations/:regulationId/breach-rules",
    authRequired: true,
    tenantRequired: false,
    handler: async ({ request, params, traceId }) => {
      const locale = new URL(request.url).searchParams.get("locale") || "pt";
      const reg = REGULATION_INDEX.get(routeParam(params, "regulationId"));
      if (!reg) throw new ApiError("NOT_FOUND", "Regulation not found.", 404);
      return json({ data: flattenI18n(reg.breach_rules, locale), breach_statuses: flattenI18n(reg.breach_statuses, locale), regulation: reg.id, trace_id: traceId });
    },
  },
  {
    method: "GET",
    path: "/api/v1/regulations/:regulationId/transfer-mechanisms",
    authRequired: true,
    tenantRequired: false,
    handler: async ({ request, params, traceId }) => {
      const locale = new URL(request.url).searchParams.get("locale") || "pt";
      const reg = REGULATION_INDEX.get(routeParam(params, "regulationId"));
      if (!reg) throw new ApiError("NOT_FOUND", "Regulation not found.", 404);
      return json({ data: flattenI18n(reg.international_transfer, locale), dpa: flattenI18n(reg.dpa_requirements, locale), regulation: reg.id, trace_id: traceId });
    },
  },
  {
    method: "GET",
    path: "/api/v1/regulations/:regulationId/consent",
    authRequired: true,
    tenantRequired: false,
    handler: async ({ request, params, traceId }) => {
      const locale = new URL(request.url).searchParams.get("locale") || "pt";
      const reg = REGULATION_INDEX.get(routeParam(params, "regulationId"));
      if (!reg) throw new ApiError("NOT_FOUND", "Regulation not found.", 404);
      return json({ data: flattenI18n(reg.consent_rules, locale), regulation: reg.id, trace_id: traceId });
    },
  },
  {
    method: "GET",
    path: "/api/v1/regulations/:regulationId/dpia-triggers",
    authRequired: true,
    tenantRequired: false,
    handler: async ({ request, params, traceId }) => {
      const locale = new URL(request.url).searchParams.get("locale") || "pt";
      const reg = REGULATION_INDEX.get(routeParam(params, "regulationId"));
      if (!reg) throw new ApiError("NOT_FOUND", "Regulation not found.", 404);
      return json({ data: flattenI18n(reg.dpia_triggers, locale), regulation: reg.id, trace_id: traceId });
    },
  },
  {
    method: "GET",
    path: "/api/v1/regulations/:regulationId/penalties",
    authRequired: true,
    tenantRequired: false,
    handler: async ({ request, params, traceId }) => {
      const locale = new URL(request.url).searchParams.get("locale") || "pt";
      const reg = REGULATION_INDEX.get(routeParam(params, "regulationId"));
      if (!reg) throw new ApiError("NOT_FOUND", "Regulation not found.", 404);
      return json({ data: flattenI18n(reg.penalties, locale), regulation: reg.id, trace_id: traceId });
    },
  },
];
