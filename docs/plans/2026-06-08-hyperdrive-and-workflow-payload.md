# Hyperdrive Connection Pooling + Workflow Payload Optimization

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Resolver dois tech debts de infraestrutura — adicionar Cloudflare Hyperdrive como pooler de conexões Neon (issue #61) e reforçar o padrão Claim-Check no council workflow para mover payloads grandes para R2 (issue #62).

**Architecture:**
- **#61:** `db.ts` detecta se `env.HYPERDRIVE` existe e usa `HYPERDRIVE.connectionString` em vez de `DATABASE_URL` diretamente. Fallback transparente para dev local. O mesmo adaptador é reusado em `council.workflow.ts` via `createDb`.
- **#62:** O council workflow já usa KV como Claim-Check. Adicionamos binding R2 ao `wrangler.toml` do workflows worker e implementamos migração automática de payloads acima de 256KB para R2, com o KV guardando apenas a referência `{ r2_key, size_kb }`.

**Tech Stack:** `@neondatabase/serverless`, `drizzle-orm/neon-http`, Cloudflare Hyperdrive, Cloudflare R2, Cloudflare KV, TypeScript estrito.

---

## Issue #61 — Cloudflare Hyperdrive: Connection Pooling para Neon

### Task 1: Atualizar `db.ts` para suportar Hyperdrive com fallback

**Contexto:**
- Arquivo atual: `apps/api-gateway/src/adapters/db.ts` — usa `neon(databaseUrl)` puro
- Hyperdrive expõe `env.HYPERDRIVE.connectionString` — uma connection string PostgreSQL padrão
- O driver `neon-http` aceita qualquer URL PostgreSQL, incluindo a do Hyperdrive
- Em dev local, `HYPERDRIVE` não existe — usar `DATABASE_URL` como fallback

**Files:**
- Modify: `apps/api-gateway/src/adapters/db.ts`

**Step 1: Modificar `createDb` para aceitar Hyperdrive opcional**

```typescript
// apps/api-gateway/src/adapters/db.ts
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "@standard/schemas";

/** Hyperdrive binding shape — presente apenas em Cloudflare Workers runtime */
interface HyperdriveBinding {
  connectionString: string;
}

/**
 * Cria cliente Drizzle para Cloudflare Edge.
 * Prefere Hyperdrive quando disponível (pooling regional); fallback para DATABASE_URL direto.
 * Em dev local, HYPERDRIVE é undefined — DATABASE_URL é usado.
 */
export const createDb = (
  databaseUrl: string,
  hyperdrive?: HyperdriveBinding,
) => {
  const connectionString = hyperdrive?.connectionString ?? databaseUrl;
  const sql = neon(connectionString);
  return drizzle({ client: sql, schema });
};

export type DbClient = ReturnType<typeof createDb>;
```

**Step 2: Verificar typecheck do adapter**

```bash
pnpm --filter @standard/api-gateway typecheck
```
Expected: Done sem erros.

**Step 3: Commit**

```bash
git add apps/api-gateway/src/adapters/db.ts
git commit -m "feat(db): support cloudflare hyperdrive with DATABASE_URL fallback"
```

---

### Task 2: Injetar Hyperdrive no `buildDrizzleDeps` do api-gateway

**Contexto:**
- `apps/api-gateway/src/app-helpers.ts` — função `buildDrizzleDeps(env)` chama `createDb(env.DATABASE_URL!)`
- Precisa passar `env.HYPERDRIVE` opcional

**Files:**
- Modify: `apps/api-gateway/src/app-helpers.ts`

**Step 1: Localizar e atualizar a chamada de `createDb`**

Buscar: `grep -n "createDb" apps/api-gateway/src/app-helpers.ts`

Substituir:
```typescript
// ANTES:
const db = createDb(env.DATABASE_URL!);

// DEPOIS:
const db = createDb(env.DATABASE_URL!, env.HYPERDRIVE);
```

**Step 2: Adicionar `HYPERDRIVE` ao tipo `Env` do api-gateway**

Buscar onde `interface Env` ou `type Env` está declarado no api-gateway (provavelmente `src/index.ts` ou `src/types.ts`):

```typescript
// Adicionar campo opcional:
HYPERDRIVE?: {
  connectionString: string;
};
```

**Step 3: Typecheck**

```bash
pnpm --filter @standard/api-gateway typecheck
```
Expected: Done.

**Step 4: Commit**

```bash
git add apps/api-gateway/src/app-helpers.ts apps/api-gateway/src/index.ts
git commit -m "feat(api-gateway): inject hyperdrive binding into db client"
```

---

### Task 3: Atualizar `council.workflow.ts` para usar `createDb`

**Contexto:**
- `workers/workflows/src/council.workflow.ts` linhas 2-3 cria Drizzle inline em vez de usar `createDb`
- Precisa importar e usar `createDb` para centralizar a lógica Hyperdrive

**Files:**
- Modify: `workers/workflows/src/council.workflow.ts`

**Step 1: Substituir criação inline de Drizzle**

```typescript
// REMOVER (linhas 2-4):
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "@standard/schemas";

// ADICIONAR no lugar:
import { createDb } from "../../apps/api-gateway/src/adapters/db";
// OU — melhor: mover createDb para @standard/domain ou criar um helper compartilhado
```

> **Nota:** `createDb` está em `apps/api-gateway` — não pode ser importado pelo workers diretamente sem criar dependência de app para worker. A solução correta é **duplicar o helper inline** no workflow (DRY local) ou extrair para `packages/domain`. Dado que o arquivo é trivial (5 linhas), **duplicar inline é YAGNI-safe**.

**Step 1 revisado: Inline helper no workflow**

```typescript
// workers/workflows/src/council.workflow.ts — substituir imports inline:
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "@standard/schemas";

// ... no início do método run():
// ANTES:
const sql = neon(this.env.DATABASE_URL);
const db = drizzle(sql, { schema: schema as any });

// DEPOIS:
const connectionString = this.env.HYPERDRIVE?.connectionString ?? this.env.DATABASE_URL;
const sql = neon(connectionString);
const db = drizzle(sql, { schema: schema as any });
```

**Step 2: Adicionar `HYPERDRIVE` ao `interface Env` do workflow**

```typescript
export interface Env {
  DATABASE_URL: string;
  HYPERDRIVE?: { connectionString: string }; // Cloudflare Hyperdrive (optional, prod/staging)
  OPENAI_API_KEY?: string;
  AI_GATEWAY_BASE_URL?: string;
  AI_GATEWAY_TOKEN?: string;
  STANDARD_CACHE: KVNamespace;
}
```

**Step 3: Typecheck do workflow worker**

```bash
pnpm --filter standard-workflows typecheck
```
Expected: Done.

**Step 4: Commit**

```bash
git add workers/workflows/src/council.workflow.ts
git commit -m "feat(workflows): use hyperdrive connection when available in council workflow"
```

---

### Task 4: Adicionar binding `[[hyperdrive]]` nos wrangler.toml

**Contexto:**
- O binding Hyperdrive precisa ser declarado no `wrangler.toml` para ser injetado em runtime
- O `id` do Hyperdrive é criado no dashboard Cloudflare ou via `wrangler hyperdrive create`
- Para dev local: binding não existe — fallback para `DATABASE_URL` funciona automaticamente
- Para staging/prod: usar IDs placeholder que serão substituídos no deploy real

**Files:**
- Modify: `apps/api-gateway/wrangler.toml`
- Modify: `workers/workflows/wrangler.toml`

**Step 1: Adicionar ao `apps/api-gateway/wrangler.toml`**

Após o bloco `[[kv_namespaces]]` de STANDARD_CACHE (dev), adicionar:

```toml
# ── Hyperdrive (Connection Pooling para Neon) ─────────────────────────────
# Para dev local: não declarar — fallback automático para DATABASE_URL
# Para staging/prod: usar IDs reais gerados via `wrangler hyperdrive create`
# Docs: https://developers.cloudflare.com/hyperdrive/

[[env.staging.hyperdrive]]
binding = "HYPERDRIVE"
id = "REPLACE_WITH_STAGING_HYPERDRIVE_ID"

[[env.production.hyperdrive]]
binding = "HYPERDRIVE"
id = "REPLACE_WITH_PRODUCTION_HYPERDRIVE_ID"
```

**Step 2: Adicionar ao `workers/workflows/wrangler.toml`**

```toml
[[env.staging.hyperdrive]]
binding = "HYPERDRIVE"
id = "REPLACE_WITH_STAGING_HYPERDRIVE_ID"

[[env.production.hyperdrive]]
binding = "HYPERDRIVE"
id = "REPLACE_WITH_PRODUCTION_HYPERDRIVE_ID"
```

**Step 3: Adicionar comentário de onboarding (como criar o Hyperdrive)**

No topo do wrangler.toml do api-gateway, acima do `[[hyperdrive]]`:

```toml
# Para criar o Hyperdrive (uma vez por ambiente):
#   wrangler hyperdrive create standard-neon-staging --connection-string="<NEON_CONNECTION_STRING>"
#   wrangler hyperdrive create standard-neon-prod --connection-string="<NEON_CONNECTION_STRING>"
# Copiar o ID retornado para os campos acima.
```

**Step 4: Verificar que wrangler não quebra sem o Hyperdrive em dev**

```bash
pnpm dev:api
```
Expected: servidor sobe sem erro (Hyperdrive não declarado em dev = `env.HYPERDRIVE` é undefined = usa DATABASE_URL).

**Step 5: Commit**

```bash
git add apps/api-gateway/wrangler.toml workers/workflows/wrangler.toml
git commit -m "feat(infra): add cloudflare hyperdrive bindings for staging and production

Bindings declared with placeholder IDs — substituir com IDs reais via:
  wrangler hyperdrive create standard-neon-<env> --connection-string=<URL>
Dev local continua usando DATABASE_URL diretamente (sem Hyperdrive)."
```

---

## Issue #62 — Workflow Payload: R2 para payloads grandes

### Task 5: Adicionar binding R2 ao `workers/workflows/wrangler.toml`

**Contexto:**
- O `council.workflow.ts` já usa Claim-Check via KV — bom. Mas KV tem limite de 25MB/valor e custo por operação de leitura/escrita.
- Para payloads acima de 256KB (evidências, documentos), R2 é mais adequado: ilimitado, custo só por GB armazenado.
- O workflows worker **não tem** binding R2 atualmente — somente KV e Workflows.

**Files:**
- Modify: `workers/workflows/wrangler.toml`

**Step 1: Adicionar binding R2 para todos os ambientes**

```toml
# Dev (usa bucket de dev compartilhado com api-gateway)
[[r2_buckets]]
binding = "STANDARD_DOCUMENTS_BUCKET"
bucket_name = "standard-documents-dev"

[env.staging]
name = "standard-workflows-staging"

[[env.staging.r2_buckets]]
binding = "STANDARD_DOCUMENTS_BUCKET"
bucket_name = "standard-documents-staging"

[env.production]
name = "standard-workflows-production"

[[env.production.r2_buckets]]
binding = "STANDARD_DOCUMENTS_BUCKET"
bucket_name = "standard-documents-prod"
```

**Step 2: Adicionar `STANDARD_DOCUMENTS_BUCKET` ao `interface Env` do workflow**

```typescript
export interface Env {
  DATABASE_URL: string;
  HYPERDRIVE?: { connectionString: string };
  OPENAI_API_KEY?: string;
  AI_GATEWAY_BASE_URL?: string;
  AI_GATEWAY_TOKEN?: string;
  STANDARD_CACHE: KVNamespace;
  STANDARD_DOCUMENTS_BUCKET: R2Bucket; // Para claim-check de payloads grandes
}
```

**Step 3: Commit**

```bash
git add workers/workflows/wrangler.toml workers/workflows/src/council.workflow.ts
git commit -m "feat(workflows): add R2 binding for large payload claim-check"
```

---

### Task 6: Implementar Claim-Check R2 no `council.workflow.ts`

**Contexto:**
- Payloads acima de 256KB devem ir para R2; KV guarda apenas a referência `{ storage: "r2", r2_key: string, size_kb: number }`.
- Payloads menores continuam em KV (latência menor, simples).
- O step `initialize-run-state` já tem a lógica de tamanho — adicionar o desvio para R2.
- Os steps que fazem `STANDARD_CACHE.get(stateKey)` precisam detectar se o payload veio de R2 e hidratar de lá.

**Files:**
- Modify: `workers/workflows/src/council.workflow.ts`

**Step 1: Criar helpers inline de Claim-Check (R2 + KV)**

Adicionar antes da classe `CouncilOrchestrationWorkflow`:

```typescript
// ── Claim-Check helpers ──────────────────────────────────────────────────
// Payloads < 256KB ficam em KV (latência baixa).
// Payloads >= 256KB vão para R2; KV guarda apenas referência { storage, r2_key, size_kb }.

const KV_THRESHOLD_BYTES = 256 * 1024; // 256 KB

type ClaimCheckRef = { storage: "r2"; r2_key: string; size_kb: number };
type ClaimCheckValue = { storage: "kv"; data: unknown };

async function savePayload(
  kv: KVNamespace,
  r2: R2Bucket,
  key: string,
  payload: unknown,
): Promise<void> {
  const serialized = JSON.stringify(payload);
  if (serialized.length >= KV_THRESHOLD_BYTES) {
    const r2Key = `council-payloads/${key}`;
    await r2.put(r2Key, serialized, {
      httpMetadata: { contentType: "application/json" },
    });
    const ref: ClaimCheckRef = {
      storage: "r2",
      r2_key: r2Key,
      size_kb: Math.round(serialized.length / 1024),
    };
    await kv.put(key, JSON.stringify(ref), { expirationTtl: 86400 });
  } else {
    await kv.put(key, serialized, { expirationTtl: 86400 });
  }
}

async function loadPayload(
  kv: KVNamespace,
  r2: R2Bucket,
  key: string,
): Promise<unknown | null> {
  const raw = await kv.get(key);
  if (!raw) return null;
  const parsed = JSON.parse(raw);
  if (parsed?.storage === "r2" && parsed?.r2_key) {
    const obj = await r2.get(parsed.r2_key);
    if (!obj) throw new Error(`R2 object missing for claim-check key: ${parsed.r2_key}`);
    const text = await obj.text();
    return JSON.parse(text);
  }
  return parsed;
}
```

**Step 2: Substituir usos de `STANDARD_CACHE.put/get` no workflow**

No método `run`:

```typescript
// ANTES (initialize-run-state):
await this.env.STANDARD_CACHE.put(stateKey, serialized, { expirationTtl: 86400 });

// DEPOIS:
await savePayload(this.env.STANDARD_CACHE, this.env.STANDARD_DOCUMENTS_BUCKET, stateKey, inputData);
```

```typescript
// ANTES (cada step de agente — load):
const stateStr = await this.env.STANDARD_CACHE.get(stateKey);
let currentPayload = JSON.parse(stateStr);

// DEPOIS:
let currentPayload = await loadPayload(this.env.STANDARD_CACHE, this.env.STANDARD_DOCUMENTS_BUCKET, stateKey);
if (!currentPayload) throw new Error(`State lost for ${runId} during step ${agentName}`);
```

```typescript
// ANTES (cada step de agente — save):
await this.env.STANDARD_CACHE.put(stateKey, JSON.stringify(currentPayload), { expirationTtl: 86400 });

// DEPOIS:
await savePayload(this.env.STANDARD_CACHE, this.env.STANDARD_DOCUMENTS_BUCKET, stateKey, currentPayload);
```

Aplicar o mesmo para o step `extract-summary` e `finalize-council-run`.

**Step 3: Remover o hard-limit de 512KB (agora obsoleto com R2)**

```typescript
// REMOVER:
if (serialized.length > 512 * 1024) {
    throw new Error(`Council payload too large...`);
}

// MANTER apenas o log de warning para monitoramento:
const payloadSizeKB = Math.round(JSON.stringify(inputData).length / 1024);
if (payloadSizeKB > 256) {
    console.info(`[council:workflow] Large payload (${payloadSizeKB}KB) — storing in R2 via claim-check.`);
}
```

**Step 4: Typecheck**

```bash
pnpm --filter standard-workflows typecheck
```
Expected: Done.

**Step 5: Commit**

```bash
git add workers/workflows/src/council.workflow.ts
git commit -m "feat(workflows): r2 claim-check for payloads >=256KB in council workflow

- Payloads < 256KB continuam em KV (baixa latência)
- Payloads >= 256KB vão para R2; KV guarda referencia { storage, r2_key }
- Remove hard-limit 512KB (agora desnecessário com R2 ilimitado)
- Retries e idempotência preservados (R2 put é idempotente por key)"
```

---

### Task 7: Typecheck + Testes finais + Push

**Step 1: Typecheck completo**

```bash
pnpm typecheck
```
Expected: 28/28 packages Done.

**Step 2: Testes**

```bash
pnpm test
```
Expected: 125/125 passando (os novos helpers são testados via typecheck; testes de integração requerem Workers runtime).

**Step 3: Push e fechar issues**

```bash
git push origin HEAD
```

```powershell
$token = [System.Environment]::GetEnvironmentVariable("GITHUB_TOKEN", "User")
$headers = @{ Authorization = "Bearer $token"; Accept = "application/vnd.github+json"; "X-GitHub-Api-Version" = "2022-11-28" }
foreach ($issue in @(61, 62)) {
  $body = @{ state = "closed"; state_reason = "completed" } | ConvertTo-Json
  Invoke-RestMethod -Uri "https://api.github.com/repos/resper1965/standard-api/issues/$issue" -Method PATCH -Headers $headers -Body $body -ContentType "application/json" | Out-Null
  Write-Host "Issue #$issue closed"
}
```

---

## Notas Finais

### Issue #61 — Ativação do Hyperdrive em Staging/Prod
Os IDs de Hyperdrive são `REPLACE_WITH_*` — precisam ser criados no Cloudflare Dashboard ou via:
```bash
wrangler hyperdrive create standard-neon-staging \
  --connection-string="postgresql://user:pass@host/db"
```
O ID retornado deve substituir o placeholder no `wrangler.toml`.

### Issue #62 — Sem testes de integração locais para R2
O R2 em dev local usa Miniflare (emulador). Para testar localmente com `pnpm dev:workflows`, o bucket `standard-documents-dev` precisa existir no Cloudflare (mesmo em dev, Miniflare emula R2 localmente sem credenciais).
