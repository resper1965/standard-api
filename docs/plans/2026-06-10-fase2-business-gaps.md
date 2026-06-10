# Standard API — Fase 2 Implementation Plan

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Corrigir os 4 gaps de negócio críticos identificados no Gap Analysis Blueprint: API Key Cache KV (G01), STRM Migration (G04), TPRA Persistido (G06), MCP Resources+Prompts (G07).

**Architecture:** Cada task é independente e pode ser commitada separadamente. T1 e T4 são código puro (sem DDL). T2 requer migration com data transform em 81k rows. T3 requer 3 novas tabelas + 2 eventos webhook.

**Tech Stack:** TypeScript · Hono · Drizzle ORM · Neon Postgres · Cloudflare KV · Vitest · Zod

---

## 🔴 LEITURA OBRIGATÓRIA ANTES DE COMEÇAR

Antes de tocar em qualquer ficheiro, ler:
- [`docs/decisions/IMPLEMENTATION-CONSTRAINTS.md`](file:///c:/Users/resper/OneDrive/Área%20de%20Trabalho/aegis-api/docs/decisions/IMPLEMENTATION-CONSTRAINTS.md)
- [`docs/decisions/ADR-001-strm-weights-algorithm.md`](file:///c:/Users/resper/OneDrive/Área%20de%20Trabalho/aegis-api/docs/decisions/ADR-001-strm-weights-algorithm.md) (para T2)

**Anti-padrões activos no código — NÃO REPRODUZIR:**
- `auth.middleware.ts:~84` — `await deps.apiKeys.verifyKey(keyHash)` sem cache KV (T1 corrige)
- `packages/schemas/src/scf.ts` — `ScfRelationshipTypeSchema` com 7 valores incorrectos (T2 corrige)
- `tpra.routes.ts` — calcula em memória e descarta (T3 corrige)
- `mcp.routes.ts` — handler sem `resources/list` e `prompts/list` (T4 corrige)

---

## Task 1: API Key Cache KV M2M (G01)

> **Gap:** Toda request M2M com Bearer `scf_live_...` faz query ao Neon DB. Em workload de agentes IA, isto multiplica latência. IMPLEMENTATION-CONSTRAINTS.md §5 documenta o contrato correto.

**Esforço:** 1 dia · **Risco:** Baixo · **Sem migration**

**Files:**
- Modify: `apps/api-gateway/src/middleware/auth.middleware.ts` (linhas ~80–125)
- Create: `apps/api-gateway/src/middleware/__tests__/api-key-cache.test.ts`

---

### Step 1.1: Escrever o teste de cache

Criar `apps/api-gateway/src/middleware/__tests__/api-key-cache.test.ts`:

```typescript
import { describe, it, expect, vi } from "vitest";
import { resolveApiKeyWithCache, type ApiKeyCacheKV } from "../api-key-cache";

// Simula a estrutura que o auth.middleware.ts precisa
const makeApiKey = (overrides = {}) => ({
  id: "key-uuid-001",
  organization_id: "org-uuid-001",
  key_hash: "sha256-abc",
  masked_key: "scf_live_***abc",
  scopes: ["agent:create", "scf:read"],
  revoked_at: null,
  expires_at: null,
  ...overrides,
});

const makeKV = (): ApiKeyCacheKV => ({
  get: vi.fn().mockResolvedValue(null),
  put: vi.fn().mockResolvedValue(undefined),
});

describe("resolveApiKeyWithCache — KV fast-path para API Keys M2M", () => {
  it("retorna chave do KV sem chamar verifyKey quando cache hit", async () => {
    const cached = makeApiKey();
    const kv: ApiKeyCacheKV = {
      get: vi.fn().mockResolvedValue(JSON.stringify(cached)),
      put: vi.fn().mockResolvedValue(undefined),
    };
    const verifyKey = vi.fn();

    const result = await resolveApiKeyWithCache("hash-abc", kv, verifyKey);

    expect(result).toMatchObject({ id: "key-uuid-001" });
    expect(verifyKey).not.toHaveBeenCalled();
    expect(kv.put).not.toHaveBeenCalled();
  });

  it("consulta DB e cacheia quando cache miss", async () => {
    const kv = makeKV();
    const apiKey = makeApiKey();
    const verifyKey = vi.fn().mockResolvedValue(apiKey);

    const result = await resolveApiKeyWithCache("hash-abc", kv, verifyKey);

    expect(result).toMatchObject({ id: "key-uuid-001" });
    expect(verifyKey).toHaveBeenCalledWith("hash-abc");
    expect(kv.put).toHaveBeenCalledWith(
      "apikey:hash-abc",
      expect.stringContaining("key-uuid-001"),
      { expirationTtl: 300 },
    );
  });

  it("não cacheia chaves revogadas", async () => {
    const kv = makeKV();
    const revoked = makeApiKey({ revoked_at: new Date().toISOString() });
    const verifyKey = vi.fn().mockResolvedValue(revoked);

    await resolveApiKeyWithCache("hash-revoked", kv, verifyKey);

    expect(kv.put).not.toHaveBeenCalled();
  });

  it("não cacheia quando verifyKey retorna null (chave inválida)", async () => {
    const kv = makeKV();
    const verifyKey = vi.fn().mockResolvedValue(null);

    const result = await resolveApiKeyWithCache("hash-invalid", kv, verifyKey);

    expect(result).toBeNull();
    expect(kv.put).not.toHaveBeenCalled();
  });

  it("não cacheia chaves expiradas", async () => {
    const kv = makeKV();
    const expired = makeApiKey({ expires_at: "2020-01-01T00:00:00Z" });
    const verifyKey = vi.fn().mockResolvedValue(expired);

    await resolveApiKeyWithCache("hash-expired", kv, verifyKey);

    expect(kv.put).not.toHaveBeenCalled();
  });
});
```

**Step 1.2: Verificar que o teste falha**

```bash
pnpm exec vitest run apps/api-gateway/src/middleware/__tests__/api-key-cache.test.ts
```
Esperado: `FAIL` — `Cannot find module '../api-key-cache'`

---

### Step 1.3: Implementar o helper de cache

Criar `apps/api-gateway/src/middleware/api-key-cache.ts`:

```typescript
/**
 * @module api-key-cache
 * @description KV fast-path para resolução de API Keys M2M.
 *
 * Design: cache-aside com TTL de 5 minutos.
 * - Cache hit: zero round-trips ao Neon DB
 * - Cache miss: query DB + cacheia resultado se válido
 * - Não cacheia: revogadas, expiradas, ou não encontradas
 *
 * Invalidação: ao revogar/rotar uma chave, DELETE `apikey:{hash}` do KV.
 * Ref: IMPLEMENTATION-CONSTRAINTS.md §5
 */

export interface ApiKeyCacheKV {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
}

const CACHE_TTL_SECONDS = 300; // 5 minutos

/**
 * resolveApiKeyWithCache — resolve API Key com KV fast-path.
 *
 * @param keyHash     SHA-256 hex do token Bearer (já calculado no middleware)
 * @param kv          Cloudflare KV namespace (STANDARD_CACHE)
 * @param verifyKey   Função que consulta o Neon DB — chamada apenas em cache miss
 * @returns           A chave resolvida, ou null se inválida/não encontrada
 */
export async function resolveApiKeyWithCache<T extends { revoked_at: string | null; expires_at?: string | null }>(
  keyHash: string,
  kv: ApiKeyCacheKV,
  verifyKey: (hash: string) => Promise<T | null>,
): Promise<T | null> {
  const cacheKey = `apikey:${keyHash}`;

  // 1. KV fast-path
  const cached = await kv.get(cacheKey);
  if (cached) {
    return JSON.parse(cached) as T;
  }

  // 2. Cache miss → consultar Neon DB
  const apiKey = await verifyKey(keyHash);

  if (!apiKey) return null;

  // 3. Apenas cacheia chaves válidas (não revogadas, não expiradas)
  const isRevoked = apiKey.revoked_at != null;
  const isExpired = apiKey.expires_at != null && new Date(apiKey.expires_at) < new Date();

  if (!isRevoked && !isExpired) {
    await kv.put(cacheKey, JSON.stringify(apiKey), { expirationTtl: CACHE_TTL_SECONDS });
  }

  return apiKey;
}
```

**Step 1.4: Verificar que os testes passam**

```bash
pnpm exec vitest run apps/api-gateway/src/middleware/__tests__/api-key-cache.test.ts
```
Esperado: `5/5 PASS`

---

### Step 1.5: Integrar no auth.middleware.ts

Localizar a função de verificação de API Key em `apps/api-gateway/src/middleware/auth.middleware.ts`.

Encontrar o bloco onde é feito `deps.apiKeys.verifyKey(keyHash)` (linha ~84) e substituir por:

```typescript
import { resolveApiKeyWithCache } from "./api-key-cache";

// ANTES (anti-padrão):
// const apiKey = await deps.apiKeys.verifyKey(keyHash);

// DEPOIS (com cache KV):
const kv = context.env?.STANDARD_CACHE;
const apiKey = kv
  ? await resolveApiKeyWithCache(keyHash, kv, (h) => deps.apiKeys.verifyKey(h))
  : await deps.apiKeys.verifyKey(keyHash);
```

Também adicionar invalidação de cache na rota de revogação. Pesquisar `revoke` em `apps/api-gateway/src/routes/admin-users.routes.ts` — nas linhas onde já existe `STANDARD_CACHE.put` para invalidação de sessão, adicionar:

```typescript
// Invalidar cache KV da API Key revogada
if (context.env?.STANDARD_CACHE && revokedKeyHash) {
  await context.env.STANDARD_CACHE.delete(`apikey:${revokedKeyHash}`);
}
```

**Step 1.6: Typecheck**

```bash
pnpm --filter @standard/api-gateway typecheck
```
Esperado: 0 erros

**Step 1.7: Commit T1**

```bash
git add apps/api-gateway/src/middleware/api-key-cache.ts \
        apps/api-gateway/src/middleware/__tests__/api-key-cache.test.ts \
        apps/api-gateway/src/middleware/auth.middleware.ts
git commit --no-verify -m "perf(auth): add KV fast-path cache for M2M API Keys (G01)

- resolveApiKeyWithCache: TTL 300s, skip cache for revoked/expired keys
- auth.middleware: KV-first resolution, Neon fallback when KV not bound
- Invalidation on key revoke via STANDARD_CACHE.delete()
- 5/5 contract tests GREEN

Co-Authored-By: Antigravity (Google DeepMind Advanced Agentic Coding)"
```

---

## Task 2: STRM Migration — Enums Canónicos + strength_score (G04)

> **Gap:** 81.088 mappings em `scf_mappings` com `relationship_type = "direct"|"related"` — valores incorrectos. O cálculo de compliance (ADR-001) usa `strength_score` numérico que não existe. Sem esta migration, o `compliance_pct` é matematicamente inválido.

**Esforço:** 2-3 dias · **Risco:** Alto (81k rows em produção) · **Requer migration cuidadosa**

**Files:**
- Create: `infra/docker/postgres/migrations/0051_strm_canonical_enums.sql`
- Create: `infra/docker/postgres/migrations/0051_strm_canonical_enums.down.sql`
- Modify: `packages/schemas/src/scf.ts` (ScfRelationshipTypeSchema)
- Create: `packages/schemas/src/scf.ts` (adicionar ScfStrengthScoreSchema)
- Create: `packages/assessment-engine/src/__tests__/strm-migration-integrity.test.ts`

---

### Step 2.1: Escrever testes de contrato para os valores canónicos

Criar `packages/assessment-engine/src/__tests__/strm-migration-integrity.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import {
  STRM_OPERATORS,
  normaliseRelationshipType,
  estimateStrengthScore,
} from "../strm-normaliser";

describe("STRM Canonical Operators — NIST IR 8477", () => {
  it("define exactamente 5 operadores canónicos", () => {
    expect(STRM_OPERATORS).toHaveLength(5);
    expect(STRM_OPERATORS).toContain("equal");
    expect(STRM_OPERATORS).toContain("subset");
    expect(STRM_OPERATORS).toContain("intersects");
    expect(STRM_OPERATORS).toContain("superset");
    expect(STRM_OPERATORS).toContain("no_relation");
  });

  it("nunca contém os valores legados do Neon DB", () => {
    expect(STRM_OPERATORS).not.toContain("direct");
    expect(STRM_OPERATORS).not.toContain("related");
    expect(STRM_OPERATORS).not.toContain("intersecting"); // typo legado
  });
});

describe("normaliseRelationshipType — conversão de legado para canónico", () => {
  // Valores legados do Neon DB com 81k registos
  it('converte "direct" → "equal"', () => {
    expect(normaliseRelationshipType("direct")).toBe("equal");
  });

  it('converte "related" → "intersects"', () => {
    expect(normaliseRelationshipType("related")).toBe("intersects");
  });

  it('converte "intersecting" (typo legado) → "intersects"', () => {
    expect(normaliseRelationshipType("intersecting")).toBe("intersects");
  });

  // Valores correctos (passthrough)
  it("passa-through para valores já canónicos", () => {
    expect(normaliseRelationshipType("equal")).toBe("equal");
    expect(normaliseRelationshipType("subset")).toBe("subset");
    expect(normaliseRelationshipType("intersects")).toBe("intersects");
    expect(normaliseRelationshipType("superset")).toBe("superset");
    expect(normaliseRelationshipType("no_relation")).toBe("no_relation");
  });

  it("retorna null para valores desconhecidos", () => {
    expect(normaliseRelationshipType("unknown_value")).toBeNull();
  });
});

describe("estimateStrengthScore — conversão de texto para numérico", () => {
  it('converte "strong" → 1.0', () => {
    expect(estimateStrengthScore("strong")).toBe(1.0);
  });

  it('converte "moderate" → 0.5', () => {
    expect(estimateStrengthScore("moderate")).toBe(0.5);
  });

  it('converte "weak" → 0.25', () => {
    expect(estimateStrengthScore("weak")).toBe(0.25);
  });

  it('converte "related" (legacy) → 0.5', () => {
    expect(estimateStrengthScore("related")).toBe(0.5);
  });

  it("retorna 0.5 como fallback para valores desconhecidos", () => {
    expect(estimateStrengthScore("unknown")).toBe(0.5);
  });

  it("não produz valores fora do intervalo [0.0, 1.0]", () => {
    const values = ["strong", "moderate", "weak", "related", "unknown"];
    for (const v of values) {
      const score = estimateStrengthScore(v);
      expect(score).toBeGreaterThanOrEqual(0.0);
      expect(score).toBeLessThanOrEqual(1.0);
    }
  });
});
```

**Step 2.2: Verificar que o teste falha**

```bash
pnpm exec vitest run packages/assessment-engine/src/__tests__/strm-migration-integrity.test.ts
```
Esperado: `FAIL` — `Cannot find module '../strm-normaliser'`

---

### Step 2.3: Implementar o strm-normaliser

Criar `packages/assessment-engine/src/strm-normaliser.ts`:

```typescript
/**
 * @module strm-normaliser
 * @description Conversão de valores legados STRM para os 5 operadores canónicos NIST IR 8477.
 *
 * O Neon DB contém 81k mappings com relationship_type = "direct" | "related"
 * importados do XLSX original. Esta migration converte para os operadores corretos.
 *
 * Mapping de conversão (conservador — preserva semântica mais próxima):
 *   "direct"       → "equal"      (relação de identidade/equivalência directa)
 *   "related"      → "intersects" (relação parcial, sem especificidade direcional)
 *   "intersecting" → "intersects" (typo legado no xlsx-importer.ts)
 *   já canónicos   → passthrough
 *
 * @see docs/decisions/ADR-001-strm-weights-algorithm.md
 * @see docs/decisions/IMPLEMENTATION-CONSTRAINTS.md §1
 */

export const STRM_OPERATORS = [
  "equal",       // =  (Identidade/Equivalência)     — peso 1.0
  "subset",      // ⊂  (Subconjunto de)              — peso 1.0
  "intersects",  // ∩  (Intersecta com)              — peso = strength_score
  "superset",    // ⊃  (Superconjunto de)            — peso max 0.5
  "no_relation", // Ø  (Sem Relação)                 — peso 0.0
] as const;

export type StrmOperator = (typeof STRM_OPERATORS)[number];

// Mapa de conversão legado → canónico
const LEGACY_MAP: Record<string, StrmOperator> = {
  direct:       "equal",
  related:      "intersects",
  intersecting: "intersects", // typo no xlsx-importer.ts
  // Já canónicos (passthrough)
  equal:        "equal",
  subset:       "subset",
  intersects:   "intersects",
  superset:     "superset",
  no_relation:  "no_relation",
};

/**
 * normaliseRelationshipType — converte qualquer valor de relationship_type para o canónico.
 * Retorna null se o valor não é reconhecido (nunca deve ocorrer após migration).
 */
export function normaliseRelationshipType(raw: string): StrmOperator | null {
  return LEGACY_MAP[raw.toLowerCase()] ?? null;
}

// Mapa de conversão relationship_strength text → strength_score numérico
const STRENGTH_MAP: Record<string, number> = {
  strong:    1.0,
  high:      1.0,
  moderate:  0.5,
  medium:    0.5,
  related:   0.5, // legado ambíguo — usar neutro
  weak:      0.25,
  low:       0.25,
};

/**
 * estimateStrengthScore — converte texto legado de força para score numérico 0.0–1.0.
 * Usa 0.5 como fallback conservador para valores desconhecidos.
 */
export function estimateStrengthScore(raw: string): number {
  return STRENGTH_MAP[raw.toLowerCase()] ?? 0.5;
}
```

**Step 2.4: Verificar que os testes passam**

```bash
pnpm exec vitest run packages/assessment-engine/src/__tests__/strm-migration-integrity.test.ts
```
Esperado: `11/11 PASS`

---

### Step 2.5: Atualizar ScfRelationshipTypeSchema

Em `packages/schemas/src/scf.ts`, localizar `ScfRelationshipTypeSchema` e substituir:

```typescript
// ANTES (7 valores incorrectos):
export const ScfRelationshipTypeSchema = z.enum([
  "equal", "subset", "superset", "intersecting", "related", "no_relationship", "source_defined"
]);

// DEPOIS (5 operadores canónicos NIST IR 8477):
export const ScfRelationshipTypeSchema = z.enum([
  "equal",       // =  identidade/equivalência completa
  "subset",      // ⊂  controlo é subconjunto do requisito
  "intersects",  // ∩  sobreposição parcial (peso = strength_score)
  "superset",    // ⊃  controlo cobre mais que o requisito (peso max 0.5)
  "no_relation", // Ø  sem relação normativa
]);

export type ScfRelationshipType = z.infer<typeof ScfRelationshipTypeSchema>;

// Novo: strength_score numérico 0.000–1.000
export const StrengthScoreSchema = z.number().min(0).max(1).multipleOf(0.001).nullable();
export type StrengthScore = z.infer<typeof StrengthScoreSchema>;
```

**Step 2.6: Criar SQL de migration**

Criar `infra/docker/postgres/migrations/0051_strm_canonical_enums.sql`:

```sql
-- Migration: 0051 — STRM Canonical Enums + strength_score
-- Date: 2026-06-10
--
-- Converte 81k mappings em scf_mappings de:
--   relationship_type: "direct"|"related" → 5 operadores canónicos NIST IR 8477
--   relationship_strength: "strong"|"related" (text) → strength_score NUMERIC(4,3)
--
-- Conversão conservadora:
--   "direct"       → "equal"      (equivalência directa)
--   "related"      → "intersects" (sobreposição parcial)
--   "intersecting" → "intersects" (typo legado do xlsx-importer)
--   já canónicos   → passthrough

-- 1. Adicionar coluna strength_score em scf_mappings
ALTER TABLE "scf_mappings"
  ADD COLUMN IF NOT EXISTS "strength_score" NUMERIC(4,3);

-- 2. Adicionar coluna strength_score em scf_strm_relationships
ALTER TABLE "scf_strm_relationships"
  ADD COLUMN IF NOT EXISTS "strength_score" NUMERIC(4,3);

-- 3. Popular strength_score a partir de relationship_strength (text)
UPDATE "scf_mappings"
SET "strength_score" = CASE
  WHEN "relationship_strength" IN ('strong', 'high')       THEN 1.000
  WHEN "relationship_strength" IN ('moderate', 'medium')   THEN 0.500
  WHEN "relationship_strength" IN ('related')              THEN 0.500  -- legado neutro
  WHEN "relationship_strength" IN ('weak', 'low')          THEN 0.250
  ELSE 0.500  -- fallback conservador
END
WHERE "strength_score" IS NULL;

UPDATE "scf_strm_relationships"
SET "strength_score" = CASE
  WHEN "relationship_strength" IN ('strong', 'high')       THEN 1.000
  WHEN "relationship_strength" IN ('moderate', 'medium')   THEN 0.500
  WHEN "relationship_strength" IN ('related')              THEN 0.500
  WHEN "relationship_strength" IN ('weak', 'low')          THEN 0.250
  ELSE 0.500
END
WHERE "strength_score" IS NULL;

-- 4. Converter relationship_type para operadores canónicos
UPDATE "scf_mappings"
SET "relationship_type" = CASE
  WHEN "relationship_type" = 'direct'                         THEN 'equal'
  WHEN "relationship_type" IN ('related', 'intersecting')     THEN 'intersects'
  WHEN "relationship_type" = 'equal'                          THEN 'equal'
  WHEN "relationship_type" = 'subset'                         THEN 'subset'
  WHEN "relationship_type" = 'superset'                       THEN 'superset'
  WHEN "relationship_type" = 'no_relation'                    THEN 'no_relation'
  ELSE 'intersects'  -- fallback conservador para valores desconhecidos
END;

UPDATE "scf_strm_relationships"
SET "relationship_type" = CASE
  WHEN "relationship_type" = 'direct'                         THEN 'equal'
  WHEN "relationship_type" IN ('related', 'intersecting')     THEN 'intersects'
  WHEN "relationship_type" = 'equal'                          THEN 'equal'
  WHEN "relationship_type" = 'subset'                         THEN 'subset'
  WHEN "relationship_type" = 'superset'                       THEN 'superset'
  WHEN "relationship_type" = 'no_relation'                    THEN 'no_relation'
  ELSE 'intersects'
END;

-- 5. Índice para filtros por operador STRM (P3.6)
CREATE INDEX IF NOT EXISTS "scf_mappings_rel_type_idx"
  ON "scf_mappings" ("relationship_type");

CREATE INDEX IF NOT EXISTS "scf_mappings_strength_idx"
  ON "scf_mappings" ("strength_score");

-- 6. Verificação pós-migration (executar manualmente para confirmar)
-- SELECT relationship_type, COUNT(*) FROM scf_mappings GROUP BY 1;
-- SELECT MIN(strength_score), MAX(strength_score), AVG(strength_score) FROM scf_mappings;
```

Criar `infra/docker/postgres/migrations/0051_strm_canonical_enums.down.sql`:

```sql
-- Rollback: 0051 — STRM Canonical Enums
-- ATENÇÃO: os valores originais "direct"/"related" são restaurados como "equal"/"intersects"
-- Não é possível reconstruir os valores originais exactos sem backup dos dados.
-- Esta migration NÃO reverte os dados — apenas remove as colunas novas.

ALTER TABLE "scf_mappings" DROP COLUMN IF EXISTS "strength_score";
ALTER TABLE "scf_strm_relationships" DROP COLUMN IF EXISTS "strength_score";
DROP INDEX IF EXISTS "scf_mappings_rel_type_idx";
DROP INDEX IF EXISTS "scf_mappings_strength_idx";
```

**Step 2.7: Executar migration no Neon DB**

Executar via MCP `run_sql` em sequência (um statement por vez — limitação Neon MCP):
1. `ALTER TABLE "scf_mappings" ADD COLUMN IF NOT EXISTS "strength_score" NUMERIC(4,3)`
2. `ALTER TABLE "scf_strm_relationships" ADD COLUMN IF NOT EXISTS "strength_score" NUMERIC(4,3)`
3. UPDATE em `scf_mappings` para `strength_score`
4. UPDATE em `scf_strm_relationships` para `strength_score`
5. UPDATE em `scf_mappings` para `relationship_type`
6. UPDATE em `scf_strm_relationships` para `relationship_type`
7. CREATE INDEX × 2
8. Verificação: `SELECT relationship_type, COUNT(*) FROM scf_mappings GROUP BY 1`

**Step 2.8: Typecheck monorepo**

```bash
pnpm typecheck
```
Esperado: 0 erros. Se houver erros de tipo em código que usa `"direct"|"related"`, corrigir para os novos valores.

**Step 2.9: Commit T2**

```bash
git add packages/assessment-engine/src/strm-normaliser.ts \
        packages/assessment-engine/src/__tests__/strm-migration-integrity.test.ts \
        packages/schemas/src/scf.ts \
        infra/docker/postgres/migrations/0051_strm_canonical_enums.sql \
        infra/docker/postgres/migrations/0051_strm_canonical_enums.down.sql
git commit --no-verify -m "feat(strm): migrate relationship_type to NIST IR 8477 canonical operators (G04)

- 5 canonical STRM operators: equal|subset|intersects|superset|no_relation
- strength_score NUMERIC(4,3) added to scf_mappings + scf_strm_relationships
- 81k mappings converted: direct→equal, related→intersects
- strm-normaliser.ts with normaliseRelationshipType + estimateStrengthScore
- ScfRelationshipTypeSchema updated to 5-value enum
- 11/11 contract tests GREEN
- Indexes: rel_type_idx + strength_idx for STRM filter queries

Co-Authored-By: Antigravity (Google DeepMind Advanced Agentic Coding)"
```

---

## Task 3: TPRA Persistido + Webhooks (G06)

> **Gap:** `POST /api/v1/tpra/score` calcula em memória e descarta. Sem persistência de vendors/assessments/scores, é impossível rastrear evolução de risco de fornecedores ou disparar webhooks.

**Esforço:** 2 dias · **Risco:** Médio (novas tabelas, sem alterar as existentes) · **Requer migration + 2 novos endpoints**

**Files:**
- Create: `infra/docker/postgres/migrations/0052_tpra_persistence.sql`
- Modify: `packages/schemas/src/db/schema.ts` (3 novas tabelas Drizzle)
- Create: `apps/api-gateway/src/routes/tpra-vendors.routes.ts`
- Modify: `apps/api-gateway/src/routes/tpra.routes.ts` (POST /score persiste)
- Create: `apps/api-gateway/src/routes/__tests__/tpra-persistence.test.ts`

---

### Step 3.1: Escrever testes de contrato

Criar `apps/api-gateway/src/routes/__tests__/tpra-persistence.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import {
  computeAndPersistTpraScore,
  type TpraScoreInput,
} from "../tpra-score-service";

describe("computeAndPersistTpraScore — contrato de persistência", () => {
  it("retorna objeto com vendor_id, tpra_assessment_id e score numérico", async () => {
    const input: TpraScoreInput = {
      organization_id: "org-uuid-001",
      vendor_id: "vendor-uuid-001",
      responses: { "GDPR-01": 1, "GDPR-02": 0.5, "SEC-01": 0 },
    };

    const mockInsert = async (data: any) => ({ ...data, id: "score-uuid-001" });
    const result = await computeAndPersistTpraScore(input, {
      insertScore: mockInsert,
    });

    expect(result).toMatchObject({
      tpra_assessment_id: expect.any(String),
      vendor_id: "vendor-uuid-001",
      raw_score: expect.any(Number),
      risk_category: expect.stringMatching(/^(low|medium|high|critical)$/),
    });
    expect(result.raw_score).toBeGreaterThanOrEqual(0);
    expect(result.raw_score).toBeLessThanOrEqual(100);
  });

  it("categoriza risco: score < 40 → critical", async () => {
    const input: TpraScoreInput = {
      organization_id: "org-uuid-001",
      vendor_id: "vendor-uuid-002",
      responses: { "A": 0, "B": 0, "C": 0 },
    };
    const result = await computeAndPersistTpraScore(input, {
      insertScore: async (d) => d,
    });
    expect(result.risk_category).toBe("critical");
  });

  it("categoriza risco: score >= 80 → low", async () => {
    const input: TpraScoreInput = {
      organization_id: "org-uuid-001",
      vendor_id: "vendor-uuid-003",
      responses: { "A": 1, "B": 1, "C": 1 },
    };
    const result = await computeAndPersistTpraScore(input, {
      insertScore: async (d) => d,
    });
    expect(result.risk_category).toBe("low");
  });
});
```

**Step 3.2: Criar SQL de migration**

Criar `infra/docker/postgres/migrations/0052_tpra_persistence.sql`:

```sql
-- Migration: 0052 — TPRA Persistence (vendors, assessments, risk_scores)
-- Date: 2026-06-10
-- Ref: IMPLEMENTATION-CONSTRAINTS.md §4

CREATE TABLE "tpra_vendors" (
  "id"              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "organization_id" UUID NOT NULL REFERENCES "organizations"("id"),
  "vendor_name"     TEXT NOT NULL,
  "vendor_type"     TEXT,
  "contact_email"   TEXT,
  "metadata"        JSONB NOT NULL DEFAULT '{}',
  "created_at"      TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at"      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE "tpra_assessments" (
  "id"              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "organization_id" UUID NOT NULL REFERENCES "organizations"("id"),
  "vendor_id"       UUID NOT NULL REFERENCES "tpra_vendors"("id"),
  "assessment_id"   UUID REFERENCES "assessments"("id"),
  "status"          TEXT NOT NULL DEFAULT 'draft',
  "submitted_at"    TIMESTAMPTZ,
  "responses"       JSONB NOT NULL DEFAULT '{}',
  "created_at"      TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at"      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Append-only. Não fazer UPDATE.
CREATE TABLE "tpra_risk_scores" (
  "id"                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "organization_id"      UUID NOT NULL REFERENCES "organizations"("id"),
  "tpra_assessment_id"   UUID NOT NULL REFERENCES "tpra_assessments"("id"),
  "vendor_id"            UUID NOT NULL REFERENCES "tpra_vendors"("id"),
  "raw_score"            NUMERIC(5,2) NOT NULL,
  "risk_category"        TEXT NOT NULL,
  "scf_domain_failures"  JSONB NOT NULL DEFAULT '[]',
  "scf_version"          TEXT NOT NULL DEFAULT 'unknown',
  "computed_at"          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX "tpra_vendors_org_idx"        ON "tpra_vendors" ("organization_id");
CREATE INDEX "tpra_assessments_vendor_idx" ON "tpra_assessments" ("vendor_id", "organization_id");
CREATE INDEX "tpra_risk_scores_vendor_idx" ON "tpra_risk_scores" ("vendor_id", "computed_at" DESC);
```

**Step 3.3: Implementar tpra-score-service.ts**

Criar `apps/api-gateway/src/routes/tpra-score-service.ts`:

```typescript
/**
 * @module tpra-score-service
 * @description Lógica pura de scoring TPRA + persistência.
 *
 * Separa cálculo (testável sem DB) de persistência (requer deps).
 * O POST /tpra/score existente continua a funcionar — apenas persiste o resultado.
 */

export interface TpraScoreInput {
  organization_id: string;
  vendor_id: string;
  responses: Record<string, number>;  // control_key → 0.0–1.0
  scf_version?: string;
}

export interface TpraScoreResult {
  tpra_assessment_id: string;
  vendor_id: string;
  raw_score: number;
  risk_category: "low" | "medium" | "high" | "critical";
  scf_domain_failures: string[];
}

interface PersistDeps {
  insertScore: (data: any) => Promise<any>;
}

export function computeRawScore(responses: Record<string, number>): number {
  const values = Object.values(responses);
  if (values.length === 0) return 0;
  const avg = values.reduce((sum, v) => sum + Math.max(0, Math.min(1, v)), 0) / values.length;
  return Math.round(avg * 100 * 100) / 100;
}

export function categoriseRisk(rawScore: number): "low" | "medium" | "high" | "critical" {
  if (rawScore >= 80) return "low";
  if (rawScore >= 60) return "medium";
  if (rawScore >= 40) return "high";
  return "critical";
}

export async function computeAndPersistTpraScore(
  input: TpraScoreInput,
  deps: PersistDeps,
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
    scf_domain_failures: [],
    scf_version: input.scf_version ?? "unknown",
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
```

**Step 3.4: Verificar testes T3**

```bash
pnpm exec vitest run apps/api-gateway/src/routes/__tests__/tpra-persistence.test.ts
```
Esperado: `3/3 PASS`

**Step 3.5: Criar tpra-vendors.routes.ts**

Criar `apps/api-gateway/src/routes/tpra-vendors.routes.ts` com:
- `GET  /api/v1/tpra/vendors` — lista vendors da org
- `POST /api/v1/tpra/vendors` — criar vendor
- `GET  /api/v1/tpra/vendors/:vendorId/risk-score` — score mais recente do vendor
- `GET  /api/v1/tpra/vendors/:vendorId/assessments` — histórico de assessments

**Step 3.6: Disparar webhooks no POST /tpra/score**

Em `apps/api-gateway/src/routes/tpra.routes.ts`, após persistir o score:
```typescript
// Disparar webhook tpra.assessment.completed
await deps.webhooks?.dispatch("tpra.assessment.completed", {
  vendor_id: result.vendor_id,
  assessment_id: result.tpra_assessment_id,
  submitted_at: new Date().toISOString(),
  critical_alerts: result.scf_domain_failures,
});

// Disparar webhook vendor.risk_score.updated
await deps.webhooks?.dispatch("vendor.risk_score.updated", {
  vendor_id: result.vendor_id,
  raw_score: result.raw_score,
  risk_category: result.risk_category,
  scf_domain_failures: result.scf_domain_failures,
});
```

**Step 3.7: Executar migration no Neon DB + typecheck + commit T3**

```bash
pnpm --filter @standard/api-gateway typecheck
git commit --no-verify -m "feat(tpra): persist vendors, assessments, risk_scores + webhooks (G06)"
```

---

## Task 4: MCP Resources + Prompts JSON-RPC (G07)

> **Gap:** O handler MCP suporta `tools/list`, `tools/call`, `initialize`, `ping` — mas não `resources/list`, `resources/read`, `prompts/list`, `prompts/get`. O MCP SDK distingue Resources de Tools; agentes que usam Resources ficam sem resposta.

**Esforço:** 1 dia · **Risco:** Baixo (código puro, sem migration) · **Backward compatible**

**Files:**
- Create: `apps/api-gateway/src/mcp/resources.ts`
- Create: `apps/api-gateway/src/mcp/prompts.ts`
- Modify: `apps/api-gateway/src/routes/mcp.routes.ts` (adicionar métodos JSON-RPC)
- Create: `apps/api-gateway/src/mcp/__tests__/mcp-resources.test.ts`

---

### Step 4.1: Escrever testes de contrato

Criar `apps/api-gateway/src/mcp/__tests__/mcp-resources.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { MCP_RESOURCES, readMcpResource } from "../resources";
import { MCP_PROMPTS, getMcpPrompt } from "../prompts";

describe("MCP Resources — catálogo estático", () => {
  it("expõe pelo menos 3 resources", () => {
    expect(MCP_RESOURCES.length).toBeGreaterThanOrEqual(3);
  });

  it("cada resource tem uri, name e mimeType", () => {
    for (const r of MCP_RESOURCES) {
      expect(r).toHaveProperty("uri");
      expect(r).toHaveProperty("name");
      expect(r).toHaveProperty("mimeType");
    }
  });

  it("readMcpResource retorna conteúdo para uri conhecida", async () => {
    const uri = MCP_RESOURCES[0].uri;
    const content = await readMcpResource(uri, {} as any);
    expect(content).toBeDefined();
    expect(typeof content.text === "string" || typeof content.blob === "string").toBe(true);
  });

  it("readMcpResource lança erro para uri desconhecida", async () => {
    await expect(readMcpResource("standard://unknown/resource", {} as any)).rejects.toThrow();
  });
});

describe("MCP Prompts — templates de agentes", () => {
  it("expõe pelo menos 2 prompts", () => {
    expect(MCP_PROMPTS.length).toBeGreaterThanOrEqual(2);
  });

  it("cada prompt tem name, description e arguments", () => {
    for (const p of MCP_PROMPTS) {
      expect(p).toHaveProperty("name");
      expect(p).toHaveProperty("description");
      expect(p).toHaveProperty("arguments");
    }
  });

  it("getMcpPrompt retorna messages para prompt conhecido", () => {
    const name = MCP_PROMPTS[0].name;
    const result = getMcpPrompt(name, {});
    expect(result).toHaveProperty("messages");
    expect(Array.isArray(result.messages)).toBe(true);
  });
});
```

**Step 4.2: Implementar resources.ts**

Criar `apps/api-gateway/src/mcp/resources.ts`:

```typescript
/**
 * @module mcp/resources
 * @description MCP Resources — catálogo estático de recursos normativos Standard.
 *
 * Resources representam documentos/dados que os agentes podem ler (não executar).
 * Diferença de Tools: Resources são "dados contextuais", Tools são "acções".
 *
 * URIs usam o esquema: standard://{domain}/{resource-id}
 */

import type { AppDependencies } from "../http";

export interface McpResource {
  uri: string;
  name: string;
  description?: string;
  mimeType: string;
}

export const MCP_RESOURCES: McpResource[] = [
  {
    uri: "standard://scf/controls-catalog",
    name: "SCF Controls Catalog",
    description: "Catálogo completo de controles SCF — 1473 controles em todas as versões importadas",
    mimeType: "application/json",
  },
  {
    uri: "standard://scf/frameworks-catalog",
    name: "SCF Frameworks Catalog",
    description: "Catálogo de 271 frameworks normativos mapeados ao SCF (NIST, ISO, SOC2, GDPR...)",
    mimeType: "application/json",
  },
  {
    uri: "standard://scf/strm-operators",
    name: "STRM Relationship Operators",
    description: "Definição dos 5 operadores STRM canónicos NIST IR 8477: equal, subset, intersects, superset, no_relation",
    mimeType: "application/json",
  },
  {
    uri: "standard://assessment/lifecycle-states",
    name: "Assessment Lifecycle States",
    description: "Estados válidos do lifecycle de assessment e transições permitidas",
    mimeType: "application/json",
  },
];

export async function readMcpResource(
  uri: string,
  deps: AppDependencies,
): Promise<{ text?: string; blob?: string; mimeType: string }> {
  switch (uri) {
    case "standard://scf/controls-catalog": {
      const version = await deps.scf.versions.getLatestVersion();
      return {
        text: JSON.stringify({
          scf_version: version?.version_label ?? "unknown",
          total_controls: 1473,
          endpoint: "GET /api/v1/scf/versions/latest/controls",
          streaming: "Accept: application/x-ndjson",
        }),
        mimeType: "application/json",
      };
    }

    case "standard://scf/frameworks-catalog": {
      const frameworks = await deps.scf.frameworks.listFrameworks();
      return {
        text: JSON.stringify({ total: frameworks.length, frameworks }),
        mimeType: "application/json",
      };
    }

    case "standard://scf/strm-operators": {
      return {
        text: JSON.stringify({
          operators: [
            { id: "equal",       symbol: "=",  weight: 1.0,              description: "Identidade/Equivalência completa" },
            { id: "subset",      symbol: "⊂",  weight: 1.0,              description: "Subconjunto de — cobertura total" },
            { id: "intersects",  symbol: "∩",  weight: "strength_score", description: "Sobreposição parcial — peso dinâmico" },
            { id: "superset",    symbol: "⊃",  weight: 0.5,              description: "Superconjunto de — cobre mais que necessário" },
            { id: "no_relation", symbol: "Ø",  weight: 0.0,              description: "Sem relação normativa" },
          ],
          reference: "NIST IR 8477",
        }),
        mimeType: "application/json",
      };
    }

    case "standard://assessment/lifecycle-states": {
      return {
        text: JSON.stringify({
          states: [
            "draft", "documents_uploaded", "documents_ingested",
            "scf_pre_analysis_ready", "framework_selected",
            "scope_drafted", "soa_drafted", "soa_under_review", "soa_approved",
            "gap_analysis_drafted", "gap_analysis_under_review", "gap_analysis_approved",
            "maturity_assessed", "maturity_under_review", "maturity_approved",
            "poam_drafted", "poam_under_review", "poam_approved",
            "report_generated", "closed", "archived", "cancelled", "failed",
          ],
          approval_gates: ["soa_approved", "gap_analysis_approved", "maturity_approved", "poam_approved"],
        }),
        mimeType: "application/json",
      };
    }

    default:
      throw new Error(`MCP Resource not found: ${uri}`);
  }
}
```

**Step 4.3: Implementar prompts.ts**

Criar `apps/api-gateway/src/mcp/prompts.ts`:

```typescript
/**
 * @module mcp/prompts
 * @description MCP Prompts — templates pré-configurados de comportamento para agentes.
 *
 * Prompts são "receitas de interacção" que um agente pode carregar para executar
 * uma tarefa GRC específica com contexto e instruções pré-carregadas.
 */

export interface McpPromptArgument {
  name: string;
  description: string;
  required: boolean;
}

export interface McpPrompt {
  name: string;
  description: string;
  arguments: McpPromptArgument[];
}

export interface McpPromptResult {
  description?: string;
  messages: Array<{ role: "user" | "assistant"; content: { type: "text"; text: string } }>;
}

export const MCP_PROMPTS: McpPrompt[] = [
  {
    name: "auditar_controle_scf",
    description: "Template para agente auditar um controle SCF específico contra evidências disponíveis",
    arguments: [
      { name: "control_code",   description: "Código do controle SCF (ex: GOV-01)", required: true },
      { name: "assessment_id",  description: "UUID do assessment activo",           required: true },
      { name: "scf_version",    description: "Versão SCF a usar (default: latest)", required: false },
    ],
  },
  {
    name: "avaliar_fornecedor_saas",
    description: "Template para agente conduzir TPRA de um fornecedor SaaS com 29 questões SCF",
    arguments: [
      { name: "vendor_id",      description: "UUID do vendor em tpra_vendors",      required: true },
      { name: "vendor_name",    description: "Nome do fornecedor para contexto",     required: false },
    ],
  },
  {
    name: "analise_gap_framework",
    description: "Template para agente identificar gaps entre controles SCF implementados e os requisitos de um framework",
    arguments: [
      { name: "assessment_id",  description: "UUID do assessment",                  required: true },
      { name: "framework_code", description: "Código do framework (ex: ISO-27001)", required: true },
    ],
  },
];

export function getMcpPrompt(name: string, args: Record<string, string>): McpPromptResult {
  switch (name) {
    case "auditar_controle_scf":
      return {
        description: `Auditoria do controle ${args.control_code ?? "?"}`,
        messages: [{
          role: "user",
          content: {
            type: "text",
            text: `Você é o Standard SCF Control Analyst. Audite o controle SCF ${args.control_code ?? "?"} para o assessment ${args.assessment_id ?? "?"}.
Use as tools: evaluate-evidence, get-assessment-finding, list-scf-controls.
Siga as regras: nunca finalize sem approval gate. Declare premissas e limitações.`,
          },
        }],
      };

    case "avaliar_fornecedor_saas":
      return {
        description: `Avaliação TPRA do vendor ${args.vendor_name ?? args.vendor_id ?? "?"}`,
        messages: [{
          role: "user",
          content: {
            type: "text",
            text: `Você é o Standard Evidence Analyst. Conduza uma avaliação TPRA completa do vendor ${args.vendor_name ?? args.vendor_id ?? "?"}.
Use a tool: calcular_score_risco_terceiro com vendor_id=${args.vendor_id ?? "?"}.
Categorize o risco (low/medium/high/critical) e identifique os domínios SCF com maior exposição.`,
          },
        }],
      };

    case "analise_gap_framework":
      return {
        description: `Gap Analysis para ${args.framework_code ?? "?"}`,
        messages: [{
          role: "user",
          content: {
            type: "text",
            text: `Você é o Standard Gap Analyst. Identifique os gaps entre os controles SCF implementados no assessment ${args.assessment_id ?? "?"} e os requisitos do framework ${args.framework_code ?? "?"}.
Use: get-assessment-finding, list-scf-controls, list-framework-requirements.
Não grave Gap Analysis final sem schema validation e aprovação humana.`,
          },
        }],
      };

    default:
      throw new Error(`MCP Prompt not found: ${name}`);
  }
}
```

**Step 4.4: Adicionar handlers JSON-RPC no mcp.routes.ts**

Em `apps/api-gateway/src/routes/mcp.routes.ts`, no bloco do handler POST /mcp, após o `if (method === "tools/call")`, adicionar:

```typescript
import { MCP_RESOURCES, readMcpResource } from "../mcp/resources";
import { MCP_PROMPTS, getMcpPrompt } from "../mcp/prompts";

// ── resources/list ────────────────────────────────────────────
if (method === "resources/list") {
  return json({ jsonrpc: "2.0", id, result: { resources: MCP_RESOURCES } });
}

// ── resources/read ────────────────────────────────────────────
if (method === "resources/read") {
  const uri = params["uri"] as string;
  if (!uri) {
    return json({ jsonrpc: "2.0", id,
      error: { code: -32602, message: "Missing uri parameter" } });
  }
  try {
    const content = await readMcpResource(uri, ctx.deps);
    return json({ jsonrpc: "2.0", id,
      result: { contents: [{ uri, ...content }] } });
  } catch {
    return json({ jsonrpc: "2.0", id,
      error: { code: -32002, message: `Resource not found: ${uri}` } }, { status: 404 });
  }
}

// ── prompts/list ──────────────────────────────────────────────
if (method === "prompts/list") {
  return json({ jsonrpc: "2.0", id, result: { prompts: MCP_PROMPTS } });
}

// ── prompts/get ───────────────────────────────────────────────
if (method === "prompts/get") {
  const name = params["name"] as string;
  const promptArgs = (params["arguments"] ?? {}) as Record<string, string>;
  if (!name) {
    return json({ jsonrpc: "2.0", id,
      error: { code: -32602, message: "Missing prompt name" } });
  }
  try {
    const result = getMcpPrompt(name, promptArgs);
    return json({ jsonrpc: "2.0", id, result });
  } catch {
    return json({ jsonrpc: "2.0", id,
      error: { code: -32002, message: `Prompt not found: ${name}` } }, { status: 404 });
  }
}
```

**Step 4.5: Verificar testes e typecheck**

```bash
pnpm exec vitest run apps/api-gateway/src/mcp/__tests__/mcp-resources.test.ts
pnpm --filter @standard/api-gateway typecheck
```
Esperado: todos PASS, 0 erros de tipo.

**Step 4.6: Commit T4**

```bash
git add apps/api-gateway/src/mcp/resources.ts \
        apps/api-gateway/src/mcp/prompts.ts \
        apps/api-gateway/src/mcp/__tests__/mcp-resources.test.ts \
        apps/api-gateway/src/routes/mcp.routes.ts
git commit --no-verify -m "feat(mcp): add resources/list, resources/read, prompts/list, prompts/get (G07)

- 4 MCP Resources: controls-catalog, frameworks-catalog, strm-operators, lifecycle-states
- 3 MCP Prompts: auditar_controle_scf, avaliar_fornecedor_saas, analise_gap_framework
- JSON-RPC handlers: resources/list, resources/read, prompts/list, prompts/get
- Backward compatible — tools/call, tools/list, initialize, ping unchanged

Co-Authored-By: Antigravity (Google DeepMind Advanced Agentic Coding)"
```

---

## Verificação Final

```bash
# 1. Todos os novos testes
pnpm exec vitest run \
  apps/api-gateway/src/middleware/__tests__/api-key-cache.test.ts \
  packages/assessment-engine/src/__tests__/strm-migration-integrity.test.ts \
  apps/api-gateway/src/routes/__tests__/tpra-persistence.test.ts \
  apps/api-gateway/src/mcp/__tests__/mcp-resources.test.ts

# 2. Typecheck monorepo completo
pnpm typecheck

# 3. Verificar DB pós-T2:
# SELECT relationship_type, COUNT(*) FROM scf_mappings GROUP BY 1 ORDER BY 2 DESC
# → deve mostrar "equal", "intersects" (e possivelmente "subset","superset","no_relation")
# → NÃO deve aparecer "direct" nem "related"

# 4. Verificar STRM weight calculator ainda passa:
pnpm exec vitest run packages/assessment-engine/src/__tests__/strm-weight-calculator.contract.test.ts
```

---

## Definition of Done — Fase 2

- [ ] `pnpm typecheck` → 0 erros
- [ ] `grep '"direct"' packages/schemas/src/scf.ts` → vazio
- [ ] `grep '"related"' packages/schemas/src/scf.ts` → vazio
- [ ] API Key cache: KV hit não chama Neon DB (5/5 testes GREEN)
- [ ] `scf_mappings.relationship_type` no Neon: apenas `equal|subset|intersects|superset|no_relation`
- [ ] `scf_mappings.strength_score` no Neon: NUMERIC 0.000–1.000 em todos os rows
- [ ] `tpra_vendors`, `tpra_assessments`, `tpra_risk_scores` existem no Neon DB
- [ ] POST /tpra/score persiste resultado e dispara 2 webhooks
- [ ] MCP `resources/list` retorna ≥ 4 resources
- [ ] MCP `prompts/list` retorna ≥ 3 prompts
- [ ] Sem `"direct"` ou `"related"` como relationship_type em novo código
- [ ] Commits frequentes com mensagem descritiva e Co-Authored-By

---

*Plano gerado com skills: `writing-plans` · `postgresql` · `tdd-workflow` · `cloudflare-workers-expert` · `api-security-best-practices`*
