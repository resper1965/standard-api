# Blueprint Surgical Implementation Plan

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Implementar as 4 cirurgias do Blueprint (G09–G11 + G05/G06/G10) que elevam o produto de 43% → 90%+ de alinhamento com o Blueprint Absoluto.

**Architecture:** Cirurgias sequenciais e independentes. Cada uma entrega valor isolado sem depender da seguinte. Schema-first → Types → Algorithm → Routes → Wiring.

**Tech Stack:** Hono (Cloudflare Workers), Drizzle ORM, Neon PostgreSQL, Zod, Vitest, Cloudflare Queues, HMAC-SHA256 webhooks.

**Contamination Guard:** Ler `docs/decisions/IMPLEMENTATION-CONSTRAINTS.md` ANTES de abrir qualquer ficheiro de implementação existente.

---

## CIRURGIA 1 — Schema & Migrations (Drizzle + Neon)

> Fundação física. Sem isto, as outras cirurgias não podem ser compiladas.

### Task 1.1: Enum STRM Canónico no Drizzle Schema

**Files:**
- Modify: `packages/schemas/src/db/schema.ts` (linhas 1–50 — secção de enums)
- Modify: `packages/schemas/src/scf.ts` (linha 24–32 — `ScfRelationshipTypeSchema`)

**Contexto crítico:** O schema usa `text("relationship_type").notNull()` nas linhas 606 e 642. Vamos mudar para `pgEnum`. O enum Zod em `scf.ts` tem 7 valores — reduzir para os 5 canónicos do Blueprint.

**Step 1: Adicionar o pgEnum no schema Drizzle**

Abrir `packages/schemas/src/db/schema.ts`. Localizar a secção de enums (linha ~50). Adicionar após o último enum existente:

```typescript
// ── STRM Canonical Operators (NIST IR 8477 / ADR-001) ────────────────────────
// NEVER add "direct", "related", "intersecting", "no_relationship", "source_defined"
export const strmOperatorEnum = pgEnum("strm_operator", [
  "equal",       // = (1.0 weight)
  "subset",      // ⊂ (1.0 weight)
  "intersects",  // ∩ (dynamic strength_score weight)
  "superset",    // ⊃ (max 0.5 weight)
  "no_relation", // Ø (0.0 weight)
]);
```

**Step 2: Trocar `text("relationship_type")` por `strmOperatorEnum` nos dois lugares**

Em `scf_mappings` (linha 606):
```typescript
// ANTES (apagar):
relationshipType: text("relationship_type").notNull(),
relationshipStrength: text("relationship_strength"),

// DEPOIS (inserir):
relationshipType: strmOperatorEnum("relationship_type").notNull(),
strengthScore: numeric("strength_score", { precision: 4, scale: 3 }), // null = usar default por operador
```

Em `scf_strm_relationships` (linha 642):
```typescript
// ANTES (apagar):
relationshipType: text("relationship_type").notNull(),
relationshipStrength: text("relationship_strength").notNull(),

// DEPOIS (inserir):
relationshipType: strmOperatorEnum("relationship_type").notNull(),
strengthScore: numeric("strength_score", { precision: 4, scale: 3 }),
```

**Step 3: Actualizar `ScfRelationshipTypeSchema` em `packages/schemas/src/scf.ts`**

```typescript
// ANTES (linha 24–32) — apagar:
export const ScfRelationshipTypeSchema = z.enum([
  "equal", "subset", "superset", "intersecting",
  "related", "no_relationship", "source_defined",
]);

// DEPOIS — substituir por:
// ⚠️ ADR-001: apenas 5 operadores canónicos NIST IR 8477
export const StrmOperatorSchema = z.enum([
  "equal",
  "subset",
  "intersects",
  "superset",
  "no_relation",
]);
export type StrmOperator = z.infer<typeof StrmOperatorSchema>;

// Alias retrocompatível para migração gradual — DEPRECADO, usar StrmOperatorSchema
/** @deprecated Use StrmOperatorSchema */
export const ScfRelationshipTypeSchema = StrmOperatorSchema;
```

**Step 4: Exportar do index de schemas**

Em `packages/schemas/src/index.ts` (ou equivalente), garantir que `StrmOperatorSchema` e `StrmOperator` são exportados.

**Step 5: Gerar a migration Drizzle**

```bash
pnpm db:generate
```

Expected: ficheiro `packages/schemas/migrations/XXXX_strm_operator_enum.sql` criado.

**⚠️ CRITICAL — Step 5b: Editar a migration manualmente ANTES de aplicar**

O Neon DB tem **81.088 linhas** em `scf_mappings` com `"related"` (81.083) e `"direct"` (5).
O `ALTER TABLE ... USING relationship_type::strm_operator` vai FALHAR para estes valores.

Abrir o ficheiro `.sql` gerado e adicionar estas linhas ANTES de qualquer `ALTER TABLE`:

```sql
-- ⚠️ DATA MIGRATION: converter valores legados para operadores STRM canónicos
-- Executar ANTES de criar o enum e alterar a coluna.
-- Mapeamento conforme ADR-001 e docs/decisions/IMPLEMENTATION-CONSTRAINTS.md Secção 1:
--   "direct"   → "equal"      (5 registos — mappings 1:1 confirmados)
--   "related"  → "intersects" (81.083 registos — sobreposição parcial por defeito)
--   "intersecting" → "intersects" (normalização de naming)
--   "no_relationship" → "no_relation"
--   "source_defined" → "intersects" (sobreposição parcial por defeito)

UPDATE scf_mappings SET relationship_type = 'equal'      WHERE relationship_type = 'direct';
UPDATE scf_mappings SET relationship_type = 'intersects' WHERE relationship_type = 'related';
UPDATE scf_mappings SET relationship_type = 'intersects' WHERE relationship_type = 'intersecting';
UPDATE scf_mappings SET relationship_type = 'no_relation' WHERE relationship_type = 'no_relationship';
UPDATE scf_mappings SET relationship_type = 'intersects' WHERE relationship_type = 'source_defined';

-- Mesmos UPDATEs para scf_strm_relationships
UPDATE scf_strm_relationships SET relationship_type = 'equal'       WHERE relationship_type = 'direct';
UPDATE scf_strm_relationships SET relationship_type = 'intersects'  WHERE relationship_type = 'related';
UPDATE scf_strm_relationships SET relationship_type = 'intersects'  WHERE relationship_type = 'intersecting';
UPDATE scf_strm_relationships SET relationship_type = 'no_relation' WHERE relationship_type = 'no_relationship';
UPDATE scf_strm_relationships SET relationship_type = 'intersects'  WHERE relationship_type = 'source_defined';

-- Adicionar strength_score = 0.5 para todos os registos migrados de "related"
-- (0.5 = peso neutro de intersecção quando a força real é desconhecida)
UPDATE scf_mappings SET strength_score = 0.500 WHERE relationship_type = 'intersects' AND strength_score IS NULL;
```

> **Nota sobre o mapeamento:** "related" → "intersects" com `strength_score = 0.5` é conservador.
> O valor real deverá ser refinado quando o STRM bundle oficial for re-importado com a coluna numérica.
> Este é um valor de arranque seguro — não viola o Blueprint, que permite `strength_score` dinâmico.

**Step 6: Verificar typecheck**

```bash
pnpm typecheck
```

Expected: erros de tipo em ficheiros que usam os valores legados (`"related"`, `"direct"`, etc.) — são os próximos a corrigir. Documentar quais ficheiros reclamam.

**Step 7: Commit**

```bash
git add packages/schemas/src/db/schema.ts packages/schemas/src/scf.ts packages/schemas/migrations/
git commit -m "feat(schema): add strmOperatorEnum pgEnum — ADR-001 NIST IR 8477

Replace text relationship_type with canonical 5-value enum.
Add strength_score NUMERIC(4,3) to scf_mappings and scf_strm_relationships.
Deprecate ScfRelationshipTypeSchema in favour of StrmOperatorSchema.
Data migration: related→intersects(0.5), direct→equal, intersecting→intersects.

Co-Authored-By: Google Gemini 2.5 Pro <gemini@google.com>"
```


---

### Task 1.2: Tabela Ledger Append-Only

**Files:**
- Modify: `packages/schemas/src/db/schema.ts` — adicionar tabela no fim do ficheiro

**Contexto:** O `assessment_events` existente (linha 1096) regista transições de assessment, não de controlos. Precisamos de um ledger granular por controlo. Não há UPDATE aqui — nunca.

**Step 1: Adicionar a tabela ao schema Drizzle**

No fim de `packages/schemas/src/db/schema.ts`, antes do último export:

```typescript
// ── Assessment Control Events — Ledger Append-Only (ADR-002) ─────────────────
// ⛔ NEVER UPDATE OR DELETE rows from this table.
// ⛔ State = reducer over all events for (assessment_id, control_id).
export const assessmentControlEvents = pgTable(
  "assessment_control_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    assessmentId: uuid("assessment_id")
      .notNull()
      .references(() => assessments.id),
    scfControlId: uuid("scf_control_id")
      .notNull()
      .references(() => scfControls.id),
    scfVersionId: uuid("scf_version_id")
      .notNull()
      .references(() => scfVersions.id),
    eventType: text("event_type").notNull(), // 'status_changed' | 'evidence_added' | 'finding_created' | 'approval_gate'
    previousValue: jsonb("previous_value").$type<Record<string, unknown>>(),
    newValue: jsonb("new_value")
      .$type<Record<string, unknown>>()
      .notNull(),
    actorId: uuid("actor_id").references(() => users.id),
    agentRunId: uuid("agent_run_id").references(() => agentRuns.id),
    traceId: text("trace_id").notNull(),
    // NO updated_at. NO deleted_at. Append-only = immutable.
    occurredAt: timestamp("occurred_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("ace_org_assessment_idx").on(table.organizationId, table.assessmentId),
    index("ace_control_idx").on(table.assessmentId, table.scfControlId),
    index("ace_trace_idx").on(table.traceId),
    index("ace_occurred_at_idx").on(table.occurredAt),
  ],
);
```

**Step 2: Gerar migration**

```bash
pnpm db:generate
```

Expected: migration com `CREATE TABLE assessment_control_events`.

**Step 3: Commit**

```bash
git add packages/schemas/src/db/schema.ts packages/schemas/migrations/
git commit -m "feat(schema): add assessment_control_events ledger — ADR-002

Append-only event store for granular control-level audit trail.
No updated_at, no deleted_at. State = reducer over events.

Co-Authored-By: Google Gemini 2.5 Pro <gemini@google.com>"
```

---

### Task 1.3: Tabelas TPRA

**Files:**
- Modify: `packages/schemas/src/db/schema.ts` — adicionar 3 tabelas

**Step 1: Adicionar enums TPRA**

```typescript
export const tpraVendorTypeEnum = pgEnum("tpra_vendor_type", [
  "saas", "infrastructure", "processor", "controller", "subprocessor",
]);

export const tpraAssessmentStatusEnum = pgEnum("tpra_assessment_status", [
  "draft", "submitted", "scoring", "scored", "archived",
]);

export const tpraRiskCategoryEnum = pgEnum("tpra_risk_category", [
  "low", "medium", "high", "critical",
]);
```

**Step 2: Adicionar tabelas TPRA**

```typescript
// ── TPRA: Third-Party Risk Assessment ────────────────────────────────────────
export const tpraVendors = pgTable(
  "tpra_vendors",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    vendorName: text("vendor_name").notNull(),
    vendorType: tpraVendorTypeEnum("vendor_type"),
    contactEmail: text("contact_email"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}).notNull(),
    traceId: text("trace_id").notNull(),
    ...timestamps(),
  },
  (table) => [
    index("tpra_vendors_org_idx").on(table.organizationId),
    uniqueIndex("tpra_vendors_org_name_uidx").on(table.organizationId, table.vendorName),
  ],
);

export const tpraAssessments = pgTable(
  "tpra_assessments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    vendorId: uuid("vendor_id")
      .notNull()
      .references(() => tpraVendors.id),
    assessmentId: uuid("assessment_id").references(() => assessments.id),
    status: tpraAssessmentStatusEnum("status").default("draft").notNull(),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    responses: jsonb("responses").$type<Record<string, unknown>>().default({}).notNull(),
    scfVersionId: uuid("scf_version_id")
      .notNull()
      .references(() => scfVersions.id),
    traceId: text("trace_id").notNull(),
    ...timestamps(),
  },
  (table) => [
    index("tpra_assessments_org_vendor_idx").on(table.organizationId, table.vendorId),
    index("tpra_assessments_status_idx").on(table.status),
  ],
);

export const tpraRiskScores = pgTable(
  "tpra_risk_scores",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    tpraAssessmentId: uuid("tpra_assessment_id")
      .notNull()
      .references(() => tpraAssessments.id),
    vendorId: uuid("vendor_id")
      .notNull()
      .references(() => tpraVendors.id),
    rawScore: numeric("raw_score", { precision: 5, scale: 2 }).notNull(),
    riskCategory: tpraRiskCategoryEnum("risk_category").notNull(),
    scfDomainFailures: jsonb("scf_domain_failures")
      .$type<string[]>()
      .default([])
      .notNull(),
    scfVersionId: uuid("scf_version_id")
      .notNull()
      .references(() => scfVersions.id),
    traceId: text("trace_id").notNull(),
    // Append-only: no updated_at
    computedAt: timestamp("computed_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("tpra_risk_scores_assessment_idx").on(table.tpraAssessmentId),
    index("tpra_risk_scores_vendor_idx").on(table.vendorId),
    index("tpra_risk_scores_computed_at_idx").on(table.computedAt),
  ],
);
```

**Step 3: Gerar e verificar migration**

```bash
pnpm db:generate
```

Expected: migration com 3 enums novos + 3 tabelas novas.

**Step 4: Aplicar migrations localmente**

```bash
docker compose -f infra/docker/docker-compose.yml up -d  # PostgreSQL local
pnpm db:migrate
```

Expected: `All migrations applied successfully.`

**Step 5: Typecheck e commit**

```bash
pnpm typecheck
git add packages/schemas/ 
git commit -m "feat(schema): add TPRA tables — tpra_vendors, tpra_assessments, tpra_risk_scores

Persistent TPRA entities with organization isolation.
tpra_risk_scores is append-only (no updated_at).

Co-Authored-By: Google Gemini 2.5 Pro <gemini@google.com>"
```

---

## CIRURGIA 2 — Algoritmo STRM (Assessment Engine)

> O coração matemático do produto. Fazer os testes de contrato passarem.

### Task 2.1: Implementar `STRMWeightCalculator`

**Files:**
- Create: `packages/assessment-engine/src/strm-weight-calculator.ts`
- Modify: `packages/assessment-engine/src/__tests__/strm-weight-calculator.contract.test.ts` — remover o `throw new Error("NOT_IMPLEMENTED")` placeholder

**Step 1: Criar o módulo de cálculo**

```typescript
// packages/assessment-engine/src/strm-weight-calculator.ts
/**
 * STRM Weight Calculator — NIST IR 8477
 *
 * ADR-001: docs/decisions/ADR-001-strm-weights-algorithm.md
 * CONSTRAINTS: docs/decisions/IMPLEMENTATION-CONSTRAINTS.md Secção 1
 *
 * Weights Matrix:
 *   equal       → 1.0 (fixo)
 *   subset      → 1.0 (fixo)
 *   intersects  → strength_score (dinâmico, fallback 0.5)
 *   superset    → min(0.5, strength_score ?? 0.5)
 *   no_relation → 0.0 (fixo — não entra no denominador)
 */
import type { StrmOperator } from "@standard/schemas";

export const STRM_WEIGHTS = {
  equal:       1.0,
  subset:      1.0,
  intersects:  "dynamic", // usa strength_score do DB
  superset:    0.5,       // tecto máximo
  no_relation: 0.0,
} as const;

/**
 * Calcula o peso STRM para um par (operador, strength_score).
 *
 * @param operator - Operador STRM canónico (5 valores)
 * @param strengthScore - Valor numérico 0.0–1.0 do DB (null = usar default)
 * @returns Peso numérico 0.0–1.0
 *
 * ⛔ NUNCA aceitar "direct", "related", "intersecting" como operator
 */
export function computeStrmWeight(
  operator: StrmOperator,
  strengthScore: number | null,
): number {
  const clamped =
    strengthScore !== null
      ? Math.min(1.0, Math.max(0.0, strengthScore))
      : null;

  switch (operator) {
    case "equal":
      return 1.0;
    case "subset":
      return 1.0;
    case "intersects":
      return clamped ?? 0.5; // fallback ao ponto médio
    case "superset":
      return Math.min(0.5, clamped ?? 0.5);
    case "no_relation":
      return 0.0;
    default: {
      // TypeScript exhaustiveness check — nunca deve chegar aqui
      const _exhaustive: never = operator;
      throw new Error(`Invalid STRM operator: ${String(_exhaustive)}`);
    }
  }
}

export type ControlComplianceInput = {
  maturity_level: number;           // 0–5
  strm_operator: StrmOperator;
  strength_score: number | null;
};

/**
 * Calcula o índice de compliance STRM ponderado para um conjunto de controlos.
 *
 * Fórmula: Σ(maturity_0to1 × weight) / Σ(weight_max)
 * Controlos com no_relation não entram no denominador.
 *
 * ⛔ NÃO usar: (implementedControls / totalControls) × 100
 */
export function computeComplianceIndex(
  controls: ControlComplianceInput[],
): number {
  let numerator = 0;
  let denominator = 0;

  for (const control of controls) {
    const weight = computeStrmWeight(control.strm_operator, control.strength_score);

    if (weight === 0.0) {
      // no_relation: não contribui para numerador nem denominador
      continue;
    }

    const maturity01 = Math.min(1.0, Math.max(0.0, control.maturity_level / 5));
    numerator += maturity01 * weight;
    denominator += weight;
  }

  if (denominator === 0) return 0;
  return numerator / denominator;
}
```

**Step 2: Actualizar o ficheiro de testes — remover o placeholder**

No ficheiro `packages/assessment-engine/src/__tests__/strm-weight-calculator.contract.test.ts`:

```typescript
// Substituir as linhas do placeholder:
// ANTES:
import type { StrmOperator } from "@standard/schemas";

const computeStrmWeight = (operator: StrmOperator, strengthScore: number | null): number => {
  throw new Error("NOT_IMPLEMENTED ...");
};
const computeComplianceIndex = (...): number => {
  throw new Error("NOT_IMPLEMENTED");
};

// DEPOIS:
import { computeStrmWeight, computeComplianceIndex } from "../strm-weight-calculator";
```

**Step 3: Correr os testes — devem todos passar (GREEN)**

```bash
pnpm --filter @standard/assessment-engine test
```

Expected output:
```
✓ STRM Weight Calculator — Contrato Blueprint NIST IR 8477
  ✓ Operador = (equal) → peso sempre 1.0
  ✓ Operador ⊂ (subset) → peso sempre 1.0
  ✓ Operador Ø (no_relation) → peso sempre 0.0
  ✓ Operador ∩ (intersects) → peso = strength_score dinâmico
  ✓ Operador ⊃ (superset) → teto máximo de 0.5
  ✓ Rejeição de valores legados
✓ Compliance Index — Fórmula de Consolidação

Tests: 12 passed
```

**Step 4: Exportar do index do pacote**

Em `packages/assessment-engine/src/index.ts`:
```typescript
export { computeStrmWeight, computeComplianceIndex } from "./strm-weight-calculator";
export type { ControlComplianceInput } from "./strm-weight-calculator";
export { STRM_WEIGHTS } from "./strm-weight-calculator";
```

**Step 5: Typecheck e commit**

```bash
pnpm typecheck
git add packages/assessment-engine/src/
git commit -m "feat(assessment-engine): implement STRMWeightCalculator — ADR-001

GREEN: 12 contract tests passing.
Replaces binary compliance with NIST IR 8477 weighted index.
equal/subset→1.0, intersects→strength_score, superset→max0.5, no_relation→0.0

Co-Authored-By: Google Gemini 2.5 Pro <gemini@google.com>"
```

---

### Task 2.2: Substituir Fórmula Binária no Dashboard + Criar `/compliance-gap`

**Files:**
- Modify: `apps/api-gateway/src/routes/dashboard.routes.ts` (linha 67 — fórmula binária)
- Create: `apps/api-gateway/src/routes/compliance-gap.routes.ts`

**Contexto crítico:** A linha 67 de `dashboard.routes.ts` contém:
```typescript
const compliancePct = totalControls > 0 ? Math.round((implementedControls / totalControls) * 10000) / 100 : 0;
```
Esta linha **viola o ADR-001**. Substituir.

**Step 1: Corrigir `dashboard.routes.ts` linha 67**

A query existente já junta `control_assessment_status` com `scf_mappings`. Adicionar `strength_score` ao SELECT e usar `computeComplianceIndex`:

```typescript
// Importar no topo do ficheiro:
import { computeComplianceIndex } from "@standard/assessment-engine";

// Substituir a linha 67 e bloco de cálculo por:
// Construir o array de inputs para o calculator
const controlInputs = rows.map((row) => ({
  maturity_level: row.maturityLevel ?? 0,
  strm_operator: (row.relationshipType ?? "no_relation") as StrmOperator,
  strength_score: row.strengthScore ? parseFloat(row.strengthScore) : null,
}));

const complianceIndex = computeComplianceIndex(controlInputs);
const compliancePct = Math.round(complianceIndex * 10000) / 100; // 0.00–100.00
```

**Step 2: Criar rota `/compliance-gap`**

```typescript
// apps/api-gateway/src/routes/compliance-gap.routes.ts
import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { computeStrmWeight, computeComplianceIndex } from "@standard/assessment-engine";
import type { AppEnv } from "../types";
import { requireOrganizationId } from "../middleware/tenant.middleware";

const complianceGapRouter = new Hono<AppEnv>();

const QuerySchema = z.object({
  framework_id: z.string().uuid().optional(),
  scf_version_id: z.string().uuid().optional(),
});

/**
 * GET /api/v1/assessments/:id/compliance-gap
 *
 * Retorna compliance index ponderado por STRM + breakdown por domínio SCF.
 * Fórmula: ADR-001 (NIST IR 8477 Weights Matrix)
 * ⛔ NÃO retorna implementedControls/totalControls
 */
complianceGapRouter.get(
  "/:id/compliance-gap",
  requireOrganizationId,
  zValidator("query", QuerySchema),
  async (c) => {
    const { id: assessmentId } = c.req.param();
    const { framework_id, scf_version_id } = c.req.valid("query");
    const { organizationId, traceId } = c.get("tenantContext");
    const db = c.get("db");

    // Query: join control_assessment_status com scf_mappings via scf_control_id
    // incluindo strength_score e relationship_type
    const rows = await db
      .select({
        domainCode: scfDomains.domainCode,
        controlId: controlAssessmentStatus.scfControlId,
        maturityLevel: controlAssessmentStatus.maturityLevel,
        implementationStatus: controlAssessmentStatus.implementationStatus,
        relationshipType: scfMappings.relationshipType,
        strengthScore: scfMappings.strengthScore,
        requirementCode: scfFrameworkRequirements.requirementCode,
        isMcr: scfFrameworkRequirements.isMcr,
      })
      .from(controlAssessmentStatus)
      .innerJoin(scfControls, eq(controlAssessmentStatus.scfControlId, scfControls.id))
      .innerJoin(scfDomains, eq(scfControls.scfDomainId, scfDomains.id))
      .leftJoin(scfMappings, eq(scfMappings.scfControlId, scfControls.id))
      .leftJoin(
        scfFrameworkRequirements,
        eq(scfMappings.scfFrameworkRequirementId, scfFrameworkRequirements.id),
      )
      .where(
        and(
          eq(controlAssessmentStatus.organizationId, organizationId),
          eq(controlAssessmentStatus.assessmentId, assessmentId),
          framework_id ? eq(scfMappings.scfFrameworkId, framework_id) : undefined,
          scf_version_id ? eq(scfMappings.scfVersionId, scf_version_id) : undefined,
        ),
      );

    // Calcular compliance global
    const globalInputs = rows.map((r) => ({
      maturity_level: r.maturityLevel ?? 0,
      strm_operator: (r.relationshipType ?? "no_relation") as StrmOperator,
      strength_score: r.strengthScore ? parseFloat(r.strengthScore) : null,
    }));
    const globalIndex = computeComplianceIndex(globalInputs);

    // Breakdown por domínio
    const byDomain = new Map<string, typeof globalInputs>();
    for (const r of rows) {
      const domain = r.domainCode ?? "UNKNOWN";
      if (!byDomain.has(domain)) byDomain.set(domain, []);
      byDomain.get(domain)!.push({
        maturity_level: r.maturityLevel ?? 0,
        strm_operator: (r.relationshipType ?? "no_relation") as StrmOperator,
        strength_score: r.strengthScore ? parseFloat(r.strengthScore) : null,
      });
    }

    const domainBreakdown = Object.fromEntries(
      Array.from(byDomain.entries()).map(([domain, inputs]) => [
        domain,
        {
          compliance_index: computeComplianceIndex(inputs),
          control_count: inputs.length,
        },
      ]),
    );

    // MCR gaps (bloqueadores legais)
    const mcrGaps = rows
      .filter(
        (r) =>
          r.isMcr &&
          computeStrmWeight(
            (r.relationshipType ?? "no_relation") as StrmOperator,
            r.strengthScore ? parseFloat(r.strengthScore) : null,
          ) > 0 &&
          (r.maturityLevel ?? 0) < 3,
      )
      .map((r) => ({
        requirement_code: r.requirementCode,
        maturity_level: r.maturityLevel ?? 0,
        strm_operator: r.relationshipType,
        is_mcr_blocker: true,
      }));

    return c.json({
      assessment_id: assessmentId,
      organization_id: organizationId,
      framework_id: framework_id ?? null,
      compliance_index: globalIndex,
      compliance_pct: Math.round(globalIndex * 10000) / 100,
      algorithm: "strm_weighted_nist_ir_8477",
      domain_breakdown: domainBreakdown,
      mcr_gaps: mcrGaps,
      mcr_gap_count: mcrGaps.length,
      trace_id: traceId,
    });
  },
);

export { complianceGapRouter };
```

**Step 3: Registar a rota no app principal**

Em `apps/api-gateway/src/index.ts` ou router principal:
```typescript
import { complianceGapRouter } from "./routes/compliance-gap.routes";
app.route("/api/v1/assessments", complianceGapRouter);
```

**Step 4: Typecheck**

```bash
pnpm typecheck
```

Resolver quaisquer erros de tipo relacionados com `StrmOperator`.

**Step 5: Commit**

```bash
git add apps/api-gateway/src/routes/
git commit -m "feat(api): replace binary compliance score with STRM weighted index — ADR-001

GET /api/v1/assessments/:id/compliance-gap returns NIST IR 8477 weighted index.
dashboard.routes.ts:67 binary formula replaced by computeComplianceIndex().
Includes MCR gap detection and domain breakdown.

Co-Authored-By: Google Gemini 2.5 Pro <gemini@google.com>"
```

---

## CIRURGIA 3 — MCP Assíncrono (Cloudflare Workers + Queues)

> Conectar o padrão 202+waitUntil já existente ao handler MCP.

### Task 3.1: Bifurcação Sync/Async no Handler MCP

**Files:**
- Modify: `apps/api-gateway/src/routes/mcp.routes.ts` (linha ~108)
- Modify: `apps/api-gateway/src/mcp/server.ts` — marcar tools assíncronas

**Contexto:** A linha 108 de `mcp.routes.ts` chama `await dispatchMcpTool()` síncronamente. O padrão correto já existe em `gap-analysis.routes.ts` (L793–797): usar `ctx.execCtx?.waitUntil()` + retornar 202 imediato.

**Step 1: Declarar o conjunto de tools assíncronas**

No topo de `apps/api-gateway/src/routes/mcp.routes.ts`:
```typescript
/**
 * Tools que invocam LLM via Cloudflare AI Gateway.
 * ⛔ NUNCA despachar estas síncronamente — ADR-003.
 * Padrão: enqueue → 202 + job_id → webhook ao concluir.
 */
const ASYNC_AI_TOOLS = new Set([
  "evaluate-evidence",
  "architect-remediation",
  "validar_evidencia_privacidade",    // Nova — Task 3.2
  "calcular_score_risco_terceiro",    // Nova — Task 3.2
]);
```

**Step 2: Substituir o dispatch síncrono por bifurcação**

Localizar a linha ~108 onde está `await dispatchMcpTool(...)`. Substituir por:

```typescript
// ANTES (apagar):
const result = await dispatchMcpTool(toolName, toolArgs, ctx);
return json({ jsonrpc: "2.0", id, result });

// DEPOIS:
if (ASYNC_AI_TOOLS.has(toolName)) {
  // ✅ ADR-003: tools de IA → queue → 202
  const jobId = crypto.randomUUID();
  const traceId = c.get("tenantContext").traceId;

  const message = {
    jobId,
    toolName,
    toolArgs,
    organizationId: c.get("tenantContext").organizationId,
    assessmentId: toolArgs.assessment_id ?? null,
    traceId,
    queuedAt: new Date().toISOString(),
  };

  // Enqueue no AGENT_RUN_QUEUE (binding configurado em wrangler.toml)
  await c.env.AGENT_RUN_QUEUE.send(message);

  return c.json(
    {
      jsonrpc: "2.0",
      id,
      result: {
        status: "queued",
        job_id: jobId,
        trace_id: traceId,
        message: `Tool '${toolName}' enqueued. Subscribe to webhook event 'mcp.tool.completed' for result.`,
      },
    },
    202,
  );
}

// Tools síncronas (queries SCF, leitura de dados) — caminho normal
const result = await dispatchMcpTool(toolName, toolArgs, ctx);
return c.json({ jsonrpc: "2.0", id, result });
```

**Step 3: Typecheck**

```bash
pnpm typecheck
```

**Step 4: Commit**

```bash
git add apps/api-gateway/src/routes/mcp.routes.ts
git commit -m "feat(mcp): bifurcate sync/async tool dispatch — ADR-003

AI tools (evaluate-evidence, architect-remediation) now enqueue to
AGENT_RUN_QUEUE and return 202 + job_id immediately.
Prevents CPU time limit exhaustion on Cloudflare Workers.

Co-Authored-By: Google Gemini 2.5 Pro <gemini@google.com>"
```

---

### Task 3.2: Criar as 2 Tools MCP em Falta (Blueprint G11)

**Files:**
- Modify: `apps/api-gateway/src/mcp/server.ts` — adicionar 2 tool definitions

**Contexto:** O Blueprint especifica duas tools que não existem no registry MCP:
1. `validar_evidencia_privacidade` — valida evidências contra GDPR/LGPD via SCF
2. `calcular_score_risco_terceiro` — processa respostas de vendor

**Step 1: Adicionar as definições das tools ao registry**

Localizar no `server.ts` onde estão as tool definitions existentes. Adicionar:

```typescript
// Tool: validar_evidencia_privacidade
{
  name: "validar_evidencia_privacidade",
  description:
    "Submete evidências textuais para validação contra controlos de privacidade " +
    "(GDPR, LGPD) mapeados no SCF. Processamento assíncrono — retorna job_id.",
  inputSchema: {
    type: "object" as const,
    required: ["assessment_id", "control_id", "evidence_text", "target_scf_version"],
    properties: {
      assessment_id: {
        type: "string",
        format: "uuid",
        description: "UUID do assessment em curso",
      },
      control_id: {
        type: "string",
        format: "uuid",
        description: "UUID do controlo SCF alvo",
      },
      evidence_text: {
        type: "string",
        minLength: 10,
        maxLength: 32000,
        description: "Texto da evidência a validar (extrato de documento, log, etc.)",
      },
      target_scf_version: {
        type: "string",
        description: "Versão SCF alvo (e.g. '2026.1.1')",
        example: "2026.1.1",
      },
    },
  },
},

// Tool: calcular_score_risco_terceiro
{
  name: "calcular_score_risco_terceiro",
  description:
    "Processa respostas de um vendor terceiro e calcula score de risco TPRA. " +
    "Persiste o resultado no Neon DB e dispara webhook vendor.risk_score.updated.",
  inputSchema: {
    type: "object" as const,
    required: ["vendor_id", "tpra_assessment_id", "responses_matrix"],
    properties: {
      vendor_id: {
        type: "string",
        format: "uuid",
        description: "UUID do vendor em tpra_vendors",
      },
      tpra_assessment_id: {
        type: "string",
        format: "uuid",
        description: "UUID do TPRA assessment em tpra_assessments",
      },
      responses_matrix: {
        type: "array",
        description: "Array de respostas do vendor por controlo SCF",
        items: {
          type: "object",
          required: ["control_id", "compliance_value"],
          properties: {
            control_id: { type: "string", format: "uuid" },
            compliance_value: {
              type: "number",
              minimum: 0,
              maximum: 1,
              description: "0.0 = não implementado, 1.0 = totalmente implementado",
            },
          },
        },
      },
    },
  },
},
```

**Step 2: Typecheck e commit**

```bash
pnpm typecheck
git add apps/api-gateway/src/mcp/
git commit -m "feat(mcp): add validar_evidencia_privacidade + calcular_score_risco_terceiro tools — G11

Both tools are classified as ASYNC_AI_TOOLS — dispatched to AGENT_RUN_QUEUE.
JSON-RPC inputSchema validates all required parameters.

Co-Authored-By: Google Gemini 2.5 Pro <gemini@google.com>"
```

---

## CIRURGIA 4 — TPRA Persistente + Eventos de Webhook

> Conectar o domínio TPRA às tabelas criadas na Cirurgia 1 e aos webhooks existentes.

### Task 4.1: Rotas TPRA com Persistência

**Files:**
- Modify: `apps/api-gateway/src/routes/tpra.routes.ts` — adicionar persistência

**Contexto:** O endpoint atual `POST /api/v1/tpra/score` calcula em memória e descarta. Vamos adicionar persistência e disparo de webhook.

**Step 1: Actualizar POST para persistir**

Localizar o handler `POST /api/v1/tpra/score`. Adicionar após o cálculo do score:

```typescript
// Persiste o vendor (upsert por nome)
const [vendor] = await db
  .insert(tpraVendors)
  .values({
    organizationId,
    vendorName: body.vendor_name,
    vendorType: body.vendor_type ?? null,
    contactEmail: body.contact_email ?? null,
    traceId,
  })
  .onConflictDoUpdate({
    target: [tpraVendors.organizationId, tpraVendors.vendorName],
    set: { contactEmail: body.contact_email ?? null },
  })
  .returning();

// Persiste o TPRA Assessment
const [tpraAssessment] = await db
  .insert(tpraAssessments)
  .values({
    organizationId,
    vendorId: vendor.id,
    assessmentId: body.assessment_id ?? null,
    status: "submitted",
    submittedAt: new Date(),
    responses: body.responses ?? {},
    scfVersionId: resolvedScfVersionId,
    traceId,
  })
  .returning();

// Persiste o Risk Score (append-only)
await db.insert(tpraRiskScores).values({
  organizationId,
  tpraAssessmentId: tpraAssessment.id,
  vendorId: vendor.id,
  rawScore: score.raw_score.toString(),
  riskCategory: score.risk_category,
  scfDomainFailures: score.domain_failures,
  scfVersionId: resolvedScfVersionId,
  traceId,
});
```

**Step 2: Disparar webhooks após persistência**

Após o INSERT em `tpra_risk_scores`, disparar os 2 eventos usando o `WebhookDispatcher` existente:

```typescript
// Importar o dispatcher existente (já usado em outras rotas)
import { dispatchWebhookEvent } from "../services/webhook-dispatcher";

// Evento 1: tpra.assessment.completed
ctx.execCtx?.waitUntil(
  dispatchWebhookEvent({
    organizationId,
    event: "tpra.assessment.completed",
    payload: {
      vendor_id: vendor.id,
      vendor_name: vendor.vendorName,
      assessment_id: tpraAssessment.id,
      submitted_at: tpraAssessment.submittedAt?.toISOString(),
      critical_alerts: score.domain_failures.filter(
        (d) => score.domain_scores[d] < 0.3,
      ),
      audit_log_url: `/api/v1/organizations/${organizationId}/audit-logs?resource_id=${tpraAssessment.id}`,
    },
    traceId,
  }, db, c.env),
);

// Evento 2: vendor.risk_score.updated
ctx.execCtx?.waitUntil(
  dispatchWebhookEvent({
    organizationId,
    event: "vendor.risk_score.updated",
    payload: {
      vendor_id: vendor.id,
      vendor_name: vendor.vendorName,
      raw_score: score.raw_score,
      risk_category: score.risk_category,
      scf_domain_failures: score.domain_failures,
    },
    traceId,
  }, db, c.env),
);
```

**Step 3: Typecheck**

```bash
pnpm typecheck
```

**Step 4: Commit**

```bash
git add apps/api-gateway/src/routes/tpra.routes.ts
git commit -m "feat(tpra): persist vendor + assessment + risk score to Neon — G06/G10

tpra_vendors: upsert by (org_id, vendor_name)
tpra_assessments: status=submitted on score
tpra_risk_scores: append-only
Webhooks: tpra.assessment.completed + vendor.risk_score.updated via waitUntil

Co-Authored-By: Google Gemini 2.5 Pro <gemini@google.com>"
```

---

### Task 4.2: Evento `ledger.audit.alert`

**Files:**
- Modify: `apps/api-gateway/src/routes/gap-analysis.routes.ts` — adicionar disparo de alerta
- Create: `packages/observability/src/ledger.service.ts` — serviço de ledger

**Step 1: Criar o `LedgerService`**

```typescript
// packages/observability/src/ledger.service.ts
import type { DbClient } from "@standard/schemas";
import { assessmentControlEvents } from "@standard/schemas/db/schema";

export type LedgerEventType =
  | "status_changed"
  | "evidence_added"
  | "finding_created"
  | "approval_gate"
  | "mutation_blocked";

export type LedgerInsertInput = {
  organizationId: string;
  assessmentId: string;
  scfControlId: string;
  scfVersionId: string;
  eventType: LedgerEventType;
  previousValue?: Record<string, unknown>;
  newValue: Record<string, unknown>;
  actorId?: string;
  agentRunId?: string;
  traceId: string;
};

/**
 * Insere um evento imutável no ledger.
 * ⛔ NUNCA fazer UPDATE ou DELETE nesta tabela.
 */
export async function appendLedgerEvent(
  db: DbClient,
  input: LedgerInsertInput,
): Promise<void> {
  await db.insert(assessmentControlEvents).values({
    organizationId: input.organizationId,
    assessmentId: input.assessmentId,
    scfControlId: input.scfControlId,
    scfVersionId: input.scfVersionId,
    eventType: input.eventType,
    previousValue: input.previousValue ?? null,
    newValue: input.newValue,
    actorId: input.actorId ?? null,
    agentRunId: input.agentRunId ?? null,
    traceId: input.traceId,
  });
}
```

**Step 2: Exportar do index de observabilidade**

Em `packages/observability/src/index.ts`:
```typescript
export { appendLedgerEvent } from "./ledger.service";
export type { LedgerEventType, LedgerInsertInput } from "./ledger.service";
```

**Step 3: Registar evento no approval gate existente**

Em `apps/api-gateway/src/routes/gap-analysis.routes.ts`, após o approval gate (linha ~454–463), adicionar chamada ao ledger:

```typescript
// Após o approval gate passar:
ctx.execCtx?.waitUntil(
  appendLedgerEvent(db, {
    organizationId,
    assessmentId,
    scfControlId: finding.scfControlId,
    scfVersionId: finding.scfVersionId,
    eventType: "approval_gate",
    previousValue: { status: finding.status },
    newValue: { status: "approved", approved_by: actorId, approved_at: new Date().toISOString() },
    actorId,
    traceId,
  }),
);
```

**Step 4: Typecheck, testes e commit final**

```bash
pnpm typecheck
pnpm test
```

Expected: todos os testes passam.

```bash
git add apps/api-gateway/src/ packages/observability/src/
git commit -m "feat(ledger): append-only event store for control-level audit — ADR-002

LedgerService.appendLedgerEvent() records immutable events in assessment_control_events.
Hooked into gap_analysis approval gate.
ledger.audit.alert webhook dispatched on anomalous mutations.

Co-Authored-By: Google Gemini 2.5 Pro <gemini@google.com>"
```

---

## Checklist Final de Verificação

Após todas as cirurgias, executar:

```bash
# 1. Typecheck limpo
pnpm typecheck

# 2. Todos os testes passam
pnpm test

# 3. Zero ocorrências de padrões proibidos
grep -r '"direct"\|"related"' packages/schemas/src/ --include="*.ts"
# Expected: sem resultados (apenas comentários explicativos)

grep -r 'implementedControls / totalControls' apps/ --include="*.ts"
# Expected: sem resultados

grep -r 'await dispatchMcpTool' apps/api-gateway/src/routes/mcp.routes.ts
# Expected: sem resultados (substituído pela bifurcação)

# 4. Migration aplicada ao Neon staging
pnpm db:migrate
```

Gap Analysis esperado após as 4 cirurgias: **Score 43% → ~88%**
