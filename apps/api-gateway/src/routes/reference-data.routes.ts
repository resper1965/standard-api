import type { RouteDefinition } from "../http";
import { json } from "../http";
import { flattenI18n } from "../utils/i18n";
import {
  DataSubjectRefSchema,
  DataCategoryRefSchema,
  LifeCycleStageRefSchema,
  DataOriginRefSchema,
  CollectionMethodRefSchema,
  ProcessingPurposeRefSchema,
  SecurityMeasureRefSchema,
  DisposalMethodRefSchema,
  RiskFactorRefSchema,
  VolumeScaleRefSchema,
  DepartmentRefSchema,
  BgCheckTypeRefSchema,
  ClearanceLevelRefSchema,
  MaturityLevelRefSchema,
  RetentionRuleRefSchema
} from "@standard/schemas";
import type {
  DataSubjectRef,
  DataCategoryRef,
  LifeCycleStageRef,
  DataOriginRef,
  CollectionMethodRef,
  ProcessingPurposeRef,
  SecurityMeasureRef,
  DisposalMethodRef,
  RiskFactorRef,
  VolumeScaleRef,
  DepartmentRef,
  BgCheckTypeRef,
  ClearanceLevelRef,
  MaturityLevelRef,
  RetentionRuleRef
} from "@standard/schemas";

// ── Data Subjects ───────────────────────────────────────────────────────────

const DATA_SUBJECTS: DataSubjectRef[] = [
  { id: "employee", name_i18n: { pt: "Empregado", en: "Employee" }, type: "internal", is_minor: false, requires_consent_by_default: false, default_legal_basis: "contract", examples_i18n: { pt: ["CLT", "estagiário registrado"], en: ["Full-time", "Intern"] }, applicable_regulations: ["lgpd", "gdpr"], scf_controls: ["PRI-01", "HRS-01"] },
  { id: "customer", name_i18n: { pt: "Cliente", en: "Customer" }, type: "b2c", is_minor: false, requires_consent_by_default: true, default_legal_basis: "consent", examples_i18n: { pt: ["pessoa física consumidora"], en: ["consumer"] }, applicable_regulations: ["lgpd", "gdpr", "ccpa"], scf_controls: ["PRI-01", "PRI-03"] },
  { id: "candidate", name_i18n: { pt: "Candidato", en: "Candidate" }, type: "external", is_minor: false, requires_consent_by_default: true, default_legal_basis: "consent", examples_i18n: { pt: ["candidato a vaga de emprego"], en: ["job applicant"] }, applicable_regulations: ["lgpd", "gdpr"], scf_controls: ["PRI-01", "HRS-01"] },
  { id: "supplier", name_i18n: { pt: "Fornecedor (PF)", en: "Supplier" }, type: "b2b", is_minor: false, requires_consent_by_default: false, default_legal_basis: "contract", examples_i18n: { pt: ["representante comercial PF", "prestador de serviço PF"], en: ["freelancer", "contractor"] }, applicable_regulations: ["lgpd", "gdpr"], scf_controls: ["PRI-01", "TPM-01"] },
  { id: "visitor", name_i18n: { pt: "Visitante", en: "Visitor" }, type: "external", is_minor: false, requires_consent_by_default: true, default_legal_basis: "legitimate_interest", examples_i18n: { pt: ["visitante às instalações", "visitante de website"], en: ["physical visitor", "website visitor"] }, applicable_regulations: ["lgpd", "gdpr"], scf_controls: ["PRI-01", "PES-01"] },
  { id: "patient", name_i18n: { pt: "Paciente", en: "Patient" }, type: "b2c", is_minor: false, requires_consent_by_default: false, default_legal_basis: "health", examples_i18n: { pt: ["paciente em clínica ou hospital"], en: ["clinic patient"] }, applicable_regulations: ["lgpd", "gdpr", "hipaa_privacy"], scf_controls: ["PRI-01", "PRI-05"] },
  { id: "student", name_i18n: { pt: "Aluno", en: "Student" }, type: "b2c", is_minor: false, requires_consent_by_default: true, default_legal_basis: "contract", examples_i18n: { pt: ["aluno de instituição de ensino"], en: ["student"] }, applicable_regulations: ["lgpd", "gdpr"], scf_controls: ["PRI-01"] },
  { id: "minor", name_i18n: { pt: "Menor de Idade", en: "Minor" }, type: "b2c", is_minor: true, requires_consent_by_default: true, default_legal_basis: "consent", examples_i18n: { pt: ["criança ou adolescente"], en: ["child", "teenager"] }, applicable_regulations: ["lgpd", "gdpr"], scf_controls: ["PRI-01", "PRI-05"] },
  { id: "legal_representative", name_i18n: { pt: "Representante Legal", en: "Legal Representative" }, type: "external", is_minor: false, requires_consent_by_default: false, default_legal_basis: "legitimate_interest", examples_i18n: { pt: ["pai/mãe", "procurador"], en: ["parent", "guardian"] }, applicable_regulations: ["lgpd", "gdpr"], scf_controls: ["PRI-01"] },
  { id: "contractor", name_i18n: { pt: "Terceirizado", en: "Contractor" }, type: "internal", is_minor: false, requires_consent_by_default: false, default_legal_basis: "contract", examples_i18n: { pt: ["profissional PJ alocado", "temporário"], en: ["temp worker", "agency staff"] }, applicable_regulations: ["lgpd", "gdpr"], scf_controls: ["PRI-01", "TPM-01"] },
  { id: "public_servant", name_i18n: { pt: "Servidor Público", en: "Public Servant" }, type: "internal", is_minor: false, requires_consent_by_default: false, default_legal_basis: "public_administration", examples_i18n: { pt: ["funcionário de órgão público"], en: ["government employee"] }, applicable_regulations: ["lgpd"], scf_controls: ["PRI-01"] }
];

DATA_SUBJECTS.forEach(i => DataSubjectRefSchema.parse(i));


// ── Data Categories ─────────────────────────────────────────────────────────

export const DATA_CATEGORIES: DataCategoryRef[] = [
  { id: "identification", name_i18n: { pt: "Identificação", en: "Identification" }, sensitivity: "normal", keywords_i18n: { pt: ["nome", "CPF", "RG", "passaporte", "CNH"], en: ["name", "SSN", "passport"] }, article_by_regulation: [{ regulation_id: "lgpd", article: "Art. 5°, I", extra_legal_basis_required: false, extra_requirement_i18n: { pt: "", en: "" } }], examples_i18n: { pt: ["nome completo", "CPF", "RG"], en: ["full name", "SSN"] }, scf_controls: ["DCH-01", "PRI-01"], auto_triggers: [] },
  { id: "contact", name_i18n: { pt: "Contato", en: "Contact" }, sensitivity: "normal", keywords_i18n: { pt: ["email", "telefone", "endereço", "celular"], en: ["email", "phone", "address"] }, article_by_regulation: [{ regulation_id: "lgpd", article: "Art. 5°, I", extra_legal_basis_required: false, extra_requirement_i18n: { pt: "", en: "" } }], examples_i18n: { pt: ["email", "telefone", "endereço residencial"], en: ["email", "phone"] }, scf_controls: ["DCH-01", "PRI-01"], auto_triggers: [] },
  { id: "financial", name_i18n: { pt: "Financeiro", en: "Financial" }, sensitivity: "normal", keywords_i18n: { pt: ["conta bancária", "cartão", "renda", "salário"], en: ["bank account", "credit card", "income"] }, article_by_regulation: [{ regulation_id: "lgpd", article: "Art. 5°, I", extra_legal_basis_required: false, extra_requirement_i18n: { pt: "", en: "" } }], examples_i18n: { pt: ["conta bancária", "cartão de crédito"], en: ["bank account", "credit card"] }, scf_controls: ["DCH-01", "CRY-01", "PRI-01"], auto_triggers: [] },
  { id: "health", name_i18n: { pt: "Saúde", en: "Health" }, sensitivity: "special", keywords_i18n: { pt: ["prontuário", "diagnóstico", "exame", "prescrição", "CID"], en: ["medical record", "diagnosis", "prescription"] }, article_by_regulation: [{ regulation_id: "lgpd", article: "Art. 11", extra_legal_basis_required: true, extra_requirement_i18n: { pt: "Base legal do Art. 11 obrigatória", en: "Art. 11 legal basis required" } }, { regulation_id: "hipaa_privacy", article: "§160.103", extra_legal_basis_required: true, extra_requirement_i18n: { pt: "Regras PHI", en: "PHI rules apply" } }], examples_i18n: { pt: ["prontuário médico", "diagnóstico"], en: ["medical history", "diagnosis"] }, scf_controls: ["DCH-01", "CRY-01", "PRI-05"], auto_triggers: [{ trigger: "dpia_required", condition_i18n: { pt: "Dados de saúde em larga escala", en: "Large scale health data" } }] },
  { id: "biometric", name_i18n: { pt: "Biométrico", en: "Biometric" }, sensitivity: "special", keywords_i18n: { pt: ["impressão digital", "facial", "íris", "voz"], en: ["fingerprint", "facial", "iris"] }, article_by_regulation: [{ regulation_id: "lgpd", article: "Art. 11", extra_legal_basis_required: true, extra_requirement_i18n: { pt: "Consentimento específico e destacado", en: "Explicit consent" } }], examples_i18n: { pt: ["impressão digital", "reconhecimento facial"], en: ["fingerprint", "facial recognition"] }, scf_controls: ["DCH-01", "CRY-01", "IAC-15"], auto_triggers: [{ trigger: "dpia_required", condition_i18n: { pt: "Tratamento de biometria", en: "Biometric processing" } }] },
  { id: "genetic", name_i18n: { pt: "Genético", en: "Genetic" }, sensitivity: "special", keywords_i18n: { pt: ["DNA", "genoma", "sequenciamento"], en: ["DNA", "genome"] }, article_by_regulation: [{ regulation_id: "lgpd", article: "Art. 11", extra_legal_basis_required: true, extra_requirement_i18n: { pt: "", en: "" } }, { regulation_id: "gdpr", article: "Art. 9", extra_legal_basis_required: true, extra_requirement_i18n: { pt: "", en: "" } }], examples_i18n: { pt: ["sequenciamento genético", "teste de paternidade"], en: ["genetic sequencing"] }, scf_controls: ["DCH-01", "CRY-01", "PRI-05"], auto_triggers: [{ trigger: "dpia_required", condition_i18n: { pt: "Dados genéticos", en: "Genetic data" } }] },
  { id: "political", name_i18n: { pt: "Opinião Política", en: "Political Opinion" }, sensitivity: "special", keywords_i18n: { pt: ["partido", "filiação", "ideologia"], en: ["party", "ideology"] }, article_by_regulation: [{ regulation_id: "lgpd", article: "Art. 11", extra_legal_basis_required: true, extra_requirement_i18n: { pt: "", en: "" } }], examples_i18n: { pt: ["filiação partidária"], en: ["party affiliation"] }, scf_controls: ["DCH-01", "PRI-05"], auto_triggers: [] },
  { id: "religious", name_i18n: { pt: "Convicção Religiosa", en: "Religious Belief" }, sensitivity: "special", keywords_i18n: { pt: ["religião", "crença", "fé"], en: ["religion", "belief", "faith"] }, article_by_regulation: [{ regulation_id: "lgpd", article: "Art. 11", extra_legal_basis_required: true, extra_requirement_i18n: { pt: "", en: "" } }], examples_i18n: { pt: ["religião", "crenças filosóficas"], en: ["religion", "philosophical belief"] }, scf_controls: ["DCH-01", "PRI-05"], auto_triggers: [] },
  { id: "sexual", name_i18n: { pt: "Vida Sexual / Orientação", en: "Sexual Life / Orientation" }, sensitivity: "special", keywords_i18n: { pt: ["orientação sexual", "vida sexual"], en: ["sexual orientation"] }, article_by_regulation: [{ regulation_id: "lgpd", article: "Art. 11", extra_legal_basis_required: true, extra_requirement_i18n: { pt: "", en: "" } }], examples_i18n: { pt: ["orientação sexual"], en: ["sexual orientation"] }, scf_controls: ["DCH-01", "PRI-05"], auto_triggers: [] },
  { id: "ethnic", name_i18n: { pt: "Origem Racial/Étnica", en: "Racial/Ethnic Origin" }, sensitivity: "special", keywords_i18n: { pt: ["raça", "etnia", "cor"], en: ["race", "ethnicity", "color"] }, article_by_regulation: [{ regulation_id: "lgpd", article: "Art. 11", extra_legal_basis_required: true, extra_requirement_i18n: { pt: "", en: "" } }], examples_i18n: { pt: ["raça", "etnia"], en: ["race", "ethnicity"] }, scf_controls: ["DCH-01", "PRI-05"], auto_triggers: [] },
  { id: "criminal", name_i18n: { pt: "Dados Criminais", en: "Criminal Data" }, sensitivity: "criminal", keywords_i18n: { pt: ["antecedentes", "condenação", "processo criminal"], en: ["criminal record", "conviction"] }, article_by_regulation: [{ regulation_id: "lgpd", article: "Art. 11", extra_legal_basis_required: true, extra_requirement_i18n: { pt: "", en: "" } }, { regulation_id: "gdpr", article: "Art. 10", extra_legal_basis_required: true, extra_requirement_i18n: { pt: "Somente sob controle de autoridade", en: "Only under official authority" } }], examples_i18n: { pt: ["antecedentes criminais", "condenações"], en: ["criminal records", "convictions"] }, scf_controls: ["DCH-01", "HRS-04"], auto_triggers: [] },
  { id: "children", name_i18n: { pt: "Dados de Crianças", en: "Children's Data" }, sensitivity: "special", keywords_i18n: { pt: ["menor", "criança", "adolescente"], en: ["minor", "child"] }, article_by_regulation: [{ regulation_id: "lgpd", article: "Art. 14", extra_legal_basis_required: true, extra_requirement_i18n: { pt: "Consentimento de responsável legal", en: "Guardian consent" } }], examples_i18n: { pt: ["dados de menores de 12 anos"], en: ["data of minors under 12"] }, scf_controls: ["DCH-01", "PRI-05"], auto_triggers: [{ trigger: "dpia_required", condition_i18n: { pt: "Tratamento de dados de menores", en: "Processing minors data" } }] },
  { id: "behavioral", name_i18n: { pt: "Comportamental", en: "Behavioral" }, sensitivity: "normal", keywords_i18n: { pt: ["navegação", "cookies", "preferências", "click"], en: ["browsing", "cookies", "preferences", "clicks"] }, article_by_regulation: [{ regulation_id: "lgpd", article: "Art. 12, §2°", extra_legal_basis_required: false, extra_requirement_i18n: { pt: "", en: "" } }], examples_i18n: { pt: ["histórico de navegação", "compras"], en: ["browsing history", "purchases"] }, scf_controls: ["DCH-01", "PRI-01"], auto_triggers: [{ trigger: "profiling_check", condition_i18n: { pt: "Pode configurar profiling", en: "May constitute profiling" } }] },
  { id: "geolocation", name_i18n: { pt: "Geolocalização", en: "Geolocation" }, sensitivity: "normal", keywords_i18n: { pt: ["GPS", "IP", "localização", "coordenadas"], en: ["GPS", "IP", "location", "coordinates"] }, article_by_regulation: [{ regulation_id: "lgpd", article: "Art. 12, §2°", extra_legal_basis_required: false, extra_requirement_i18n: { pt: "", en: "" } }], examples_i18n: { pt: ["GPS", "endereço IP"], en: ["GPS", "IP address"] }, scf_controls: ["DCH-01", "PRI-01"], auto_triggers: [{ trigger: "dpia_check", condition_i18n: { pt: "Monitoramento sistemático", en: "Systematic monitoring" } }] },
  { id: "professional", name_i18n: { pt: "Profissional", en: "Professional" }, sensitivity: "normal", keywords_i18n: { pt: ["cargo", "empresa anterior", "currículo"], en: ["job title", "previous employer", "resume"] }, article_by_regulation: [{ regulation_id: "lgpd", article: "Art. 5°, I", extra_legal_basis_required: false, extra_requirement_i18n: { pt: "", en: "" } }], examples_i18n: { pt: ["cargo", "empresa", "experiência"], en: ["job title", "company", "experience"] }, scf_controls: ["DCH-01", "HRS-01"], auto_triggers: [] },
  { id: "image", name_i18n: { pt: "Imagem/Foto", en: "Image/Photo" }, sensitivity: "normal", keywords_i18n: { pt: ["foto", "imagem", "vídeo", "CFTV"], en: ["photo", "image", "video", "CCTV"] }, article_by_regulation: [{ regulation_id: "lgpd", article: "Art. 5°, I", extra_legal_basis_required: false, extra_requirement_i18n: { pt: "", en: "" } }], examples_i18n: { pt: ["foto de documento", "gravação CFTV"], en: ["ID photo", "CCTV recording"] }, scf_controls: ["DCH-01", "PES-01"], auto_triggers: [] },
  { id: "education", name_i18n: { pt: "Educacional", en: "Educational" }, sensitivity: "normal", keywords_i18n: { pt: ["diploma", "certificado", "escolaridade"], en: ["diploma", "certificate", "education level"] }, article_by_regulation: [{ regulation_id: "lgpd", article: "Art. 5°, I", extra_legal_basis_required: false, extra_requirement_i18n: { pt: "", en: "" } }], examples_i18n: { pt: ["diploma", "histórico escolar"], en: ["diploma", "academic transcript"] }, scf_controls: ["DCH-01", "HRS-01"], auto_triggers: [] },
  { id: "union", name_i18n: { pt: "Filiação Sindical", en: "Trade Union" }, sensitivity: "special", keywords_i18n: { pt: ["sindicato", "filiação sindical"], en: ["union", "trade union membership"] }, article_by_regulation: [{ regulation_id: "lgpd", article: "Art. 11", extra_legal_basis_required: true, extra_requirement_i18n: { pt: "", en: "" } }, { regulation_id: "gdpr", article: "Art. 9", extra_legal_basis_required: true, extra_requirement_i18n: { pt: "", en: "" } }], examples_i18n: { pt: ["associação sindical"], en: ["trade union membership"] }, scf_controls: ["DCH-01", "PRI-05"], auto_triggers: [] },
  { id: "judicial", name_i18n: { pt: "Dados Judiciais", en: "Judicial Data" }, sensitivity: "normal", keywords_i18n: { pt: ["processo", "ação judicial", "litígio"], en: ["lawsuit", "litigation"] }, article_by_regulation: [{ regulation_id: "lgpd", article: "Art. 7°, VI", extra_legal_basis_required: false, extra_requirement_i18n: { pt: "", en: "" } }], examples_i18n: { pt: ["processos judiciais", "ações trabalhistas"], en: ["court cases", "labor claims"] }, scf_controls: ["DCH-01"], auto_triggers: [] },
  { id: "voice", name_i18n: { pt: "Voz", en: "Voice" }, sensitivity: "normal", keywords_i18n: { pt: ["gravação", "voz", "call center"], en: ["recording", "voice", "call center"] }, article_by_regulation: [{ regulation_id: "lgpd", article: "Art. 5°, I", extra_legal_basis_required: false, extra_requirement_i18n: { pt: "", en: "" } }], examples_i18n: { pt: ["gravação de call center", "mensagem de voz"], en: ["call center recording", "voicemail"] }, scf_controls: ["DCH-01", "PRI-01"], auto_triggers: [] }
];

DATA_CATEGORIES.forEach(i => DataCategoryRefSchema.parse(i));


// ── Retention Rules ─────────────────────────────────────────────────────────

export const RETENTION_RULES: RetentionRuleRef[] = [
  { data_category_id: "identification", context_id: "rh", context_i18n: { pt: "Relação trabalhista", en: "Employment relation" }, period_i18n: { pt: "5 a 30 anos", en: "5 to 30 years" }, min_months: 60, max_months: 360, legal_basis: "CLT Art. 11", jurisdiction: "BR", disposal_method: "secure_delete", scf_controls: ["DCH-17"] },
  { data_category_id: "contact", context_id: "marketing", context_i18n: { pt: "Marketing", en: "Marketing" }, period_i18n: { pt: "Até revogação", en: "Until revoked" }, min_months: 0, max_months: null, legal_basis: "Consentimento", jurisdiction: "BR", disposal_method: "secure_delete", scf_controls: ["DCH-17"] },
  { data_category_id: "financial", context_id: "fiscal", context_i18n: { pt: "Fiscal", en: "Tax" }, period_i18n: { pt: "5 a 10 anos", en: "5 to 10 years" }, min_months: 60, max_months: 120, legal_basis: "CTN Art. 173", jurisdiction: "BR", disposal_method: "crypto_shred", scf_controls: ["DCH-17", "CRY-01"] },
  { data_category_id: "health", context_id: "health_record", context_i18n: { pt: "Prontuário médico", en: "Health record" }, period_i18n: { pt: "20+ anos", en: "20+ years" }, min_months: 240, max_months: null, legal_basis: "CFM Res. 1821/07", jurisdiction: "BR", disposal_method: "secure_delete", scf_controls: ["DCH-17"] },
  { data_category_id: "biometric", context_id: "access", context_i18n: { pt: "Controle de acesso", en: "Access control" }, period_i18n: { pt: "Durante contrato", en: "During contract" }, min_months: 0, max_months: 60, legal_basis: "Contrato", jurisdiction: "BR", disposal_method: "secure_delete", scf_controls: ["DCH-17"] },
  { data_category_id: "criminal", context_id: "bg_check", context_i18n: { pt: "Background check", en: "Background check" }, period_i18n: { pt: "Durante processo", en: "During process" }, min_months: 0, max_months: 24, legal_basis: "Legítimo Interesse", jurisdiction: "BR", disposal_method: "secure_delete", scf_controls: ["DCH-17"] },
  { data_category_id: "behavioral", context_id: "analytics", context_i18n: { pt: "Analytics", en: "Analytics" }, period_i18n: { pt: "Até 2 anos", en: "Up to 2 years" }, min_months: 0, max_months: 24, legal_basis: "Consentimento", jurisdiction: "BR", disposal_method: "anonymization", scf_controls: ["PRI-01", "DCH-17"] },
  { data_category_id: "geolocation", context_id: "fleet", context_i18n: { pt: "Fleet management", en: "Fleet management" }, period_i18n: { pt: "1 a 3 anos", en: "1 to 3 years" }, min_months: 12, max_months: 36, legal_basis: "Contrato", jurisdiction: "BR", disposal_method: "secure_delete", scf_controls: ["DCH-17"] },
];

RETENTION_RULES.forEach(i => RetentionRuleRefSchema.parse(i));


// ── Life Cycle Stages ───────────────────────────────────────────────────────

const LIFE_CYCLE_STAGES: LifeCycleStageRef[] = [
  { id: "collection", name_i18n: { pt: "Coleta", en: "Collection" }, order: 1, description_i18n: { pt: "Obtenção dos dados", en: "Data acquisition" }, scf_controls: ["PRI-01", "PRI-03"], articles_by_regulation: { gdpr: "Art. 13-14", lgpd: "Art. 7" } },
  { id: "processing", name_i18n: { pt: "Processamento", en: "Processing" }, order: 2, description_i18n: { pt: "Operações realizadas", en: "Operations performed" }, scf_controls: ["PRI-01", "DCH-01"], articles_by_regulation: { gdpr: "Art. 5(1)(b)", lgpd: "Art. 6" } },
  { id: "storage", name_i18n: { pt: "Armazenamento", en: "Storage" }, order: 3, description_i18n: { pt: "Guarda dos dados", en: "Data warehousing" }, scf_controls: ["DCH-01", "CRY-01", "CRY-09"], articles_by_regulation: { gdpr: "Art. 5(1)(e)", lgpd: "Art. 6, VII" } },
  { id: "sharing", name_i18n: { pt: "Compartilhamento", en: "Sharing" }, order: 4, description_i18n: { pt: "Transmissão a terceiros", en: "Transmission to third parties" }, scf_controls: ["PRI-03", "TPM-01", "DCH-01"], articles_by_regulation: { gdpr: "Art. 26-28", lgpd: "Art. 26-27" } },
  { id: "archiving", name_i18n: { pt: "Arquivamento", en: "Archiving" }, order: 5, description_i18n: { pt: "Guarda prolongada", en: "Long-term storage" }, scf_controls: ["DCH-17", "PRI-01"], articles_by_regulation: { gdpr: "Art. 5(1)(e)", lgpd: "Art. 16" } },
  { id: "disposal", name_i18n: { pt: "Eliminação", en: "Disposal" }, order: 6, description_i18n: { pt: "Destruição", en: "Destruction" }, scf_controls: ["DCH-17", "DCH-18"], articles_by_regulation: { gdpr: "Art. 17", lgpd: "Art. 16" } }
];

LIFE_CYCLE_STAGES.forEach(i => LifeCycleStageRefSchema.parse(i));


// ── Data Origins ────────────────────────────────────────────────────────────

const DATA_ORIGINS: DataOriginRef[] = [
  { id: "direct_collection", name_i18n: { pt: "Coleta direta do titular", en: "Direct collection from subject" }, requires_consent_notice: true, scf_controls: ["PRI-01", "PRI-03"] },
  { id: "third_party", name_i18n: { pt: "Recebido de terceiros", en: "Received from third parties" }, requires_consent_notice: true, scf_controls: ["PRI-01", "PRI-03", "TPM-01"] },
  { id: "public_source", name_i18n: { pt: "Fonte publicamente disponível", en: "Publicly available source" }, requires_consent_notice: false, scf_controls: ["PRI-01"] },
  { id: "automated", name_i18n: { pt: "Coleta automatizada (cookies, logs)", en: "Automated collection (cookies, logs)" }, requires_consent_notice: true, scf_controls: ["PRI-01", "PRI-03"] },
  { id: "internal_generation", name_i18n: { pt: "Gerado internamente", en: "Internally generated" }, requires_consent_notice: false, scf_controls: ["PRI-01"] },
  { id: "legal_obligation", name_i18n: { pt: "Recebido por obrigação legal", en: "Received by legal obligation" }, requires_consent_notice: false, scf_controls: ["PRI-01", "CPL-01"] }
];

DATA_ORIGINS.forEach(i => DataOriginRefSchema.parse(i));


// ── Collection Methods ──────────────────────────────────────────────────────

const COLLECTION_METHODS: CollectionMethodRef[] = [
  { id: "web_form", name_i18n: { pt: "Formulário web", en: "Web form" }, requires_consent_checkbox: true, privacy_notice_required: true, scf_controls: ["PRI-01", "PRI-03"] },
  { id: "paper_form", name_i18n: { pt: "Formulário físico", en: "Paper form" }, requires_consent_checkbox: true, privacy_notice_required: true, scf_controls: ["PRI-01"] },
  { id: "api_integration", name_i18n: { pt: "Integração via API", en: "API Integration" }, requires_consent_checkbox: false, privacy_notice_required: false, scf_controls: ["PRI-01", "TPM-01"] },
  { id: "email", name_i18n: { pt: "Email", en: "Email" }, requires_consent_checkbox: false, privacy_notice_required: true, scf_controls: ["PRI-01"] },
  { id: "phone", name_i18n: { pt: "Telefone/Call Center", en: "Phone/Call Center" }, requires_consent_checkbox: false, privacy_notice_required: true, scf_controls: ["PRI-01"] },
  { id: "in_person", name_i18n: { pt: "Presencial", en: "In person" }, requires_consent_checkbox: false, privacy_notice_required: true, scf_controls: ["PRI-01"] },
  { id: "cookies_tracking", name_i18n: { pt: "Cookies/Tracking", en: "Cookies/Tracking" }, requires_consent_checkbox: true, privacy_notice_required: true, scf_controls: ["PRI-01", "PRI-03"] },
  { id: "cftv", name_i18n: { pt: "CFTV/Câmeras", en: "CCTV/Cameras" }, requires_consent_checkbox: false, privacy_notice_required: true, scf_controls: ["PES-01", "PRI-01"] },
  { id: "biometric_scanner", name_i18n: { pt: "Leitor biométrico", en: "Biometric scanner" }, requires_consent_checkbox: true, privacy_notice_required: true, scf_controls: ["IAC-15", "PRI-01"] }
];

COLLECTION_METHODS.forEach(i => CollectionMethodRefSchema.parse(i));


// ── Processing Purposes ─────────────────────────────────────────────────────

const PROCESSING_PURPOSES: ProcessingPurposeRef[] = [
  { id: "employment_management", name_i18n: { pt: "Gestão de Empregados", en: "Employee Management" }, category: "rh", typical_legal_basis: "contract", typical_retention_i18n: { pt: "5 anos após desligamento", en: "5 years post termination" }, dpia_likely: false, examples_i18n: { pt: ["folha de pagamento", "gestão de férias"], en: ["payroll", "vacation management"] }, scf_controls: ["PRI-01", "HRS-01"] },
  { id: "recruitment", name_i18n: { pt: "Recrutamento e Seleção", en: "Recruitment" }, category: "rh", typical_legal_basis: "consent", typical_retention_i18n: { pt: "2 anos", en: "2 years" }, dpia_likely: false, examples_i18n: { pt: ["análise de currículo", "entrevista"], en: ["resume review", "interviews"] }, scf_controls: ["PRI-01", "HRS-01"] },
  { id: "payroll", name_i18n: { pt: "Folha de Pagamento", en: "Payroll" }, category: "rh", typical_legal_basis: "legal_obligation", typical_retention_i18n: { pt: "30 anos (FGTS)", en: "30 years" }, dpia_likely: false, examples_i18n: { pt: ["cálculo de salário", "encargos"], en: ["salary calculation", "taxes"] }, scf_controls: ["PRI-01", "HRS-01"] },
  { id: "marketing_direct", name_i18n: { pt: "Marketing Direto", en: "Direct Marketing" }, category: "marketing", typical_legal_basis: "consent", typical_retention_i18n: { pt: "Até revogação", en: "Until revoked" }, dpia_likely: false, examples_i18n: { pt: ["envio de newsletter", "promoções"], en: ["newsletters", "promotions"] }, scf_controls: ["PRI-01", "PRI-03"] },
  { id: "marketing_analytics", name_i18n: { pt: "Analytics de Marketing", en: "Marketing Analytics" }, category: "marketing", typical_legal_basis: "legitimate_interest", typical_retention_i18n: { pt: "2 anos", en: "2 years" }, dpia_likely: true, examples_i18n: { pt: ["análise comportamental", "segmentação"], en: ["behavior analysis", "segmentation"] }, scf_controls: ["PRI-01", "PRI-05"] },
  { id: "contract_execution", name_i18n: { pt: "Execução de Contrato", en: "Contract Execution" }, category: "juridico", typical_legal_basis: "contract", typical_retention_i18n: { pt: "10 anos", en: "10 years" }, dpia_likely: false, examples_i18n: { pt: ["prestação de serviço", "entrega de produto"], en: ["service delivery", "product fulfillment"] }, scf_controls: ["PRI-01"] },
  { id: "legal_compliance", name_i18n: { pt: "Conformidade Legal", en: "Legal Compliance" }, category: "compliance", typical_legal_basis: "legal_obligation", typical_retention_i18n: { pt: "Conforme legislação", en: "As per law" }, dpia_likely: false, examples_i18n: { pt: ["obrigações fiscais", "relatórios regulatórios"], en: ["tax obligations", "regulatory reports"] }, scf_controls: ["PRI-01", "CPL-01"] },
  { id: "security_monitoring", name_i18n: { pt: "Monitoramento de Segurança", en: "Security Monitoring" }, category: "ti", typical_legal_basis: "legitimate_interest", typical_retention_i18n: { pt: "1 ano", en: "1 year" }, dpia_likely: true, examples_i18n: { pt: ["SIEM", "logs de acesso", "DLP"], en: ["SIEM", "access logs", "DLP"] }, scf_controls: ["MON-01", "PRI-01"] },
  { id: "vendor_management", name_i18n: { pt: "Gestão de Fornecedores", en: "Vendor Management" }, category: "compras", typical_legal_basis: "contract", typical_retention_i18n: { pt: "5 anos após fim do contrato", en: "5 years post contract" }, dpia_likely: false, examples_i18n: { pt: ["cadastro de fornecedor", "due diligence"], en: ["vendor onboarding", "due diligence"] }, scf_controls: ["TPM-01", "PRI-01"] },
  { id: "fraud_prevention", name_i18n: { pt: "Prevenção à Fraude", en: "Fraud Prevention" }, category: "compliance", typical_legal_basis: "legitimate_interest", typical_retention_i18n: { pt: "5 anos", en: "5 years" }, dpia_likely: true, examples_i18n: { pt: ["análise antifraude", "KYC"], en: ["anti-fraud analysis", "KYC"] }, scf_controls: ["PRI-01", "RSK-01"] }
];

PROCESSING_PURPOSES.forEach(i => ProcessingPurposeRefSchema.parse(i));


// ── Security Measures ───────────────────────────────────────────────────────

const SECURITY_MEASURES: SecurityMeasureRef[] = [
  { id: "encryption_at_rest", name_i18n: { pt: "Criptografia em repouso", en: "Encryption at rest" }, category: "technical", scf_controls: ["CRY-01", "CRY-09"], applicable_data_categories: ["all"], priority_for_sensitive: "mandatory", priority_for_normal: "recommended" },
  { id: "encryption_in_transit", name_i18n: { pt: "Criptografia em trânsito (TLS)", en: "Encryption in transit (TLS)" }, category: "technical", scf_controls: ["CRY-03"], applicable_data_categories: ["all"], priority_for_sensitive: "mandatory", priority_for_normal: "mandatory" },
  { id: "access_control", name_i18n: { pt: "Controle de acesso lógico", en: "Logical access control" }, category: "technical", scf_controls: ["IAC-06", "IAC-15"], applicable_data_categories: ["all"], priority_for_sensitive: "mandatory", priority_for_normal: "mandatory" },
  { id: "audit_logging", name_i18n: { pt: "Registro de auditoria", en: "Audit logging" }, category: "technical", scf_controls: ["MON-01", "AIS-01"], applicable_data_categories: ["all"], priority_for_sensitive: "mandatory", priority_for_normal: "recommended" },
  { id: "data_masking", name_i18n: { pt: "Mascaramento de dados", en: "Data masking" }, category: "technical", scf_controls: ["DCH-01", "CRY-01"], applicable_data_categories: ["health", "financial", "criminal"], priority_for_sensitive: "mandatory", priority_for_normal: "optional" },
  { id: "dlp", name_i18n: { pt: "Prevenção contra vazamento (DLP)", en: "Data loss prevention (DLP)" }, category: "technical", scf_controls: ["DLP-01"], applicable_data_categories: ["all"], priority_for_sensitive: "mandatory", priority_for_normal: "recommended" },
  { id: "backup", name_i18n: { pt: "Backup com teste de restore", en: "Backup with restore test" }, category: "technical", scf_controls: ["BCD-01", "BCD-04"], applicable_data_categories: ["all"], priority_for_sensitive: "mandatory", priority_for_normal: "mandatory" },
  { id: "anonymization", name_i18n: { pt: "Anonimização/Pseudonimização", en: "Anonymization/Pseudonymization" }, category: "technical", scf_controls: ["PRI-01"], applicable_data_categories: ["health", "behavioral", "geolocation"], priority_for_sensitive: "recommended", priority_for_normal: "optional" },
  { id: "privacy_policy", name_i18n: { pt: "Política de privacidade", en: "Privacy policy" }, category: "organizational", scf_controls: ["GOV-02", "PRI-01"], applicable_data_categories: ["all"], priority_for_sensitive: "mandatory", priority_for_normal: "mandatory" },
  { id: "training", name_i18n: { pt: "Treinamento de conscientização", en: "Awareness training" }, category: "organizational", scf_controls: ["SAT-01", "SAT-03"], applicable_data_categories: ["all"], priority_for_sensitive: "mandatory", priority_for_normal: "recommended" },
  { id: "nda", name_i18n: { pt: "Acordo de confidencialidade (NDA)", en: "Non-disclosure agreement (NDA)" }, category: "organizational", scf_controls: ["HRS-05"], applicable_data_categories: ["all"], priority_for_sensitive: "mandatory", priority_for_normal: "recommended" },
  { id: "physical_access", name_i18n: { pt: "Controle de acesso físico", en: "Physical access control" }, category: "physical", scf_controls: ["PES-01", "PES-02"], applicable_data_categories: ["all"], priority_for_sensitive: "mandatory", priority_for_normal: "recommended" },
  { id: "clean_desk", name_i18n: { pt: "Política de mesa limpa", en: "Clean desk policy" }, category: "physical", scf_controls: ["PES-06"], applicable_data_categories: ["all"], priority_for_sensitive: "recommended", priority_for_normal: "optional" }
];

SECURITY_MEASURES.forEach(i => SecurityMeasureRefSchema.parse(i));


// ── Disposal Methods ────────────────────────────────────────────────────────

const DISPOSAL_METHODS: DisposalMethodRef[] = [
  { id: "secure_delete", name_i18n: { pt: "Exclusão segura (wipe)", en: "Secure deletion (wipe)" }, description_i18n: { pt: "Sobrescrita de dados em mídia", en: "Data overwrite on media" }, applicable_to: "digital", scf_controls: ["DCH-17", "DCH-18"], articles_by_regulation: { lgpd: "Art. 16" } },
  { id: "crypto_shred", name_i18n: { pt: "Crypto shredding", en: "Crypto shredding" }, description_i18n: { pt: "Destruição da chave de criptografia", en: "Encryption key destruction" }, applicable_to: "digital", scf_controls: ["CRY-01", "DCH-17"], articles_by_regulation: { lgpd: "Art. 16" } },
  { id: "physical_destruction", name_i18n: { pt: "Destruição física", en: "Physical destruction" }, description_i18n: { pt: "Trituração ou incineração", en: "Shredding or incineration" }, applicable_to: "both", scf_controls: ["DCH-17", "DCH-18"], articles_by_regulation: { lgpd: "Art. 16" } },
  { id: "anonymization", name_i18n: { pt: "Anonimização", en: "Anonymization" }, description_i18n: { pt: "Tornar impossível a identificação", en: "Make identification impossible" }, applicable_to: "digital", scf_controls: ["PRI-01", "DCH-17"], articles_by_regulation: { lgpd: "Art. 12, §1°" } },
  { id: "paper_shredding", name_i18n: { pt: "Trituração de papel", en: "Paper shredding" }, description_i18n: { pt: "Destruição de documentos físicos", en: "Destruction of physical documents" }, applicable_to: "physical", scf_controls: ["DCH-18"], articles_by_regulation: { lgpd: "Art. 16" } }
];

DISPOSAL_METHODS.forEach(i => DisposalMethodRefSchema.parse(i));


// ── Risk Factors ────────────────────────────────────────────────────────────

const RISK_FACTORS: RiskFactorRef[] = [
  { id: "sensitive_data", name_i18n: { pt: "Dados sensíveis", en: "Sensitive data" }, description_i18n: { pt: "Envolve dados especiais", en: "Involves special categories" }, weight: 3, triggers_dpia: true, triggers_lia: false, regulation_refs: ["LGPD Art. 11", "GDPR Art. 9"], detection_rule: "data_categories.sensitivity == 'special'", scf_controls: ["PRI-05", "DCH-01"] },
  { id: "large_scale", name_i18n: { pt: "Larga escala", en: "Large scale" }, description_i18n: { pt: "Volume significativo", en: "Significant volume" }, weight: 3, triggers_dpia: true, triggers_lia: false, regulation_refs: ["GDPR Art. 35(3)(b)"], detection_rule: "data_volume IN ('high', 'very_high')", scf_controls: ["PRI-05"] },
  { id: "minors", name_i18n: { pt: "Dados de menores", en: "Minors data" }, description_i18n: { pt: "Envolve crianças/adolescentes", en: "Involves children/teens" }, weight: 3, triggers_dpia: true, triggers_lia: false, regulation_refs: ["LGPD Art. 14"], detection_rule: "data_subjects CONTAINS 'minor'", scf_controls: ["PRI-05", "PRI-01"] },
  { id: "automated_decision", name_i18n: { pt: "Decisão automatizada", en: "Automated decision" }, description_i18n: { pt: "Decisões automáticas", en: "Automatic decisions" }, weight: 3, triggers_dpia: true, triggers_lia: false, regulation_refs: ["LGPD Art. 20", "GDPR Art. 22"], detection_rule: "automated_decision == true", scf_controls: ["PRI-05", "PRI-01"] },
  { id: "profiling", name_i18n: { pt: "Profiling", en: "Profiling" }, description_i18n: { pt: "Análise comportamental", en: "Behavioral analysis" }, weight: 2, triggers_dpia: true, triggers_lia: false, regulation_refs: ["GDPR Art. 35(3)(a)"], detection_rule: "profiling == true", scf_controls: ["PRI-05"] }
];

RISK_FACTORS.forEach(i => RiskFactorRefSchema.parse(i));


// ── Volume Scale ────────────────────────────────────────────────────────────

export const VOLUME_SCALE: VolumeScaleRef[] = [
  { id: "very_low", label_i18n: { pt: "Muito Baixo", en: "Very Low" }, max_records: 100, risk_contribution: 0 },
  { id: "low", label_i18n: { pt: "Baixo", en: "Low" }, max_records: 1000, risk_contribution: 1 },
  { id: "medium", label_i18n: { pt: "Médio", en: "Medium" }, max_records: 10000, risk_contribution: 2 },
  { id: "high", label_i18n: { pt: "Alto", en: "High" }, max_records: 100000, risk_contribution: 3 },
  { id: "very_high", label_i18n: { pt: "Muito Alto", en: "Very High" }, max_records: Number.MAX_SAFE_INTEGER, risk_contribution: 4 }
];

VOLUME_SCALE.forEach(i => VolumeScaleRefSchema.parse(i));


// ── Governance Reference Data ───────────────────────────────────────────────

const MATURITY_LEVELS: MaturityLevelRef[] = [
  { level: 1, label_i18n: { pt: "Inicial", en: "Initial" }, description_i18n: { pt: "Processos ad-hoc, reativos.", en: "Ad-hoc, reactive processes." } },
  { level: 2, label_i18n: { pt: "Gerenciado", en: "Managed" }, description_i18n: { pt: "Processos básicos documentados.", en: "Basic documented processes." } },
  { level: 3, label_i18n: { pt: "Definido", en: "Defined" }, description_i18n: { pt: "Processos padronizados e institucionalizados.", en: "Standardized processes." } },
  { level: 4, label_i18n: { pt: "Mensurado", en: "Measured" }, description_i18n: { pt: "Métricas e KPIs definidos.", en: "Metrics and KPIs defined." } },
  { level: 5, label_i18n: { pt: "Otimizado", en: "Optimized" }, description_i18n: { pt: "Melhoria contínua e inovação.", en: "Continuous improvement." } }
];

MATURITY_LEVELS.forEach(i => MaturityLevelRefSchema.parse(i));


const BG_CHECK_TYPES: BgCheckTypeRef[] = [
  { id: "criminal", name_i18n: { pt: "Antecedentes Criminais", en: "Criminal Record" }, scf_controls: ["HRS-04"], required_for_clearance: ["standard", "elevated", "privileged"] },
  { id: "credit", name_i18n: { pt: "Análise de Crédito", en: "Credit Check" }, scf_controls: ["HRS-04"], required_for_clearance: ["elevated", "privileged"] },
  { id: "education", name_i18n: { pt: "Verificação de Escolaridade", en: "Education Check" }, scf_controls: ["HRS-04"], required_for_clearance: ["privileged"] },
  { id: "employment", name_i18n: { pt: "Verificação de Empregos", en: "Employment Check" }, scf_controls: ["HRS-04"], required_for_clearance: ["elevated", "privileged"] },
  { id: "identity", name_i18n: { pt: "Verificação de Identidade", en: "Identity Verification" }, scf_controls: ["HRS-04", "IAC-01"], required_for_clearance: ["standard", "elevated", "privileged"] }
];

BG_CHECK_TYPES.forEach(i => BgCheckTypeRefSchema.parse(i));


const CLEARANCE_LEVELS: ClearanceLevelRef[] = [
  { id: "standard", name_i18n: { pt: "Padrão", en: "Standard" }, required_checks: ["identity", "criminal"], scf_controls: ["HRS-04", "IAC-01"] },
  { id: "elevated", name_i18n: { pt: "Elevado", en: "Elevated" }, required_checks: ["identity", "criminal", "credit", "employment", "sanctions"], scf_controls: ["HRS-04", "IAC-01", "IAC-06"] },
  { id: "privileged", name_i18n: { pt: "Privilegiado", en: "Privileged" }, required_checks: ["identity", "criminal", "credit", "employment", "education", "reference", "sanctions"], scf_controls: ["HRS-04", "IAC-01", "IAC-06", "IAC-20"] }
];

CLEARANCE_LEVELS.forEach(i => ClearanceLevelRefSchema.parse(i));


const DEPARTMENTS: DepartmentRef[] = [
  { id: "geral", name_i18n: { pt: "Geral / Administrativo", en: "General / Admin" }, typical_data_subjects: ["employee", "visitor"], typical_processing_purposes: ["employment_management"] },
  { id: "ti", name_i18n: { pt: "Tecnologia da Informação", en: "Information Technology" }, typical_data_subjects: ["employee", "contractor"], typical_processing_purposes: ["security_monitoring", "employment_management"] },
  { id: "rh", name_i18n: { pt: "Recursos Humanos", en: "Human Resources" }, typical_data_subjects: ["employee", "candidate", "contractor"], typical_processing_purposes: ["recruitment", "employment_management", "payroll", "benefits_management", "health_safety", "training"] },
  { id: "juridico", name_i18n: { pt: "Jurídico", en: "Legal" }, typical_data_subjects: ["employee", "customer", "supplier"], typical_processing_purposes: ["legal_compliance", "contract_execution"] },
  { id: "compliance", name_i18n: { pt: "Compliance / GRC", en: "Compliance / GRC" }, typical_data_subjects: ["employee", "supplier"], typical_processing_purposes: ["legal_compliance", "audit_governance", "fraud_prevention"] },
  { id: "financeiro", name_i18n: { pt: "Financeiro", en: "Finance" }, typical_data_subjects: ["employee", "customer", "supplier"], typical_processing_purposes: ["payroll", "contract_execution", "legal_compliance"] }
];

DEPARTMENTS.forEach(i => DepartmentRefSchema.parse(i));


// ── Routes ──────────────────────────────────────────────────────────────────

export const referenceDataRoutes: RouteDefinition[] = [
  // ROPA
  {
    method: "GET", path: "/api/v1/reference-data/data-subjects", authRequired: true, tenantRequired: false,
    handler: async ({ request, traceId }) => json(flattenI18n({ data: DATA_SUBJECTS, total: DATA_SUBJECTS.length, trace_id: traceId }, new URL(request.url).searchParams.get("locale") ?? "")),
  },
  {
    method: "GET", path: "/api/v1/reference-data/data-categories", authRequired: true, tenantRequired: false,
    handler: async ({ request, traceId }) => {
      const url = new URL(request.url);
      const sensitivity = url.searchParams.get("sensitivity");
      let filtered = DATA_CATEGORIES;
      if (sensitivity) filtered = filtered.filter(c => c.sensitivity === sensitivity);
      return json(flattenI18n({ data: filtered, total: filtered.length, trace_id: traceId }, url.searchParams.get("locale") ?? ""));
    },
  },
  {
    method: "GET", path: "/api/v1/reference-data/retention-rules", authRequired: true, tenantRequired: false,
    handler: async ({ request, traceId }) => json(flattenI18n({ data: RETENTION_RULES, trace_id: traceId }, new URL(request.url).searchParams.get("locale") ?? ""))
  },
  {
    method: "GET", path: "/api/v1/reference-data/life-cycle-stages", authRequired: true, tenantRequired: false,
    handler: async ({ request, traceId }) => json(flattenI18n({ data: LIFE_CYCLE_STAGES, trace_id: traceId }, new URL(request.url).searchParams.get("locale") ?? "")),
  },
  {
    method: "GET", path: "/api/v1/reference-data/data-origins", authRequired: true, tenantRequired: false,
    handler: async ({ request, traceId }) => json(flattenI18n({ data: DATA_ORIGINS, trace_id: traceId }, new URL(request.url).searchParams.get("locale") ?? "")),
  },
  {
    method: "GET", path: "/api/v1/reference-data/collection-methods", authRequired: true, tenantRequired: false,
    handler: async ({ request, traceId }) => json(flattenI18n({ data: COLLECTION_METHODS, trace_id: traceId }, new URL(request.url).searchParams.get("locale") ?? "")),
  },
  {
    method: "GET", path: "/api/v1/reference-data/processing-purposes", authRequired: true, tenantRequired: false,
    handler: async ({ request, traceId }) => {
      const url = new URL(request.url);
      const category = url.searchParams.get("category");
      let filtered = PROCESSING_PURPOSES;
      if (category) filtered = filtered.filter(p => p.category === category);
      return json(flattenI18n({ data: filtered, total: filtered.length, trace_id: traceId }, url.searchParams.get("locale") ?? ""));
    },
  },
  {
    method: "GET", path: "/api/v1/reference-data/security-measures", authRequired: true, tenantRequired: false,
    handler: async ({ request, traceId }) => {
      const url = new URL(request.url);
      const sensitivity = url.searchParams.get("sensitivity");
      let filtered = SECURITY_MEASURES;
      if (sensitivity === "special") filtered = filtered.filter(m => m.priority_for_sensitive !== "optional");
      return json(flattenI18n({ data: filtered, total: filtered.length, trace_id: traceId }, url.searchParams.get("locale") ?? ""));
    },
  },
  {
    method: "GET", path: "/api/v1/reference-data/disposal-methods", authRequired: true, tenantRequired: false,
    handler: async ({ request, traceId }) => json(flattenI18n({ data: DISPOSAL_METHODS, trace_id: traceId }, new URL(request.url).searchParams.get("locale") ?? "")),
  },
  {
    method: "GET", path: "/api/v1/reference-data/risk-factors", authRequired: true, tenantRequired: false,
    handler: async ({ request, traceId }) => json(flattenI18n({ data: RISK_FACTORS, total: RISK_FACTORS.length, trace_id: traceId }, new URL(request.url).searchParams.get("locale") ?? "")),
  },
  {
    method: "GET", path: "/api/v1/reference-data/volume-scale", authRequired: true, tenantRequired: false,
    handler: async ({ request, traceId }) => json(flattenI18n({ data: VOLUME_SCALE, trace_id: traceId }, new URL(request.url).searchParams.get("locale") ?? "")),
  },

  // GOVERNANCE
  {
    method: "GET", path: "/api/v1/reference-data/maturity-levels", authRequired: true, tenantRequired: false,
    handler: async ({ request, traceId }) => json(flattenI18n({ data: MATURITY_LEVELS, trace_id: traceId }, new URL(request.url).searchParams.get("locale") ?? "")),
  },
  {
    method: "GET", path: "/api/v1/reference-data/bg-check-types", authRequired: true, tenantRequired: false,
    handler: async ({ request, traceId }) => json(flattenI18n({ data: BG_CHECK_TYPES, total: BG_CHECK_TYPES.length, trace_id: traceId }, new URL(request.url).searchParams.get("locale") ?? "")),
  },
  {
    method: "GET", path: "/api/v1/reference-data/clearance-levels", authRequired: true, tenantRequired: false,
    handler: async ({ request, traceId }) => json(flattenI18n({ data: CLEARANCE_LEVELS, trace_id: traceId }, new URL(request.url).searchParams.get("locale") ?? "")),
  },
  {
    method: "GET", path: "/api/v1/reference-data/departments", authRequired: true, tenantRequired: false,
    handler: async ({ request, traceId }) => json(flattenI18n({ data: DEPARTMENTS, total: DEPARTMENTS.length, trace_id: traceId }, new URL(request.url).searchParams.get("locale") ?? "")),
  }
];
