/**
 * @module strm-normaliser
 * @description ConversÃ£o de valores legados STRM para os 5 operadores canÃ³nicos NIST IR 8477.
 *
 * ## Contexto
 * O Neon DB contÃ©m ~81k mappings em `scf_mappings` e ~34k em `scf_strm_relationships`
 * importados do XLSX SCF original com valores de relationship_type = "direct" | "related".
 * Estes valores sÃ£o INCORRECTOS face ao blueprint NIST IR 8477.
 *
 * ## Mapping de conversÃ£o (conservador â€” preserva semÃ¢ntica mais prÃ³xima)
 *   "direct"       â†’ "equal"      (relaÃ§Ã£o de identidade/equivalÃªncia directa)
 *   "related"      â†’ "intersects" (relaÃ§Ã£o parcial, sem especificidade direcional)
 *   "intersecting" â†’ "intersects" (typo legado no xlsx-importer.ts)
 *   valores canÃ³nicos â†’ passthrough
 *
 * ## FÃ³rmula de peso (ADR-001)
 *   equal      â†’ 1.0
 *   subset     â†’ 1.0
 *   intersects â†’ strength_score (0.0â€“1.0, dinÃ¢mico)
 *   superset   â†’ min(0.5, strength_score ?? 0.5)
 *   no_relation â†’ 0.0
 *
 * @see docs/decisions/ADR-001-strm-weights-algorithm.md
 * @see docs/decisions/IMPLEMENTATION-CONSTRAINTS.md Â§1
 */

/** Os 5 operadores canÃ³nicos STRM conforme NIST IR 8477. */
export const STRM_OPERATORS = [
  "equal", // =  (Identidade/EquivalÃªncia)  â€” peso 1.0
  "subset", // âŠ‚  (Subconjunto de)           â€” peso 1.0
  "intersects", // âˆ©  (Intersecta com)           â€” peso = strength_score
  "superset", // âŠƒ  (Superconjunto de)         â€” peso max 0.5
  "no_relation", // Ã˜  (Sem RelaÃ§Ã£o)              â€” peso 0.0
] as const;

// Import the canonical type from @standard/schemas to avoid re-export collision.
// StrmOperator in @standard/schemas is identical: z.enum(["equal","subset","intersects","superset","no_relation"])
import type { StrmOperator } from "@standard/schemas";

// Mapa completo: legado â†’ canÃ³nico + passthrough para jÃ¡-canÃ³nicos
const LEGACY_MAP: Record<string, StrmOperator> = {
  // Valores legados do Neon DB (81k registos)
  direct: "equal",
  related: "intersects",
  intersecting: "intersects", // typo no xlsx-importer.ts

  // Passthrough para valores jÃ¡ canÃ³nicos
  equal: "equal",
  subset: "subset",
  intersects: "intersects",
  superset: "superset",
  no_relation: "no_relation",

  // Aliases histÃ³ricos do schemas/scf.ts (pre-migration)
  no_relationship: "no_relation",
  source_defined: "intersects", // fallback conservador
};

/**
 * normaliseRelationshipType â€” converte qualquer valor de relationship_type para o canÃ³nico.
 *
 * @param raw   Valor bruto do banco de dados ou XLSX
 * @returns     Operador canÃ³nico, ou null se o valor nÃ£o Ã© reconhecido
 */
export function normaliseRelationshipType(raw: string): StrmOperator | null {
  return LEGACY_MAP[raw.toLowerCase().trim()] ?? null;
}

// Mapa de conversÃ£o relationship_strength (texto) â†’ strength_score (numÃ©rico 0.0â€“1.0)
const STRENGTH_MAP: Record<string, number> = {
  strong: 1.0,
  high: 1.0,
  moderate: 0.5,
  medium: 0.5,
  related: 0.5, // legado ambÃ­guo â€” usar neutro
  weak: 0.25,
  low: 0.25,
};

/** Fallback conservador para valores nÃ£o mapeados */
const DEFAULT_STRENGTH = 0.5;

/**
 * estimateStrengthScore â€” converte texto legado de forÃ§a para score numÃ©rico 0.0â€“1.0.
 *
 * Usado na migration 0051 para popular a coluna strength_score a partir
 * da coluna relationship_strength (texto) existente no Neon DB.
 *
 * @param raw   Valor bruto (ex: "strong", "related", "weak")
 * @returns     Score numÃ©rico entre 0.0 e 1.0
 */
export function estimateStrengthScore(raw: string): number {
  return STRENGTH_MAP[raw.toLowerCase().trim()] ?? DEFAULT_STRENGTH;
}

