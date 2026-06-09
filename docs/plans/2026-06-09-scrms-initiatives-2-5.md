# SCRMS Iniciativas 2–5: Implementation Plan (Refined)

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Implementar PPTDF API surfacing, SCR-CMM domain scores + maturity routes, Gap MCR enrichment + migration, e Continuous Assessment cycle — tudo validado por `pnpm typecheck` sem erros.

**Architecture:**
- **Iniciativa 2 (PPTDF):** Os 5 booleans PPTDF já existem em `scf_assessment_objectives` (schema + XLSX importer). Falta surfaçar via API: adicionar `pptdf_dimensions[]` ao mapper do Drizzle + novo endpoint `/pptdf-profile`. Sem migration necessária.
- **Iniciativa 3 (SCR-CMM):** O package `maturity` tem lógica completa (0-5, CMMI) mas sem rotas REST e sem `by_domain`/`scr_cmm_level`. Falta: criar `maturity.routes.ts`, extender `MaturitySummary` com domain breakdown, implementar agregação via join `maturity_scores ↔ scf_controls ↔ scf_domains`.
- **Iniciativa 4 (MCR Enrichment):** `is_mcr_gap` hardcoded como `false`. Falta: (a) migration `is_mcr_gap` em `gap_findings`, (b) usar `deps.scf.frameworks.listMcrRequirements()` no `GapDraftService` para popular dinamicamente, (c) filtro `?mcr_only=true` no endpoint.
- **Iniciativa 5 (Continuous Cycle):** Completamente ausente. Falta: migration `parent_assessment_id` + `cycle_number` em `assessments`, nova transição `closed → draft` no engine, endpoint `POST /api/v1/assessments/:id/new-cycle`.

**Tech Stack:** TypeScript, Drizzle ORM, Zod, Hono/Cloudflare Workers, PostgreSQL, pnpm monorepo.

---

## BATCH A — Iniciativa 2: PPTDF API Surfacing

### Task A1: Adicionar `pptdf_dimensions[]` ao mapper de assessment objectives

**Files:**
- Modify: `packages/scf-core/src/repositories/drizzle-scf.repository.ts`

**Step 1: Localizar o mapper de assessment objectives**
```bash
grep -n "mapObjective\|pptdf\|assessmentObjective\|objective_code" packages/scf-core/src/repositories/drizzle-scf.repository.ts | head -30
```

**Step 2: Adicionar campo `pptdf_dimensions` ao mapper existente**

No mapper que constrói `ScfAssessmentObjective` (procurar por onde `objectiveCode` e `text` são lidos), adicionar logo após os campos `pptdf_*`:

```typescript
// Computed: collapsed PPTDF array for quick filtering
pptdf_dimensions: [
  ...(row.pptdfPeople ? ["people" as const] : []),
  ...(row.pptdfProcess ? ["process" as const] : []),
  ...(row.pptdfTechnology ? ["technology" as const] : []),
  ...(row.pptdfData ? ["data" as const] : []),
  ...(row.pptdfFacility ? ["facility" as const] : []),
],
```

**Step 3: Adicionar `pptdf_dimensions` ao `ScfAssessmentObjectiveSchema` em scf.ts**

```typescript
// packages/schemas/src/scf.ts — no ScfAssessmentObjectiveSchema
pptdf_dimensions: z.array(
  z.enum(["people", "process", "technology", "data", "facility"])
).default([]),
```

**Step 4: Typecheck parcial**
```bash
pnpm --filter @standard/schemas typecheck
pnpm --filter @standard/scf-core typecheck
```

**Step 5: Commit**
```bash
git add packages/schemas/src/scf.ts packages/scf-core/src/repositories/drizzle-scf.repository.ts
git commit -m "feat(scf): add pptdf_dimensions calculated array to assessment objective schema and mapper"
```

---

### Task A2: Adicionar filtro `?pptdf=` no endpoint de assessment-objectives

**Files:**
- Modify: `apps/api-gateway/src/routes/scf.routes.ts`

**Step 1: Localizar o endpoint de assessment-objectives**
```bash
grep -n "assessment-objectives\|listAssessmentObjectives" apps/api-gateway/src/routes/scf.routes.ts | head -10
```

**Step 2: Adicionar filtro por dimensão PPTDF no handler**

No handler do endpoint de assessment-objectives:
```typescript
const rawPptdf = new URL(request.url).searchParams.get("pptdf");
const pptdfFilter = rawPptdf ? rawPptdf.split(",").map(s => s.trim()).filter(Boolean) : [];

let objectives = await deps.scf.controls.listAssessmentObjectives(controlId, scfVersionId);

if (pptdfFilter.length > 0) {
  objectives = objectives.filter(obj =>
    pptdfFilter.some(dim => (obj.pptdf_dimensions ?? []).includes(dim as any))
  );
}
```

**Step 3: Adicionar novo endpoint `GET /api/v1/scf/controls/:controlId/pptdf-profile`**

```typescript
{
  method: "GET",
  path: "/api/v1/scf/controls/:controlId/pptdf-profile",
  // ... config auth/permissions igual aos demais ...
  handler: async (ctx) => {
    const controlId = routeUuidParam(ctx.params, "controlId");
    const scfVersionId = await requireVersionQuery(ctx.request, ctx.deps);
    const objectives = await ctx.deps.scf.controls.listAssessmentObjectives(controlId, scfVersionId);

    const active = new Set<string>();
    for (const obj of objectives) {
      for (const dim of obj.pptdf_dimensions ?? []) active.add(dim);
    }

    return json({
      control_id: controlId,
      scf_version_id: scfVersionId,
      active_dimensions: [...active],
      pptdf_profile: {
        people: active.has("people"),
        process: active.has("process"),
        technology: active.has("technology"),
        data: active.has("data"),
        facility: active.has("facility"),
      },
      objectives_analyzed: objectives.length,
      trace_id: ctx.traceId,
    });
  },
},
```

**Step 4: Typecheck + commit**
```bash
pnpm typecheck
git commit -m "feat(api): add ?pptdf= filter and GET pptdf-profile endpoint for SCF assessment objectives"
```

---

## BATCH B — Iniciativa 3: SCR-CMM Domain Scores + Maturity Routes

### Task B1: Estender tipos de MaturitySummary com domain breakdown e SCR-CMM level

**Files:**
- Modify: `packages/maturity/src/types.ts`
- Modify: `packages/schemas/src/maturity.ts`

**Step 1: Adicionar novos tipos em `packages/maturity/src/types.ts`**

Após a definição de `MaturitySummary` existente (L83–91), adicionar:

```typescript
export type MaturityDomainScore = {
  domain_code: string;
  domain_name: string;
  average_score: number;
  median_score: number;
  controls_count: number;
  scored_controls: number;
  level_distribution: Record<MaturityLevel, number>;
};

// Estender MaturitySummary:
export type MaturitySummary = {
  averageScore: number;
  medianScore: number;
  minScore: number;
  maxScore: number;
  totalControls: number;
  scoredControls: number;
  levelDistribution: Record<MaturityLevel, number>;
  // New SCRMS fields:
  scrCmmLevel: MaturityLevel;      // floor(averageScore) capped at 5
  byDomain: MaturityDomainScore[]; // per SCF domain aggregation
};
```

**Step 2: Estender `MaturitySummaryResponseSchema` em `packages/schemas/src/maturity.ts`**

Localizar `MaturitySummaryResponseSchema` (L81–93) e adicionar:
```typescript
scr_cmm_level: z.number().int().min(0).max(5),
by_domain: z.array(z.object({
  domain_code: z.string(),
  domain_name: z.string(),
  average_score: z.number(),
  median_score: z.number(),
  controls_count: z.number().int(),
  scored_controls: z.number().int(),
  level_distribution: z.record(z.string(), z.number()),
})).default([]),
```

**Step 3: Typecheck**
```bash
pnpm --filter @standard/maturity typecheck
pnpm --filter @standard/schemas typecheck
```

**Step 4: Commit**
```bash
git commit -m "feat(maturity): add scrCmmLevel and byDomain breakdown to MaturitySummary types"
```

---

### Task B2: Implementar domain score aggregation em MaturityDraftService

**Files:**
- Modify: `packages/maturity/src/services/maturity-draft.service.ts`
- Modify: `packages/maturity/src/types.ts` — adicionar deps opcionais

**Step 1: Adicionar dep opcional `getControlDomains` a MaturityDependencies**

```typescript
export type MaturityDependencies = {
  repositories: MaturityRepositories;
  getApprovedGapAnalysis: (...) => Promise<...>;
  getMaturityCriteriaForControl?: (...) => Promise<...>;
  // NEW:
  getControlDomains?: (controlIds: string[]) => Promise<
    Record<string, { domain_code: string; domain_name: string }>
  >;
};
```

**Step 2: Localizar `computeSummary` em maturity-draft.service.ts**
```bash
grep -n "computeSummary\|averageScore\|levelDistribution" packages/maturity/src/services/maturity-draft.service.ts | head -20
```

**Step 3: Atualizar `computeSummary` para incluir domain aggregation**

```typescript
private async computeSummary(
  scores: MaturityScore[],
): Promise<MaturitySummary> {
  const vals = scores.map(s => s.score);
  const sorted = [...vals].sort((a, b) => a - b);
  const avg = vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
  const median = sorted[Math.floor(sorted.length / 2)] ?? 0;
  const levelDist = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } as Record<MaturityLevel, number>;
  for (const v of vals) levelDist[v as MaturityLevel] = (levelDist[v as MaturityLevel] ?? 0) + 1;

  // SCR-CMM level = floor of average, capped at 5
  const scrCmmLevel = Math.min(5, Math.max(0, Math.floor(avg))) as MaturityLevel;

  // Domain breakdown (best-effort — requires getControlDomains dep)
  let byDomain: MaturityDomainScore[] = [];
  if (this.deps.getControlDomains) {
    const controlIds = scores.map(s => s.scfControlId);
    const domainMap = await this.deps.getControlDomains(controlIds);
    const grouped = new Map<string, { domain: { domain_code: string; domain_name: string }; scores: number[] }>();
    for (const score of scores) {
      const domain = domainMap[score.scfControlId];
      if (!domain) continue;
      if (!grouped.has(domain.domain_code)) {
        grouped.set(domain.domain_code, { domain, scores: [] });
      }
      grouped.get(domain.domain_code)!.scores.push(score.score);
    }
    for (const [, entry] of grouped) {
      const dVals = entry.scores;
      const dSorted = [...dVals].sort((a, b) => a - b);
      const dAvg = dVals.reduce((a, b) => a + b, 0) / dVals.length;
      const dMedian = dSorted[Math.floor(dSorted.length / 2)] ?? 0;
      const dDist = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } as Record<MaturityLevel, number>;
      for (const v of dVals) dDist[v as MaturityLevel] = (dDist[v as MaturityLevel] ?? 0) + 1;
      byDomain.push({
        domain_code: entry.domain.domain_code,
        domain_name: entry.domain.domain_name,
        average_score: Math.round(dAvg * 100) / 100,
        median_score: dMedian as MaturityLevel,
        controls_count: dVals.length,
        scored_controls: dVals.length,
        level_distribution: dDist,
      });
    }
    byDomain.sort((a, b) => a.domain_code.localeCompare(b.domain_code));
  }

  return {
    averageScore: Math.round(avg * 100) / 100,
    medianScore: median as MaturityLevel,
    minScore: sorted[0] ?? 0,
    maxScore: sorted[sorted.length - 1] ?? 0,
    totalControls: scores.length,
    scoredControls: scores.length,
    levelDistribution: levelDist,
    scrCmmLevel,
    byDomain,
  };
}
```

**Step 4: Typecheck + commit**
```bash
pnpm typecheck
git commit -m "feat(maturity): implement domain score aggregation and SCR-CMM level in computeSummary"
```

---

### Task B3: Criar maturity.routes.ts com CRUD REST completo

**Files:**
- Create: `apps/api-gateway/src/routes/maturity.routes.ts`
- Modify: `apps/api-gateway/src/routes/index.ts` — registrar as rotas

**Step 1: Verificar como outros route files são estruturados**
```bash
head -80 apps/api-gateway/src/routes/gap-analysis.routes.ts
```

**Step 2: Criar `maturity.routes.ts` com os seguintes endpoints:**

```typescript
// POST /api/v1/assessments/:assessmentId/maturity/draft
// GET  /api/v1/assessments/:assessmentId/maturity
// GET  /api/v1/maturity/:maturityVersionId
// GET  /api/v1/maturity/:maturityVersionId/scores
// GET  /api/v1/maturity/:maturityVersionId/summary  ← inclui by_domain e scr_cmm_level
// POST /api/v1/maturity/:maturityVersionId/validate
// POST /api/v1/maturity/:maturityVersionId/submit-review
// POST /api/v1/maturity/:maturityVersionId/approve
```

**Step 3: Implementar handler de summary com domínios**

No handler de `/summary`, chamar `MaturityDraftService.getSummary()` e incluir:
```typescript
return json({
  data: {
    ...summary,
    scr_cmm_level: summary.scrCmmLevel,
    by_domain: summary.byDomain,
  },
  trace_id: traceId,
});
```

**Step 4: Registrar em index.ts**
```bash
grep -n "import.*routes\|registerRoutes\|routes\." apps/api-gateway/src/routes/index.ts | head -20
```

**Step 5: Typecheck + commit**
```bash
pnpm typecheck
git commit -m "feat(api): create maturity.routes.ts with full CRUD including domain scores and SCR-CMM level"
```

---

## BATCH C — Iniciativa 4: MCR Enrichment no Gap Analysis

### Task C1: Migration — adicionar `is_mcr_gap` à tabela `gap_findings`

**Files:**
- Modify: `packages/schemas/src/db/schema.ts` — tabela `gapFindings`

**Step 1: Localizar tabela `gapFindings` no schema (L1665)**

```bash
grep -n "gapFindings\|gap_findings" packages/schemas/src/db/schema.ts | head -10
```

**Step 2: Adicionar coluna ao schema Drizzle**

Na definição da tabela `gapFindings`, após `requiresUserValidation`, adicionar:
```typescript
isMcrGap: boolean("is_mcr_gap").default(false).notNull(),
```

**Step 3: Gerar e aplicar migration**
```bash
pnpm db:generate
# Verificar arquivo SQL gerado em infra/docker/postgres/migrations/
pnpm db:migrate
```

**Step 4: Remover `(row as any)` do mapper no drizzle-gap-analysis.repository.ts**

Localizar linha que usa `(row as any).isMcrGap` e substituir por `row.isMcrGap`:
```typescript
is_mcr_gap: row.isMcrGap ?? false,
```

Fazer o mesmo no `apps/api-gateway/src/adapters/gap-analysis.repository.ts`.

**Step 5: Typecheck + commit**
```bash
pnpm typecheck
git commit -m "feat(db): add is_mcr_gap column to gap_findings table and clean up any-casts"
```

---

### Task C2: Implementar MCR enrichment no GapDraftService

**Files:**
- Modify: `packages/gap-analysis/src/services/gap-draft.service.ts`

**Step 1: Localizar onde `is_mcr_gap: false` está hardcoded (L113)**

**Step 2: Substituir pela chamada ao SCF service**

```typescript
// MCR enrichment: resolve via SCF framework requirements
let is_mcr_gap = false;
if (this.deps.scf && soaItem.framework_requirement_id) {
  try {
    // Check if the framework requirement is a Minimum Compliance Requirement
    const frameworkId = soaItem.framework_id;
    if (frameworkId) {
      const mcrReqs = await this.deps.scf.frameworks.listMcrRequirements(frameworkId);
      is_mcr_gap = mcrReqs.some(req => req.framework_requirement_id === soaItem.framework_requirement_id);
    }
  } catch {
    // Non-blocking: if SCF is unavailable, default to false
    is_mcr_gap = false;
  }
}
```

**Step 3: Fazer o mesmo em `gap-analysis-execution.service.ts` (linha 311)**

```typescript
// MCR enrichment via SCF deps
let is_mcr_gap = false;
if (this.deps?.scf && soaItem.framework_id && soaItem.framework_requirement_id) {
  try {
    const mcrReqs = await this.deps.scf.frameworks.listMcrRequirements(soaItem.framework_id);
    is_mcr_gap = mcrReqs.some(r => r.framework_requirement_id === soaItem.framework_requirement_id);
  } catch { /* non-blocking */ }
}
```

**Step 4: Typecheck + commit**
```bash
pnpm typecheck
git commit -m "feat(gap): implement MCR enrichment — is_mcr_gap populated from SCF listMcrRequirements"
```

---

### Task C3: Adicionar filtro `?mcr_only=true` no endpoint de gap findings

**Files:**
- Modify: `apps/api-gateway/src/routes/gap-analysis.routes.ts`

**Step 1: Localizar endpoint `GET /api/v1/gap-analysis/:gapAnalysisVersionId/findings` (L218)**

**Step 2: Adicionar filtro mcr_only**

```typescript
const mcrOnly = new URL(request.url).searchParams.get("mcr_only") === "true";
const allFindings = await gapDraftService.listGapFindings(versionId, {}, context);
const findings = mcrOnly ? allFindings.filter(f => f.is_mcr_gap) : allFindings;

return json({
  data: findings,
  meta: {
    total: findings.length,
    mcr_findings: findings.filter(f => f.is_mcr_gap).length,
    mcr_only_filter: mcrOnly,
  },
  trace_id: traceId,
});
```

**Step 3: Typecheck + commit**
```bash
pnpm typecheck
git commit -m "feat(api): add ?mcr_only=true filter to gap findings endpoint"
```

---

## BATCH D — Iniciativa 5: Continuous Assessment Cycle

### Task D1: Migration — adicionar campos de ciclo à tabela `assessments`

**Files:**
- Modify: `packages/schemas/src/db/schema.ts` — tabela `assessments` (L865–888)

**Step 1: Adicionar colunas de ciclo**

```typescript
// Self-referential FK para rastreabilidade de re-assessments
parentAssessmentId: uuid("parent_assessment_id"),  // nullable — null = assessment original
cycleNumber: integer("cycle_number").default(1).notNull(),
baselineSoaVersionId: uuid("baseline_soa_version_id"), // nullable
```

**⚠️ Não usar `.references()` na FK self-referencial** sem garantir que Drizzle a gera corretamente.

**Step 2: Gerar e aplicar migration**
```bash
pnpm db:generate
# Revisar SQL: deve ser ADD COLUMN...DEFAULT 1 NOT NULL / ADD COLUMN...NULL
pnpm db:migrate
```

**Step 3: Commit**
```bash
git commit -m "feat(db): add parent_assessment_id, cycle_number, baseline_soa_version_id to assessments"
```

---

### Task D2: Atualizar schemas Zod de assessment com cycle fields

**Files:**
- Modify: `packages/schemas/src/assessment.ts`

**Step 1: Localizar schema de assessment response**
```bash
grep -n "AssessmentSchema\|AssessmentResponse\|parent_assessment" packages/schemas/src/assessment.ts | head -20
```

**Step 2: Adicionar campos**

```typescript
parent_assessment_id: z.string().uuid().optional().nullable(),
cycle_number: z.number().int().min(1).default(1),
baseline_soa_version_id: z.string().uuid().optional().nullable(),
```

**Step 3: Typecheck + commit**
```bash
pnpm typecheck
git commit -m "feat(schemas): add cycle fields to assessment schema (parent_id, cycle_number, baseline_soa)"
```

---

### Task D3: Adicionar transição `closed → draft` no assessment engine

**Files:**
- Modify: `packages/assessment-engine/src/transitions.ts`
- Modify: `packages/assessment-engine/src/states.ts` — remover `closed` de `terminalAssessmentStates`? (cuidado — lógica de workflow usa isso)
- Modify: `packages/assessment-engine/src/prerequisites.ts`

**⚠️ DECISÃO ARQUITETURAL:** Não remover `closed` dos terminal states — em vez disso, a criação de novo ciclo é um **novo assessment separado** com `parent_assessment_id` linkado. O assessment `closed` permanece imutável. Isso preserva a imutabilidade dos artefatos aprovados (regra AGENTS.md §11).

**Step 1: Confirmar que não precisamos alterar `states.ts` ou `transitions.ts`**

A Iniciativa 5 cria um **novo assessment** a partir de um `closed`, não reutiliza o mesmo. Portanto o engine não precisa mudar.

**Step 2: Documentar a decisão em `docs/decisions/adr-005-continuous-assessment-cycle.md`**

```markdown
# ADR-005: Continuous Assessment Cycle via New Assessment

## Decision
A new assessment cycle is created as a **new Assessment entity** with `parent_assessment_id`
pointing to the original closed assessment. The closed assessment remains immutable.

## Rationale
- Preserves immutability of approved artifacts (SoA, Gap Analysis, Maturity, POA&M)
- Avoids state machine complexity of reopening a terminal state
- Enables clear audit trail of cycle evolution
```

**Step 3: Commit**
```bash
git commit -m "docs: add ADR-005 — continuous assessment cycle via new assessment entity"
```

---

### Task D4: Implementar `POST /api/v1/assessments/:id/new-cycle`

**Files:**
- Modify: `apps/api-gateway/src/routes/assessment.routes.ts` (ou criar `assessment-cycle.routes.ts`)

**Step 1: Localizar rotas de assessment**
```bash
grep -n "path.*assessment\|assessments.*routes" apps/api-gateway/src/routes/assessment.routes.ts | head -20
```

**Step 2: Implementar endpoint**

```typescript
{
  method: "POST",
  path: "/api/v1/assessments/:assessmentId/new-cycle",
  // auth + permissions: assessments:write
  handler: async (ctx) => {
    const parentId = routeUuidParam(ctx.params, "assessmentId");
    const organizationId = ctx.organizationId;

    // 1. Validate parent assessment exists, belongs to org, and is closed
    const parent = await ctx.deps.assessments.get(parentId, organizationId);
    if (!parent) throw new ApiError("NOT_FOUND", "Assessment not found.", 404);
    if (parent.state !== "closed") {
      throw new ApiError(
        "VALIDATION_ERROR",
        `Only closed assessments can start a new cycle. Current state: ${parent.state}`,
        400
      );
    }

    // 2. Find most recent approved SoA from parent assessment
    const soaVersions = await ctx.deps.soa.repositories.versions.listByAssessment(parentId, organizationId);
    const approvedSoa = soaVersions
      .filter(v => v.status === "approved")
      .sort((a, b) => b.version_number - a.version_number)[0];

    // 3. Create new assessment as new cycle
    const cycleNumber = (parent.cycle_number ?? 1) + 1;
    const newId = crypto.randomUUID();
    const newAssessment = {
      id: newId,
      organization_id: organizationId,
      name: `${parent.name} — Cycle ${cycleNumber}`,
      state: "draft" as const,
      scf_version_id: parent.scf_version_id,
      parent_assessment_id: parentId,
      cycle_number: cycleNumber,
      baseline_soa_version_id: approvedSoa?.soa_version_id ?? null,
      created_by: ctx.actorId,
      trace_id: ctx.traceId,
    };

    await ctx.deps.assessments.save(newAssessment);

    return json({
      data: newAssessment,
      parent_assessment_id: parentId,
      cycle_number: cycleNumber,
      baseline_soa_version_id: approvedSoa?.soa_version_id ?? null,
      message: `New assessment cycle ${cycleNumber} created successfully.`,
      trace_id: ctx.traceId,
    }, { status: 201 });
  },
},
```

**Step 3: Typecheck + commit**
```bash
pnpm typecheck
git commit -m "feat(api): add POST /api/v1/assessments/:id/new-cycle for continuous assessment"
```

---

## Verification Final

```bash
# Typecheck completo — deve passar sem erros
pnpm typecheck

# Lint
pnpm lint

# Testes (se disponíveis)
pnpm test
```

### Endpoints entregues após todas as iniciativas:

| Método | Endpoint | Iniciativa |
|---|---|---|
| `GET` | `/api/v1/scf/controls/:id/assessment-objectives?pptdf=people,process` | 2 |
| `GET` | `/api/v1/scf/controls/:id/pptdf-profile` | 2 |
| `POST` | `/api/v1/assessments/:id/maturity/draft` | 3 |
| `GET` | `/api/v1/assessments/:id/maturity` | 3 |
| `GET` | `/api/v1/maturity/:versionId/summary` (com `by_domain`, `scr_cmm_level`) | 3 |
| `GET` | `/api/v1/gap-analysis/:versionId/findings?mcr_only=true` | 4 |
| `POST` | `/api/v1/assessments/:id/new-cycle` | 5 |

### Tracker de tasks:

| Task | Iniciativa | Status |
|---|---|---|
| A1 — PPTDF mapper + schema | 2 | `[ ]` |
| A2 — PPTDF endpoints | 2 | `[ ]` |
| B1 — MaturitySummary types | 3 | `[ ]` |
| B2 — Domain aggregation | 3 | `[ ]` |
| B3 — maturity.routes.ts | 3 | `[ ]` |
| C1 — Migration is_mcr_gap | 4 | `[ ]` |
| C2 — MCR enrichment runtime | 4 | `[ ]` |
| C3 — Filter mcr_only | 4 | `[ ]` |
| D1 — Migration cycle fields | 5 | `[ ]` |
| D2 — Assessment schema cycle | 5 | `[ ]` |
| D3 — ADR-005 | 5 | `[ ]` |
| D4 — new-cycle endpoint | 5 | `[ ]` |
