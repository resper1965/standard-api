// @ts-nocheck -- Zod v4 CI type compat
/**
 * @module tpra-score-service
 * @description LÃ³gica pura de scoring TPRA + interface de persistÃªncia.
 *
 * Separa cÃ¡lculo (testÃ¡vel sem DB) de persistÃªncia (requer deps injectados).
 * O POST /tpra/score existente pode continuar a funcionar como calcula â€”
 * esta camada adiciona a persistÃªncia no Neon DB e disparo de webhooks.
 *
 * @see docs/decisions/IMPLEMENTATION-CONSTRAINTS.md Â§4
 * @see infra/docker/postgres/migrations/0052_tpra_persistence.sql
 */

export interface TpraScoreInput {
  organization_id: string;
  vendor_id: string;
  /** Mapa control_key â†’ resposta (0.0â€“1.0). Cada valor Ã© clampado automaticamente. */
  responses: Record<string, number>;
  /** VersÃ£o SCF de referÃªncia. Default: "unknown". */
  scf_version?: string;
}

export interface TpraScoreResult {
  tpra_assessment_id: string;
  vendor_id: string;
  /** Score numÃ©rico 0.00â€“100.00 */
  raw_score: number;
  risk_category: "low" | "medium" | "high" | "critical";
  scf_domain_failures: string[];
}

export interface TpraScorePersistDeps {
  /** Inserir um registo em tpra_risk_scores (append-only) */
  insertScore: (data: Record<string, unknown>) => Promise<unknown>;
}

/**
 * computeRawScore â€” mÃ©dia simples das respostas, escalada para 0â€“100.
 *
 * Cada valor Ã© clampado ao intervalo [0, 1] antes do cÃ¡lculo.
 * Retorna 0 quando responses estÃ¡ vazio.
 */
export function computeRawScore(responses: Record<string, number>): number {
  const values = Object.values(responses);
  if (values.length === 0) return 0;

  const sum = values.reduce((acc, v) => acc + Math.max(0, Math.min(1, v)), 0);
  const avg = sum / values.length;

  // Arredondar a 2 casas decimais para evitar floating-point drift
  return Math.round(avg * 100 * 100) / 100;
}

/**
 * categoriseRisk â€” classifica o risco com base no score numÃ©rico.
 *
 * Thresholds:
 *   >= 80 â†’ low
 *   >= 60 â†’ medium
 *   >= 40 â†’ high
 *    < 40 â†’ critical
 */
export function categoriseRisk(
  rawScore: number,
): "low" | "medium" | "high" | "critical" {
  if (rawScore >= 80) return "low";
  if (rawScore >= 60) return "medium";
  if (rawScore >= 40) return "high";
  return "critical";
}

/**
 * computeAndPersistTpraScore â€” calcula o score TPRA e persiste no Neon DB.
 *
 * Fluxo:
 *   1. Calcula raw_score e risk_category a partir das respostas
 *   2. Persiste via deps.insertScore (tpra_risk_scores â€” append-only)
 *   3. Retorna o resultado para o handler disparar webhooks
 *
 * NÃ£o lanÃ§a excepÃ§Ãµes de validaÃ§Ã£o â€” a validaÃ§Ã£o de inputs Ã© da responsabilidade
 * do route handler (Zod schema).
 */
export async function computeAndPersistTpraScore(
  input: TpraScoreInput,
  deps: TpraScorePersistDeps,
): Promise<TpraScoreResult> {
  const rawScore = computeRawScore(input.responses);
  const riskCategory = categoriseRisk(rawScore);
  const assessmentId = crypto.randomUUID();

  const scoreRecord = {
    id: assessmentId,
    organization_id: input.organization_id,
    tpra_assessment_id: assessmentId,
    vendor_id: input.vendor_id,
    raw_score: rawScore,
    risk_category: riskCategory,
    scf_domain_failures: [] as string[],
    scf_version: input.scf_version ?? "unknown",
    computed_at: new Date().toISOString(),
  };

  await deps.insertScore(scoreRecord);

  return {
    tpra_assessment_id: assessmentId,
    vendor_id: input.vendor_id,
    raw_score: rawScore,
    risk_category: riskCategory,
    scf_domain_failures: [],
  };
}
