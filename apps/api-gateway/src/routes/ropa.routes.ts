/**
 * CB-E: ROPA Reference Data
 *
 * Dados de referência para inventário de dados pessoais (ROPA).
 * 11 endpoints estáticos com dados de referência para alimentar o módulo Privacy do Aegis.
 * Todos linkam ao SCF via scf_controls[].
 */
import type { RouteDefinition } from "../http";
import { json, routeParam } from "../http";
import { ApiError } from "../errors/api-error";

// ── Data Subjects ───────────────────────────────────────────────────────────

const DATA_SUBJECTS = [
  { id: "employee", name_pt: "Empregado", name_en: "Employee", type: "internal" as const, is_minor: false, requires_consent_by_default: false, default_legal_basis: "contract", examples_pt: ["CLT", "estagiário registrado"], applicable_regulations: ["lgpd", "gdpr"], scf_controls: ["PRI-01", "HRS-01"] },
  { id: "customer", name_pt: "Cliente", name_en: "Customer", type: "b2c" as const, is_minor: false, requires_consent_by_default: true, default_legal_basis: "consent", examples_pt: ["pessoa física consumidora"], applicable_regulations: ["lgpd", "gdpr", "ccpa"], scf_controls: ["PRI-01", "PRI-03"] },
  { id: "candidate", name_pt: "Candidato", name_en: "Candidate", type: "external" as const, is_minor: false, requires_consent_by_default: true, default_legal_basis: "consent", examples_pt: ["candidato a vaga de emprego"], applicable_regulations: ["lgpd", "gdpr"], scf_controls: ["PRI-01", "HRS-01"] },
  { id: "supplier", name_pt: "Fornecedor (PF)", name_en: "Supplier", type: "b2b" as const, is_minor: false, requires_consent_by_default: false, default_legal_basis: "contract", examples_pt: ["representante comercial PF", "prestador de serviço PF"], applicable_regulations: ["lgpd", "gdpr"], scf_controls: ["PRI-01", "TPM-01"] },
  { id: "visitor", name_pt: "Visitante", name_en: "Visitor", type: "external" as const, is_minor: false, requires_consent_by_default: true, default_legal_basis: "legitimate_interest", examples_pt: ["visitante às instalações", "visitante de website"], applicable_regulations: ["lgpd", "gdpr"], scf_controls: ["PRI-01", "PES-01"] },
  { id: "patient", name_pt: "Paciente", name_en: "Patient", type: "b2c" as const, is_minor: false, requires_consent_by_default: false, default_legal_basis: "health", examples_pt: ["paciente em clínica ou hospital"], applicable_regulations: ["lgpd", "gdpr", "hipaa_privacy"], scf_controls: ["PRI-01", "PRI-05"] },
  { id: "student", name_pt: "Aluno", name_en: "Student", type: "b2c" as const, is_minor: false, requires_consent_by_default: true, default_legal_basis: "contract", examples_pt: ["aluno de instituição de ensino"], applicable_regulations: ["lgpd", "gdpr"], scf_controls: ["PRI-01"] },
  { id: "minor", name_pt: "Menor de Idade", name_en: "Minor", type: "b2c" as const, is_minor: true, requires_consent_by_default: true, default_legal_basis: "consent", examples_pt: ["criança ou adolescente"], applicable_regulations: ["lgpd", "gdpr"], scf_controls: ["PRI-01", "PRI-05"] },
  { id: "legal_representative", name_pt: "Representante Legal", name_en: "Legal Representative", type: "external" as const, is_minor: false, requires_consent_by_default: false, default_legal_basis: "legitimate_interest", examples_pt: ["pai/mãe", "procurador"], applicable_regulations: ["lgpd", "gdpr"], scf_controls: ["PRI-01"] },
  { id: "contractor", name_pt: "Terceirizado", name_en: "Contractor", type: "internal" as const, is_minor: false, requires_consent_by_default: false, default_legal_basis: "contract", examples_pt: ["profissional PJ alocado", "temporário"], applicable_regulations: ["lgpd", "gdpr"], scf_controls: ["PRI-01", "TPM-01"] },
  { id: "public_servant", name_pt: "Servidor Público", name_en: "Public Servant", type: "internal" as const, is_minor: false, requires_consent_by_default: false, default_legal_basis: "public_administration", examples_pt: ["funcionário de órgão público"], applicable_regulations: ["lgpd"], scf_controls: ["PRI-01"] },
];

// ── Data Categories ─────────────────────────────────────────────────────────

const DATA_CATEGORIES = [
  { id: "identification", name_pt: "Identificação", name_en: "Identification", sensitivity: "normal" as const, keywords_pt: ["nome", "CPF", "RG", "passaporte", "CNH"], article_by_regulation: [{ regulation_id: "lgpd", article: "Art. 5°, I", extra_legal_basis_required: false, extra_requirement_pt: "" }], examples_pt: ["nome completo", "CPF", "RG"], scf_controls: ["DCH-01", "PRI-01"], retention_rules: [{ context_pt: "Relação trabalhista", min_years: 5, max_years: 30, legal_basis: "CLT Art. 11", jurisdiction: "BR" }], auto_triggers: [] },
  { id: "contact", name_pt: "Contato", name_en: "Contact", sensitivity: "normal" as const, keywords_pt: ["email", "telefone", "endereço", "celular"], article_by_regulation: [{ regulation_id: "lgpd", article: "Art. 5°, I", extra_legal_basis_required: false, extra_requirement_pt: "" }], examples_pt: ["email", "telefone", "endereço residencial"], scf_controls: ["DCH-01", "PRI-01"], retention_rules: [{ context_pt: "Marketing", min_years: 0, max_years: null, legal_basis: "Até revogação do consentimento", jurisdiction: "BR" }], auto_triggers: [] },
  { id: "financial", name_pt: "Financeiro", name_en: "Financial", sensitivity: "normal" as const, keywords_pt: ["conta bancária", "cartão", "renda", "salário"], article_by_regulation: [{ regulation_id: "lgpd", article: "Art. 5°, I", extra_legal_basis_required: false, extra_requirement_pt: "" }], examples_pt: ["conta bancária", "cartão de crédito"], scf_controls: ["DCH-01", "CRY-01", "PRI-01"], retention_rules: [{ context_pt: "Fiscal", min_years: 5, max_years: 10, legal_basis: "CTN Art. 173", jurisdiction: "BR" }], auto_triggers: [] },
  { id: "health", name_pt: "Saúde", name_en: "Health", sensitivity: "special" as const, keywords_pt: ["prontuário", "diagnóstico", "exame", "prescrição", "CID"], article_by_regulation: [{ regulation_id: "lgpd", article: "Art. 11", extra_legal_basis_required: true, extra_requirement_pt: "Base legal do Art. 11 obrigatória" }, { regulation_id: "hipaa_privacy", article: "§160.103", extra_legal_basis_required: true, extra_requirement_pt: "PHI rules apply" }], examples_pt: ["prontuário médico", "diagnóstico", "exames"], scf_controls: ["DCH-01", "CRY-01", "PRI-05"], retention_rules: [{ context_pt: "Prontuário médico", min_years: 20, max_years: null, legal_basis: "CFM Res. 1821/07", jurisdiction: "BR" }], auto_triggers: [{ trigger: "dpia_required", condition_pt: "Dados de saúde em larga escala" }] },
  { id: "biometric", name_pt: "Biométrico", name_en: "Biometric", sensitivity: "special" as const, keywords_pt: ["impressão digital", "facial", "íris", "voz"], article_by_regulation: [{ regulation_id: "lgpd", article: "Art. 11", extra_legal_basis_required: true, extra_requirement_pt: "Consentimento específico e destacado" }], examples_pt: ["impressão digital", "reconhecimento facial"], scf_controls: ["DCH-01", "CRY-01", "IAC-15"], retention_rules: [{ context_pt: "Controle de acesso", min_years: 0, max_years: 5, legal_basis: "Duração contratual", jurisdiction: "BR" }], auto_triggers: [{ trigger: "dpia_required", condition_pt: "Tratamento de biometria" }] },
  { id: "genetic", name_pt: "Genético", name_en: "Genetic", sensitivity: "special" as const, keywords_pt: ["DNA", "genoma", "sequenciamento"], article_by_regulation: [{ regulation_id: "lgpd", article: "Art. 11", extra_legal_basis_required: true, extra_requirement_pt: "" }, { regulation_id: "gdpr", article: "Art. 9", extra_legal_basis_required: true, extra_requirement_pt: "" }], examples_pt: ["sequenciamento genético", "teste de paternidade"], scf_controls: ["DCH-01", "CRY-01", "PRI-05"], retention_rules: [], auto_triggers: [{ trigger: "dpia_required", condition_pt: "Dados genéticos" }] },
  { id: "political", name_pt: "Opinião Política", name_en: "Political Opinion", sensitivity: "special" as const, keywords_pt: ["partido", "filiação", "ideologia"], article_by_regulation: [{ regulation_id: "lgpd", article: "Art. 11", extra_legal_basis_required: true, extra_requirement_pt: "" }], examples_pt: ["filiação partidária"], scf_controls: ["DCH-01", "PRI-05"], retention_rules: [], auto_triggers: [] },
  { id: "religious", name_pt: "Convicção Religiosa", name_en: "Religious Belief", sensitivity: "special" as const, keywords_pt: ["religião", "crença", "fé"], article_by_regulation: [{ regulation_id: "lgpd", article: "Art. 11", extra_legal_basis_required: true, extra_requirement_pt: "" }], examples_pt: ["religião", "crenças filosóficas"], scf_controls: ["DCH-01", "PRI-05"], retention_rules: [], auto_triggers: [] },
  { id: "sexual", name_pt: "Vida Sexual / Orientação", name_en: "Sexual Life / Orientation", sensitivity: "special" as const, keywords_pt: ["orientação sexual", "vida sexual"], article_by_regulation: [{ regulation_id: "lgpd", article: "Art. 11", extra_legal_basis_required: true, extra_requirement_pt: "" }], examples_pt: ["orientação sexual"], scf_controls: ["DCH-01", "PRI-05"], retention_rules: [], auto_triggers: [] },
  { id: "ethnic", name_pt: "Origem Racial/Étnica", name_en: "Racial/Ethnic Origin", sensitivity: "special" as const, keywords_pt: ["raça", "etnia", "cor"], article_by_regulation: [{ regulation_id: "lgpd", article: "Art. 11", extra_legal_basis_required: true, extra_requirement_pt: "" }], examples_pt: ["raça", "etnia"], scf_controls: ["DCH-01", "PRI-05"], retention_rules: [], auto_triggers: [] },
  { id: "criminal", name_pt: "Dados Criminais", name_en: "Criminal Data", sensitivity: "criminal" as const, keywords_pt: ["antecedentes", "condenação", "processo criminal"], article_by_regulation: [{ regulation_id: "lgpd", article: "Art. 11", extra_legal_basis_required: true, extra_requirement_pt: "" }, { regulation_id: "gdpr", article: "Art. 10", extra_legal_basis_required: true, extra_requirement_pt: "Somente sob controle de autoridade oficial" }], examples_pt: ["antecedentes criminais", "condenações"], scf_controls: ["DCH-01", "HRS-04"], retention_rules: [{ context_pt: "Background check", min_years: 0, max_years: 2, legal_basis: "Duração do processo seletivo/contrato", jurisdiction: "BR" }], auto_triggers: [] },
  { id: "children", name_pt: "Dados de Crianças", name_en: "Children's Data", sensitivity: "special" as const, keywords_pt: ["menor", "criança", "adolescente"], article_by_regulation: [{ regulation_id: "lgpd", article: "Art. 14", extra_legal_basis_required: true, extra_requirement_pt: "Consentimento de responsável legal" }], examples_pt: ["dados de menores de 12 anos"], scf_controls: ["DCH-01", "PRI-05"], retention_rules: [], auto_triggers: [{ trigger: "dpia_required", condition_pt: "Tratamento de dados de menores" }] },
  { id: "behavioral", name_pt: "Comportamental", name_en: "Behavioral", sensitivity: "normal" as const, keywords_pt: ["navegação", "cookies", "preferências", "click"], article_by_regulation: [{ regulation_id: "lgpd", article: "Art. 12, §2°", extra_legal_basis_required: false, extra_requirement_pt: "" }], examples_pt: ["histórico de navegação", "compras"], scf_controls: ["DCH-01", "PRI-01"], retention_rules: [{ context_pt: "Analytics", min_years: 0, max_years: 2, legal_basis: "Consentimento ou anonimização", jurisdiction: "BR" }], auto_triggers: [{ trigger: "profiling_check", condition_pt: "Pode configurar profiling" }] },
  { id: "geolocation", name_pt: "Geolocalização", name_en: "Geolocation", sensitivity: "normal" as const, keywords_pt: ["GPS", "IP", "localização", "coordenadas"], article_by_regulation: [{ regulation_id: "lgpd", article: "Art. 12, §2°", extra_legal_basis_required: false, extra_requirement_pt: "" }], examples_pt: ["GPS", "endereço IP"], scf_controls: ["DCH-01", "PRI-01"], retention_rules: [{ context_pt: "Fleet management", min_years: 1, max_years: 3, legal_basis: "Obrigação contratual", jurisdiction: "BR" }], auto_triggers: [{ trigger: "dpia_check", condition_pt: "Monitoramento sistemático" }] },
  { id: "professional", name_pt: "Profissional", name_en: "Professional", sensitivity: "normal" as const, keywords_pt: ["cargo", "empresa anterior", "currículo"], article_by_regulation: [{ regulation_id: "lgpd", article: "Art. 5°, I", extra_legal_basis_required: false, extra_requirement_pt: "" }], examples_pt: ["cargo", "empresa", "experiência"], scf_controls: ["DCH-01", "HRS-01"], retention_rules: [{ context_pt: "Recrutamento", min_years: 0, max_years: 2, legal_basis: "Consentimento", jurisdiction: "BR" }], auto_triggers: [] },
  { id: "image", name_pt: "Imagem/Foto", name_en: "Image/Photo", sensitivity: "normal" as const, keywords_pt: ["foto", "imagem", "vídeo", "CFTV"], article_by_regulation: [{ regulation_id: "lgpd", article: "Art. 5°, I", extra_legal_basis_required: false, extra_requirement_pt: "" }], examples_pt: ["foto de documento", "gravação CFTV"], scf_controls: ["DCH-01", "PES-01"], retention_rules: [{ context_pt: "CFTV", min_years: 0, max_years: 1, legal_basis: "Legítimo interesse", jurisdiction: "BR" }], auto_triggers: [] },
  { id: "education", name_pt: "Educacional", name_en: "Educational", sensitivity: "normal" as const, keywords_pt: ["diploma", "certificado", "escolaridade"], article_by_regulation: [{ regulation_id: "lgpd", article: "Art. 5°, I", extra_legal_basis_required: false, extra_requirement_pt: "" }], examples_pt: ["diploma", "histórico escolar"], scf_controls: ["DCH-01", "HRS-01"], retention_rules: [{ context_pt: "Emprego", min_years: 5, max_years: 30, legal_basis: "CLT", jurisdiction: "BR" }], auto_triggers: [] },
  { id: "union", name_pt: "Filiação Sindical", name_en: "Trade Union", sensitivity: "special" as const, keywords_pt: ["sindicato", "filiação sindical"], article_by_regulation: [{ regulation_id: "lgpd", article: "Art. 11", extra_legal_basis_required: true, extra_requirement_pt: "" }, { regulation_id: "gdpr", article: "Art. 9", extra_legal_basis_required: true, extra_requirement_pt: "" }], examples_pt: ["associação sindical"], scf_controls: ["DCH-01", "PRI-05"], retention_rules: [], auto_triggers: [] },
  { id: "judicial", name_pt: "Dados Judiciais", name_en: "Judicial Data", sensitivity: "normal" as const, keywords_pt: ["processo", "ação judicial", "litígio"], article_by_regulation: [{ regulation_id: "lgpd", article: "Art. 7°, VI", extra_legal_basis_required: false, extra_requirement_pt: "" }], examples_pt: ["processos judiciais", "ações trabalhistas"], scf_controls: ["DCH-01"], retention_rules: [{ context_pt: "Prescrição", min_years: 5, max_years: 20, legal_basis: "CC Art. 205/206", jurisdiction: "BR" }], auto_triggers: [] },
  { id: "voice", name_pt: "Voz", name_en: "Voice", sensitivity: "normal" as const, keywords_pt: ["gravação", "voz", "call center"], article_by_regulation: [{ regulation_id: "lgpd", article: "Art. 5°, I", extra_legal_basis_required: false, extra_requirement_pt: "" }], examples_pt: ["gravação de call center", "mensagem de voz"], scf_controls: ["DCH-01", "PRI-01"], retention_rules: [{ context_pt: "Call center", min_years: 0, max_years: 5, legal_basis: "Regulação setorial", jurisdiction: "BR" }], auto_triggers: [] },
];

// ── Life Cycle Stages ───────────────────────────────────────────────────────

const LIFE_CYCLE_STAGES = [
  { id: "collection", name_pt: "Coleta", order: 1, description_pt: "Obtenção dos dados pessoais junto ao titular ou terceiros", scf_controls: ["PRI-01", "PRI-03"], gdpr_article: "Art. 13-14", lgpd_article: "Art. 7" },
  { id: "processing", name_pt: "Processamento", order: 2, description_pt: "Operações realizadas sobre os dados (classificação, análise, etc.)", scf_controls: ["PRI-01", "DCH-01"], gdpr_article: "Art. 5(1)(b)", lgpd_article: "Art. 6" },
  { id: "storage", name_pt: "Armazenamento", order: 3, description_pt: "Guarda dos dados em meio físico ou digital", scf_controls: ["DCH-01", "CRY-01", "CRY-09"], gdpr_article: "Art. 5(1)(e)", lgpd_article: "Art. 6, VII" },
  { id: "sharing", name_pt: "Compartilhamento", order: 4, description_pt: "Transmissão a terceiros internos ou externos", scf_controls: ["PRI-03", "TPM-01", "DCH-01"], gdpr_article: "Art. 26-28", lgpd_article: "Art. 26-27" },
  { id: "archiving", name_pt: "Arquivamento", order: 5, description_pt: "Guarda prolongada após encerramento da finalidade primária", scf_controls: ["DCH-17", "PRI-01"], gdpr_article: "Art. 5(1)(e)", lgpd_article: "Art. 16" },
  { id: "disposal", name_pt: "Eliminação", order: 6, description_pt: "Destruição dos dados ao fim do período de retenção", scf_controls: ["DCH-17", "DCH-18"], gdpr_article: "Art. 17", lgpd_article: "Art. 16" },
];

// ── Data Origins ────────────────────────────────────────────────────────────

const DATA_ORIGINS = [
  { id: "direct_collection", name_pt: "Coleta direta do titular", requires_consent_notice: true, scf_controls: ["PRI-01", "PRI-03"] },
  { id: "third_party", name_pt: "Recebido de terceiros", requires_consent_notice: true, scf_controls: ["PRI-01", "PRI-03", "TPM-01"] },
  { id: "public_source", name_pt: "Fonte publicamente disponível", requires_consent_notice: false, scf_controls: ["PRI-01"] },
  { id: "automated", name_pt: "Coleta automatizada (cookies, logs)", requires_consent_notice: true, scf_controls: ["PRI-01", "PRI-03"] },
  { id: "internal_generation", name_pt: "Gerado internamente (avaliação, análise)", requires_consent_notice: false, scf_controls: ["PRI-01"] },
  { id: "legal_obligation", name_pt: "Recebido por obrigação legal", requires_consent_notice: false, scf_controls: ["PRI-01", "CPL-01"] },
];

// ── Collection Methods ──────────────────────────────────────────────────────

const COLLECTION_METHODS = [
  { id: "web_form", name_pt: "Formulário web", requires_consent_checkbox: true, privacy_notice_required: true, scf_controls: ["PRI-01", "PRI-03"] },
  { id: "paper_form", name_pt: "Formulário físico", requires_consent_checkbox: true, privacy_notice_required: true, scf_controls: ["PRI-01"] },
  { id: "api_integration", name_pt: "Integração via API", requires_consent_checkbox: false, privacy_notice_required: false, scf_controls: ["PRI-01", "TPM-01"] },
  { id: "email", name_pt: "Email", requires_consent_checkbox: false, privacy_notice_required: true, scf_controls: ["PRI-01"] },
  { id: "phone", name_pt: "Telefone/Call Center", requires_consent_checkbox: false, privacy_notice_required: true, scf_controls: ["PRI-01"] },
  { id: "in_person", name_pt: "Presencial", requires_consent_checkbox: false, privacy_notice_required: true, scf_controls: ["PRI-01"] },
  { id: "cookies_tracking", name_pt: "Cookies/Tracking", requires_consent_checkbox: true, privacy_notice_required: true, scf_controls: ["PRI-01", "PRI-03"] },
  { id: "cftv", name_pt: "CFTV/Câmeras", requires_consent_checkbox: false, privacy_notice_required: true, scf_controls: ["PES-01", "PRI-01"] },
  { id: "biometric_scanner", name_pt: "Leitor biométrico", requires_consent_checkbox: true, privacy_notice_required: true, scf_controls: ["IAC-15", "PRI-01"] },
];

// ── Processing Purposes ─────────────────────────────────────────────────────

const PROCESSING_PURPOSES = [
  { id: "employment_management", name_pt: "Gestão de Empregados", category: "rh", typical_legal_basis: "contract", typical_retention_pt: "5 anos após desligamento", dpia_likely: false, examples_pt: ["folha de pagamento", "gestão de férias"], scf_controls: ["PRI-01", "HRS-01"] },
  { id: "recruitment", name_pt: "Recrutamento e Seleção", category: "rh", typical_legal_basis: "consent", typical_retention_pt: "2 anos", dpia_likely: false, examples_pt: ["análise de currículo", "entrevista"], scf_controls: ["PRI-01", "HRS-01"] },
  { id: "payroll", name_pt: "Folha de Pagamento", category: "rh", typical_legal_basis: "legal_obligation", typical_retention_pt: "30 anos (FGTS)", dpia_likely: false, examples_pt: ["cálculo de salário", "encargos"], scf_controls: ["PRI-01", "HRS-01"] },
  { id: "benefits_management", name_pt: "Gestão de Benefícios", category: "rh", typical_legal_basis: "contract", typical_retention_pt: "5 anos", dpia_likely: false, examples_pt: ["plano de saúde", "vale transporte"], scf_controls: ["PRI-01"] },
  { id: "marketing_direct", name_pt: "Marketing Direto", category: "marketing", typical_legal_basis: "consent", typical_retention_pt: "Até revogação", dpia_likely: false, examples_pt: ["envio de newsletter", "promoções"], scf_controls: ["PRI-01", "PRI-03"] },
  { id: "marketing_analytics", name_pt: "Analytics de Marketing", category: "marketing", typical_legal_basis: "legitimate_interest", typical_retention_pt: "2 anos", dpia_likely: true, examples_pt: ["análise comportamental", "segmentação"], scf_controls: ["PRI-01", "PRI-05"] },
  { id: "customer_relationship", name_pt: "Gestão de Relacionamento", category: "comercial", typical_legal_basis: "contract", typical_retention_pt: "5 anos após fim do contrato", dpia_likely: false, examples_pt: ["CRM", "atendimento ao cliente"], scf_controls: ["PRI-01"] },
  { id: "contract_execution", name_pt: "Execução de Contrato", category: "juridico", typical_legal_basis: "contract", typical_retention_pt: "10 anos", dpia_likely: false, examples_pt: ["prestação de serviço", "entrega de produto"], scf_controls: ["PRI-01"] },
  { id: "legal_compliance", name_pt: "Conformidade Legal", category: "compliance", typical_legal_basis: "legal_obligation", typical_retention_pt: "Conforme legislação", dpia_likely: false, examples_pt: ["obrigações fiscais", "relatórios regulatórios"], scf_controls: ["PRI-01", "CPL-01"] },
  { id: "audit_governance", name_pt: "Auditoria e Governança", category: "compliance", typical_legal_basis: "legitimate_interest", typical_retention_pt: "5 anos", dpia_likely: false, examples_pt: ["auditoria interna", "trilha de auditoria"], scf_controls: ["AIS-01", "GOV-05"] },
  { id: "security_monitoring", name_pt: "Monitoramento de Segurança", category: "ti", typical_legal_basis: "legitimate_interest", typical_retention_pt: "1 ano", dpia_likely: true, examples_pt: ["SIEM", "logs de acesso", "DLP"], scf_controls: ["MON-01", "PRI-01"] },
  { id: "health_safety", name_pt: "Saúde e Segurança do Trabalho", category: "rh", typical_legal_basis: "legal_obligation", typical_retention_pt: "20 anos", dpia_likely: false, examples_pt: ["ASO", "PCMSO", "acidente de trabalho"], scf_controls: ["PRI-01", "HRS-01"] },
  { id: "training", name_pt: "Treinamento", category: "rh", typical_legal_basis: "contract", typical_retention_pt: "5 anos", dpia_likely: false, examples_pt: ["registro de treinamento", "certificados"], scf_controls: ["SAT-01", "PRI-01"] },
  { id: "vendor_management", name_pt: "Gestão de Fornecedores", category: "compras", typical_legal_basis: "contract", typical_retention_pt: "5 anos após fim do contrato", dpia_likely: false, examples_pt: ["cadastro de fornecedor", "due diligence"], scf_controls: ["TPM-01", "PRI-01"] },
  { id: "fraud_prevention", name_pt: "Prevenção à Fraude", category: "compliance", typical_legal_basis: "legitimate_interest", typical_retention_pt: "5 anos", dpia_likely: true, examples_pt: ["análise antifraude", "KYC"], scf_controls: ["PRI-01", "RSK-01"] },
];

// ── Security Measures ───────────────────────────────────────────────────────

const SECURITY_MEASURES = [
  { id: "encryption_at_rest", name_pt: "Criptografia em repouso", category: "technical" as const, scf_controls: ["CRY-01", "CRY-09"], applicable_data_categories: ["all"], priority_for_sensitive: "mandatory" as const, priority_for_normal: "recommended" as const },
  { id: "encryption_in_transit", name_pt: "Criptografia em trânsito (TLS)", category: "technical" as const, scf_controls: ["CRY-03"], applicable_data_categories: ["all"], priority_for_sensitive: "mandatory" as const, priority_for_normal: "mandatory" as const },
  { id: "access_control", name_pt: "Controle de acesso lógico", category: "technical" as const, scf_controls: ["IAC-06", "IAC-15"], applicable_data_categories: ["all"], priority_for_sensitive: "mandatory" as const, priority_for_normal: "mandatory" as const },
  { id: "audit_logging", name_pt: "Registro de auditoria", category: "technical" as const, scf_controls: ["MON-01", "AIS-01"], applicable_data_categories: ["all"], priority_for_sensitive: "mandatory" as const, priority_for_normal: "recommended" as const },
  { id: "data_masking", name_pt: "Mascaramento de dados", category: "technical" as const, scf_controls: ["DCH-01", "CRY-01"], applicable_data_categories: ["health", "financial", "criminal"], priority_for_sensitive: "mandatory" as const, priority_for_normal: "optional" as const },
  { id: "dlp", name_pt: "Prevenção contra vazamento (DLP)", category: "technical" as const, scf_controls: ["DLP-01"], applicable_data_categories: ["all"], priority_for_sensitive: "mandatory" as const, priority_for_normal: "recommended" as const },
  { id: "backup", name_pt: "Backup com teste de restore", category: "technical" as const, scf_controls: ["BCD-01", "BCD-04"], applicable_data_categories: ["all"], priority_for_sensitive: "mandatory" as const, priority_for_normal: "mandatory" as const },
  { id: "anonymization", name_pt: "Anonimização/Pseudonimização", category: "technical" as const, scf_controls: ["PRI-01"], applicable_data_categories: ["health", "behavioral", "geolocation"], priority_for_sensitive: "recommended" as const, priority_for_normal: "optional" as const },
  { id: "privacy_policy", name_pt: "Política de privacidade", category: "organizational" as const, scf_controls: ["GOV-02", "PRI-01"], applicable_data_categories: ["all"], priority_for_sensitive: "mandatory" as const, priority_for_normal: "mandatory" as const },
  { id: "training", name_pt: "Treinamento de conscientização", category: "organizational" as const, scf_controls: ["SAT-01", "SAT-03"], applicable_data_categories: ["all"], priority_for_sensitive: "mandatory" as const, priority_for_normal: "recommended" as const },
  { id: "nda", name_pt: "Acordo de confidencialidade (NDA)", category: "organizational" as const, scf_controls: ["HRS-05"], applicable_data_categories: ["all"], priority_for_sensitive: "mandatory" as const, priority_for_normal: "recommended" as const },
  { id: "physical_access", name_pt: "Controle de acesso físico", category: "physical" as const, scf_controls: ["PES-01", "PES-02"], applicable_data_categories: ["all"], priority_for_sensitive: "mandatory" as const, priority_for_normal: "recommended" as const },
  { id: "clean_desk", name_pt: "Política de mesa limpa", category: "physical" as const, scf_controls: ["PES-06"], applicable_data_categories: ["all"], priority_for_sensitive: "recommended" as const, priority_for_normal: "optional" as const },
];

// ── Disposal Methods ────────────────────────────────────────────────────────

const DISPOSAL_METHODS = [
  { id: "secure_delete", name_pt: "Exclusão segura (wipe)", description_pt: "Sobrescrita de dados em mídia digital com algoritmo certificado", applicable_to: "digital" as const, scf_controls: ["DCH-17", "DCH-18"], lgpd_article: "Art. 16" },
  { id: "crypto_shred", name_pt: "Crypto shredding", description_pt: "Destruição da chave de criptografia tornando dados irrecuperáveis", applicable_to: "digital" as const, scf_controls: ["CRY-01", "DCH-17"], lgpd_article: "Art. 16" },
  { id: "physical_destruction", name_pt: "Destruição física", description_pt: "Trituração, desmagnetização ou incineração de mídia", applicable_to: "both" as const, scf_controls: ["DCH-17", "DCH-18"], lgpd_article: "Art. 16" },
  { id: "anonymization", name_pt: "Anonimização", description_pt: "Tornar impossível a identificação do titular (irreversível)", applicable_to: "digital" as const, scf_controls: ["PRI-01", "DCH-17"], lgpd_article: "Art. 12, §1°" },
  { id: "paper_shredding", name_pt: "Trituração de papel", description_pt: "Destruição de documentos físicos em fragmentadora", applicable_to: "physical" as const, scf_controls: ["DCH-18"], lgpd_article: "Art. 16" },
];

// ── Risk Factors ────────────────────────────────────────────────────────────

const RISK_FACTORS = [
  { id: "sensitive_data", name_pt: "Dados sensíveis", description_pt: "Tratamento envolve dados de categorias especiais", weight: 3, triggers_dpia: true, triggers_lia: false, regulation_ref: "LGPD Art. 11 / GDPR Art. 9", detection_rule: "data_categories.sensitivity == 'special'", scf_controls: ["PRI-05", "DCH-01"] },
  { id: "large_scale", name_pt: "Larga escala", description_pt: "Volume significativo de titulares ou registros", weight: 3, triggers_dpia: true, triggers_lia: false, regulation_ref: "GDPR Art. 35(3)(b)", detection_rule: "data_volume IN ('high', 'very_high')", scf_controls: ["PRI-05"] },
  { id: "minors", name_pt: "Dados de menores", description_pt: "Tratamento envolve dados de crianças/adolescentes", weight: 3, triggers_dpia: true, triggers_lia: false, regulation_ref: "LGPD Art. 14", detection_rule: "data_subjects CONTAINS 'minor'", scf_controls: ["PRI-05", "PRI-01"] },
  { id: "systematic_monitoring", name_pt: "Monitoramento sistemático", description_pt: "Observação contínua e sistemática de titulares", weight: 3, triggers_dpia: true, triggers_lia: false, regulation_ref: "GDPR Art. 35(3)(c)", detection_rule: null, scf_controls: ["PRI-05", "MON-01"] },
  { id: "automated_decision", name_pt: "Decisão automatizada", description_pt: "Decisões com efeitos legais baseadas em tratamento automatizado", weight: 3, triggers_dpia: true, triggers_lia: false, regulation_ref: "LGPD Art. 20 / GDPR Art. 22", detection_rule: "automated_decision == true", scf_controls: ["PRI-05", "PRI-01"] },
  { id: "profiling", name_pt: "Profiling", description_pt: "Análise de aspectos pessoais para prever comportamento", weight: 2, triggers_dpia: true, triggers_lia: false, regulation_ref: "GDPR Art. 35(3)(a)", detection_rule: "profiling == true", scf_controls: ["PRI-05"] },
  { id: "biometric_usage", name_pt: "Uso de biometria", description_pt: "Tratamento de dados biométricos para identificação", weight: 2, triggers_dpia: true, triggers_lia: false, regulation_ref: "LGPD Art. 11 / GDPR Art. 9", detection_rule: "data_categories CONTAINS 'biometric'", scf_controls: ["PRI-05", "IAC-15"] },
  { id: "geolocation_usage", name_pt: "Uso de geolocalização", description_pt: "Rastreamento de localização de titulares", weight: 2, triggers_dpia: true, triggers_lia: false, regulation_ref: "GDPR Recital 75", detection_rule: "data_categories CONTAINS 'geolocation'", scf_controls: ["PRI-05"] },
  { id: "combined_datasets", name_pt: "Combinação de bases de dados", description_pt: "Cruzamento de dados de diferentes fontes", weight: 1, triggers_dpia: false, triggers_lia: false, regulation_ref: "WP29 Guidelines", detection_rule: null, scf_controls: ["PRI-05", "DCH-01"] },
  { id: "health_data_volume", name_pt: "Dados de saúde em volume", description_pt: "Tratamento de dados de saúde em escala não individual", weight: 3, triggers_dpia: true, triggers_lia: false, regulation_ref: "LGPD Art. 11 + Art. 38", detection_rule: "data_categories CONTAINS 'health' AND data_volume != 'low'", scf_controls: ["PRI-05"] },
  { id: "transfer_no_adequacy", name_pt: "Transferência sem adequação", description_pt: "Transferência internacional para país sem decisão de adequação", weight: 2, triggers_dpia: false, triggers_lia: false, regulation_ref: "LGPD Art. 33 / GDPR Art. 44-49", detection_rule: "international_transfer AND NOT adequacy_decision", scf_controls: ["PRI-09"] },
  { id: "legitimate_interest", name_pt: "Legítimo interesse", description_pt: "Tratamento baseado em legítimo interesse do controlador", weight: 0, triggers_dpia: false, triggers_lia: true, regulation_ref: "LGPD Art. 10, §3° / GDPR Art. 6(1)(f)", detection_rule: "legal_basis == 'legitimate_interest'", scf_controls: ["PRI-01"] },
  { id: "new_technology", name_pt: "Nova tecnologia", description_pt: "Uso de tecnologia emergente no tratamento", weight: 2, triggers_dpia: true, triggers_lia: false, regulation_ref: "GDPR Art. 35(1)", detection_rule: null, scf_controls: ["PRI-05"] },
];

// ── Volume Scale ────────────────────────────────────────────────────────────

const VOLUME_SCALE = [
  { id: "very_low", label_pt: "Muito Baixo", label_en: "Very Low", max_records: 100, risk_contribution: 0 },
  { id: "low", label_pt: "Baixo", label_en: "Low", max_records: 1000, risk_contribution: 1 },
  { id: "medium", label_pt: "Médio", label_en: "Medium", max_records: 10000, risk_contribution: 2 },
  { id: "high", label_pt: "Alto", label_en: "High", max_records: 100000, risk_contribution: 3 },
  { id: "very_high", label_pt: "Muito Alto", label_en: "Very High", max_records: Infinity, risk_contribution: 4 },
];

// ── Routes ──────────────────────────────────────────────────────────────────

export const ropaRoutes: RouteDefinition[] = [
  {
    method: "GET", path: "/api/v1/ropa/data-subjects",
    authRequired: true, tenantRequired: false,
    handler: async ({ traceId }) => json({ data: DATA_SUBJECTS, total: DATA_SUBJECTS.length, trace_id: traceId }),
  },
  {
    method: "GET", path: "/api/v1/ropa/data-categories",
    authRequired: true, tenantRequired: false,
    handler: async ({ request, traceId }) => {
      const url = new URL(request.url);
      const sensitivity = url.searchParams.get("sensitivity");
      let filtered = DATA_CATEGORIES;
      if (sensitivity) filtered = filtered.filter(c => c.sensitivity === sensitivity);
      return json({ data: filtered, total: filtered.length, trace_id: traceId });
    },
  },
  {
    method: "GET", path: "/api/v1/ropa/life-cycle-stages",
    authRequired: true, tenantRequired: false,
    handler: async ({ traceId }) => json({ data: LIFE_CYCLE_STAGES, trace_id: traceId }),
  },
  {
    method: "GET", path: "/api/v1/ropa/data-origins",
    authRequired: true, tenantRequired: false,
    handler: async ({ traceId }) => json({ data: DATA_ORIGINS, trace_id: traceId }),
  },
  {
    method: "GET", path: "/api/v1/ropa/collection-methods",
    authRequired: true, tenantRequired: false,
    handler: async ({ traceId }) => json({ data: COLLECTION_METHODS, trace_id: traceId }),
  },
  {
    method: "GET", path: "/api/v1/ropa/processing-purposes",
    authRequired: true, tenantRequired: false,
    handler: async ({ request, traceId }) => {
      const url = new URL(request.url);
      const category = url.searchParams.get("category");
      let filtered = PROCESSING_PURPOSES;
      if (category) filtered = filtered.filter(p => p.category === category);
      return json({ data: filtered, total: filtered.length, trace_id: traceId });
    },
  },
  {
    method: "GET", path: "/api/v1/ropa/retention-rules",
    authRequired: true, tenantRequired: false,
    handler: async ({ request, traceId }) => {
      const url = new URL(request.url);
      const categoryId = url.searchParams.get("category");
      const allRules = DATA_CATEGORIES.flatMap(c => c.retention_rules.map(r => ({ data_category_id: c.id, data_category_name_pt: c.name_pt, ...r })));
      const filtered = categoryId ? allRules.filter(r => r.data_category_id === categoryId) : allRules;
      return json({ data: filtered, total: filtered.length, trace_id: traceId });
    },
  },
  {
    method: "GET", path: "/api/v1/ropa/security-measures",
    authRequired: true, tenantRequired: false,
    handler: async ({ request, traceId }) => {
      const url = new URL(request.url);
      const sensitivity = url.searchParams.get("sensitivity");
      let filtered = SECURITY_MEASURES;
      if (sensitivity === "special") filtered = filtered.filter(m => m.priority_for_sensitive !== "optional");
      return json({ data: filtered, total: filtered.length, trace_id: traceId });
    },
  },
  {
    method: "GET", path: "/api/v1/ropa/disposal-methods",
    authRequired: true, tenantRequired: false,
    handler: async ({ traceId }) => json({ data: DISPOSAL_METHODS, trace_id: traceId }),
  },
  {
    method: "GET", path: "/api/v1/ropa/risk-factors",
    authRequired: true, tenantRequired: false,
    handler: async ({ traceId }) => json({ data: RISK_FACTORS, total: RISK_FACTORS.length, dpia_threshold: 8, dpia_rule: "risk_score = Σ(weight × present). Se >= 8 → DPIA obrigatório", trace_id: traceId }),
  },
  {
    method: "GET", path: "/api/v1/ropa/volume-scale",
    authRequired: true, tenantRequired: false,
    handler: async ({ traceId }) => json({ data: VOLUME_SCALE, trace_id: traceId }),
  },
];
