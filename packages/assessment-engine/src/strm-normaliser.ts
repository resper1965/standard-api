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
import { toCanonicalOperator } from "@standard/scf-core";

/**
 * normaliseRelationshipType â€” converte qualquer valor de relationship_type para o canÃ³nico.
 *
 * Delega para `toCanonicalOperator` (@standard/scf-core), o Ãºnico ponto onde uma
 * string bruta se torna um operador STRM. NÃ£o hÃ¡ fallback: um valor nÃ£o
 * reconhecido (ex: "source_defined") devolve null em vez de ser coagido a
 * "intersects".
 *
 * @param raw   Valor bruto do banco de dados ou XLSX
 * @returns     Operador canÃ³nico, ou null se o valor nÃ£o Ã© reconhecido
 */
export function normaliseRelationshipType(raw: string): StrmOperator | null {
  return toCanonicalOperator(raw);
}

// estimateStrengthScore (strength text -> numeric score) was removed here.
// It was migration 0051's one-time backfill helper, already run; it had no
// production callers, and its `?? 0.5` fallback was the strength half of the
// same conservative-default family this branch removes on the operator side
// (see toCanonicalOperator's doc comment). Do not re-add a default here â€” a
// strength this branch cannot read should be null, not 0.5.

