// @ts-nocheck -- Zod v4 CI type compat
import type {
  CreatePrivacyActivityRequest,
  CreatePrivacyDataSubjectRequest,
  CreatePrivacyDataCategoryRequest,
  CreatePrivacyThirdPartyRequest,
  CreatePrivacyFieldReviewRequest,
  PrivacyLegalBasisCode,
} from "@standard/schemas";
import type { PrivacyDependencies, PrivacyContext } from "../types";
import { PrivacyCrudService } from "./privacy-crud.service";

// â”€â”€â”€ Extraction Result (what the AI agent produces) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export type PrivacyExtractionResult = {
  activity: Partial<CreatePrivacyActivityRequest>;
  data_subjects: CreatePrivacyDataSubjectRequest[];
  data_categories: CreatePrivacyDataCategoryRequest[];
  third_parties: CreatePrivacyThirdPartyRequest[];
  pending_questions: string[];
  confidence: number;
  warnings: string[];
  source_text_hash: string;
  agent_model?: string;
  extraction_trace_id?: string;
};

// â”€â”€â”€ AI Extraction Service â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/**
 * PrivacyAiService provides AI-assisted extraction and enrichment.
 * 
 * IMPORTANT RULES:
 * - AI never approves anything automatically
 * - AI never asserts compliance
 * - AI can only SUGGEST fields, pending questions, risks, and evidence
 * - Every AI suggestion must become a field_review with source="ai_suggestion"
 * - Critical legal fields ALWAYS require human review
 * - All outputs must preserve agent_model, confidence, trace_id
 */
export class PrivacyAiService {
  private crud: PrivacyCrudService;

  constructor(private readonly deps: PrivacyDependencies) {
    this.crud = new PrivacyCrudService(deps);
  }

  /**
   * Process a natural language description and create a structured activity.
   * Returns the created activity + all AI-generated field reviews.
   *
   * This method:
   * 1. Creates the activity with extracted data
   * 2. Adds data subjects, categories, and third parties
   * 3. Creates field_review records for EVERY AI-suggested field
   * 4. Returns pending questions the AI identified
   */
  async extractFromText(
    text: string,
    context: PrivacyContext,
    extraction?: PrivacyExtractionResult
  ) {
    // If no extraction provided, use rule-based extraction (Phase 6 starter)
    const extracted = extraction ?? this.ruleBasedExtract(text);

    // 1. Create the activity
    const activityData: CreatePrivacyActivityRequest = {
      name: extracted.activity.name ?? "Atividade extraÃ­da por IA",
      ...extracted.activity,
    };
    const activity = await this.crud.createActivity(activityData, context);

    // 2. Add relations
    if (extracted.data_subjects.length > 0) {
      await this.crud.addDataSubjects(activity.id, extracted.data_subjects, context);
    }
    if (extracted.data_categories.length > 0) {
      await this.crud.addDataCategories(activity.id, extracted.data_categories, context);
    }
    if (extracted.third_parties.length > 0) {
      await this.crud.addThirdParties(activity.id, extracted.third_parties, context);
    }

    // 3. Create field reviews for every AI-suggested field
    const aiFields = Object.entries(extracted.activity).filter(([_, v]) => v !== undefined);
    const fieldReviews = [];
    for (const [field, value] of aiFields) {
      const review = await this.crud.addFieldReview(activity.id, {
        field_name: field,
        suggested_value: String(value),
        source: "ai_suggestion",
        comment: `ExtraÃ­do automaticamente de texto. ConfianÃ§a: ${extracted.confidence}%. Requer revisÃ£o humana.`,
      }, context);
      fieldReviews.push(review);
    }

    // 4. Flag critical legal fields that ALWAYS need explicit human review
    const criticalFields = ["legal_basis_lgpd", "retention_period", "purpose", "dpia_required"];
    for (const field of criticalFields) {
      if ((extracted.activity as any)[field] !== undefined) {
        await this.crud.addFieldReview(activity.id, {
          field_name: `${field}_legal_review`,
          suggested_value: String((extracted.activity as any)[field]),
          source: "system_rule",
          comment: "Campo jurÃ­dico crÃ­tico. RevisÃ£o humana obrigatÃ³ria antes de aprovaÃ§Ã£o.",
        }, context);
      }
    }

    return {
      activity,
      field_reviews_created: fieldReviews.length,
      pending_questions: extracted.pending_questions,
      warnings: extracted.warnings,
      confidence: extracted.confidence,
      agent_model: extracted.agent_model ?? "rule-based-v1",
      extraction_trace_id: extracted.extraction_trace_id ?? context.traceId,
      /** The system does NOT assert compliance. All values are suggestions. */
      compliance_assertion: false,
    };
  }

  /**
   * Rule-based extraction (no LLM required).
   * This is the starter implementation for Phase 6.
   * In production, this would be replaced/augmented by an LLM agent.
   */
  private ruleBasedExtract(text: string): PrivacyExtractionResult {
    const lower = text.toLowerCase();
    const result: PrivacyExtractionResult = {
      activity: {},
      data_subjects: [],
      data_categories: [],
      third_parties: [],
      pending_questions: [],
      warnings: [],
      confidence: 0,
      source_text_hash: this.hash(text),
    };

    let fieldsExtracted = 0;

    // Extract purpose
    const purposePatterns = [/para\s+(.+?)(?:\.|,|$)/i, /purpose[:\s]+(.+?)(?:\.|,|$)/i, /finalidade[:\s]+(.+?)(?:\.|,|$)/i];
    for (const p of purposePatterns) {
      const match = text.match(p);
      if (match?.[1]) { result.activity.purpose = match[1].trim(); fieldsExtracted++; break; }
    }

    // Extract legal basis (multi-regime aware)
    const legalBasisMap: Record<string, PrivacyLegalBasisCode> = {
      // Universal (PT-BR + EN)
      "consentimento": "consent",
      "consent": "consent",
      "contrato": "contract",
      "contract": "contract",
      "contractual necessity": "contract",
      "obrigaÃ§Ã£o legal": "legal_obligation",
      "legal obligation": "legal_obligation",
      "legÃ­timo interesse": "legitimate_interest",
      "legitimate interest": "legitimate_interest",
      "interesse legÃ­timo": "legitimate_interest",
      "vital interests": "vital_interests",
      "interesses vitais": "vital_interests",
      "public interest": "public_interest",
      "interesse pÃºblico": "public_interest",
      // LGPD-specific
      "proteÃ§Ã£o ao crÃ©dito": "credit_protection",
      "proteÃ§Ã£o da vida": "life_protection",
      "tutela da saÃºde": "health_protection",
      "administraÃ§Ã£o pÃºblica": "public_administration",
      "pesquisa": "research",
      "processo judicial": "judicial_process",
      // GDPR-specific
      "public task": "public_task",
      // CCPA-specific
      "opt-out": "opt_out_compliant",
      "opt out": "opt_out_compliant",
      "opt-in": "opt_in_obtained",
    };
    for (const [keyword, basis] of Object.entries(legalBasisMap)) {
      if (lower.includes(keyword)) {
        // Populate both new and legacy fields
        result.activity.legal_basis_lgpd = basis as any;
        result.activity.legal_bases = [{
          regime: result.activity.privacy_regime ?? "lgpd",
          basis,
        }];
        fieldsExtracted++;
        break;
      }
    }

    // Extract retention
    const retentionMatch = text.match(/(\d+)\s*(anos?|years?|meses|months?|dias|days?)/i);
    if (retentionMatch) {
      result.activity.retention_period = `${retentionMatch[1]} ${retentionMatch[2]}`;
      fieldsExtracted++;
    }

    // Extract data subjects
    const subjectMap: Record<string, CreatePrivacyDataSubjectRequest["category"]> = {
      "clientes": "customers", "customers": "customers",
      "funcionÃ¡rios": "employees", "employees": "employees",
      "colaboradores": "employees",
      "fornecedores": "suppliers", "suppliers": "suppliers",
      "parceiros": "partners", "partners": "partners",
      "menores": "minors", "crianÃ§as": "minors", "children": "minors",
      "pacientes": "patients", "patients": "patients",
      "alunos": "students", "students": "students",
      "visitantes": "visitors", "visitors": "visitors",
    };
    for (const [keyword, category] of Object.entries(subjectMap)) {
      if (lower.includes(keyword)) {
        result.data_subjects.push({ category });
        fieldsExtracted++;
      }
    }

    // Extract data categories
    const categoryPatterns: Record<string, { name: string; sensitivity: CreatePrivacyDataCategoryRequest["sensitivity"] }> = {
      "email": { name: "Email addresses", sensitivity: "personal" },
      "e-mail": { name: "Email addresses", sensitivity: "personal" },
      "nome": { name: "Names", sensitivity: "personal" },
      "name": { name: "Names", sensitivity: "personal" },
      "cpf": { name: "CPF (Tax ID)", sensitivity: "sensitive" },
      "rg": { name: "RG (National ID)", sensitivity: "sensitive" },
      "endereÃ§o": { name: "Addresses", sensitivity: "personal" },
      "address": { name: "Addresses", sensitivity: "personal" },
      "telefone": { name: "Phone numbers", sensitivity: "personal" },
      "phone": { name: "Phone numbers", sensitivity: "personal" },
      "dados financeiros": { name: "Financial data", sensitivity: "financial" },
      "financial data": { name: "Financial data", sensitivity: "financial" },
      "dados de saÃºde": { name: "Health data", sensitivity: "health" },
      "health data": { name: "Health data", sensitivity: "health" },
      "biometria": { name: "Biometric data", sensitivity: "biometric" },
      "biometric": { name: "Biometric data", sensitivity: "biometric" },
      "salÃ¡rio": { name: "Salary data", sensitivity: "financial" },
      "salary": { name: "Salary data", sensitivity: "financial" },
    };
    for (const [keyword, cat] of Object.entries(categoryPatterns)) {
      if (lower.includes(keyword)) {
        result.data_categories.push({ category_name: cat.name, sensitivity: cat.sensitivity });
        fieldsExtracted++;
      }
    }

    // Extract third parties
    const thirdPartyPatterns = [
      /compartilh\w+\s+(?:[\w\s]{0,20})(?:com|para)\s+(?:a\s+|o\s+)?(\w+)/gi,
      /shar\w+\s+(?:[\w\s]{0,20})(?:with|to)\s+(\w+)/gi,
      /enviam\w*\s+(?:[\w\s]{0,20})(?:para|a)\s+(?:a\s+|o\s+)?(\w+)/gi,
    ];
    for (const pattern of thirdPartyPatterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const name = match[1] ?? "";
        if (name.length > 2 && !["que", "com", "the", "and", "for", "dos", "das"].includes(name.toLowerCase())) {
          result.third_parties.push({
            name,
            role: "processor",
          });
          fieldsExtracted++;
        }
      }
    }

    // Detect flags
    if (lower.includes("transfer") && (lower.includes("internac") || lower.includes("international") || lower.includes("exterior"))) {
      result.activity.international_transfer = true;
      fieldsExtracted++;
    }
    if (result.third_parties.length > 0) {
      result.activity.third_party_sharing = true;
    }
    if (lower.includes("decisÃ£o automatizada") || lower.includes("automated decision") || lower.includes("profiling")) {
      result.activity.automated_decision_making = true;
      fieldsExtracted++;
    }
    if (lower.includes("menor") || lower.includes("crianÃ§a") || lower.includes("child") || lower.includes("minor")) {
      result.activity.vulnerable_subjects = true;
      fieldsExtracted++;
    }
    if (lower.includes("monitoramento") || lower.includes("monitoring") || lower.includes("surveillance") || lower.includes("cctv")) {
      result.activity.systematic_monitoring = true;
      fieldsExtracted++;
    }

    // Generate pending questions based on what's missing
    if (!result.activity.purpose) result.pending_questions.push("Qual Ã© a finalidade do tratamento de dados?");
    if (!result.activity.legal_basis_lgpd) result.pending_questions.push("Qual Ã© a base legal para este tratamento (LGPD)?");
    if (!result.activity.retention_period) result.pending_questions.push("Por quanto tempo os dados serÃ£o retidos?");
    if (result.data_subjects.length === 0) result.pending_questions.push("Quais sÃ£o os titulares dos dados (clientes, funcionÃ¡rios, etc.)?");
    if (result.data_categories.length === 0) result.pending_questions.push("Quais dados pessoais sÃ£o coletados?");
    if (!result.activity.security_measures_summary) result.pending_questions.push("Quais medidas de seguranÃ§a sÃ£o aplicadas?");

    // Warnings
    if (result.data_categories.some((c) => c.sensitivity === "sensitive" || c.sensitivity === "health" || c.sensitivity === "biometric")) {
      result.warnings.push("Dados sensÃ­veis detectados. DPIA provavelmente necessÃ¡rio.");
    }
    if (result.activity.international_transfer) {
      result.warnings.push("TransferÃªncia internacional detectada. TIA recomendado.");
    }
    if (result.activity.vulnerable_subjects) {
      result.warnings.push("Titulares vulnerÃ¡veis detectados. AtenÃ§Ã£o redobrada Ã  proteÃ§Ã£o.");
    }

    // Confidence score (0-100)
    const totalExpected = 8; // purpose, basis, retention, subjects, categories, parties, security, department
    result.confidence = Math.min(100, Math.round((fieldsExtracted / totalExpected) * 100));

    result.activity.name = result.activity.purpose
      ? `Atividade: ${result.activity.purpose.substring(0, 80)}`
      : "Atividade de tratamento (pendente detalhamento)";

    return result;
  }

  private hash(text: string): string {
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
  }
}

