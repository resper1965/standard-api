-- Migration: 0051 — STRM Canonical Enums + strength_score
-- Date: 2026-06-10
-- Ref: docs/decisions/IMPLEMENTATION-CONSTRAINTS.md §1, ADR-001
--
-- Converte ~81k mappings em scf_mappings e ~34k em scf_strm_relationships de:
--   relationship_type: "direct"|"related" → 5 operadores canónicos NIST IR 8477
--   relationship_strength: "strong"|"related" (text) → strength_score NUMERIC(4,3)
--
-- Conversão conservadora (preserva semântica mais próxima):
--   "direct"            → "equal"      (equivalência directa)
--   "related"           → "intersects" (sobreposição parcial)
--   "intersecting"      → "intersects" (typo legado do xlsx-importer.ts)
--   "no_relationship"   → "no_relation" (alias legado)
--   "source_defined"    → "intersects" (fallback conservador)
--   já canónicos        → passthrough
--
-- NOTA: Executar statement-by-statement via MCP run_sql (limitação Neon MCP)

-- 1. Adicionar coluna strength_score em scf_mappings
ALTER TABLE "scf_mappings"
  ADD COLUMN IF NOT EXISTS "strength_score" NUMERIC(4,3);

-- 2. Adicionar coluna strength_score em scf_strm_relationships
ALTER TABLE "scf_strm_relationships"
  ADD COLUMN IF NOT EXISTS "strength_score" NUMERIC(4,3);

-- 3. Popular strength_score e converter relationship_type com segurança (PL/pgSQL dinâmico)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name='scf_mappings' AND column_name='relationship_strength'
  ) THEN
    EXECUTE 'UPDATE "scf_mappings"
      SET "strength_score" = CASE
        WHEN LOWER("relationship_strength") IN (''strong'', ''high'')       THEN 1.000
        WHEN LOWER("relationship_strength") IN (''moderate'', ''medium'')   THEN 0.500
        WHEN LOWER("relationship_strength") IN (''related'')              THEN 0.500
        WHEN LOWER("relationship_strength") IN (''weak'', ''low'')          THEN 0.250
        ELSE 0.500
      END
      WHERE "strength_score" IS NULL';
  END IF;

  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name='scf_strm_relationships' AND column_name='relationship_strength'
  ) THEN
    EXECUTE 'UPDATE "scf_strm_relationships"
      SET "strength_score" = CASE
        WHEN LOWER("relationship_strength") IN (''strong'', ''high'')       THEN 1.000
        WHEN LOWER("relationship_strength") IN (''moderate'', ''medium'')   THEN 0.500
        WHEN LOWER("relationship_strength") IN (''related'')              THEN 0.500
        WHEN LOWER("relationship_strength") IN (''weak'', ''low'')          THEN 0.250
        ELSE 0.500
      END
      WHERE "strength_score" IS NULL';
  END IF;

  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name='scf_mappings' AND column_name='relationship_type' AND data_type IN ('character varying', 'text')
  ) THEN
    EXECUTE 'UPDATE "scf_mappings"
      SET "relationship_type" = CASE
        WHEN "relationship_type" = ''direct''                                     THEN ''equal''
        WHEN "relationship_type" IN (''related'', ''intersecting'')                 THEN ''intersects''
        WHEN "relationship_type" IN (''no_relationship'')                         THEN ''no_relation''
        WHEN "relationship_type" = ''source_defined''                             THEN ''intersects''
        WHEN "relationship_type" IN (''equal'',''subset'',''intersects'',''superset'',''no_relation'') THEN "relationship_type"
        ELSE ''intersects''
      END';
  END IF;

  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name='scf_strm_relationships' AND column_name='relationship_type' AND data_type IN ('character varying', 'text')
  ) THEN
    EXECUTE 'UPDATE "scf_strm_relationships"
      SET "relationship_type" = CASE
        WHEN "relationship_type" = ''direct''                                     THEN ''equal''
        WHEN "relationship_type" IN (''related'', ''intersecting'')                 THEN ''intersects''
        WHEN "relationship_type" IN (''no_relationship'')                         THEN ''no_relation''
        WHEN "relationship_type" = ''source_defined''                             THEN ''intersects''
        WHEN "relationship_type" IN (''equal'',''subset'',''intersects'',''superset'',''no_relation'') THEN "relationship_type"
        ELSE ''intersects''
      END';
  END IF;
END $$;

-- 7. Índice para filtros por operador STRM (P3.6 — filtro ?relationship_type=subset)
CREATE INDEX IF NOT EXISTS "scf_mappings_rel_type_idx"
  ON "scf_mappings" ("relationship_type");

-- 8. Índice para queries por strength_score (compliance index computation)
CREATE INDEX IF NOT EXISTS "scf_mappings_strength_score_idx"
  ON "scf_mappings" ("strength_score");

-- VERIFICAÇÃO PÓS-MIGRATION (executar manualmente para confirmar):
-- SELECT relationship_type, COUNT(*) FROM scf_mappings GROUP BY 1 ORDER BY 2 DESC;
-- → deve mostrar apenas: equal, intersects (e possivelmente subset, superset, no_relation)
-- → NÃO deve aparecer: direct, related, intersecting, no_relationship, source_defined
--
-- SELECT MIN(strength_score), MAX(strength_score), AVG(strength_score)
-- FROM scf_mappings WHERE strength_score IS NOT NULL;
-- → deve retornar: min=0.250, max=1.000, avg≈0.5
