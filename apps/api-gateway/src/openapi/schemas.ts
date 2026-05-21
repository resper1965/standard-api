import { z } from "zod";
import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";

extendZodWithOpenApi(z);

export const RopaAnalysisOutputSchema = z.object({
  suggested_risk_level: z.enum(["low", "medium", "high", "critical"])
    .openapi({ description: "Primary risk level deduced from the data processing activity." }),
  required_controls: z.array(z.object({
    control_id: z.string(),
    name: z.string(),
    reason: z.string()
  })).openapi({ description: "List of suggested controls via SCF." }),
  suggested_legal_basis: z.string().openapi({ description: "Deduced LGPD/GDPR legal basis." }),
  is_dpia_required: z.boolean().openapi({ description: "Whether a DPIA should be triggered in the agentic chain." })
}).openapi("RopaAnalysisOutput");

export const DpiaAssessmentInputSchema = z.object({
  projectDescription: z.string().min(5).openapi({ example: "Project integrating the accounting API" }),
  ropaContext: RopaAnalysisOutputSchema
}).openapi("DpiaAssessmentInput");

export const VendorScannerInputSchema = z.object({
  vendorName: z.string().openapi({ example: "Amazon Web Services (AWS)" }),
  contractExcerpt: z.string().min(20).openapi({ example: "5.1 The Processor agrees to notify the Controller of any breach within 120 hours." })
}).openapi("VendorScannerInput");

export const VendorScannerBatchInputSchema = z.object({
  batch_id: z.string().optional(),
  items: z.array(z.object({
    correlation_id: z.string().openapi({ example: "vendor_clause_5.1" }),
    payload: VendorScannerInputSchema
  })).max(500)
}).openapi("VendorScannerBatchInput");

export const VendorScannerOutputSchema = z.object({
  has_standard_contractual_clauses: z.boolean().openapi({ description: "Whether the contract has EU/ANPD standardized DPA clauses." }),
  is_dpa_compliant: z.boolean().openapi({ description: "Whether the contract is globally compliant for LGPD/GDPR." }),
  liability_cap_identified: z.string().optional().openapi({ description: "Liability cap paid by the vendor." }),
  data_subprocessors_listed: z.array(z.string()).openapi({ description: "Third-party companies detected in the contract text." }),
  red_flags_for_negotiation: z.array(z.string()).openapi({ description: "Severe gaps that the legal team needs to renegotiate." })
}).openapi("VendorScannerOutput");

export const IncidentTriagerInputSchema = z.object({
  systemModuleName: z.string().openapi({ example: "WAF Edge Firewall" }),
  rawLogsExcerpt: z.string().min(10).openapi({ example: "[10/Oct/2026:13:55:36 +0000] 'GET /admin' 403 154 '-' 'SqlMap/1.4'" })
}).openapi("IncidentTriagerInput");

export const IncidentTriagerOutputSchema = z.object({
  is_false_positive: z.boolean().openapi({ description: "Identifica se é apenas ruído ou tráfego lícito." }),
  severity_level: z.enum(["low", "medium", "high", "critical"]).openapi({ description: "Gravidade real calculada pelo Agente L3." }),
  attack_vector_guessed: z.string().openapi({ description: "Vetor provável (ex: SQL Injection)." }),
  affected_assets_identified: z.array(z.string()).openapi({ description: "Hosts ou módulos sob ataque." }),
  immediate_containment_actions: z.array(z.string()).openapi({ description: "Playbook rápido de contenção." }),
  requires_dpo_breach_notification: z.boolean().openapi({ description: "Se PII estiver exposto, deve disparar a notificação oficial DPO LGPD." })
}).openapi("IncidentTriagerOutput");

export const BoardTranslatorInputSchema = z.object({
  technicalRiskDescription: z.string().min(10).openapi({ example: "Vulnerabilidade no pod kube-system expondo porta 10250 sem auth (CVE-2018-1002105)." }),
  riskCategory: z.enum(["security", "privacy", "compliance", "architecture"]).openapi({ example: "security" }),
  businessContext: z.string().optional().openapi({ example: "Cluster roda os pagamentos de Black Friday." })
}).openapi("BoardTranslatorInput");

export const BoardTranslatorOutputSchema = z.object({
  executive_summary: z.string().openapi({ description: "Plain-language summary without excessive jargon." }),
  financial_impact_estimate: z.string().openapi({ description: "Descriptive estimate of financial loss if the risk materializes." }),
  regulatory_impact: z.string().openapi({ description: "Fines or legal requirements involved." }),
  board_level_recommendation: z.string().openapi({ description: "What the board should approve (e.g., buy WAF, allocate budget)." }),
  urgency_metric: z.number().min(0).max(100).openapi({ description: "Board urgency score (0-100)." })
}).openapi("BoardTranslatorOutput");
