/**
 * @module tpra-score-service
 * @description Lógica pura de scoring TPRA + interface de persistência.
 *
 * Separa cálculo (testável sem DB) de persistência (requer deps injectados).
 * O POST /tpra/score existente pode continuar a funcionar como calcula —
 * esta camada adiciona a persistência no Neon DB e disparo de webhooks.
 *
 * @see docs/decisions/IMPLEMENTATION-CONSTRAINTS.md §4
 * @see infra/docker/postgres/migrations/0052_tpra_persistence.sql
 */

export interface TpraScoreInput {
  organization_id: string;
  vendor_id: string;
  /** Mapa control_key → resposta (0.0–1.0). Cada valor é clampado automaticamente. */
  responses: Record<string, number>;
  /** Versão SCF de referência. Default: "unknown". */
  scf_version?: string;
}

export interface TpraScoreResult {
  tpra_assessment_id: string;
  vendor_id: string;
  /** Score numérico 0.00–100.00 */
  raw_score: number;
  risk_category: "low" | "medium" | "high" | "critical";
  scf_domain_failures: string[];
}

export interface TpraScorePersistDeps {
  /** Inserir um registo em tpra_risk_scores (append-only) */
  insertScore: (data: Record<string, unknown>) => Promise<unknown>;
}

/**
 * computeRawScore — média simples das respostas, escalada para 0–100.
 *
 * Cada valor é clampado ao intervalo [0, 1] antes do cálculo.
 * Retorna 0 quando responses está vazio.
 */
export function computeRawScore(responses: Record<string, number>): number {
  const values = Object.values(responses);
  if (values.length === 0) return 0;

  const sum = values.reduce(
    (acc, v) => acc + Math.max(0, Math.min(1, v)),
    0,
  );
  const avg = sum / values.length;

  // Arredondar a 2 casas decimais para evitar floating-point drift
  return Math.round(avg * 100 * 100) / 100;
}

/**
 * categoriseRisk — classifica o risco com base no score numérico.
 *
 * Thresholds:
 *   >= 80 → low
 *   >= 60 → medium
 *   >= 40 → high
 *    < 40 → critical
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
 * computeAndPersistTpraScore — calcula o score TPRA e persiste no Neon DB.
 *
 * Fluxo:
 *   1. Calcula raw_score e risk_category a partir das respostas
 *   2. Persiste via deps.insertScore (tpra_risk_scores — append-only)
 *   3. Retorna o resultado para o handler disparar webhooks
 *
 * Não lança excepções de validação — a validação de inputs é da responsabilidade
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
