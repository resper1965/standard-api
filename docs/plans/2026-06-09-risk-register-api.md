# Risk Register API Implementation Plan

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Implementar a API CRUD do `assessment_risk_register` — o registro operacional de riscos por assessment, com `risk_appetite`, `risk_tolerance` e `risk_threshold` recebidos como input da aplicação consumidora (GRC / frontend), e `within_tolerance` calculado deterministicamente pelo Standard.

**Architecture:**
- Tabela `assessment_risk_register` já existe (migration 0043). Faltam: 3 campos de input (`risk_appetite_input`, `risk_tolerance_input`, `risk_threshold_input`) + `within_tolerance` (boolean calculado), o Zod schema, o service e as routes.
- A migration 0044 adiciona os 4 campos na tabela existente.
- Service puro (`risk-register.service.ts`) em `packages/gap-analysis/src/services/` calcula `within_tolerance = residual_risk_score <= risk_tolerance_input` e deriva `risk_category` dos scores.
- Routes em `apps/api-gateway/src/routes/risk-register.routes.ts`, registradas em `app.ts`.
- Multi-tenancy obrigatório: todo acesso filtrado por `organization_id` + `assessment_id`.

**Tech Stack:** Drizzle ORM, Zod, Hono, TypeScript strict, `packages/schemas`, `apps/api-gateway`

---

## Task 1: Migration 0044 — adicionar campos de risk appetite na tabela

**Files:**
- Modify: `packages/schemas/src/db/schema.ts` — adicionar 4 colunas ao `assessmentRiskRegister`
- Run: `pnpm db:generate` para gerar `0044_*.sql`

**Contexto:** A tabela `assessment_risk_register` foi criada na migration 0043 mas sem os campos de input de risk appetite. Eles precisam ser nullable (nem todo registro precisa deles).

**Step 1: Adicionar 4 colunas ao `assessmentRiskRegister` em `packages/schemas/src/db/schema.ts`**

Localizar o bloco da tabela `assessmentRiskRegister` (linha ~864). Adicionar antes de `traceId`:

```typescript
/** Input da aplicação consumidora: corporate risk appetite (0.0–1.0). Não gerenciado pelo Standard. */
riskAppetiteInput: numeric("risk_appetite_input", { precision: 4, scale: 2 }),
/** Input da aplicação consumidora: LOB/unit risk tolerance (0.0–1.0). */
riskToleranceInput: numeric("risk_tolerance_input", { precision: 4, scale: 2 }),
/** Input da aplicação consumidora: departmental risk threshold (0.0–1.0). */
riskThresholdInput: numeric("risk_threshold_input", { precision: 4, scale: 2 }),
/**
 * Calculado pelo Standard: residual_risk_score <= risk_tolerance_input.
 * null quando risk_tolerance_input não foi fornecido.
 */
withinTolerance: boolean("within_tolerance"),
```

**Step 2: Gerar migration**

```powershell
pnpm db:generate
```

Esperado: `[✓] Your SQL migration file ➜ ...0044_*.sql 🚀`

**Step 3: Verificar SQL gerado**

```powershell
Get-Content (Get-ChildItem infra/docker/postgres/migrations/0044_*.sql | Select-Object -First 1).FullName
```

Esperado: 4x `ALTER TABLE "assessment_risk_register" ADD COLUMN ...`

**Step 4: Commit**

```powershell
git add -A; git commit -m "feat(risk-register): add risk appetite input fields + within_tolerance to schema, migration-0044"
```

---

## Task 2: Zod Schemas para Risk Register

**Files:**
- Create: `packages/schemas/src/risk-register.ts`
- Modify: `packages/schemas/src/index.ts` — re-export

**Contexto:** Os schemas Zod definem os contratos da API. Devem ser importados pelo service e pelas routes.

**Step 1: Criar `packages/schemas/src/risk-register.ts`**

```typescript
import { z } from "zod";

/** Tratamentos de risco disponíveis (espelho do enum DB). */
export const RiskTreatmentSchema = z.enum([
  "mitigate",
  "accept",
  "transfer",
  "avoid",
  "monitor",
]);
export type RiskTreatment = z.infer<typeof RiskTreatmentSchema>;

/** Categorias de risco derivadas do residual score. */
export const RiskCategorySchema = z.enum([
  "low",
  "moderate",
  "high",
  "severe",
  "extreme",
]);
export type RiskCategory = z.infer<typeof RiskCategorySchema>;

/**
 * Body para criação de uma entrada no risk register.
 * risk_appetite/tolerance/threshold vêm da aplicação consumidora (GRC / frontend).
 * O Standard NÃO armazena nem gerencia esses valores — apenas os recebe por request.
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
  review_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  /** Corporate risk appetite — 0.0 a 1.0. Enviado pela aplicação, nunca gerenciado pelo Standard. */
  risk_appetite: z.number().min(0).max(1).optional(),
  /** LOB/unit risk tolerance — 0.0 a 1.0. */
  risk_tolerance: z.number().min(0).max(1).optional(),
  /** Departmental risk threshold — 0.0 a 1.0. */
  risk_threshold: z.number().min(0).max(1).optional(),
});
export type CreateRiskRegisterEntry = z.infer<typeof CreateRiskRegisterEntrySchema>;

/** Body para update parcial. Todos opcionais exceto nenhum (deve ter ao menos 1 campo). */
export const UpdateRiskRegisterEntrySchema = CreateRiskRegisterEntrySchema
  .partial()
  .omit({ gap_finding_id: true, scf_version_id: true })
  .refine(obj => Object.keys(obj).length > 0, {
    message: "At least one field must be provided for update.",
  });
export type UpdateRiskRegisterEntry = z.infer<typeof UpdateRiskRegisterEntrySchema>;

/** Response de uma entrada do risk register. */
export const RiskRegisterEntrySchema = z.object({
  id: z.string().uuid(),
  organization_id: z.string().uuid(),
  assessment_id: z.string().uuid(),
  scf_version_id: z.string().uuid(),
  gap_finding_id: z.string().uuid(),
  scf_risk_id: z.string().uuid().nullable(),
  risk_title: z.string(),
  risk_description: z.string().nullable(),
  inherent_risk_score: z.string().nullable(),
  residual_risk_score: z.string().nullable(),
  risk_category: RiskCategorySchema.nullable(),
  treatment: RiskTreatmentSchema,
  treatment_rationale: z.string().nullable(),
  owner_id: z.string().uuid().nullable(),
  review_date: z.string().nullable(),
  roc_determination: z.string().nullable(),
  risk_appetite_input: z.string().nullable(),
  risk_tolerance_input: z.string().nullable(),
  risk_threshold_input: z.string().nullable(),
  within_tolerance: z.boolean().nullable(),
  trace_id: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type RiskRegisterEntry = z.infer<typeof RiskRegisterEntrySchema>;

/** Response paginada da listagem. */
export const RiskRegisterListResponseSchema = z.object({
  data: z.array(RiskRegisterEntrySchema),
  total: z.number(),
  trace_id: z.string(),
});
```

**Step 2: Adicionar export em `packages/schemas/src/index.ts`**

Adicionar linha:
```typescript
export * from "./risk-register";
```

**Step 3: Typecheck**

```powershell
pnpm typecheck 2>&1 | Select-Object -Last 6
```

Esperado: tudo `Done`, sem erros.

**Step 4: Commit**

```powershell
git add -A; git commit -m "feat(risk-register): add zod schemas for risk register api"
```

---

## Task 3: Risk Register Service

**Files:**
- Create: `packages/gap-analysis/src/services/risk-register.service.ts`

**Contexto:** O service encapsula toda a lógica de negócio do risk register:
1. Valida que o `gap_finding_id` pertence ao assessment correto (multi-tenancy)
2. Deriva `inherent/residual_risk_score` do gap finding (via `risk-score.service.ts`)
3. Calcula `risk_category` a partir do residual score
4. Calcula `within_tolerance` = `residual_risk_score <= risk_tolerance_input`
5. Deriva `roc_determination` do gap finding (denormalizado)
6. CRUD contra `assessmentRiskRegister` via Drizzle

**Step 1: Criar `packages/gap-analysis/src/services/risk-register.service.ts`**

```typescript
import { eq, and } from "drizzle-orm";
import { assessmentRiskRegister, gapFindings } from "@standard/schemas/db";
import type { GapAnalysisContext, GapAnalysisDependencies } from "../types";
import { GapAnalysisWorkflowError } from "../errors";
import type {
  CreateRiskRegisterEntry,
  RiskRegisterEntry,
  UpdateRiskRegisterEntry,
} from "@standard/schemas";
import { randomUUID } from "crypto";

/** Deriva risk_category a partir do residual risk score (0.0–1.0). */
export const deriveRiskCategory = (
  residualScore: number,
): "low" | "moderate" | "high" | "severe" | "extreme" => {
  if (residualScore < 0.2) return "low";
  if (residualScore < 0.4) return "moderate";
  if (residualScore < 0.6) return "high";
  if (residualScore < 0.8) return "severe";
  return "extreme";
};

export class RiskRegisterService {
  constructor(private readonly deps: GapAnalysisDependencies) {}

  async create(
    assessmentId: string,
    input: CreateRiskRegisterEntry,
    ctx: GapAnalysisContext,
  ): Promise<RiskRegisterEntry> {
    // 1. Validar que o gap finding pertence ao assessment (multi-tenancy)
    const finding = await this.deps.repositories.gapFindings.get(
      input.gap_finding_id,
      ctx.organizationId,
    );
    if (!finding || finding.assessment_id !== assessmentId) {
      throw new GapAnalysisWorkflowError(
        "GAP_FINDING_NOT_FOUND",
        "Gap finding not found or does not belong to this assessment.",
      );
    }

    // 2. Herdar scores do gap finding
    const inherentScore = finding.inherent_risk_score
      ? Number(finding.inherent_risk_score)
      : null;
    const residualScore = finding.residual_risk_score
      ? Number(finding.residual_risk_score)
      : null;

    // 3. Calcular risk_category
    const riskCategory = residualScore !== null
      ? deriveRiskCategory(residualScore)
      : null;

    // 4. Calcular within_tolerance
    const riskToleranceInput = input.risk_tolerance ?? null;
    const withinTolerance =
      residualScore !== null && riskToleranceInput !== null
        ? residualScore <= riskToleranceInput
        : null;

    const entry = {
      id: randomUUID(),
      organizationId: ctx.organizationId,
      assessmentId,
      scfVersionId: input.scf_version_id,
      gapFindingId: input.gap_finding_id,
      scfRiskId: input.scf_risk_id ?? null,
      riskTitle: input.risk_title,
      riskDescription: input.risk_description ?? null,
      inherentRiskScore: inherentScore !== null ? String(inherentScore) : null,
      residualRiskScore: residualScore !== null ? String(residualScore) : null,
      riskCategory,
      treatment: input.treatment,
      treatmentRationale: input.treatment_rationale ?? null,
      ownerId: input.owner_id ?? null,
      reviewDate: input.review_date ?? null,
      rocDetermination: finding.roc_determination ?? null,
      riskAppetiteInput: input.risk_appetite !== undefined ? String(input.risk_appetite) : null,
      riskToleranceInput: riskToleranceInput !== null ? String(riskToleranceInput) : null,
      riskThresholdInput: input.risk_threshold !== undefined ? String(input.risk_threshold) : null,
      withinTolerance,
      traceId: ctx.traceId,
    };

    await this.deps.db
      .insert(assessmentRiskRegister)
      .values(entry);

    return this.toResponse(entry);
  }

  async list(assessmentId: string, ctx: GapAnalysisContext): Promise<RiskRegisterEntry[]> {
    const rows = await this.deps.db
      .select()
      .from(assessmentRiskRegister)
      .where(
        and(
          eq(assessmentRiskRegister.organizationId, ctx.organizationId),
          eq(assessmentRiskRegister.assessmentId, assessmentId),
        ),
      );
    return rows.map(r => this.toResponse(r));
  }

  async get(entryId: string, ctx: GapAnalysisContext): Promise<RiskRegisterEntry | null> {
    const rows = await this.deps.db
      .select()
      .from(assessmentRiskRegister)
      .where(
        and(
          eq(assessmentRiskRegister.id, entryId),
          eq(assessmentRiskRegister.organizationId, ctx.organizationId),
        ),
      );
    return rows[0] ? this.toResponse(rows[0]) : null;
  }

  async update(
    entryId: string,
    patch: UpdateRiskRegisterEntry,
    ctx: GapAnalysisContext,
  ): Promise<RiskRegisterEntry> {
    const existing = await this.get(entryId, ctx);
    if (!existing) {
      throw new GapAnalysisWorkflowError("RISK_REGISTER_NOT_FOUND", "Risk register entry not found.");
    }

    const residualScore = existing.residual_risk_score
      ? Number(existing.residual_risk_score)
      : null;

    const riskToleranceInput = patch.risk_tolerance !== undefined
      ? patch.risk_tolerance
      : existing.risk_tolerance_input
        ? Number(existing.risk_tolerance_input)
        : null;

    const withinTolerance =
      residualScore !== null && riskToleranceInput !== null
        ? residualScore <= riskToleranceInput
        : existing.within_tolerance;

    const updates: Partial<typeof assessmentRiskRegister.$inferInsert> = {
      ...(patch.risk_title && { riskTitle: patch.risk_title }),
      ...(patch.risk_description !== undefined && { riskDescription: patch.risk_description }),
      ...(patch.treatment && { treatment: patch.treatment }),
      ...(patch.treatment_rationale !== undefined && { treatmentRationale: patch.treatment_rationale }),
      ...(patch.owner_id !== undefined && { ownerId: patch.owner_id }),
      ...(patch.review_date !== undefined && { reviewDate: patch.review_date }),
      ...(patch.risk_appetite !== undefined && { riskAppetiteInput: String(patch.risk_appetite) }),
      ...(patch.risk_tolerance !== undefined && { riskToleranceInput: String(patch.risk_tolerance) }),
      ...(patch.risk_threshold !== undefined && { riskThresholdInput: String(patch.risk_threshold) }),
      withinTolerance,
    };

    await this.deps.db
      .update(assessmentRiskRegister)
      .set(updates)
      .where(
        and(
          eq(assessmentRiskRegister.id, entryId),
          eq(assessmentRiskRegister.organizationId, ctx.organizationId),
        ),
      );

    return { ...existing, ...updates } as RiskRegisterEntry;
  }

  async delete(entryId: string, ctx: GapAnalysisContext): Promise<void> {
    const existing = await this.get(entryId, ctx);
    if (!existing) {
      throw new GapAnalysisWorkflowError("RISK_REGISTER_NOT_FOUND", "Risk register entry not found.");
    }
    await this.deps.db
      .delete(assessmentRiskRegister)
      .where(
        and(
          eq(assessmentRiskRegister.id, entryId),
          eq(assessmentRiskRegister.organizationId, ctx.organizationId),
        ),
      );
  }

  private toResponse(row: Record<string, unknown>): RiskRegisterEntry {
    return {
      id: row.id as string,
      organization_id: row.organizationId as string,
      assessment_id: row.assessmentId as string,
      scf_version_id: row.scfVersionId as string,
      gap_finding_id: row.gapFindingId as string,
      scf_risk_id: (row.scfRiskId as string | null) ?? null,
      risk_title: row.riskTitle as string,
      risk_description: (row.riskDescription as string | null) ?? null,
      inherent_risk_score: (row.inherentRiskScore as string | null) ?? null,
      residual_risk_score: (row.residualRiskScore as string | null) ?? null,
      risk_category: (row.riskCategory as RiskRegisterEntry["risk_category"]) ?? null,
      treatment: row.treatment as RiskRegisterEntry["treatment"],
      treatment_rationale: (row.treatmentRationale as string | null) ?? null,
      owner_id: (row.ownerId as string | null) ?? null,
      review_date: (row.reviewDate as string | null) ?? null,
      roc_determination: (row.rocDetermination as string | null) ?? null,
      risk_appetite_input: (row.riskAppetiteInput as string | null) ?? null,
      risk_tolerance_input: (row.riskToleranceInput as string | null) ?? null,
      risk_threshold_input: (row.riskThresholdInput as string | null) ?? null,
      within_tolerance: (row.withinTolerance as boolean | null) ?? null,
      trace_id: row.traceId as string,
      created_at: row.createdAt as string,
      updated_at: row.updatedAt as string,
    };
  }
}
```

**Step 2: Typecheck**

```powershell
pnpm typecheck 2>&1 | Select-Object -Last 6
```

**Step 3: Commit**

```powershell
git add -A; git commit -m "feat(risk-register): add risk register service with within_tolerance calculation"
```

---

## Task 4: Risk Register Routes

**Files:**
- Create: `apps/api-gateway/src/routes/risk-register.routes.ts`
- Modify: `apps/api-gateway/src/app.ts` — registrar `riskRegisterRoutes`

**Endpoints a criar:**
- `POST   /api/v1/assessments/:id/risk-register` — criar entrada
- `GET    /api/v1/assessments/:id/risk-register` — listar todas do assessment
- `GET    /api/v1/assessments/:id/risk-register/:entryId` — detalhe
- `PATCH  /api/v1/assessments/:id/risk-register/:entryId` — atualizar
- `DELETE /api/v1/assessments/:id/risk-register/:entryId` — remover

**Step 1: Criar `apps/api-gateway/src/routes/risk-register.routes.ts`**

```typescript
import {
  CreateRiskRegisterEntrySchema,
  UpdateRiskRegisterEntrySchema,
} from "@standard/schemas";
import { RiskRegisterService } from "@standard/gap-analysis";
import type { RouteDefinition } from "../http";
import {
  json,
  parseJson,
  routeUuidParam,
  requireOrganizationId,
} from "../http";
import { ApiError } from "../errors/api-error";
import { requireAssessment } from "./gap-analysis.routes";

const contextFor = (assessmentId: string, organizationId: string, traceId: string, actorId?: string) => ({
  organizationId,
  assessmentId,
  traceId,
  ...(actorId ? { actorId } : {}),
});

export const riskRegisterRoutes: RouteDefinition[] = [
  // ── POST /assessments/:id/risk-register ────────────────────────────────────
  {
    method: "POST",
    path: "/api/v1/assessments/:id/risk-register",
    protected: true,
    requireActor: true,
    permissions: ["gap:update"],
    handler: async ({ deps, params, request, organizationId, actorId, traceId }) => {
      const orgId = requireOrganizationId({ organizationId });
      const assessmentId = routeUuidParam(params, "id");
      await requireAssessment(deps, assessmentId, orgId);

      const body = await parseJson(request, CreateRiskRegisterEntrySchema);
      const ctx = contextFor(assessmentId, orgId, traceId, actorId);

      const service = new RiskRegisterService(deps.gapAnalysis);
      const entry = await service.create(assessmentId, body, ctx);
      return json({ data: entry, trace_id: traceId }, 201);
    },
  },

  // ── GET /assessments/:id/risk-register ─────────────────────────────────────
  {
    method: "GET",
    path: "/api/v1/assessments/:id/risk-register",
    protected: true,
    permissions: ["gap:read"],
    handler: async ({ deps, params, organizationId, traceId }) => {
      const orgId = requireOrganizationId({ organizationId });
      const assessmentId = routeUuidParam(params, "id");
      await requireAssessment(deps, assessmentId, orgId);

      const ctx = contextFor(assessmentId, orgId, traceId);
      const service = new RiskRegisterService(deps.gapAnalysis);
      const entries = await service.list(assessmentId, ctx);
      return json({ data: entries, total: entries.length, trace_id: traceId });
    },
  },

  // ── GET /assessments/:id/risk-register/:entryId ────────────────────────────
  {
    method: "GET",
    path: "/api/v1/assessments/:id/risk-register/:entryId",
    protected: true,
    permissions: ["gap:read"],
    handler: async ({ deps, params, organizationId, traceId }) => {
      const orgId = requireOrganizationId({ organizationId });
      const assessmentId = routeUuidParam(params, "id");
      const entryId = routeUuidParam(params, "entryId");
      await requireAssessment(deps, assessmentId, orgId);

      const ctx = contextFor(assessmentId, orgId, traceId);
      const service = new RiskRegisterService(deps.gapAnalysis);
      const entry = await service.get(entryId, ctx);
      if (!entry) throw new ApiError("NOT_FOUND", "Risk register entry not found.", 404);
      return json({ data: entry, trace_id: traceId });
    },
  },

  // ── PATCH /assessments/:id/risk-register/:entryId ──────────────────────────
  {
    method: "PATCH",
    path: "/api/v1/assessments/:id/risk-register/:entryId",
    protected: true,
    requireActor: true,
    permissions: ["gap:update"],
    handler: async ({ deps, params, request, organizationId, actorId, traceId }) => {
      const orgId = requireOrganizationId({ organizationId });
      const assessmentId = routeUuidParam(params, "id");
      const entryId = routeUuidParam(params, "entryId");
      await requireAssessment(deps, assessmentId, orgId);

      const body = await parseJson(request, UpdateRiskRegisterEntrySchema);
      const ctx = contextFor(assessmentId, orgId, traceId, actorId);

      const service = new RiskRegisterService(deps.gapAnalysis);
      const entry = await service.update(entryId, body, ctx);
      return json({ data: entry, trace_id: traceId });
    },
  },

  // ── DELETE /assessments/:id/risk-register/:entryId ─────────────────────────
  {
    method: "DELETE",
    path: "/api/v1/assessments/:id/risk-register/:entryId",
    protected: true,
    requireActor: true,
    permissions: ["gap:update"],
    handler: async ({ deps, params, organizationId, actorId, traceId }) => {
      const orgId = requireOrganizationId({ organizationId });
      const assessmentId = routeUuidParam(params, "id");
      const entryId = routeUuidParam(params, "entryId");
      await requireAssessment(deps, assessmentId, orgId);

      const ctx = contextFor(assessmentId, orgId, traceId, actorId);
      const service = new RiskRegisterService(deps.gapAnalysis);
      await service.delete(entryId, ctx);
      return json({ success: true, trace_id: traceId });
    },
  },
];
```

**Step 2: Registrar em `apps/api-gateway/src/app.ts`**

Adicionar import:
```typescript
import { riskRegisterRoutes } from "./routes/risk-register.routes";
```

Adicionar no array de routes (junto com `maturityRoutes`):
```typescript
...riskRegisterRoutes,
```

**Step 3: Typecheck**

```powershell
pnpm typecheck 2>&1 | Select-Object -Last 6
```

Esperado: sem erros.

**Step 4: Commit**

```powershell
git add -A; git commit -m "feat(risk-register): add risk register api routes (post/get/patch/delete)"
```

---

## Task 5: Export endpoint + verificação final

**Files:**
- Modify: `apps/api-gateway/src/routes/risk-register.routes.ts` — adicionar `GET .../export`

**Contexto:** O GRC externo precisa consumir o risk register. O export retorna o mesmo payload da listagem, mas com header `Content-Type: application/json` e estrutura flat pronta para ingestão.

**Step 1: Adicionar export route em `risk-register.routes.ts`**

```typescript
// ── GET /assessments/:id/risk-register/export ──────────────────────────────
{
  method: "GET",
  path: "/api/v1/assessments/:id/risk-register/export",
  protected: true,
  permissions: ["gap:read"],
  handler: async ({ deps, params, organizationId, traceId }) => {
    const orgId = requireOrganizationId({ organizationId });
    const assessmentId = routeUuidParam(params, "id");
    await requireAssessment(deps, assessmentId, orgId);

    const ctx = contextFor(assessmentId, orgId, traceId);
    const service = new RiskRegisterService(deps.gapAnalysis);
    const entries = await service.list(assessmentId, ctx);

    // Flat export para consumo por sistemas GRC externos
    const export_data = entries.map(e => ({
      ...e,
      _export_at: new Date().toISOString(),
      _assessment_id: assessmentId,
      _standard_version: "2026.1",
    }));

    return json({
      assessment_id: assessmentId,
      exported_at: new Date().toISOString(),
      total: export_data.length,
      entries: export_data,
      trace_id: traceId,
    });
  },
},
```

**Step 2: Typecheck final**

```powershell
pnpm typecheck 2>&1 | Select-Object -Last 8
```

Esperado: todos os pacotes `Done`, sem erros.

**Step 3: Commit final**

```powershell
git add -A; git commit -m "feat(risk-register): add grc export endpoint and finalize risk register api"
```

---

## Sumário de endpoints após execução

| Método | Path | Permissão | Descrição |
|---|---|---|---|
| `POST` | `/api/v1/assessments/:id/risk-register` | `gap:update` | Criar entrada (com risk_appetite/tolerance/threshold) |
| `GET` | `/api/v1/assessments/:id/risk-register` | `gap:read` | Listar entradas do assessment |
| `GET` | `/api/v1/assessments/:id/risk-register/:entryId` | `gap:read` | Detalhe de uma entrada |
| `PATCH` | `/api/v1/assessments/:id/risk-register/:entryId` | `gap:update` | Atualizar tratamento/tolerância |
| `DELETE` | `/api/v1/assessments/:id/risk-register/:entryId` | `gap:update` | Remover entrada |
| `GET` | `/api/v1/assessments/:id/risk-register/export` | `gap:read` | Export flat para GRC externo |

## Campos enviados pela aplicação consumidora

| Campo | Tipo | Obrigatório | Quem define |
|---|---|---|---|
| `risk_appetite` | `number 0.0–1.0` | Não | Board/CEO — gerenciado no GRC |
| `risk_tolerance` | `number 0.0–1.0` | Não | LOB/unidade — gerenciado no GRC |
| `risk_threshold` | `number 0.0–1.0` | Não | Departamento — gerenciado no GRC |

## Calculado pelo Standard

| Campo | Como |
|---|---|
| `inherent_risk_score` | Herdado do `gap_finding` (IE × OL) |
| `residual_risk_score` | Herdado do `gap_finding` |
| `risk_category` | `deriveRiskCategory(residualScore)` |
| `within_tolerance` | `residualScore <= risk_tolerance_input` |
| `roc_determination` | Herdado do `gap_finding` (denormalizado) |
