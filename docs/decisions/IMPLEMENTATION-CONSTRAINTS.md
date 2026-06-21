# IMPLEMENTATION CONSTRAINTS
## Documento de Controlo de Contaminação — Standard API

> **LEITURA OBRIGATÓRIA** antes de qualquer implementação relacionada a:
> STRM, compliance score, MCP tools, ledger, TPRA, webhooks.
>
> Atualizado em: 2026-06-10
> Referência: Gap Analysis Blueprint (Partes 1–4), NIST IR 8477

---

## ⚠️ COMO USAR ESTE DOCUMENTO

Este ficheiro existe para **prevenir pattern contamination** — o risco de reproduzir
código legado incorreto ao implementar novas features. O repositório contém anti-padrões
ativos que parecem corretos mas violam o Blueprint.

**Regra**: sempre que implementar qualquer feature listada abaixo, leia a secção
correspondente ANTES de abrir qualquer ficheiro de implementação existente.

---

## SECÇÃO 1 — STRM: Tipos de Relação e Pesos

### 1.1 Estado Atual do Repositório (o que NÃO copiar)

O Neon DB contém 81.088 mappings em `scf_mappings` com:
```
relationship_type: "direct" | "related"        ← INCORRETO
relationship_strength: "strong" | "related"    ← INCORRETO
```

O ficheiro `packages/schemas/src/scf.ts` define `ScfRelationshipTypeSchema` com 7 valores:
```ts
// ESTADO ATUAL — NÃO REPRODUZIR EM NOVO CÓDIGO:
z.enum(["equal", "subset", "superset", "intersecting", "related", "no_relationship", "source_defined"])
//                                       ^^^^^^^^^^^^   ^^^^^^^   ^^^^^^^^^^^^^^    ^^^^^^^^^^^^^
//                                       inconsistente  legado    legado            legado
```

O ficheiro `xlsx-importer.ts` usa `"intersecting"` (com 'ing') — inconsistente com o
Blueprint que especifica `"intersects"`.

### 1.2 Valores Canónicos Corretos (Blueprint — NIST IR 8477)

```ts
// ✅ USAR SEMPRE ESTES VALORES:
export const STRM_OPERATORS = [
  "equal",        // =  (Operador de Igualdade)      — peso 1.0
  "subset",       // ⊂  (Subconjunto de)             — peso 1.0
  "intersects",   // ∩  (Intersecta com)             — peso = strength_score (0.1–0.9)
  "superset",     // ⊃  (Superconjunto de)           — peso máx 0.5
  "no_relation",  // Ø  (Sem Relação)                — peso 0.0
] as const;
```

> **NOTA**: O xlsx-importer existente usa `"intersecting"` — ao migrar, normalizar
> para `"intersects"` para alinhamento com o Blueprint.

### 1.3 Weights Matrix — Fórmula Canónica (G09)

```
NUNCA implementar: compliance = (implementedControls / totalControls) * 100
                                 ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
                                 Esta fórmula existe em dashboard.routes.ts linha 67.
                                 É BINÁRIA. NÃO PRODUZ GAP JURÍDICO REAL.

SEMPRE implementar:
  weight(equal)      = 1.0
  weight(subset)     = 1.0
  weight(intersects) = strength_score   ← valor numérico 0.0–1.0 do DB
  weight(superset)   = min(0.5, strength_score ?? 0.5)
  weight(no_relation) = 0.0

  compliance_index = Σ(maturity_0to1 × weight) / Σ(weight_max_possible)
```

### 1.4 Coluna `strength_score` — Contrato de Schema

```sql
-- ✅ CORRETO: coluna numérica a adicionar via migration
ALTER TABLE scf_mappings ADD COLUMN strength_score NUMERIC(4,3);
ALTER TABLE scf_strm_relationships ADD COLUMN strength_score NUMERIC(4,3);

-- ❌ PROIBIDO: usar relationship_strength text como proxy numérico
-- "strong" → 1.0 / "moderate" → 0.5 / "weak" → 0.3  ← não é o contrato do Blueprint
```

---

## SECÇÃO 2 — MCP Tools: Assincronismo Obrigatório

### 2.1 Estado Atual — ✅ RESOLVIDO

> O anti-padrão síncrono foi **eliminado**. `mcp.routes.ts` agora implementa bifurcação
> ADR-003 com `ASYNC_TOOLS` set + `AGENT_RUN_QUEUE` para tools de IA.
> Consumer em `workers/queues/src/mcp-tool.consumer.ts` processa e despacha para AI Gateway.
> Tool names normalizados para hyphens (convenção MCP).

```ts
// ✅ IMPLEMENTADO em mcp.routes.ts:
const ASYNC_TOOLS = new Set(["evaluate-evidence", "architect-remediation",
                             "validar-evidencia-privacidade", "calcular-score-risco-terceiro"]);

if (ASYNC_TOOLS.has(toolName)) {
  const jobId = crypto.randomUUID();
  await ctx.deps.AGENT_RUN_QUEUE.send({ job_id: jobId, tool_name: toolName, ... });
  return json({ status: "queued", job_id: jobId }, { status: 202 });
}
// Tools síncronas (SCF queries, etc.) continuam normais.
```

> **Referência**: ADR-003, `gap-analysis.routes.ts` L793–797 (padrão waitUntil original).

### 2.3 Duas Tools Obrigatórias do Blueprint (G11)

Estas tools NÃO existem no registry atual (`mcp/server.ts`). Criar do zero:

```ts
// Tool 1: validar_evidencia_privacidade
{
  name: "validar_evidencia_privacidade",
  description: "Submete evidências textuais para validação contra controlos GDPR/LGPD via SCF",
  inputSchema: {
    type: "object",
    required: ["assessment_id", "control_id", "evidence_text", "target_scf_version"],
    properties: {
      assessment_id:      { type: "string", format: "uuid" },
      control_id:         { type: "string", format: "uuid" },
      evidence_text:      { type: "string", minLength: 10 },
      target_scf_version: { type: "string", example: "2026.1.1" }
    }
  }
}

// Tool 2: calcular_score_risco_terceiro
{
  name: "calcular_score_risco_terceiro",
  description: "Processa respostas de vendor e injeta resultados na base Neon DB",
  inputSchema: {
    type: "object",
    required: ["vendor_id", "assessment_id", "responses_matrix"],
    properties: {
      vendor_id:        { type: "string", format: "uuid" },
      assessment_id:    { type: "string", format: "uuid" },
      responses_matrix: {
        type: "array",
        items: {
          type: "object",
          required: ["control_id", "compliance_value"],
          properties: {
            control_id:       { type: "string", format: "uuid" },
            compliance_value: { type: "number", minimum: 0, maximum: 1 }
          }
        }
      }
    }
  }
}
```

---

## SECÇÃO 3 — Ledger: Imutabilidade de Eventos

### 3.1 Estado Atual (o que NÃO copiar)

```ts
// ❌ ANTI-PADRÃO ATIVO em gap-analysis.routes.ts linha 472:
await new GapReviewService(deps.gapAnalysis).updateGapFinding(findingId, body, ctx);
// ^^ Reescreve a linha. Não gera evento imutável com previous_value/new_value.

// ❌ ANTI-PADRÃO ATIVO em dashboard.routes.ts:
// audit_logs é INSERT-only por convenção, mas sem constraint de banco.
// Qualquer UPDATE/DELETE nessa tabela é tecnicamente possível.
```

### 3.2 Contrato Correto

```sql
-- ✅ Tabela de Ledger — append-only por design
CREATE TABLE assessment_control_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  assessment_id   UUID NOT NULL,
  control_id      UUID NOT NULL,
  event_type      TEXT NOT NULL,  -- 'status_changed' | 'evidence_added' | 'finding_updated'
  previous_value  JSONB,
  new_value       JSONB NOT NULL,
  actor_id        UUID REFERENCES users(id),
  trace_id        TEXT,
  scf_version     TEXT NOT NULL,
  occurred_at     TIMESTAMPTZ NOT NULL DEFAULT now()
  -- SEM updated_at. SEM deleted_at. Append-only = imutável.
);

-- NUNCA fazer UPDATE ou DELETE nesta tabela.
-- Estado actual = reducer sobre todos os eventos por (assessment_id, control_id).
```

### 3.3 Evento `ledger.audit.alert` — Quando Disparar

```ts
// ✅ Disparar webhook ledger.audit.alert quando:
// 1. Tentativa de UPDATE em assessment_control_events (bloqueado por trigger)
// 2. Tentativa de PATCH em gap_finding de versão approved
// 3. Bulk-delete de findings (≥ 10 registos de uma vez)
//
// ❌ NÃO disparar para: operações normais de draft/review/approve.
```

---

## SECÇÃO 4 — TPRA: Persistência Obrigatória

### 4.1 Estado Atual (o que NÃO copiar)

```ts
// ❌ ANTI-PADRÃO ATIVO em tpra.routes.ts:
// POST /api/v1/tpra/score
// Calcula score em memória e descarta. Não persiste vendor nem assessment.
// Nenhum webhook é disparado.
```

### 4.2 Entidades Obrigatórias (a criar via migration)

```sql
-- tpra_vendors
CREATE TABLE tpra_vendors (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  vendor_name     TEXT NOT NULL,
  vendor_type     TEXT,          -- 'saas' | 'infrastructure' | 'processor' | 'controller'
  contact_email   TEXT,
  metadata        JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- tpra_assessments
CREATE TABLE tpra_assessments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  vendor_id       UUID NOT NULL REFERENCES tpra_vendors(id),
  assessment_id   UUID REFERENCES assessments(id),  -- link ao assessment pai (opcional)
  status          TEXT NOT NULL DEFAULT 'draft',    -- draft | submitted | scored | archived
  submitted_at    TIMESTAMPTZ,
  responses       JSONB DEFAULT '{}',               -- respostas do vendor
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- tpra_risk_scores
CREATE TABLE tpra_risk_scores (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id       UUID NOT NULL REFERENCES organizations(id),
  tpra_assessment_id    UUID NOT NULL REFERENCES tpra_assessments(id),
  vendor_id             UUID NOT NULL REFERENCES tpra_vendors(id),
  raw_score             NUMERIC(5,2) NOT NULL,       -- 0.00–100.00
  risk_category         TEXT NOT NULL,               -- 'low' | 'medium' | 'high' | 'critical'
  scf_domain_failures   JSONB DEFAULT '[]',          -- array de domain_codes com falha
  scf_version           TEXT NOT NULL,
  computed_at           TIMESTAMPTZ NOT NULL DEFAULT now()
  -- Append-only. Não fazer UPDATE.
);
```

### 4.3 Eventos de Webhook Obrigatórios (G10)

```ts
// ✅ Evento 1: tpra.assessment.completed
// Disparar quando: tpra_assessments.status muda para 'submitted'
{
  event: "tpra.assessment.completed",
  payload: {
    vendor_id:        string,   // UUID
    assessment_id:    string,   // UUID do tpra_assessment
    submitted_at:     string,   // ISO 8601
    critical_alerts:  string[], // lista de domínios SCF com score crítico
    audit_log_url:    string    // URL para GET /api/v1/organizations/:id/audit-logs?resource_id=...
  }
}

// ✅ Evento 2: vendor.risk_score.updated
// Disparar quando: tpra_risk_scores recebe novo registo para vendor_id
{
  event: "vendor.risk_score.updated",
  payload: {
    vendor_id:           string,
    raw_score:           number,
    risk_category:       "low" | "medium" | "high" | "critical",
    scf_domain_failures: string[]   // array de domain_codes
  }
}

// ✅ Evento 3: ledger.audit.alert
// Disparar quando: tentativa anómala de mutação em dados imutáveis
{
  event: "ledger.audit.alert",
  payload: {
    alert_type:   "retroactive_mutation_attempt" | "bulk_delete_attempt",
    resource:     string,   // nome da tabela
    resource_id:  string,   // UUID do registo alvo
    actor_id:     string,
    trace_id:     string,
    timestamp:    string
  }
}
```

---

## SECÇÃO 5 — API Key Cache KV (G01)

### 5.1 Estado Atual (o que NÃO copiar)

```ts
// ❌ ANTI-PADRÃO ATIVO em auth.middleware.ts (~linha 84):
const apiKey = await deps.apiKeys.verifyKey(keyHash);
// ^^ Consulta Neon DB em TODA request M2M com Bearer token.
// Em workloads de agentes IA (muitas requests), multiplica custo e latência.
```

### 5.2 Contrato Correto

```ts
// ✅ CORRETO: cache KV com TTL
const cacheKey = `apikey:${keyHash}`;
const cached = await env.STANDARD_CACHE.get(cacheKey, "json");

if (cached) {
  // Cache hit — sem query ao Neon
  return cached as ResolvedApiKey;
}

// Cache miss — consultar Neon e cachear
const apiKey = await deps.apiKeys.verifyKey(keyHash);
if (apiKey && !apiKey.revoked_at) {
  await env.STANDARD_CACHE.put(cacheKey, JSON.stringify(apiKey), {
    expirationTtl: 300  // 5 minutos
  });
}

// Na revogação de chave: SEMPRE invalidar cache:
await env.STANDARD_CACHE.delete(`apikey:${revokedKeyHash}`);
```

---

## SECÇÃO 6 — O que está CORRETO e NÃO deve ser alterado

Esta secção é tão importante quanto as anteriores. Estes padrões estão **corretos** e
qualquer nova implementação deve ser **consistente** com eles, não os substituir:

| Componente | Ficheiro | O que está correto |
|---|---|---|
| Approval gates | `gap-analysis.routes.ts` L454–463 | Reject PATCH em versão approved — manter! |
| Batch async pattern | `gap-analysis.routes.ts` L793–797 | `waitUntil` para jobs de IA — reutilizar! |
| Rate limiting KV | `rate-limit.middleware.ts` | In-memory + KV batch sync — manter! |
| Multi-tenancy | Todas as rotas | `requireOrganizationId()` em tudo — obrigatório! |
| STRM inference | `xlsx-importer.ts` L388–448 | Lógica de cardinality analysis — manter! |
| MCR gaps | `gap-analysis.routes.ts` L390–391 | Filtro `is_mcr_gap` — manter! |
| Webhook signing | `webhook.routes.ts` | HMAC-SHA256 — manter! |
| SCF multiversão | `scf.routes.ts` | `resolveVersionId("latest")` — manter! |

---

## SECÇÃO 7 — Checklist de Verificação Pós-Implementação

Antes de considerar qualquer tarefa concluída, verificar:

```
[ ] pnpm typecheck — zero erros
[ ] grep "implementedControls / totalControls" src/ → deve retornar vazio
[ ] grep '"direct"' packages/schemas/src/ → deve retornar vazio (relationship_type)
[ ] grep '"related"' packages/schemas/src/scf.ts → deve retornar vazio (relationship_type)
[ ] grep 'await dispatchMcpTool' — tools de IA devem usar enqueue, não await direto
[ ] Tabelas novas têm organization_id NOT NULL (ou justificativa explícita)
[ ] Eventos de webhook disparados em todos os state transitions relevantes
[ ] Testes do algoritmo STRM passam: equal→1.0, subset→1.0, intersects→dynamic, superset→0.5, no_relation→0.0
```

---

## REFERÊNCIAS

- Blueprint Absoluto (Partes 1–4): contexto desta conversa
- NIST IR 8477 — Set Theory Relationship Mapping (STRM)
- Gap Analysis Report: `brain/.../gap_analysis_blueprint.md`
- ADR-001: `docs/decisions/ADR-001-strm-weights-algorithm.md`
- ADR-002: `docs/decisions/ADR-002-ledger-append-only.md`
- ADR-003: `docs/decisions/ADR-003-mcp-async-pattern.md`
