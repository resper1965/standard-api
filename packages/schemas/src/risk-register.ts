// @ts-nocheck -- Zod v4 CI type compat
import { z } from "zod";

/** Tratamentos de risco disponÃ­veis (espelho do enum DB riskTreatmentEnum). */
export const RiskTreatmentSchema = z.enum([
  "mitigate",
  "accept",
  "transfer",
  "avoid",
  "monitor",
]);
export type RiskTreatment = z.infer<typeof RiskTreatmentSchema>;

/** Categorias de risco derivadas do residual risk score (usadas no risk register). */
export const RiskRegisterCategorySchema = z.enum([
  "low",
  "moderate",
  "high",
  "severe",
  "extreme",
]);
export type RiskRegisterCategory = z.infer<typeof RiskRegisterCategorySchema>;

/**
 * Body para criaÃ§Ã£o de uma entrada no risk register.
 *
 * risk_appetite / risk_tolerance / risk_threshold sÃ£o parÃ¢metros enviados pela
 * aplicaÃ§Ã£o consumidora (GRC / frontend). O Standard NÃƒO armazena nem gerencia
 * esses valores como configuraÃ§Ã£o â€” apenas os recebe por request e usa para
 * calcular within_tolerance naquele assessment especÃ­fico.
 *
 * SCR-RMM Step 13: Risk Treatment Decision.
 * ADR-014 Q-C: accept nÃ£o requer approval gate â€” o registro Ã© o audit record.
 * ADR-014 Q-D: scf_version_id obrigatÃ³rio para AGENTS.md Â§8 rastreabilidade.
 */
export const CreateRiskRegisterEntrySchema = z.object({
  gap_finding_id: z.string().uuid(),
  scf_version_id: z.string().uuid(),
  scf_risk_id: z.string().uuid().optional(),
  risk_title: z.string().min(3).max(500),
  risk_description: z.string().max(2000).optional(),
  treatment: RiskTreatmentSchema,
  treatment_rationale: z.string().max(2000).optional(),
  owner_id: z.string().uuid().optional(),
  review_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "review_date must be YYYY-MM-DD")
    .optional(),
  /**
   * Corporate risk appetite (0.0â€“1.0).
   * Gerenciado pelo GRC externo; enviado aqui como contexto do assessment.
   */
  risk_appetite: z.number().min(0).max(1).optional(),
  /**
   * LOB / unit risk tolerance (0.0â€“1.0).
   * Usado pelo Standard para calcular within_tolerance = residual_risk_score <= risk_tolerance.
   */
  risk_tolerance: z.number().min(0).max(1).optional(),
  /**
   * Departmental risk threshold (0.0â€“1.0).
   * Armazenado como rastreabilidade â€” nÃ£o afeta within_tolerance.
   */
  risk_threshold: z.number().min(0).max(1).optional(),
});
export type CreateRiskRegisterEntry = z.infer<
  typeof CreateRiskRegisterEntrySchema
>;

/**
 * Body para update parcial de uma entrada do risk register.
 * gap_finding_id e scf_version_id sÃ£o imutÃ¡veis apÃ³s criaÃ§Ã£o.
 */
export const UpdateRiskRegisterEntrySchema =
  CreateRiskRegisterEntrySchema.partial()
    .omit({ gap_finding_id: true, scf_version_id: true })
    .refine((obj) => Object.keys(obj).length > 0, {
      message: "At least one field must be provided for update.",
    });
export type UpdateRiskRegisterEntry = z.infer<
  typeof UpdateRiskRegisterEntrySchema
>;

/** Response completa de uma entrada do risk register. */
export const RiskRegisterEntrySchema = z.object({
  id: z.string().uuid(),
  organization_id: z.string().uuid(),
  assessment_id: z.string().uuid(),
  scf_version_id: z.string().uuid(),
  gap_finding_id: z.string().uuid(),
  scf_risk_id: z.string().uuid().nullable(),
  risk_title: z.string(),
  risk_description: z.string().nullable(),
  /** Herdado do gap_finding (IE Ã— OL). Calculado pelo Standard. */
  inherent_risk_score: z.string().nullable(),
  /** Herdado do gap_finding. Calculado pelo Standard. */
  residual_risk_score: z.string().nullable(),
  /** Derivado pelo Standard a partir do residual_risk_score. */
  risk_category: RiskRegisterCategorySchema.nullable(),
  treatment: RiskTreatmentSchema,
  treatment_rationale: z.string().nullable(),
  owner_id: z.string().uuid().nullable(),
  review_date: z.string().nullable(),
  /** Herdado do gap_finding (denormalizado para eficiÃªncia de relatÃ³rio). */
  roc_determination: z.string().nullable(),
  /** Input da aplicaÃ§Ã£o: corporate risk appetite armazenado como contexto. */
  risk_appetite_input: z.string().nullable(),
  /** Input da aplicaÃ§Ã£o: LOB risk tolerance usado para calcular within_tolerance. */
  risk_tolerance_input: z.string().nullable(),
  /** Input da aplicaÃ§Ã£o: departmental threshold armazenado como contexto. */
  risk_threshold_input: z.string().nullable(),
  /** Calculado: residual_risk_score <= risk_tolerance_input. null se risk_tolerance nÃ£o fornecido. */
  within_tolerance: z.boolean().nullable(),
  trace_id: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type RiskRegisterEntry = z.infer<typeof RiskRegisterEntrySchema>;

/** Response paginada da listagem do risk register. */
export const RiskRegisterListResponseSchema = z.object({
  data: z.array(RiskRegisterEntrySchema),
  total: z.number(),
  trace_id: z.string(),
});
export type RiskRegisterListResponse = z.infer<
  typeof RiskRegisterListResponseSchema
>;

/** Payload do export para consumo por sistemas GRC externos. */
export const RiskRegisterExportSchema = z.object({
  assessment_id: z.string().uuid(),
  exported_at: z.string(),
  total: z.number(),
  entries: z.array(
    RiskRegisterEntrySchema.extend({
      _export_at: z.string(),
      _assessment_id: z.string().uuid(),
      _standard_version: z.string(),
    }),
  ),
  trace_id: z.string(),
});
export type RiskRegisterExport = z.infer<typeof RiskRegisterExportSchema>;

