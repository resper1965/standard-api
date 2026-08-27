/**
 * CB-E: ROPA Reference Data
 *
 * Dados de referÃªncia para inventÃ¡rio de dados pessoais (ROPA).
 * 11 endpoints estÃ¡ticos com dados de referÃªncia para alimentar o mÃ³dulo Privacy do Standard.
 * Todos linkam ao SCF via scf_controls[].
 */
import type { RouteDefinition } from "../http";
import { json, routeParam, routeUuidParam } from "../http";
import { ApiError } from "../errors/api-error";
import { flattenI18n } from "../utils/i18n";

// â”€â”€ Data Subjects â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const DATA_SUBJECTS = [
  {
    id: "employee",
    name_i18n: { pt: "Empregado", en: "Employee" },
    type: "internal" as const,
    is_minor: false,
    requires_consent_by_default: false,
    default_legal_basis: "contract",
    examples_i18n: { pt: ["CLT", "estagiÃ¡rio registrado"] },
    applicable_regulations: ["lgpd", "gdpr"],
    scf_controls: ["PRI-01", "HRS-01"],
  },
  {
    id: "customer",
    name_i18n: { pt: "Cliente", en: "Customer" },
    type: "b2c" as const,
    is_minor: false,
    requires_consent_by_default: true,
    default_legal_basis: "consent",
    examples_i18n: { pt: ["pessoa fÃ­sica consumidora"] },
    applicable_regulations: ["lgpd", "gdpr", "ccpa"],
    scf_controls: ["PRI-01", "PRI-03"],
  },
  {
    id: "candidate",
    name_i18n: { pt: "Candidato", en: "Candidate" },
    type: "external" as const,
    is_minor: false,
    requires_consent_by_default: true,
    default_legal_basis: "consent",
    examples_i18n: { pt: ["candidato a vaga de emprego"] },
    applicable_regulations: ["lgpd", "gdpr"],
    scf_controls: ["PRI-01", "HRS-01"],
  },
  {
    id: "supplier",
    name_i18n: { pt: "Fornecedor (PF)", en: "Supplier" },
    type: "b2b" as const,
    is_minor: false,
    requires_consent_by_default: false,
    default_legal_basis: "contract",
    examples_i18n: {
      pt: ["representante comercial PF", "prestador de serviÃ§o PF"],
    },
    applicable_regulations: ["lgpd", "gdpr"],
    scf_controls: ["PRI-01", "TPM-01"],
  },
  {
    id: "visitor",
    name_i18n: { pt: "Visitante", en: "Visitor" },
    type: "external" as const,
    is_minor: false,
    requires_consent_by_default: true,
    default_legal_basis: "legitimate_interest",
    examples_i18n: {
      pt: ["visitante Ã s instalaÃ§Ãµes", "visitante de website"],
    },
    applicable_regulations: ["lgpd", "gdpr"],
    scf_controls: ["PRI-01", "PES-01"],
  },
  {
    id: "patient",
    name_i18n: { pt: "Paciente", en: "Patient" },
    type: "b2c" as const,
    is_minor: false,
    requires_consent_by_default: false,
    default_legal_basis: "health",
    examples_i18n: { pt: ["paciente em clÃ­nica ou hospital"] },
    applicable_regulations: ["lgpd", "gdpr", "hipaa_privacy"],
    scf_controls: ["PRI-01", "PRI-05"],
  },
  {
    id: "student",
    name_i18n: { pt: "Aluno", en: "Student" },
    type: "b2c" as const,
    is_minor: false,
    requires_consent_by_default: true,
    default_legal_basis: "contract",
    examples_i18n: { pt: ["aluno de instituiÃ§Ã£o de ensino"] },
    applicable_regulations: ["lgpd", "gdpr"],
    scf_controls: ["PRI-01"],
  },
  {
    id: "minor",
    name_i18n: { pt: "Menor de Idade", en: "Minor" },
    type: "b2c" as const,
    is_minor: true,
    requires_consent_by_default: true,
    default_legal_basis: "consent",
    examples_i18n: { pt: ["crianÃ§a ou adolescente"] },
    applicable_regulations: ["lgpd", "gdpr"],
    scf_controls: ["PRI-01", "PRI-05"],
  },
  {
    id: "legal_representative",
    name_i18n: { pt: "Representante Legal", en: "Legal Representative" },
    type: "external" as const,
    is_minor: false,
    requires_consent_by_default: false,
    default_legal_basis: "legitimate_interest",
    examples_i18n: { pt: ["pai/mÃ£e", "procurador"] },
    applicable_regulations: ["lgpd", "gdpr"],
    scf_controls: ["PRI-01"],
  },
  {
    id: "contractor",
    name_i18n: { pt: "Terceirizado", en: "Contractor" },
    type: "internal" as const,
    is_minor: false,
    requires_consent_by_default: false,
    default_legal_basis: "contract",
    examples_i18n: { pt: ["profissional PJ alocado", "temporÃ¡rio"] },
    applicable_regulations: ["lgpd", "gdpr"],
    scf_controls: ["PRI-01", "TPM-01"],
  },
  {
    id: "public_servant",
    name_i18n: { pt: "Servidor PÃºblico", en: "Public Servant" },
    type: "internal" as const,
    is_minor: false,
    requires_consent_by_default: false,
    default_legal_basis: "public_administration",
    examples_i18n: { pt: ["funcionÃ¡rio de Ã³rgÃ£o pÃºblico"] },
    applicable_regulations: ["lgpd"],
    scf_controls: ["PRI-01"],
  },
];

const DATA_CATEGORIES = [
  {
    id: "identification",
    name_i18n: { pt: "IdentificaÃ§Ã£o", en: "Identification" },
    sensitivity: "normal" as const,
    keywords_i18n: { pt: ["nome", "CPF", "RG", "passaporte", "CNH"] },
    article_by_regulation: [
      {
        regulation_id: "lgpd",
        article: "Art. 5Â°, I",
        extra_legal_basis_required: false,
        extra_requirement_i18n: { pt: "" },
      },
    ],
    examples_i18n: { pt: ["nome completo", "CPF", "RG"] },
    scf_controls: ["DCH-01", "PRI-01"],
    retention_rules: [
      {
        context_i18n: { pt: "RelaÃ§Ã£o trabalhista" },
        min_years: 5,
        max_years: 30,
        legal_basis: "CLT Art. 11",
        jurisdiction: "BR",
      },
    ],
    auto_triggers: [],
  },
  {
    id: "contact",
    name_i18n: { pt: "Contato", en: "Contact" },
    sensitivity: "normal" as const,
    keywords_i18n: { pt: ["email", "telefone", "endereÃ§o", "celular"] },
    article_by_regulation: [
      {
        regulation_id: "lgpd",
        article: "Art. 5Â°, I",
        extra_legal_basis_required: false,
        extra_requirement_i18n: { pt: "" },
      },
    ],
    examples_i18n: { pt: ["email", "telefone", "endereÃ§o residencial"] },
    scf_controls: ["DCH-01", "PRI-01"],
    retention_rules: [
      {
        context_i18n: { pt: "Marketing" },
        min_years: 0,
        max_years: null,
        legal_basis: "AtÃ© revogaÃ§Ã£o do consentimento",
        jurisdiction: "BR",
      },
    ],
    auto_triggers: [],
  },
  {
    id: "financial",
    name_i18n: { pt: "Financeiro", en: "Financial" },
    sensitivity: "normal" as const,
    keywords_i18n: { pt: ["conta bancÃ¡ria", "cartÃ£o", "renda", "salÃ¡rio"] },
    article_by_regulation: [
      {
        regulation_id: "lgpd",
        article: "Art. 5Â°, I",
        extra_legal_basis_required: false,
        extra_requirement_i18n: { pt: "" },
      },
    ],
    examples_i18n: { pt: ["conta bancÃ¡ria", "cartÃ£o de crÃ©dito"] },
    scf_controls: ["DCH-01", "CRY-01", "PRI-01"],
    retention_rules: [
      {
        context_i18n: { pt: "Fiscal" },
        min_years: 5,
        max_years: 10,
        legal_basis: "CTN Art. 173",
        jurisdiction: "BR",
      },
    ],
    auto_triggers: [],
  },
  {
    id: "health",
    name_i18n: { pt: "SaÃºde", en: "Health" },
    sensitivity: "special" as const,
    keywords_i18n: {
      pt: ["prontuÃ¡rio", "diagnÃ³stico", "exame", "prescriÃ§Ã£o", "CID"],
    },
    article_by_regulation: [
      {
        regulation_id: "lgpd",
        article: "Art. 11",
        extra_legal_basis_required: true,
        extra_requirement_i18n: { pt: "Base legal do Art. 11 obrigatÃ³ria" },
      },
      {
        regulation_id: "hipaa_privacy",
        article: "Â§160.103",
        extra_legal_basis_required: true,
        extra_requirement_i18n: { pt: "PHI rules apply" },
      },
    ],
    examples_i18n: { pt: ["prontuÃ¡rio mÃ©dico", "diagnÃ³stico", "exames"] },
    scf_controls: ["DCH-01", "CRY-01", "PRI-05"],
    retention_rules: [
      {
        context_i18n: { pt: "ProntuÃ¡rio mÃ©dico" },
        min_years: 20,
        max_years: null,
        legal_basis: "CFM Res. 1821/07",
        jurisdiction: "BR",
      },
    ],
    auto_triggers: [
      {
        trigger: "dpia_required",
        condition_i18n: { pt: "Dados de saÃºde em larga escala" },
      },
    ],
  },
  {
    id: "biometric",
    name_i18n: { pt: "BiomÃ©trico", en: "Biometric" },
    sensitivity: "special" as const,
    keywords_i18n: { pt: ["impressÃ£o digital", "facial", "Ã­ris", "voz"] },
    article_by_regulation: [
      {
        regulation_id: "lgpd",
        article: "Art. 11",
        extra_legal_basis_required: true,
        extra_requirement_i18n: { pt: "Consentimento especÃ­fico e destacado" },
      },
    ],
    examples_i18n: { pt: ["impressÃ£o digital", "reconhecimento facial"] },
    scf_controls: ["DCH-01", "CRY-01", "IAC-15"],
    retention_rules: [
      {
        context_i18n: { pt: "Controle de acesso" },
        min_years: 0,
        max_years: 5,
        legal_basis: "DuraÃ§Ã£o contratual",
        jurisdiction: "BR",
      },
    ],
    auto_triggers: [
      {
        trigger: "dpia_required",
        condition_i18n: { pt: "Tratamento de biometria" },
      },
    ],
  },
  {
    id: "genetic",
    name_i18n: { pt: "GenÃ©tico", en: "Genetic" },
    sensitivity: "special" as const,
    keywords_i18n: { pt: ["DNA", "genoma", "sequenciamento"] },
    article_by_regulation: [
      {
        regulation_id: "lgpd",
        article: "Art. 11",
        extra_legal_basis_required: true,
        extra_requirement_i18n: { pt: "" },
      },
      {
        regulation_id: "gdpr",
        article: "Art. 9",
        extra_legal_basis_required: true,
        extra_requirement_i18n: { pt: "" },
      },
    ],
    examples_i18n: { pt: ["sequenciamento genÃ©tico", "teste de paternidade"] },
    scf_controls: ["DCH-01", "CRY-01", "PRI-05"],
    retention_rules: [],
    auto_triggers: [
      { trigger: "dpia_required", condition_i18n: { pt: "Dados genÃ©ticos" } },
    ],
  },
  {
    id: "political",
    name_i18n: { pt: "OpiniÃ£o PolÃ­tica", en: "Political Opinion" },
    sensitivity: "special" as const,
    keywords_i18n: { pt: ["partido", "filiaÃ§Ã£o", "ideologia"] },
    article_by_regulation: [
      {
        regulation_id: "lgpd",
        article: "Art. 11",
        extra_legal_basis_required: true,
        extra_requirement_i18n: { pt: "" },
      },
    ],
    examples_i18n: { pt: ["filiaÃ§Ã£o partidÃ¡ria"] },
    scf_controls: ["DCH-01", "PRI-05"],
    retention_rules: [],
    auto_triggers: [],
  },
  {
    id: "religious",
    name_i18n: { pt: "ConvicÃ§Ã£o Religiosa", en: "Religious Belief" },
    sensitivity: "special" as const,
    keywords_i18n: { pt: ["religiÃ£o", "crenÃ§a", "fÃ©"] },
    article_by_regulation: [
      {
        regulation_id: "lgpd",
        article: "Art. 11",
        extra_legal_basis_required: true,
        extra_requirement_i18n: { pt: "" },
      },
    ],
    examples_i18n: { pt: ["religiÃ£o", "crenÃ§as filosÃ³ficas"] },
    scf_controls: ["DCH-01", "PRI-05"],
    retention_rules: [],
    auto_triggers: [],
  },
  {
    id: "sexual",
    name_i18n: {
      pt: "Vida Sexual / OrientaÃ§Ã£o",
      en: "Sexual Life / Orientation",
    },
    sensitivity: "special" as const,
    keywords_i18n: { pt: ["orientaÃ§Ã£o sexual", "vida sexual"] },
    article_by_regulation: [
      {
        regulation_id: "lgpd",
        article: "Art. 11",
        extra_legal_basis_required: true,
        extra_requirement_i18n: { pt: "" },
      },
    ],
    examples_i18n: { pt: ["orientaÃ§Ã£o sexual"] },
    scf_controls: ["DCH-01", "PRI-05"],
    retention_rules: [],
    auto_triggers: [],
  },
  {
    id: "ethnic",
    name_i18n: { pt: "Origem Racial/Ã‰tnica", en: "Racial/Ethnic Origin" },
    sensitivity: "special" as const,
    keywords_i18n: { pt: ["raÃ§a", "etnia", "cor"] },
    article_by_regulation: [
      {
        regulation_id: "lgpd",
        article: "Art. 11",
        extra_legal_basis_required: true,
        extra_requirement_i18n: { pt: "" },
      },
    ],
    examples_i18n: { pt: ["raÃ§a", "etnia"] },
    scf_controls: ["DCH-01", "PRI-05"],
    retention_rules: [],
    auto_triggers: [],
  },
  {
    id: "criminal",
    name_i18n: { pt: "Dados Criminais", en: "Criminal Data" },
    sensitivity: "criminal" as const,
    keywords_i18n: {
      pt: ["antecedentes", "condenaÃ§Ã£o", "processo criminal"],
    },
    article_by_regulation: [
      {
        regulation_id: "lgpd",
        article: "Art. 11",
        extra_legal_basis_required: true,
        extra_requirement_i18n: { pt: "" },
      },
      {
        regulation_id: "gdpr",
        article: "Art. 10",
        extra_legal_basis_required: true,
        extra_requirement_i18n: {
          pt: "Somente sob controle de autoridade oficial",
        },
      },
    ],
    examples_i18n: { pt: ["antecedentes criminais", "condenaÃ§Ãµes"] },
    scf_controls: ["DCH-01", "HRS-04"],
    retention_rules: [
      {
        context_i18n: { pt: "Background check" },
        min_years: 0,
        max_years: 2,
        legal_basis: "DuraÃ§Ã£o do processo seletivo/contrato",
        jurisdiction: "BR",
      },
    ],
    auto_triggers: [],
  },
  {
    id: "children",
    name_i18n: { pt: "Dados de CrianÃ§as", en: "Children's Data" },
    sensitivity: "special" as const,
    keywords_i18n: { pt: ["menor", "crianÃ§a", "adolescente"] },
    article_by_regulation: [
      {
        regulation_id: "lgpd",
        article: "Art. 14",
        extra_legal_basis_required: true,
        extra_requirement_i18n: { pt: "Consentimento de responsÃ¡vel legal" },
      },
    ],
    examples_i18n: { pt: ["dados de menores de 12 anos"] },
    scf_controls: ["DCH-01", "PRI-05"],
    retention_rules: [],
    auto_triggers: [
      {
        trigger: "dpia_required",
        condition_i18n: { pt: "Tratamento de dados de menores" },
      },
    ],
  },
  {
    id: "behavioral",
    name_i18n: { pt: "Comportamental", en: "Behavioral" },
    sensitivity: "normal" as const,
    keywords_i18n: { pt: ["navegaÃ§Ã£o", "cookies", "preferÃªncias", "click"] },
    article_by_regulation: [
      {
        regulation_id: "lgpd",
        article: "Art. 12, Â§2Â°",
        extra_legal_basis_required: false,
        extra_requirement_i18n: { pt: "" },
      },
    ],
    examples_i18n: { pt: ["histÃ³rico de navegaÃ§Ã£o", "compras"] },
    scf_controls: ["DCH-01", "PRI-01"],
    retention_rules: [
      {
        context_i18n: { pt: "Analytics" },
        min_years: 0,
        max_years: 2,
        legal_basis: "Consentimento ou anonimizaÃ§Ã£o",
        jurisdiction: "BR",
      },
    ],
    auto_triggers: [
      {
        trigger: "profiling_check",
        condition_i18n: { pt: "Pode configurar profiling" },
      },
    ],
  },
  {
    id: "geolocation",
    name_i18n: { pt: "GeolocalizaÃ§Ã£o", en: "Geolocation" },
    sensitivity: "normal" as const,
    keywords_i18n: { pt: ["GPS", "IP", "localizaÃ§Ã£o", "coordenadas"] },
    article_by_regulation: [
      {
        regulation_id: "lgpd",
        article: "Art. 12, Â§2Â°",
        extra_legal_basis_required: false,
        extra_requirement_i18n: { pt: "" },
      },
    ],
    examples_i18n: { pt: ["GPS", "endereÃ§o IP"] },
    scf_controls: ["DCH-01", "PRI-01"],
    retention_rules: [
      {
        context_i18n: { pt: "Fleet management" },
        min_years: 1,
        max_years: 3,
        legal_basis: "ObrigaÃ§Ã£o contratual",
        jurisdiction: "BR",
      },
    ],
    auto_triggers: [
      {
        trigger: "dpia_check",
        condition_i18n: { pt: "Monitoramento sistemÃ¡tico" },
      },
    ],
  },
  {
    id: "professional",
    name_i18n: { pt: "Profissional", en: "Professional" },
    sensitivity: "normal" as const,
    keywords_i18n: { pt: ["cargo", "empresa anterior", "currÃ­culo"] },
    article_by_regulation: [
      {
        regulation_id: "lgpd",
        article: "Art. 5Â°, I",
        extra_legal_basis_required: false,
        extra_requirement_i18n: { pt: "" },
      },
    ],
    examples_i18n: { pt: ["cargo", "empresa", "experiÃªncia"] },
    scf_controls: ["DCH-01", "HRS-01"],
    retention_rules: [
      {
        context_i18n: { pt: "Recrutamento" },
        min_years: 0,
        max_years: 2,
        legal_basis: "Consentimento",
        jurisdiction: "BR",
      },
    ],
    auto_triggers: [],
  },
  {
    id: "image",
    name_i18n: { pt: "Imagem/Foto", en: "Image/Photo" },
    sensitivity: "normal" as const,
    keywords_i18n: { pt: ["foto", "imagem", "vÃ­deo", "CFTV"] },
    article_by_regulation: [
      {
        regulation_id: "lgpd",
        article: "Art. 5Â°, I",
        extra_legal_basis_required: false,
        extra_requirement_i18n: { pt: "" },
      },
    ],
    examples_i18n: { pt: ["foto de documento", "gravaÃ§Ã£o CFTV"] },
    scf_controls: ["DCH-01", "PES-01"],
    retention_rules: [
      {
        context_i18n: { pt: "CFTV" },
        min_years: 0,
        max_years: 1,
        legal_basis: "LegÃ­timo interesse",
        jurisdiction: "BR",
      },
    ],
    auto_triggers: [],
  },
  {
    id: "education",
    name_i18n: { pt: "Educacional", en: "Educational" },
    sensitivity: "normal" as const,
    keywords_i18n: { pt: ["diploma", "certificado", "escolaridade"] },
    article_by_regulation: [
      {
        regulation_id: "lgpd",
        article: "Art. 5Â°, I",
        extra_legal_basis_required: false,
        extra_requirement_i18n: { pt: "" },
      },
    ],
    examples_i18n: { pt: ["diploma", "histÃ³rico escolar"] },
    scf_controls: ["DCH-01", "HRS-01"],
    retention_rules: [
      {
        context_i18n: { pt: "Emprego" },
        min_years: 5,
        max_years: 30,
        legal_basis: "CLT",
        jurisdiction: "BR",
      },
    ],
    auto_triggers: [],
  },
  {
    id: "union",
    name_i18n: { pt: "FiliaÃ§Ã£o Sindical", en: "Trade Union" },
    sensitivity: "special" as const,
    keywords_i18n: { pt: ["sindicato", "filiaÃ§Ã£o sindical"] },
    article_by_regulation: [
      {
        regulation_id: "lgpd",
        article: "Art. 11",
        extra_legal_basis_required: true,
        extra_requirement_i18n: { pt: "" },
      },
      {
        regulation_id: "gdpr",
        article: "Art. 9",
        extra_legal_basis_required: true,
        extra_requirement_i18n: { pt: "" },
      },
    ],
    examples_i18n: { pt: ["associaÃ§Ã£o sindical"] },
    scf_controls: ["DCH-01", "PRI-05"],
    retention_rules: [],
    auto_triggers: [],
  },
  {
    id: "judicial",
    name_i18n: { pt: "Dados Judiciais", en: "Judicial Data" },
    sensitivity: "normal" as const,
    keywords_i18n: { pt: ["processo", "aÃ§Ã£o judicial", "litÃ­gio"] },
    article_by_regulation: [
      {
        regulation_id: "lgpd",
        article: "Art. 7Â°, VI",
        extra_legal_basis_required: false,
        extra_requirement_i18n: { pt: "" },
      },
    ],
    examples_i18n: { pt: ["processos judiciais", "aÃ§Ãµes trabalhistas"] },
    scf_controls: ["DCH-01"],
    retention_rules: [
      {
        context_i18n: { pt: "PrescriÃ§Ã£o" },
        min_years: 5,
        max_years: 20,
        legal_basis: "CC Art. 205/206",
        jurisdiction: "BR",
      },
    ],
    auto_triggers: [],
  },
  {
    id: "voice",
    name_i18n: { pt: "Voz", en: "Voice" },
    sensitivity: "normal" as const,
    keywords_i18n: { pt: ["gravaÃ§Ã£o", "voz", "call center"] },
    article_by_regulation: [
      {
        regulation_id: "lgpd",
        article: "Art. 5Â°, I",
        extra_legal_basis_required: false,
        extra_requirement_i18n: { pt: "" },
      },
    ],
    examples_i18n: { pt: ["gravaÃ§Ã£o de call center", "mensagem de voz"] },
    scf_controls: ["DCH-01", "PRI-01"],
    retention_rules: [
      {
        context_i18n: { pt: "Call center" },
        min_years: 0,
        max_years: 5,
        legal_basis: "RegulaÃ§Ã£o setorial",
        jurisdiction: "BR",
      },
    ],
    auto_triggers: [],
  },
];

// â”€â”€ Life Cycle Stages â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const LIFE_CYCLE_STAGES = [
  {
    id: "collection",
    name_i18n: { pt: "Coleta" },
    order: 1,
    description_i18n: {
      pt: "ObtenÃ§Ã£o dos dados pessoais junto ao titular ou terceiros",
    },
    scf_controls: ["PRI-01", "PRI-03"],
    gdpr_article: "Art. 13-14",
    lgpd_article: "Art. 7",
  },
  {
    id: "processing",
    name_i18n: { pt: "Processamento" },
    order: 2,
    description_i18n: {
      pt: "OperaÃ§Ãµes realizadas sobre os dados (classificaÃ§Ã£o, anÃ¡lise, etc.)",
    },
    scf_controls: ["PRI-01", "DCH-01"],
    gdpr_article: "Art. 5(1)(b)",
    lgpd_article: "Art. 6",
  },
  {
    id: "storage",
    name_i18n: { pt: "Armazenamento" },
    order: 3,
    description_i18n: { pt: "Guarda dos dados em meio fÃ­sico ou digital" },
    scf_controls: ["DCH-01", "CRY-01", "CRY-09"],
    gdpr_article: "Art. 5(1)(e)",
    lgpd_article: "Art. 6, VII",
  },
  {
    id: "sharing",
    name_i18n: { pt: "Compartilhamento" },
    order: 4,
    description_i18n: { pt: "TransmissÃ£o a terceiros internos ou externos" },
    scf_controls: ["PRI-03", "TPM-01", "DCH-01"],
    gdpr_article: "Art. 26-28",
    lgpd_article: "Art. 26-27",
  },
  {
    id: "archiving",
    name_i18n: { pt: "Arquivamento" },
    order: 5,
    description_i18n: {
      pt: "Guarda prolongada apÃ³s encerramento da finalidade primÃ¡ria",
    },
    scf_controls: ["DCH-17", "PRI-01"],
    gdpr_article: "Art. 5(1)(e)",
    lgpd_article: "Art. 16",
  },
  {
    id: "disposal",
    name_i18n: { pt: "EliminaÃ§Ã£o" },
    order: 6,
    description_i18n: {
      pt: "DestruiÃ§Ã£o dos dados ao fim do perÃ­odo de retenÃ§Ã£o",
    },
    scf_controls: ["DCH-17", "DCH-18"],
    gdpr_article: "Art. 17",
    lgpd_article: "Art. 16",
  },
];

// â”€â”€ Data Origins â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const DATA_ORIGINS = [
  {
    id: "direct_collection",
    name_i18n: { pt: "Coleta Direta", en: "Direct Collection" },
    requires_consent: true,
    gdpr_article: "Art. 13",
    lgpd_article: "Art. 9",
  },
  {
    id: "indirect_collection",
    name_i18n: { pt: "Coleta Indireta", en: "Indirect Collection" },
    requires_consent: false,
    gdpr_article: "Art. 14",
    lgpd_article: "Art. 10",
  },
  {
    id: "public_source",
    name_i18n: { pt: "Dados PÃºblicos", en: "Public Data" },
    requires_consent: false,
    gdpr_article: "Art. 9(2)(e)",
    lgpd_article: "Art. 7, Â§4Â°",
  },
  {
    id: "sharing_from_partner",
    name_i18n: { pt: "Compartilhamento por Parceiro", en: "Partner Sharing" },
    requires_consent: false,
    gdpr_article: "Art. 26",
    lgpd_article: "Art. 7, Â§5Â°",
  },
];

// â”€â”€ Collection Methods â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const COLLECTION_METHODS = [
  {
    id: "web_form",
    name_i18n: { pt: "FormulÃ¡rio Web" },
    security_controls: ["PRI-01", "NET-01"],
  },
  {
    id: "mobile_app",
    name_i18n: { pt: "Aplicativo MÃ³vel" },
    security_controls: ["PRI-01", "NET-01", "CRY-01"],
  },
  {
    id: "paper_form",
    name_i18n: { pt: "FormulÃ¡rio FÃ­sico" },
    security_controls: ["PES-01", "DCH-01"],
  },
  {
    id: "phone_call",
    name_i18n: { pt: "Chamada TelefÃ´nica" },
    security_controls: ["PRI-01"],
  },
  {
    id: "face_to_face",
    name_i18n: { pt: "Atendimento Presencial" },
    security_controls: ["PES-01"],
  },
  {
    id: "api_integration",
    name_i18n: { pt: "IntegraÃ§Ã£o via API" },
    security_controls: ["IAC-01", "NET-01", "CRY-01"],
  },
  {
    id: "iot_device",
    name_i18n: { pt: "Dispositivo IoT" },
    security_controls: ["CRY-01", "NET-01"],
  },
];

// â”€â”€ Processing Purposes â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const PROCESSING_PURPOSES = [
  {
    id: "payroll",
    name_i18n: {
      pt: "GestÃ£o de Folha de Pagamento",
      en: "Payroll Management",
    },
    category: "hr",
    typical_retention_i18n: { pt: "30 anos (FGTS)", en: "30 years (FGTS)" },
    legal_basis: "legal_obligation",
    examples_i18n: {
      pt: ["cÃ¡lculo de salÃ¡rio", "pagamento de impostos"],
      en: ["salary calculation", "tax payment"],
    },
  },
  {
    id: "marketing_direct",
    name_i18n: { pt: "Marketing Direto", en: "Direct Marketing" },
    category: "marketing",
    typical_retention_i18n: { pt: "AtÃ© revogaÃ§Ã£o", en: "Until revocation" },
    legal_basis: "consent",
    examples_i18n: {
      pt: ["envio de newsletter", "oferta de produtos"],
      en: ["newsletter sending", "product offers"],
    },
  },
  {
    id: "fraud_prevention",
    name_i18n: { pt: "PrevenÃ§Ã£o Ã  Fraude", en: "Fraud Prevention" },
    category: "security",
    typical_retention_i18n: { pt: "5 anos", en: "5 years" },
    legal_basis: "legitimate_interest",
    examples_i18n: {
      pt: [
        "anÃ¡lise de comportamento de compra",
        "verificaÃ§Ã£o de identidade",
      ],
      en: ["purchase behavior analysis", "identity verification"],
    },
  },
  {
    id: "customer_support",
    name_i18n: { pt: "Suporte ao Cliente", en: "Customer Support" },
    category: "operations",
    typical_retention_i18n: { pt: "5 anos", en: "5 years" },
    legal_basis: "contract",
    examples_i18n: {
      pt: ["atendimento de chamados", "resoluÃ§Ã£o de dÃºvidas"],
      en: ["ticket handling", "doubt resolution"],
    },
  },
];

// â”€â”€ Security Measures â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const SECURITY_MEASURES = [
  {
    id: "encryption_in_transit",
    name_i18n: {
      pt: "Criptografia em trÃ¢nsito (TLS)",
      en: "Encryption in transit (TLS)",
    },
    category: "technical" as const,
    scf_controls: ["CRY-03"],
    applicable_data_categories: ["all"],
    priority_for_sensitive: "mandatory" as const,
    priority_for_normal: "mandatory" as const,
  },
  {
    id: "access_control",
    name_i18n: {
      pt: "Controle de acesso lÃ³gico",
      en: "Logical access control",
    },
    category: "technical" as const,
    scf_controls: ["IAC-06", "IAC-15"],
    applicable_data_categories: ["all"],
    priority_for_sensitive: "mandatory" as const,
    priority_for_normal: "mandatory" as const,
  },
  {
    id: "audit_logging",
    name_i18n: { pt: "Registro de auditoria", en: "Audit logging" },
    category: "technical" as const,
    scf_controls: ["MON-01", "AIS-01"],
    applicable_data_categories: ["all"],
    priority_for_sensitive: "mandatory" as const,
    priority_for_normal: "recommended" as const,
  },
  {
    id: "data_masking",
    name_i18n: { pt: "Mascaramento de dados", en: "Data masking" },
    category: "technical" as const,
    scf_controls: ["DCH-01", "CRY-01"],
    applicable_data_categories: ["health", "financial", "criminal"],
    priority_for_sensitive: "mandatory" as const,
    priority_for_normal: "optional" as const,
  },
  {
    id: "dlp",
    name_i18n: {
      pt: "PrevenÃ§Ã£o contra vazamento (DLP)",
      en: "Data Leak Prevention (DLP)",
    },
    category: "technical" as const,
    scf_controls: ["DLP-01"],
    applicable_data_categories: ["all"],
    priority_for_sensitive: "mandatory" as const,
    priority_for_normal: "recommended" as const,
  },
  {
    id: "backup",
    name_i18n: {
      pt: "Backup com teste de restore",
      en: "Backup with restore test",
    },
    category: "technical" as const,
    scf_controls: ["BCD-01", "BCD-04"],
    applicable_data_categories: ["all"],
    priority_for_sensitive: "mandatory" as const,
    priority_for_normal: "mandatory" as const,
  },
  {
    id: "anonymization",
    name_i18n: {
      pt: "AnonimizaÃ§Ã£o/PseudonimizaÃ§Ã£o",
      en: "Anonymization/Pseudonymization",
    },
    category: "technical" as const,
    scf_controls: ["PRI-01"],
    applicable_data_categories: ["health", "behavioral", "geolocation"],
    priority_for_sensitive: "recommended" as const,
    priority_for_normal: "optional" as const,
  },
  {
    id: "privacy_policy",
    name_i18n: { pt: "PolÃ­tica de privacidade", en: "Privacy policy" },
    category: "organizational" as const,
    scf_controls: ["GOV-02", "PRI-01"],
    applicable_data_categories: ["all"],
    priority_for_sensitive: "mandatory" as const,
    priority_for_normal: "mandatory" as const,
  },
  {
    id: "training",
    name_i18n: {
      pt: "Treinamento de conscientizaÃ§Ã£o",
      en: "Awareness training",
    },
    category: "organizational" as const,
    scf_controls: ["SAT-01", "SAT-03"],
    applicable_data_categories: ["all"],
    priority_for_sensitive: "mandatory" as const,
    priority_for_normal: "recommended" as const,
  },
  {
    id: "nda",
    name_i18n: {
      pt: "Acordo de confidencialidade (NDA)",
      en: "Non-Disclosure Agreement (NDA)",
    },
    category: "organizational" as const,
    scf_controls: ["HRS-05"],
    applicable_data_categories: ["all"],
    priority_for_sensitive: "mandatory" as const,
    priority_for_normal: "recommended" as const,
  },
  {
    id: "physical_access",
    name_i18n: {
      pt: "Controle de acesso fÃ­sico",
      en: "Physical access control",
    },
    category: "physical" as const,
    scf_controls: ["PES-01", "PES-02"],
    applicable_data_categories: ["all"],
    priority_for_sensitive: "mandatory" as const,
    priority_for_normal: "recommended" as const,
  },
  {
    id: "clean_desk",
    name_i18n: { pt: "PolÃ­tica de mesa limpa", en: "Clean desk policy" },
    category: "physical" as const,
    scf_controls: ["PES-06"],
    applicable_data_categories: ["all"],
    priority_for_sensitive: "recommended" as const,
    priority_for_normal: "optional" as const,
  },
];

// â”€â”€ Disposal Methods â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const DISPOSAL_METHODS = [
  {
    id: "secure_delete",
    name_i18n: { pt: "ExclusÃ£o segura (wipe)", en: "Secure delete (wipe)" },
    description_i18n: {
      pt: "Sobrescrita de dados em mÃ­dia digital com algoritmo certificado",
      en: "Overwriting data on digital media with a certified algorithm",
    },
    applicable_to: "digital" as const,
    scf_controls: ["DCH-17", "DCH-18"],
    lgpd_article: "Art. 16",
  },
  {
    id: "crypto_shred",
    name_i18n: { pt: "Crypto shredding", en: "Crypto shredding" },
    description_i18n: {
      pt: "DestruiÃ§Ã£o da chave de criptografia tornando dados irrecuperÃ¡veis",
      en: "Destruction of the encryption key making data unrecoverable",
    },
    applicable_to: "digital" as const,
    scf_controls: ["CRY-01", "DCH-17"],
    lgpd_article: "Art. 16",
  },
  {
    id: "physical_destruction",
    name_i18n: { pt: "DestruiÃ§Ã£o fÃ­sica", en: "Physical destruction" },
    description_i18n: {
      pt: "TrituraÃ§Ã£o, desmagnetizaÃ§Ã£o ou incineraÃ§Ã£o de mÃ­dia",
      en: "Shredding, degaussing or incineration of media",
    },
    applicable_to: "both" as const,
    scf_controls: ["DCH-17", "DCH-18"],
    lgpd_article: "Art. 16",
  },
  {
    id: "anonymization",
    name_i18n: { pt: "AnonimizaÃ§Ã£o", en: "Anonymization" },
    description_i18n: {
      pt: "Tornar impossÃ­vel a identificaÃ§Ã£o do titular (irreversÃ­vel)",
      en: "Making identification of the subject impossible (irreversible)",
    },
    applicable_to: "digital" as const,
    scf_controls: ["PRI-01", "DCH-17"],
    lgpd_article: "Art. 12, Â§1Â°",
  },
  {
    id: "paper_shredding",
    name_i18n: { pt: "TrituraÃ§Ã£o de papel", en: "Paper shredding" },
    description_i18n: {
      pt: "DestruiÃ§Ã£o de documentos fÃ­sicos em fragmentadora",
      en: "Destruction of physical documents in a shredder",
    },
    applicable_to: "physical" as const,
    scf_controls: ["DCH-18"],
    lgpd_article: "Art. 16",
  },
];

// â”€â”€ Risk Factors â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const RISK_FACTORS = [
  {
    id: "sensitive_data",
    name_i18n: { pt: "Dados sensÃ­veis", en: "Sensitive data" },
    description_i18n: {
      pt: "Tratamento envolve dados de categorias especiais",
      en: "Processing involves special categories of data",
    },
    weight: 3,
    triggers_dpia: true,
    triggers_lia: false,
    regulation_ref: "LGPD Art. 11 / GDPR Art. 9",
    detection_rule: "data_categories.sensitivity == 'special'",
    scf_controls: ["PRI-05", "DCH-01"],
  },
  {
    id: "large_scale",
    name_i18n: { pt: "Larga escala", en: "Large scale" },
    description_i18n: {
      pt: "Volume significativo de titulares ou registros",
      en: "Significant volume of data subjects or records",
    },
    weight: 3,
    triggers_dpia: true,
    triggers_lia: false,
    regulation_ref: "GDPR Art. 35(3)(b)",
    detection_rule: "data_volume IN ('high', 'very_high')",
    scf_controls: ["PRI-05"],
  },
  {
    id: "minors",
    name_i18n: { pt: "Dados de menores", en: "Minors' data" },
    description_i18n: {
      pt: "Tratamento envolve dados de crianÃ§as/adolescentes",
      en: "Processing involves data of children/adolescents",
    },
    weight: 3,
    triggers_dpia: true,
    triggers_lia: false,
    regulation_ref: "LGPD Art. 14",
    detection_rule: "data_subjects CONTAINS 'minor'",
    scf_controls: ["PRI-05", "PRI-01"],
  },
  {
    id: "systematic_monitoring",
    name_i18n: {
      pt: "Monitoramento sistemÃ¡tico",
      en: "Systematic monitoring",
    },
    description_i18n: {
      pt: "ObservaÃ§Ã£o contÃ­nua e sistemÃ¡tica de titulares",
      en: "Continuous and systematic observation of data subjects",
    },
    weight: 3,
    triggers_dpia: true,
    triggers_lia: false,
    regulation_ref: "GDPR Art. 35(3)(c)",
    detection_rule: null,
    scf_controls: ["PRI-05", "MON-01"],
  },
  {
    id: "automated_decision",
    name_i18n: { pt: "DecisÃ£o automatizada", en: "Automated decision" },
    description_i18n: {
      pt: "DecisÃµes com efeitos legais baseadas em tratamento automatizado",
      en: "Decisions with legal effects based on automated processing",
    },
    weight: 3,
    triggers_dpia: true,
    triggers_lia: false,
    regulation_ref: "LGPD Art. 20 / GDPR Art. 22",
    detection_rule: "automated_decision == true",
    scf_controls: ["PRI-05", "PRI-01"],
  },
  {
    id: "profiling",
    name_i18n: { pt: "Profiling", en: "Profiling" },
    description_i18n: {
      pt: "AnÃ¡lise de aspectos pessoais para prever comportamento",
      en: "Analysis of personal aspects to predict behavior",
    },
    weight: 2,
    triggers_dpia: true,
    triggers_lia: false,
    regulation_ref: "GDPR Art. 35(3)(a)",
    detection_rule: "profiling == true",
    scf_controls: ["PRI-05"],
  },
  {
    id: "biometric_usage",
    name_i18n: { pt: "Uso de biometria", en: "Biometric usage" },
    description_i18n: {
      pt: "Tratamento de dados biomÃ©tricos para identificaÃ§Ã£o",
      en: "Processing of biometric data for identification",
    },
    weight: 2,
    triggers_dpia: true,
    triggers_lia: false,
    regulation_ref: "LGPD Art. 11 / GDPR Art. 9",
    detection_rule: "data_categories CONTAINS 'biometric'",
    scf_controls: ["PRI-05", "IAC-15"],
  },
  {
    id: "geolocation_usage",
    name_i18n: { pt: "Uso de geolocalizaÃ§Ã£o", en: "Geolocation usage" },
    description_i18n: {
      pt: "Rastreamento de localizaÃ§Ã£o de titulares",
      en: "Tracking of data subjects' location",
    },
    weight: 2,
    triggers_dpia: true,
    triggers_lia: false,
    regulation_ref: "GDPR Recital 75",
    detection_rule: "data_categories CONTAINS 'geolocation'",
    scf_controls: ["PRI-05"],
  },
  {
    id: "combined_datasets",
    name_i18n: {
      pt: "CombinaÃ§Ã£o de bases de dados",
      en: "Combination of databases",
    },
    description_i18n: {
      pt: "Cruzamento de dados de diferentes fontes",
      en: "Crossing data from different sources",
    },
    weight: 1,
    triggers_dpia: false,
    triggers_lia: false,
    regulation_ref: "WP29 Guidelines",
    detection_rule: null,
    scf_controls: ["PRI-05", "DCH-01"],
  },
  {
    id: "health_data_volume",
    name_i18n: { pt: "Dados de saÃºde em volume", en: "Health data in volume" },
    description_i18n: {
      pt: "Tratamento de dados de saÃºde em escala nÃ£o individual",
      en: "Processing of health data on a non-individual scale",
    },
    weight: 3,
    triggers_dpia: true,
    triggers_lia: false,
    regulation_ref: "LGPD Art. 11 + Art. 38",
    detection_rule:
      "data_categories CONTAINS 'health' AND data_volume != 'low'",
    scf_controls: ["PRI-05"],
  },
  {
    id: "transfer_no_adequacy",
    name_i18n: {
      pt: "TransferÃªncia sem adequaÃ§Ã£o",
      en: "Transfer without adequacy",
    },
    description_i18n: {
      pt: "TransferÃªncia internacional para paÃ­s sem decisÃ£o de adequaÃ§Ã£o",
      en: "International transfer to a country without an adequacy decision",
    },
    weight: 2,
    triggers_dpia: false,
    triggers_lia: false,
    regulation_ref: "LGPD Art. 33 / GDPR Art. 44-49",
    detection_rule: "international_transfer AND NOT adequacy_decision",
    scf_controls: ["PRI-09"],
  },
  {
    id: "legitimate_interest",
    name_i18n: { pt: "LegÃ­timo interesse", en: "Legitimate interest" },
    description_i18n: {
      pt: "Tratamento baseado em legÃ­timo interesse do controlador",
      en: "Processing based on legitimate interest of the controller",
    },
    weight: 0,
    triggers_dpia: false,
    triggers_lia: true,
    regulation_ref: "LGPD Art. 10, Â§3Â° / GDPR Art. 6(1)(f)",
    detection_rule: "legal_basis == 'legitimate_interest'",
    scf_controls: ["PRI-01"],
  },
  {
    id: "new_technology",
    name_i18n: { pt: "Nova tecnologia", en: "New technology" },
    description_i18n: {
      pt: "Uso de tecnologia emergente no tratamento",
      en: "Use of emerging technology in processing",
    },
    weight: 2,
    triggers_dpia: true,
    triggers_lia: false,
    regulation_ref: "GDPR Art. 35(1)",
    detection_rule: null,
    scf_controls: ["PRI-05"],
  },
];

// â”€â”€ Volume Scale â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const VOLUME_SCALE = [
  {
    id: "very_low",
    label_i18n: { pt: "Muito Baixo", en: "Very Low" },
    max_records: 100,
    risk_contribution: 0,
  },
  {
    id: "low",
    label_i18n: { pt: "Baixo", en: "Low" },
    max_records: 1000,
    risk_contribution: 1,
  },
  {
    id: "medium",
    label_i18n: { pt: "MÃ©dio", en: "Medium" },
    max_records: 10000,
    risk_contribution: 2,
  },
  {
    id: "high",
    label_i18n: { pt: "Alto", en: "High" },
    max_records: 100000,
    risk_contribution: 3,
  },
  {
    id: "very_high",
    label_i18n: { pt: "Muito Alto", en: "Very High" },
    max_records: Number.MAX_SAFE_INTEGER,
    risk_contribution: 4,
  },
];

// â”€â”€ Routes â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const ropaRoutes: RouteDefinition[] = [
  {
    method: "GET",
    path: "/api/v1/ropa/data-subjects",
    authRequired: true,
    tenantRequired: false,
    permissions: ["scf:read"],
    handler: async ({ request, traceId }) => {
      const locale = (new URL(request.url).searchParams.get("locale") ||
        "pt") as any;
      return json({
        data: flattenI18n(DATA_SUBJECTS, locale),
        total: DATA_SUBJECTS.length,
        trace_id: traceId,
      });
    },
  },
  {
    method: "GET",
    path: "/api/v1/ropa/data-categories",
    authRequired: true,
    tenantRequired: false,
    permissions: ["scf:read"],
    handler: async ({ request, traceId }) => {
      const locale = (new URL(request.url).searchParams.get("locale") ||
        "pt") as any;
      const url = new URL(request.url);
      const sensitivity = url.searchParams.get("sensitivity");
      let filtered = DATA_CATEGORIES;
      if (sensitivity)
        filtered = filtered.filter((c) => c.sensitivity === sensitivity);
      return json({
        data: flattenI18n(filtered, locale),
        total: filtered.length,
        trace_id: traceId,
      });
    },
  },
  {
    method: "GET",
    path: "/api/v1/ropa/life-cycle-stages",
    authRequired: true,
    tenantRequired: false,
    permissions: ["scf:read"],
    handler: async ({ request, traceId }) => {
      const locale = (new URL(request.url).searchParams.get("locale") ||
        "pt") as any;
      return json({
        data: flattenI18n(LIFE_CYCLE_STAGES, locale),
        trace_id: traceId,
      });
    },
  },
  {
    method: "GET",
    path: "/api/v1/ropa/data-origins",
    authRequired: true,
    tenantRequired: false,
    permissions: ["scf:read"],
    handler: async ({ request, traceId }) => {
      const locale = (new URL(request.url).searchParams.get("locale") ||
        "pt") as any;
      return json({
        data: flattenI18n(DATA_ORIGINS, locale),
        trace_id: traceId,
      });
    },
  },
  {
    method: "GET",
    path: "/api/v1/ropa/collection-methods",
    authRequired: true,
    tenantRequired: false,
    permissions: ["scf:read"],
    handler: async ({ request, traceId }) => {
      const locale = (new URL(request.url).searchParams.get("locale") ||
        "pt") as any;
      return json({
        data: flattenI18n(COLLECTION_METHODS, locale),
        trace_id: traceId,
      });
    },
  },
  {
    method: "GET",
    path: "/api/v1/ropa/processing-purposes",
    authRequired: true,
    tenantRequired: false,
    permissions: ["scf:read"],
    handler: async ({ request, traceId }) => {
      const locale = (new URL(request.url).searchParams.get("locale") ||
        "pt") as any;
      const url = new URL(request.url);
      const category = url.searchParams.get("category");
      let filtered = PROCESSING_PURPOSES;
      if (category) filtered = filtered.filter((p) => p.category === category);
      return json({
        data: flattenI18n(filtered, locale),
        total: filtered.length,
        trace_id: traceId,
      });
    },
  },
  {
    method: "GET",
    path: "/api/v1/ropa/retention-rules",
    authRequired: true,
    tenantRequired: false,
    permissions: ["scf:read"],
    handler: async ({ request, traceId }) => {
      const locale = (new URL(request.url).searchParams.get("locale") ||
        "pt") as any;
      const url = new URL(request.url);
      const categoryId = url.searchParams.get("category");
      const allRules = DATA_CATEGORIES.flatMap((c) =>
        c.retention_rules.map((r) => ({
          data_category_id: c.id,
          data_category_name_i18n: c.name_i18n,
          ...r,
        })),
      );
      const filtered = categoryId
        ? allRules.filter((r) => r.data_category_id === categoryId)
        : allRules;
      return json({
        data: flattenI18n(filtered, locale),
        total: filtered.length,
        trace_id: traceId,
      });
    },
  },
  {
    method: "GET",
    path: "/api/v1/ropa/security-measures",
    authRequired: true,
    tenantRequired: false,
    permissions: ["scf:read"],
    handler: async ({ request, traceId }) => {
      const locale = (new URL(request.url).searchParams.get("locale") ||
        "pt") as any;
      const url = new URL(request.url);
      const sensitivity = url.searchParams.get("sensitivity");
      let filtered = SECURITY_MEASURES;
      if (sensitivity === "special")
        filtered = filtered.filter(
          (m) => m.priority_for_sensitive === "mandatory",
        );
      return json({
        data: flattenI18n(filtered, locale),
        total: filtered.length,
        trace_id: traceId,
      });
    },
  },
  {
    method: "GET",
    path: "/api/v1/ropa/disposal-methods",
    authRequired: true,
    tenantRequired: false,
    permissions: ["scf:read"],
    handler: async ({ request, traceId }) => {
      const locale = (new URL(request.url).searchParams.get("locale") ||
        "pt") as any;
      return json({
        data: flattenI18n(DISPOSAL_METHODS, locale),
        trace_id: traceId,
      });
    },
  },
  {
    method: "GET",
    path: "/api/v1/ropa/risk-factors",
    authRequired: true,
    tenantRequired: false,
    permissions: ["scf:read"],
    handler: async ({ request, traceId }) => {
      const locale = (new URL(request.url).searchParams.get("locale") ||
        "pt") as any;
      return json({
        data: flattenI18n(RISK_FACTORS, locale),
        total: RISK_FACTORS.length,
        dpia_threshold: 8,
        dpia_rule:
          "risk_score = Î£(weight Ã— present). Se >= 8 â†’ DPIA obrigatÃ³rio",
        trace_id: traceId,
      });
    },
  },
  {
    method: "GET",
    path: "/api/v1/ropa/volume-scale",
    authRequired: true,
    tenantRequired: false,
    permissions: ["scf:read"],
    handler: async ({ request, traceId }) => {
      const locale = (new URL(request.url).searchParams.get("locale") ||
        "pt") as any;
      return json({
        data: flattenI18n(VOLUME_SCALE, locale),
        trace_id: traceId,
      });
    },
  },
];
