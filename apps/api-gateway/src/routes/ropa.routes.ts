/**
 * CB-E: ROPA Reference Data
 *
 * Dados de referência para inventário de dados pessoais (ROPA).
 * 11 endpoints estáticos com dados de referência para alimentar o módulo Privacy do Standard.
 * Todos linkam ao SCF via scf_controls[].
 */
import type { RouteDefinition } from "../http";
import { json, routeParam, routeUuidParam } from "../http";
import { ApiError } from "../errors/api-error";
import { flattenI18n } from "../utils/i18n";

// ── Data Subjects ───────────────────────────────────────────────────────────

const DATA_SUBJECTS = [
  { id: "employee", name_i18n: { pt: "Empregado", en: "Employee" }, type: "internal" as const, is_minor: false, requires_consent_by_default: false, default_legal_basis: "contract", examples_i18n: { pt: ["CLT", "estagiário registrado"] }, applicable_regulations: ["lgpd", "gdpr"], scf_controls: ["PRI-01", "HRS-01"] },
  { id: "customer", name_i18n: { pt: "Cliente", en: "Customer" }, type: "b2c" as const, is_minor: false, requires_consent_by_default: true, default_legal_basis: "consent", examples_i18n: { pt: ["pessoa física consumidora"] }, applicable_regulations: ["lgpd", "gdpr", "ccpa"], scf_controls: ["PRI-01", "PRI-03"] },
  { id: "candidate", name_i18n: { pt: "Candidato", en: "Candidate" }, type: "external" as const, is_minor: false, requires_consent_by_default: true, default_legal_basis: "consent", examples_i18n: { pt: ["candidato a vaga de emprego"] }, applicable_regulations: ["lgpd", "gdpr"], scf_controls: ["PRI-01", "HRS-01"] },
  { id: "supplier", name_i18n: { pt: "Fornecedor (PF)", en: "Supplier" }, type: "b2b" as const, is_minor: false, requires_consent_by_default: false, default_legal_basis: "contract", examples_i18n: { pt: ["representante comercial PF", "prestador de serviço PF"] }, applicable_regulations: ["lgpd", "gdpr"], scf_controls: ["PRI-01", "TPM-01"] },
  { id: "visitor", name_i18n: { pt: "Visitante", en: "Visitor" }, type: "external" as const, is_minor: false, requires_consent_by_default: true, default_legal_basis: "legitimate_interest", examples_i18n: { pt: ["visitante às instalações", "visitante de website"] }, applicable_regulations: ["lgpd", "gdpr"], scf_controls: ["PRI-01", "PES-01"] },
  { id: "patient", name_i18n: { pt: "Paciente", en: "Patient" }, type: "b2c" as const, is_minor: false, requires_consent_by_default: false, default_legal_basis: "health", examples_i18n: { pt: ["paciente em clínica ou hospital"] }, applicable_regulations: ["lgpd", "gdpr", "hipaa_privacy"], scf_controls: ["PRI-01", "PRI-05"] },
  { id: "student", name_i18n: { pt: "Aluno", en: "Student" }, type: "b2c" as const, is_minor: false, requires_consent_by_default: true, default_legal_basis: "contract", examples_i18n: { pt: ["aluno de instituição de ensino"] }, applicable_regulations: ["lgpd", "gdpr"], scf_controls: ["PRI-01"] },
  { id: "minor", name_i18n: { pt: "Menor de Idade", en: "Minor" }, type: "b2c" as const, is_minor: true, requires_consent_by_default: true, default_legal_basis: "consent", examples_i18n: { pt: ["criança ou adolescente"] }, applicable_regulations: ["lgpd", "gdpr"], scf_controls: ["PRI-01", "PRI-05"] },
  { id: "legal_representative", name_i18n: { pt: "Representante Legal", en: "Legal Representative" }, type: "external" as const, is_minor: false, requires_consent_by_default: false, default_legal_basis: "legitimate_interest", examples_i18n: { pt: ["pai/mãe", "procurador"] }, applicable_regulations: ["lgpd", "gdpr"], scf_controls: ["PRI-01"] },
  { id: "contractor", name_i18n: { pt: "Terceirizado", en: "Contractor" }, type: "internal" as const, is_minor: false, requires_consent_by_default: false, default_legal_basis: "contract", examples_i18n: { pt: ["profissional PJ alocado", "temporário"] }, applicable_regulations: ["lgpd", "gdpr"], scf_controls: ["PRI-01", "TPM-01"] },
  { id: "public_servant", name_i18n: { pt: "Servidor Público", en: "Public Servant" }, type: "internal" as const, is_minor: false, requires_consent_by_default: false, default_legal_basis: "public_administration", examples_i18n: { pt: ["funcionário de órgão público"] }, applicable_regulations: ["lgpd"], scf_controls: ["PRI-01"] },
];

const DATA_CATEGORIES = [
  { id: "identification", name_i18n: { pt: "Identificação", en: "Identification" }, sensitivity: "normal" as const, keywords_i18n: { pt: ["nome", "CPF", "RG", "passaporte", "CNH"] }, article_by_regulation: [{ regulation_id: "lgpd", article: "Art. 5°, I", extra_legal_basis_required: false, extra_requirement_i18n: { pt: "" } }], examples_i18n: { pt: ["nome completo", "CPF", "RG"] }, scf_controls: ["DCH-01", "PRI-01"], retention_rules: [{ context_i18n: { pt: "Relação trabalhista" }, min_years: 5, max_years: 30, legal_basis: "CLT Art. 11", jurisdiction: "BR" }], auto_triggers: [] },
  { id: "contact", name_i18n: { pt: "Contato", en: "Contact" }, sensitivity: "normal" as const, keywords_i18n: { pt: ["email", "telefone", "endereço", "celular"] }, article_by_regulation: [{ regulation_id: "lgpd", article: "Art. 5°, I", extra_legal_basis_required: false, extra_requirement_i18n: { pt: "" } }], examples_i18n: { pt: ["email", "telefone", "endereço residencial"] }, scf_controls: ["DCH-01", "PRI-01"], retention_rules: [{ context_i18n: { pt: "Marketing" }, min_years: 0, max_years: null, legal_basis: "Até revogação do consentimento", jurisdiction: "BR" }], auto_triggers: [] },
  { id: "financial", name_i18n: { pt: "Financeiro", en: "Financial" }, sensitivity: "normal" as const, keywords_i18n: { pt: ["conta bancária", "cartão", "renda", "salário"] }, article_by_regulation: [{ regulation_id: "lgpd", article: "Art. 5°, I", extra_legal_basis_required: false, extra_requirement_i18n: { pt: "" } }], examples_i18n: { pt: ["conta bancária", "cartão de crédito"] }, scf_controls: ["DCH-01", "CRY-01", "PRI-01"], retention_rules: [{ context_i18n: { pt: "Fiscal" }, min_years: 5, max_years: 10, legal_basis: "CTN Art. 173", jurisdiction: "BR" }], auto_triggers: [] },
  { id: "health", name_i18n: { pt: "Saúde", en: "Health" }, sensitivity: "special" as const, keywords_i18n: { pt: ["prontuário", "diagnóstico", "exame", "prescrição", "CID"] }, article_by_regulation: [{ regulation_id: "lgpd", article: "Art. 11", extra_legal_basis_required: true, extra_requirement_i18n: { pt: "Base legal do Art. 11 obrigatória" } }, { regulation_id: "hipaa_privacy", article: "§160.103", extra_legal_basis_required: true, extra_requirement_i18n: { pt: "PHI rules apply" } }], examples_i18n: { pt: ["prontuário médico", "diagnóstico", "exames"] }, scf_controls: ["DCH-01", "CRY-01", "PRI-05"], retention_rules: [{ context_i18n: { pt: "Prontuário médico" }, min_years: 20, max_years: null, legal_basis: "CFM Res. 1821/07", jurisdiction: "BR" }], auto_triggers: [{ trigger: "dpia_required", condition_i18n: { pt: "Dados de saúde em larga escala" } }] },
  { id: "biometric", name_i18n: { pt: "Biométrico", en: "Biometric" }, sensitivity: "special" as const, keywords_i18n: { pt: ["impressão digital", "facial", "íris", "voz"] }, article_by_regulation: [{ regulation_id: "lgpd", article: "Art. 11", extra_legal_basis_required: true, extra_requirement_i18n: { pt: "Consentimento específico e destacado" } }], examples_i18n: { pt: ["impressão digital", "reconhecimento facial"] }, scf_controls: ["DCH-01", "CRY-01", "IAC-15"], retention_rules: [{ context_i18n: { pt: "Controle de acesso" }, min_years: 0, max_years: 5, legal_basis: "Duração contratual", jurisdiction: "BR" }], auto_triggers: [{ trigger: "dpia_required", condition_i18n: { pt: "Tratamento de biometria" } }] },
  { id: "genetic", name_i18n: { pt: "Genético", en: "Genetic" }, sensitivity: "special" as const, keywords_i18n: { pt: ["DNA", "genoma", "sequenciamento"] }, article_by_regulation: [{ regulation_id: "lgpd", article: "Art. 11", extra_legal_basis_required: true, extra_requirement_i18n: { pt: "" } }, { regulation_id: "gdpr", article: "Art. 9", extra_legal_basis_required: true, extra_requirement_i18n: { pt: "" } }], examples_i18n: { pt: ["sequenciamento genético", "teste de paternidade"] }, scf_controls: ["DCH-01", "CRY-01", "PRI-05"], retention_rules: [], auto_triggers: [{ trigger: "dpia_required", condition_i18n: { pt: "Dados genéticos" } }] },
  { id: "political", name_i18n: { pt: "Opinião Política", en: "Political Opinion" }, sensitivity: "special" as const, keywords_i18n: { pt: ["partido", "filiação", "ideologia"] }, article_by_regulation: [{ regulation_id: "lgpd", article: "Art. 11", extra_legal_basis_required: true, extra_requirement_i18n: { pt: "" } }], examples_i18n: { pt: ["filiação partidária"] }, scf_controls: ["DCH-01", "PRI-05"], retention_rules: [], auto_triggers: [] },
  { id: "religious", name_i18n: { pt: "Convicção Religiosa", en: "Religious Belief" }, sensitivity: "special" as const, keywords_i18n: { pt: ["religião", "crença", "fé"] }, article_by_regulation: [{ regulation_id: "lgpd", article: "Art. 11", extra_legal_basis_required: true, extra_requirement_i18n: { pt: "" } }], examples_i18n: { pt: ["religião", "crenças filosóficas"] }, scf_controls: ["DCH-01", "PRI-05"], retention_rules: [], auto_triggers: [] },
  { id: "sexual", name_i18n: { pt: "Vida Sexual / Orientação", en: "Sexual Life / Orientation" }, sensitivity: "special" as const, keywords_i18n: { pt: ["orientação sexual", "vida sexual"] }, article_by_regulation: [{ regulation_id: "lgpd", article: "Art. 11", extra_legal_basis_required: true, extra_requirement_i18n: { pt: "" } }], examples_i18n: { pt: ["orientação sexual"] }, scf_controls: ["DCH-01", "PRI-05"], retention_rules: [], auto_triggers: [] },
  { id: "ethnic", name_i18n: { pt: "Origem Racial/Étnica", en: "Racial/Ethnic Origin" }, sensitivity: "special" as const, keywords_i18n: { pt: ["raça", "etnia", "cor"] }, article_by_regulation: [{ regulation_id: "lgpd", article: "Art. 11", extra_legal_basis_required: true, extra_requirement_i18n: { pt: "" } }], examples_i18n: { pt: ["raça", "etnia"] }, scf_controls: ["DCH-01", "PRI-05"], retention_rules: [], auto_triggers: [] },
  { id: "criminal", name_i18n: { pt: "Dados Criminais", en: "Criminal Data" }, sensitivity: "criminal" as const, keywords_i18n: { pt: ["antecedentes", "condenação", "processo criminal"] }, article_by_regulation: [{ regulation_id: "lgpd", article: "Art. 11", extra_legal_basis_required: true, extra_requirement_i18n: { pt: "" } }, { regulation_id: "gdpr", article: "Art. 10", extra_legal_basis_required: true, extra_requirement_i18n: { pt: "Somente sob controle de autoridade oficial" } }], examples_i18n: { pt: ["antecedentes criminais", "condenações"] }, scf_controls: ["DCH-01", "HRS-04"], retention_rules: [{ context_i18n: { pt: "Background check" }, min_years: 0, max_years: 2, legal_basis: "Duração do processo seletivo/contrato", jurisdiction: "BR" }], auto_triggers: [] },
  { id: "children", name_i18n: { pt: "Dados de Crianças", en: "Children's Data" }, sensitivity: "special" as const, keywords_i18n: { pt: ["menor", "criança", "adolescente"] }, article_by_regulation: [{ regulation_id: "lgpd", article: "Art. 14", extra_legal_basis_required: true, extra_requirement_i18n: { pt: "Consentimento de responsável legal" } }], examples_i18n: { pt: ["dados de menores de 12 anos"] }, scf_controls: ["DCH-01", "PRI-05"], retention_rules: [], auto_triggers: [{ trigger: "dpia_required", condition_i18n: { pt: "Tratamento de dados de menores" } }] },
  { id: "behavioral", name_i18n: { pt: "Comportamental", en: "Behavioral" }, sensitivity: "normal" as const, keywords_i18n: { pt: ["navegação", "cookies", "preferências", "click"] }, article_by_regulation: [{ regulation_id: "lgpd", article: "Art. 12, §2°", extra_legal_basis_required: false, extra_requirement_i18n: { pt: "" } }], examples_i18n: { pt: ["histórico de navegação", "compras"] }, scf_controls: ["DCH-01", "PRI-01"], retention_rules: [{ context_i18n: { pt: "Analytics" }, min_years: 0, max_years: 2, legal_basis: "Consentimento ou anonimização", jurisdiction: "BR" }], auto_triggers: [{ trigger: "profiling_check", condition_i18n: { pt: "Pode configurar profiling" } }] },
  { id: "geolocation", name_i18n: { pt: "Geolocalização", en: "Geolocation" }, sensitivity: "normal" as const, keywords_i18n: { pt: ["GPS", "IP", "localização", "coordenadas"] }, article_by_regulation: [{ regulation_id: "lgpd", article: "Art. 12, §2°", extra_legal_basis_required: false, extra_requirement_i18n: { pt: "" } }], examples_i18n: { pt: ["GPS", "endereço IP"] }, scf_controls: ["DCH-01", "PRI-01"], retention_rules: [{ context_i18n: { pt: "Fleet management" }, min_years: 1, max_years: 3, legal_basis: "Obrigação contratual", jurisdiction: "BR" }], auto_triggers: [{ trigger: "dpia_check", condition_i18n: { pt: "Monitoramento sistemático" } }] },
  { id: "professional", name_i18n: { pt: "Profissional", en: "Professional" }, sensitivity: "normal" as const, keywords_i18n: { pt: ["cargo", "empresa anterior", "currículo"] }, article_by_regulation: [{ regulation_id: "lgpd", article: "Art. 5°, I", extra_legal_basis_required: false, extra_requirement_i18n: { pt: "" } }], examples_i18n: { pt: ["cargo", "empresa", "experiência"] }, scf_controls: ["DCH-01", "HRS-01"], retention_rules: [{ context_i18n: { pt: "Recrutamento" }, min_years: 0, max_years: 2, legal_basis: "Consentimento", jurisdiction: "BR" }], auto_triggers: [] },
  { id: "image", name_i18n: { pt: "Imagem/Foto", en: "Image/Photo" }, sensitivity: "normal" as const, keywords_i18n: { pt: ["foto", "imagem", "vídeo", "CFTV"] }, article_by_regulation: [{ regulation_id: "lgpd", article: "Art. 5°, I", extra_legal_basis_required: false, extra_requirement_i18n: { pt: "" } }], examples_i18n: { pt: ["foto de documento", "gravação CFTV"] }, scf_controls: ["DCH-01", "PES-01"], retention_rules: [{ context_i18n: { pt: "CFTV" }, min_years: 0, max_years: 1, legal_basis: "Legítimo interesse", jurisdiction: "BR" }], auto_triggers: [] },
  { id: "education", name_i18n: { pt: "Educacional", en: "Educational" }, sensitivity: "normal" as const, keywords_i18n: { pt: ["diploma", "certificado", "escolaridade"] }, article_by_regulation: [{ regulation_id: "lgpd", article: "Art. 5°, I", extra_legal_basis_required: false, extra_requirement_i18n: { pt: "" } }], examples_i18n: { pt: ["diploma", "histórico escolar"] }, scf_controls: ["DCH-01", "HRS-01"], retention_rules: [{ context_i18n: { pt: "Emprego" }, min_years: 5, max_years: 30, legal_basis: "CLT", jurisdiction: "BR" }], auto_triggers: [] },
  { id: "union", name_i18n: { pt: "Filiação Sindical", en: "Trade Union" }, sensitivity: "special" as const, keywords_i18n: { pt: ["sindicato", "filiação sindical"] }, article_by_regulation: [{ regulation_id: "lgpd", article: "Art. 11", extra_legal_basis_required: true, extra_requirement_i18n: { pt: "" } }, { regulation_id: "gdpr", article: "Art. 9", extra_legal_basis_required: true, extra_requirement_i18n: { pt: "" } }], examples_i18n: { pt: ["associação sindical"] }, scf_controls: ["DCH-01", "PRI-05"], retention_rules: [], auto_triggers: [] },
  { id: "judicial", name_i18n: { pt: "Dados Judiciais", en: "Judicial Data" }, sensitivity: "normal" as const, keywords_i18n: { pt: ["processo", "ação judicial", "litígio"] }, article_by_regulation: [{ regulation_id: "lgpd", article: "Art. 7°, VI", extra_legal_basis_required: false, extra_requirement_i18n: { pt: "" } }], examples_i18n: { pt: ["processos judiciais", "ações trabalhistas"] }, scf_controls: ["DCH-01"], retention_rules: [{ context_i18n: { pt: "Prescrição" }, min_years: 5, max_years: 20, legal_basis: "CC Art. 205/206", jurisdiction: "BR" }], auto_triggers: [] },
  { id: "voice", name_i18n: { pt: "Voz", en: "Voice" }, sensitivity: "normal" as const, keywords_i18n: { pt: ["gravação", "voz", "call center"] }, article_by_regulation: [{ regulation_id: "lgpd", article: "Art. 5°, I", extra_legal_basis_required: false, extra_requirement_i18n: { pt: "" } }], examples_i18n: { pt: ["gravação de call center", "mensagem de voz"] }, scf_controls: ["DCH-01", "PRI-01"], retention_rules: [{ context_i18n: { pt: "Call center" }, min_years: 0, max_years: 5, legal_basis: "Regulação setorial", jurisdiction: "BR" }], auto_triggers: [] },
];

// ── Life Cycle Stages ───────────────────────────────────────────────────────

const LIFE_CYCLE_STAGES = [
  { id: "collection", name_i18n: { pt: "Coleta" }, order: 1, description_i18n: { pt: "Obtenção dos dados pessoais junto ao titular ou terceiros" }, scf_controls: ["PRI-01", "PRI-03"], gdpr_article: "Art. 13-14", lgpd_article: "Art. 7" },
  { id: "processing", name_i18n: { pt: "Processamento" }, order: 2, description_i18n: { pt: "Operações realizadas sobre os dados (classificação, análise, etc.)" }, scf_controls: ["PRI-01", "DCH-01"], gdpr_article: "Art. 5(1)(b)", lgpd_article: "Art. 6" },
  { id: "storage", name_i18n: { pt: "Armazenamento" }, order: 3, description_i18n: { pt: "Guarda dos dados em meio físico ou digital" }, scf_controls: ["DCH-01", "CRY-01", "CRY-09"], gdpr_article: "Art. 5(1)(e)", lgpd_article: "Art. 6, VII" },
  { id: "sharing", name_i18n: { pt: "Compartilhamento" }, order: 4, description_i18n: { pt: "Transmissão a terceiros internos ou externos" }, scf_controls: ["PRI-03", "TPM-01", "DCH-01"], gdpr_article: "Art. 26-28", lgpd_article: "Art. 26-27" },
  { id: "archiving", name_i18n: { pt: "Arquivamento" }, order: 5, description_i18n: { pt: "Guarda prolongada após encerramento da finalidade primária" }, scf_controls: ["DCH-17", "PRI-01"], gdpr_article: "Art. 5(1)(e)", lgpd_article: "Art. 16" },
  { id: "disposal", name_i18n: { pt: "Eliminação" }, order: 6, description_i18n: { pt: "Destruição dos dados ao fim do período de retenção" }, scf_controls: ["DCH-17", "DCH-18"], gdpr_article: "Art. 17", lgpd_article: "Art. 16" },
];

// ── Data Origins ────────────────────────────────────────────────────────────

const DATA_ORIGINS = [
  { id: "direct_collection", name_i18n: { pt: "Coleta Direta", en: "Direct Collection" }, requires_consent: true, gdpr_article: "Art. 13", lgpd_article: "Art. 9" },
  { id: "indirect_collection", name_i18n: { pt: "Coleta Indireta", en: "Indirect Collection" }, requires_consent: false, gdpr_article: "Art. 14", lgpd_article: "Art. 10" },
  { id: "public_source", name_i18n: { pt: "Dados Públicos", en: "Public Data" }, requires_consent: false, gdpr_article: "Art. 9(2)(e)", lgpd_article: "Art. 7, §4°" },
  { id: "sharing_from_partner", name_i18n: { pt: "Compartilhamento por Parceiro", en: "Partner Sharing" }, requires_consent: false, gdpr_article: "Art. 26", lgpd_article: "Art. 7, §5°" },
];

// ── Collection Methods ──────────────────────────────────────────────────────

const COLLECTION_METHODS = [
  { id: "web_form", name_i18n: { pt: "Formulário Web" }, security_controls: ["PRI-01", "NET-01"] },
  { id: "mobile_app", name_i18n: { pt: "Aplicativo Móvel" }, security_controls: ["PRI-01", "NET-01", "CRY-01"] },
  { id: "paper_form", name_i18n: { pt: "Formulário Físico" }, security_controls: ["PES-01", "DCH-01"] },
  { id: "phone_call", name_i18n: { pt: "Chamada Telefônica" }, security_controls: ["PRI-01"] },
  { id: "face_to_face", name_i18n: { pt: "Atendimento Presencial" }, security_controls: ["PES-01"] },
  { id: "api_integration", name_i18n: { pt: "Integração via API" }, security_controls: ["IAC-01", "NET-01", "CRY-01"] },
  { id: "iot_device", name_i18n: { pt: "Dispositivo IoT" }, security_controls: ["CRY-01", "NET-01"] },
];

// ── Processing Purposes ─────────────────────────────────────────────────────

const PROCESSING_PURPOSES = [
  { id: "payroll", name_i18n: { pt: "Gestão de Folha de Pagamento", en: "Payroll Management" }, category: "hr", typical_retention_i18n: { pt: "30 anos (FGTS)", en: "30 years (FGTS)" }, legal_basis: "legal_obligation", examples_i18n: { pt: ["cálculo de salário", "pagamento de impostos"], en: ["salary calculation", "tax payment"] } },
  { id: "marketing_direct", name_i18n: { pt: "Marketing Direto", en: "Direct Marketing" }, category: "marketing", typical_retention_i18n: { pt: "Até revogação", en: "Until revocation" }, legal_basis: "consent", examples_i18n: { pt: ["envio de newsletter", "oferta de produtos"], en: ["newsletter sending", "product offers"] } },
  { id: "fraud_prevention", name_i18n: { pt: "Prevenção à Fraude", en: "Fraud Prevention" }, category: "security", typical_retention_i18n: { pt: "5 anos", en: "5 years" }, legal_basis: "legitimate_interest", examples_i18n: { pt: ["análise de comportamento de compra", "verificação de identidade"], en: ["purchase behavior analysis", "identity verification"] } },
  { id: "customer_support", name_i18n: { pt: "Suporte ao Cliente", en: "Customer Support" }, category: "operations", typical_retention_i18n: { pt: "5 anos", en: "5 years" }, legal_basis: "contract", examples_i18n: { pt: ["atendimento de chamados", "resolução de dúvidas"], en: ["ticket handling", "doubt resolution"] } },
];

// ── Security Measures ───────────────────────────────────────────────────────

const SECURITY_MEASURES = [
  { id: "encryption_in_transit", name_i18n: { pt: "Criptografia em trânsito (TLS)", en: "Encryption in transit (TLS)" }, category: "technical" as const, scf_controls: ["CRY-03"], applicable_data_categories: ["all"], priority_for_sensitive: "mandatory" as const, priority_for_normal: "mandatory" as const },
  { id: "access_control", name_i18n: { pt: "Controle de acesso lógico", en: "Logical access control" }, category: "technical" as const, scf_controls: ["IAC-06", "IAC-15"], applicable_data_categories: ["all"], priority_for_sensitive: "mandatory" as const, priority_for_normal: "mandatory" as const },
  { id: "audit_logging", name_i18n: { pt: "Registro de auditoria", en: "Audit logging" }, category: "technical" as const, scf_controls: ["MON-01", "AIS-01"], applicable_data_categories: ["all"], priority_for_sensitive: "mandatory" as const, priority_for_normal: "recommended" as const },
  { id: "data_masking", name_i18n: { pt: "Mascaramento de dados", en: "Data masking" }, category: "technical" as const, scf_controls: ["DCH-01", "CRY-01"], applicable_data_categories: ["health", "financial", "criminal"], priority_for_sensitive: "mandatory" as const, priority_for_normal: "optional" as const },
  { id: "dlp", name_i18n: { pt: "Prevenção contra vazamento (DLP)", en: "Data Leak Prevention (DLP)" }, category: "technical" as const, scf_controls: ["DLP-01"], applicable_data_categories: ["all"], priority_for_sensitive: "mandatory" as const, priority_for_normal: "recommended" as const },
  { id: "backup", name_i18n: { pt: "Backup com teste de restore", en: "Backup with restore test" }, category: "technical" as const, scf_controls: ["BCD-01", "BCD-04"], applicable_data_categories: ["all"], priority_for_sensitive: "mandatory" as const, priority_for_normal: "mandatory" as const },
  { id: "anonymization", name_i18n: { pt: "Anonimização/Pseudonimização", en: "Anonymization/Pseudonymization" }, category: "technical" as const, scf_controls: ["PRI-01"], applicable_data_categories: ["health", "behavioral", "geolocation"], priority_for_sensitive: "recommended" as const, priority_for_normal: "optional" as const },
  { id: "privacy_policy", name_i18n: { pt: "Política de privacidade", en: "Privacy policy" }, category: "organizational" as const, scf_controls: ["GOV-02", "PRI-01"], applicable_data_categories: ["all"], priority_for_sensitive: "mandatory" as const, priority_for_normal: "mandatory" as const },
  { id: "training", name_i18n: { pt: "Treinamento de conscientização", en: "Awareness training" }, category: "organizational" as const, scf_controls: ["SAT-01", "SAT-03"], applicable_data_categories: ["all"], priority_for_sensitive: "mandatory" as const, priority_for_normal: "recommended" as const },
  { id: "nda", name_i18n: { pt: "Acordo de confidencialidade (NDA)", en: "Non-Disclosure Agreement (NDA)" }, category: "organizational" as const, scf_controls: ["HRS-05"], applicable_data_categories: ["all"], priority_for_sensitive: "mandatory" as const, priority_for_normal: "recommended" as const },
  { id: "physical_access", name_i18n: { pt: "Controle de acesso físico", en: "Physical access control" }, category: "physical" as const, scf_controls: ["PES-01", "PES-02"], applicable_data_categories: ["all"], priority_for_sensitive: "mandatory" as const, priority_for_normal: "recommended" as const },
  { id: "clean_desk", name_i18n: { pt: "Política de mesa limpa", en: "Clean desk policy" }, category: "physical" as const, scf_controls: ["PES-06"], applicable_data_categories: ["all"], priority_for_sensitive: "recommended" as const, priority_for_normal: "optional" as const },
];

// ── Disposal Methods ────────────────────────────────────────────────────────

const DISPOSAL_METHODS = [
  { id: "secure_delete", name_i18n: { pt: "Exclusão segura (wipe)", en: "Secure delete (wipe)" }, description_i18n: { pt: "Sobrescrita de dados em mídia digital com algoritmo certificado", en: "Overwriting data on digital media with a certified algorithm" }, applicable_to: "digital" as const, scf_controls: ["DCH-17", "DCH-18"], lgpd_article: "Art. 16" },
  { id: "crypto_shred", name_i18n: { pt: "Crypto shredding", en: "Crypto shredding" }, description_i18n: { pt: "Destruição da chave de criptografia tornando dados irrecuperáveis", en: "Destruction of the encryption key making data unrecoverable" }, applicable_to: "digital" as const, scf_controls: ["CRY-01", "DCH-17"], lgpd_article: "Art. 16" },
  { id: "physical_destruction", name_i18n: { pt: "Destruição física", en: "Physical destruction" }, description_i18n: { pt: "Trituração, desmagnetização ou incineração de mídia", en: "Shredding, degaussing or incineration of media" }, applicable_to: "both" as const, scf_controls: ["DCH-17", "DCH-18"], lgpd_article: "Art. 16" },
  { id: "anonymization", name_i18n: { pt: "Anonimização", en: "Anonymization" }, description_i18n: { pt: "Tornar impossível a identificação do titular (irreversível)", en: "Making identification of the subject impossible (irreversible)" }, applicable_to: "digital" as const, scf_controls: ["PRI-01", "DCH-17"], lgpd_article: "Art. 12, §1°" },
  { id: "paper_shredding", name_i18n: { pt: "Trituração de papel", en: "Paper shredding" }, description_i18n: { pt: "Destruição de documentos físicos em fragmentadora", en: "Destruction of physical documents in a shredder" }, applicable_to: "physical" as const, scf_controls: ["DCH-18"], lgpd_article: "Art. 16" },
];

// ── Risk Factors ────────────────────────────────────────────────────────────

const RISK_FACTORS = [
  { id: "sensitive_data", name_i18n: { pt: "Dados sensíveis", en: "Sensitive data" }, description_i18n: { pt: "Tratamento envolve dados de categorias especiais", en: "Processing involves special categories of data" }, weight: 3, triggers_dpia: true, triggers_lia: false, regulation_ref: "LGPD Art. 11 / GDPR Art. 9", detection_rule: "data_categories.sensitivity == 'special'", scf_controls: ["PRI-05", "DCH-01"] },
  { id: "large_scale", name_i18n: { pt: "Larga escala", en: "Large scale" }, description_i18n: { pt: "Volume significativo de titulares ou registros", en: "Significant volume of data subjects or records" }, weight: 3, triggers_dpia: true, triggers_lia: false, regulation_ref: "GDPR Art. 35(3)(b)", detection_rule: "data_volume IN ('high', 'very_high')", scf_controls: ["PRI-05"] },
  { id: "minors", name_i18n: { pt: "Dados de menores", en: "Minors' data" }, description_i18n: { pt: "Tratamento envolve dados de crianças/adolescentes", en: "Processing involves data of children/adolescents" }, weight: 3, triggers_dpia: true, triggers_lia: false, regulation_ref: "LGPD Art. 14", detection_rule: "data_subjects CONTAINS 'minor'", scf_controls: ["PRI-05", "PRI-01"] },
  { id: "systematic_monitoring", name_i18n: { pt: "Monitoramento sistemático", en: "Systematic monitoring" }, description_i18n: { pt: "Observação contínua e sistemática de titulares", en: "Continuous and systematic observation of data subjects" }, weight: 3, triggers_dpia: true, triggers_lia: false, regulation_ref: "GDPR Art. 35(3)(c)", detection_rule: null, scf_controls: ["PRI-05", "MON-01"] },
  { id: "automated_decision", name_i18n: { pt: "Decisão automatizada", en: "Automated decision" }, description_i18n: { pt: "Decisões com efeitos legais baseadas em tratamento automatizado", en: "Decisions with legal effects based on automated processing" }, weight: 3, triggers_dpia: true, triggers_lia: false, regulation_ref: "LGPD Art. 20 / GDPR Art. 22", detection_rule: "automated_decision == true", scf_controls: ["PRI-05", "PRI-01"] },
  { id: "profiling", name_i18n: { pt: "Profiling", en: "Profiling" }, description_i18n: { pt: "Análise de aspectos pessoais para prever comportamento", en: "Analysis of personal aspects to predict behavior" }, weight: 2, triggers_dpia: true, triggers_lia: false, regulation_ref: "GDPR Art. 35(3)(a)", detection_rule: "profiling == true", scf_controls: ["PRI-05"] },
  { id: "biometric_usage", name_i18n: { pt: "Uso de biometria", en: "Biometric usage" }, description_i18n: { pt: "Tratamento de dados biométricos para identificação", en: "Processing of biometric data for identification" }, weight: 2, triggers_dpia: true, triggers_lia: false, regulation_ref: "LGPD Art. 11 / GDPR Art. 9", detection_rule: "data_categories CONTAINS 'biometric'", scf_controls: ["PRI-05", "IAC-15"] },
  { id: "geolocation_usage", name_i18n: { pt: "Uso de geolocalização", en: "Geolocation usage" }, description_i18n: { pt: "Rastreamento de localização de titulares", en: "Tracking of data subjects' location" }, weight: 2, triggers_dpia: true, triggers_lia: false, regulation_ref: "GDPR Recital 75", detection_rule: "data_categories CONTAINS 'geolocation'", scf_controls: ["PRI-05"] },
  { id: "combined_datasets", name_i18n: { pt: "Combinação de bases de dados", en: "Combination of databases" }, description_i18n: { pt: "Cruzamento de dados de diferentes fontes", en: "Crossing data from different sources" }, weight: 1, triggers_dpia: false, triggers_lia: false, regulation_ref: "WP29 Guidelines", detection_rule: null, scf_controls: ["PRI-05", "DCH-01"] },
  { id: "health_data_volume", name_i18n: { pt: "Dados de saúde em volume", en: "Health data in volume" }, description_i18n: { pt: "Tratamento de dados de saúde em escala não individual", en: "Processing of health data on a non-individual scale" }, weight: 3, triggers_dpia: true, triggers_lia: false, regulation_ref: "LGPD Art. 11 + Art. 38", detection_rule: "data_categories CONTAINS 'health' AND data_volume != 'low'", scf_controls: ["PRI-05"] },
  { id: "transfer_no_adequacy", name_i18n: { pt: "Transferência sem adequação", en: "Transfer without adequacy" }, description_i18n: { pt: "Transferência internacional para país sem decisão de adequação", en: "International transfer to a country without an adequacy decision" }, weight: 2, triggers_dpia: false, triggers_lia: false, regulation_ref: "LGPD Art. 33 / GDPR Art. 44-49", detection_rule: "international_transfer AND NOT adequacy_decision", scf_controls: ["PRI-09"] },
  { id: "legitimate_interest", name_i18n: { pt: "Legítimo interesse", en: "Legitimate interest" }, description_i18n: { pt: "Tratamento baseado em legítimo interesse do controlador", en: "Processing based on legitimate interest of the controller" }, weight: 0, triggers_dpia: false, triggers_lia: true, regulation_ref: "LGPD Art. 10, §3° / GDPR Art. 6(1)(f)", detection_rule: "legal_basis == 'legitimate_interest'", scf_controls: ["PRI-01"] },
  { id: "new_technology", name_i18n: { pt: "Nova tecnologia", en: "New technology" }, description_i18n: { pt: "Uso de tecnologia emergente no tratamento", en: "Use of emerging technology in processing" }, weight: 2, triggers_dpia: true, triggers_lia: false, regulation_ref: "GDPR Art. 35(1)", detection_rule: null, scf_controls: ["PRI-05"] },
];

// ── Volume Scale ────────────────────────────────────────────────────────────

const VOLUME_SCALE = [
  { id: "very_low", label_i18n: { pt: "Muito Baixo", en: "Very Low" }, max_records: 100, risk_contribution: 0 },
  { id: "low", label_i18n: { pt: "Baixo", en: "Low" }, max_records: 1000, risk_contribution: 1 },
  { id: "medium", label_i18n: { pt: "Médio", en: "Medium" }, max_records: 10000, risk_contribution: 2 },
  { id: "high", label_i18n: { pt: "Alto", en: "High" }, max_records: 100000, risk_contribution: 3 },
  { id: "very_high", label_i18n: { pt: "Muito Alto", en: "Very High" }, max_records: Number.MAX_SAFE_INTEGER, risk_contribution: 4 },
];

// ── Routes ──────────────────────────────────────────────────────────────────

export const ropaRoutes: RouteDefinition[] = [
  {
    method: "GET", path: "/api/v1/ropa/data-subjects",
    authRequired: true, tenantRequired: false,
    handler: async ({ request, traceId }) => {
      const locale = (new URL(request.url).searchParams.get("locale") || "pt") as any;
      return json({ data: flattenI18n(DATA_SUBJECTS, locale), total: DATA_SUBJECTS.length, trace_id: traceId });
    },
  },
  {
    method: "GET", path: "/api/v1/ropa/data-categories",
    authRequired: true, tenantRequired: false,
    handler: async ({ request, traceId }) => {
      const locale = (new URL(request.url).searchParams.get("locale") || "pt") as any;
      const url = new URL(request.url);
      const sensitivity = url.searchParams.get("sensitivity");
      let filtered = DATA_CATEGORIES;
      if (sensitivity) filtered = filtered.filter(c => c.sensitivity === sensitivity);
      return json({ data: flattenI18n(filtered, locale), total: filtered.length, trace_id: traceId });
    },
  },
  {
    method: "GET", path: "/api/v1/ropa/life-cycle-stages",
    authRequired: true, tenantRequired: false,
    handler: async ({ request, traceId }) => {
      const locale = (new URL(request.url).searchParams.get("locale") || "pt") as any;
      return json({ data: flattenI18n(LIFE_CYCLE_STAGES, locale), trace_id: traceId });
    },
  },
  {
    method: "GET", path: "/api/v1/ropa/data-origins",
    authRequired: true, tenantRequired: false,
    handler: async ({ request, traceId }) => {
      const locale = (new URL(request.url).searchParams.get("locale") || "pt") as any;
      return json({ data: flattenI18n(DATA_ORIGINS, locale), trace_id: traceId });
    },
  },
  {
    method: "GET", path: "/api/v1/ropa/collection-methods",
    authRequired: true, tenantRequired: false,
    handler: async ({ request, traceId }) => {
      const locale = (new URL(request.url).searchParams.get("locale") || "pt") as any;
      return json({ data: flattenI18n(COLLECTION_METHODS, locale), trace_id: traceId });
    },
  },
  {
    method: "GET", path: "/api/v1/ropa/processing-purposes",
    authRequired: true, tenantRequired: false,
    handler: async ({ request, traceId }) => {
      const locale = (new URL(request.url).searchParams.get("locale") || "pt") as any;
      const url = new URL(request.url);
      const category = url.searchParams.get("category");
      let filtered = PROCESSING_PURPOSES;
      if (category) filtered = filtered.filter(p => p.category === category);
      return json({ data: flattenI18n(filtered, locale), total: filtered.length, trace_id: traceId });
    },
  },
  {
    method: "GET", path: "/api/v1/ropa/retention-rules",
    authRequired: true, tenantRequired: false,
    handler: async ({ request, traceId }) => {
      const locale = (new URL(request.url).searchParams.get("locale") || "pt") as any;
      const url = new URL(request.url);
      const categoryId = url.searchParams.get("category");
      const allRules = DATA_CATEGORIES.flatMap(c => c.retention_rules.map(r => ({ data_category_id: c.id, data_category_name_i18n: c.name_i18n, ...r })));
      const filtered = categoryId ? allRules.filter(r => r.data_category_id === categoryId) : allRules;
      return json({ data: flattenI18n(filtered, locale), total: filtered.length, trace_id: traceId });
    },
  },
  {
    method: "GET", path: "/api/v1/ropa/security-measures",
    authRequired: true, tenantRequired: false,
    handler: async ({ request, traceId }) => {
      const locale = (new URL(request.url).searchParams.get("locale") || "pt") as any;
      const url = new URL(request.url);
      const sensitivity = url.searchParams.get("sensitivity");
      let filtered = SECURITY_MEASURES;
      if (sensitivity === "special") filtered = filtered.filter(m => m.priority_for_sensitive === "mandatory");
      return json({ data: flattenI18n(filtered, locale), total: filtered.length, trace_id: traceId });
    },
  },
  {
    method: "GET", path: "/api/v1/ropa/disposal-methods",
    authRequired: true, tenantRequired: false,
    handler: async ({ request, traceId }) => {
      const locale = (new URL(request.url).searchParams.get("locale") || "pt") as any;
      return json({ data: flattenI18n(DISPOSAL_METHODS, locale), trace_id: traceId });
    },
  },
  {
    method: "GET", path: "/api/v1/ropa/risk-factors",
    authRequired: true, tenantRequired: false,
    handler: async ({ request, traceId }) => {
      const locale = (new URL(request.url).searchParams.get("locale") || "pt") as any;
      return json({ data: flattenI18n(RISK_FACTORS, locale), total: RISK_FACTORS.length, dpia_threshold: 8, dpia_rule: "risk_score = Σ(weight × present). Se >= 8 → DPIA obrigatório", trace_id: traceId });
    },
  },
  {
    method: "GET", path: "/api/v1/ropa/volume-scale",
    authRequired: true, tenantRequired: false,
    handler: async ({ request, traceId }) => {
      const locale = (new URL(request.url).searchParams.get("locale") || "pt") as any;
      return json({ data: flattenI18n(VOLUME_SCALE, locale), trace_id: traceId });
    },
  },
];
