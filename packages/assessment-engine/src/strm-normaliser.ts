/**
 * @module strm-normaliser
 * @description Conversão de valores legados STRM para os 5 operadores canónicos NIST IR 8477.
 *
 * ## Contexto
 * O Neon DB contém ~81k mappings em `scf_mappings` e ~34k em `scf_strm_relationships`
 * importados do XLSX SCF original com valores de relationship_type = "direct" | "related".
 * Estes valores são INCORRECTOS face ao blueprint NIST IR 8477.
 *
 * ## Mapping de conversão (conservador — preserva semântica mais próxima)
 *   "direct"       → "equal"      (relação de identidade/equivalência directa)
 *   "related"      → "intersects" (relação parcial, sem especificidade direcional)
 *   "intersecting" → "intersects" (typo legado no xlsx-importer.ts)
 *   valores canónicos → passthrough
 *
 * ## Fórmula de peso (ADR-001)
 *   equal      → 1.0
 *   subset     → 1.0
 *   intersects → strength_score (0.0–1.0, dinâmico)
 *   superset   → min(0.5, strength_score ?? 0.5)
 *   no_relation → 0.0
 *
 * @see docs/decisions/ADR-001-strm-weights-algorithm.md
 * @see docs/decisions/IMPLEMENTATION-CONSTRAINTS.md §1
 */

/** Os 5 operadores canónicos STRM conforme NIST IR 8477. */
export const STRM_OPERATORS = [
  "equal",        // =  (Identidade/Equivalência)  — peso 1.0
  "subset",       // ⊂  (Subconjunto de)           — peso 1.0
  "intersects",   // ∩  (Intersecta com)           — peso = strength_score
  "superset",     // ⊃  (Superconjunto de)         — peso max 0.5
  "no_relation",  // Ø  (Sem Relação)              — peso 0.0
] as const;

export type StrmOperator = (typeof STRM_OPERATORS)[number];

// Mapa completo: legado → canónico + passthrough para já-canónicos
const LEGACY_MAP: Record<string, StrmOperator> = {
  // Valores legados do Neon DB (81k registos)
  direct:        "equal",
  related:       "intersects",
  intersecting:  "intersects",  // typo no xlsx-importer.ts

  // Passthrough para valores já canónicos
  equal:         "equal",
  subset:        "subset",
  intersects:    "intersects",
  superset:      "superset",
  no_relation:   "no_relation",

  // Aliases históricos do schemas/scf.ts (pre-migration)
  no_relationship:  "no_relation",
  source_defined:   "intersects",  // fallback conservador
};

/**
 * normaliseRelationshipType — converte qualquer valor de relationship_type para o canónico.
 *
 * @param raw   Valor bruto do banco de dados ou XLSX
 * @returns     Operador canónico, ou null se o valor não é reconhecido
 */
export function normaliseRelationshipType(raw: string): StrmOperator | null {
  return LEGACY_MAP[raw.toLowerCase().trim()] ?? null;
}

// Mapa de conversão relationship_strength (texto) → strength_score (numérico 0.0–1.0)
const STRENGTH_MAP: Record<string, number> = {
  strong:    1.0,
  high:      1.0,
  moderate:  0.5,
  medium:    0.5,
  related:   0.5,  // legado ambíguo — usar neutro
  weak:      0.25,
  low:       0.25,
};

/** Fallback conservador para valores não mapeados */
const DEFAULT_STRENGTH = 0.5;

/**
 * estimateStrengthScore — converte texto legado de força para score numérico 0.0–1.0.
 *
 * Usado na migration 0051 para popular a coluna strength_score a partir
 * da coluna relationship_strength (texto) existente no Neon DB.
 *
 * @param raw   Valor bruto (ex: "strong", "related", "weak")
 * @returns     Score numérico entre 0.0 e 1.0
 */
export function estimateStrengthScore(raw: string): number {
  return STRENGTH_MAP[raw.toLowerCase().trim()] ?? DEFAULT_STRENGTH;
}
