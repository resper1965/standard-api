# Frontend Blueprint — Parte 5: Admin Console + Developer Portal

**Data:** 2026-06-10  
**Status:** ✅ Aprovado  
**Stack:** Vite SPA + React 19 + React Router + TanStack Query + Zustand + Radix UI + Tailwind (Nordic Tech)  
**Gaps endereçados:** G12 (dívida documentada), G13 (CRÍTICO), G14 (CRÍTICO), G15 (MÉDIA)

---

## Decisões Arquitecturais

### Stack mantida (não migrar para Next.js)
- Vite SPA mantida — sem migração de framework
- **G12 (Edge Middleware)** → dívida técnica documentada com CF Worker shim
  - CF Pages `_worker.ts` actua como proxy de borda, injeta `X-Tenant-Id` header
  - Frontend lê header no primeiro render via React Context
  - Registado em `docs/decisions/` como tech debt explícito

### Docs públicos — optimizados para AI agents
- `/docs/*` sem auth wall — acessível por Cursor, Claude Code, Antigravity e outros AI IDEs
- `/openapi.json` servido publicamente pela API
- `/llms.txt` na raiz do domínio — ficheiro de contexto estruturado para AI agents (padrão llms.txt)
- Dados sintéticos de demo via `evals/golden-outputs` para visitors sem API key

### Revogação de API Keys
- Revogação imediata — 401 instantâneo na borda, sem grace period
- Invalida cache KV no Cloudflare no momento da revogação

---

## Estrutura de Ficheiros

```
apps/web/src/
├── pages/
│   ├── admin/
│   │   ├── ApiKeys.tsx               ← NOVO — G13
│   │   ├── Organizations.tsx         ← EXISTE
│   │   ├── Users.tsx                 ← EXISTE (+ RBAC matrix)
│   │   └── AuditLogs.tsx             ← EXISTE
│   └── docs/                         ← NOVO — público, sem auth
│       ├── DocsLayout.tsx            ← layout 3-col com nav lateral
│       ├── ApiReference.tsx          ← OpenAPI viewer
│       ├── McpPlayground.tsx         ← G14 async sandbox
│       └── Webhooks.tsx              ← G15 logs + payload inspector
├── components/
│   ├── api-keys/
│   │   ├── CreateApiKeyModal.tsx     ← Sheet multi-step (3 etapas)
│   │   └── SecretDisplayOverlay.tsx ← one-shot reveal, destruição pós-cópia
│   ├── mcp/
│   │   ├── ToolExplorer.tsx          ← lista de tools com busca
│   │   ├── AsyncTimeline.tsx         ← 202 → polling → resultado visual
│   │   └── JobStatusPoller.tsx       ← TanStack Query refetchInterval
│   ├── webhooks/
│   │   ├── WebhookConfigurator.tsx   ← URL + event subscriptions
│   │   ├── DeliveryHistory.tsx       ← tabela cronológica
│   │   └── PayloadInspector.tsx      ← JSON expandível (react-json-view-lite)
│   └── docs/
│       └── LlmsContext.tsx           ← conteúdo do /llms.txt
├── stores/
│   ├── mcpPlayground.store.ts        ← Zustand (jobId, status, result, demoMode)
│   └── secretDisplay.store.ts        ← Zustand (token one-shot, destruição pós-cópia)
└── lib/
    └── api-client.ts                 ← fetch wrapper com auth header
```

---

## Módulo 1 — API Keys `/admin/api-keys` (G13 CRÍTICO)

### Tabela principal
- Colunas: ID mascarado (prefixo), nome, escopos (badges), criada em, último uso, acções
- Botão "Nova Chave" abre Sheet lateral
- Botão "Revogar" abre `AlertDialog` com confirmação → `DELETE /api/v1/api-keys/:id`

### CreateApiKeyModal — Sheet com 3 steps
```
Step 1 — Detalhes
  - Campo: Nome / Propósito (ex: "Integração Hub GRC")
  - Campo: Data expiração (DatePicker, opcional)

Step 2 — Escopos
  - Grupos: Assessment | TPRA | Privacy | KB | Admin
  - Checkboxes múltiplos por grupo
  - Preview do scope string gerado

Step 3 — SecretDisplayOverlay
  - Background: amber-950, border: amber-500
  - Chave: font-mono, select-all on click
  - Botão "Copiar" → ícone ✅ após cópia (Sonner toast)
  - Aviso vermelho: "Esta chave não poderá ser recuperada ou exibida novamente."
  - Fechar modal → Zustand destroys token (secretDisplay.store.clear())
  - Reabrir modal NÃO exibe a chave novamente — vai para lista mascarada
```

### Zustand store `secretDisplay`
```ts
interface SecretDisplayStore {
  token: string | null;
  copied: boolean;
  set: (token: string) => void;
  markCopied: () => void;
  clear: () => void;  // chamado no onOpenChange(false) do Sheet
}
```

---

## Módulo 2 — MCP Playground `/docs/mcp` (G14 CRÍTICO)

### Layout 3 painéis
```
┌──────────────┬──────────────────────┬──────────────────────┐
│ Tool Explorer│ Input Form           │ Async Timeline       │
│              │                      │                      │
│ [busca]      │ Tool: calcular_score │ ● idle               │
│              │ vendor_id: [____]    │ ● 202 Accepted       │
│ > validar_   │ answers: { ... }     │   job_id: abc-123    │
│   evidencia  │                      │ ⏳ Processando...    │
│ > calcular_  │ 🔑 API Key (opt.)    │ ● Resultado          │
│   score      │ [_____________]      │ { risk_score: 0.73 } │
│              │                      │                      │
│              │ [▶ Disparar]         │                      │
└──────────────┴──────────────────────┴──────────────────────┘
```

### Modo demo vs. modo real
| Condição | Comportamento |
|----------|--------------|
| Sem API key | Demo mode — timeline simulada com fixtures de `evals/golden-outputs`, badge "Modo Demonstração" |
| Com API key | Chamada real `POST /api/v1/mcp` → 202 + job_id → poll `GET /api/v1/jobs/:id` a cada 2s |

### Zustand store `mcpPlayground`
```ts
interface McpPlaygroundStore {
  apiKey: string;
  selectedTool: string | null;
  jobId: string | null;
  status: 'idle' | 'dispatched' | 'polling' | 'done' | 'error';
  result: unknown | null;
  error: string | null;
  demoMode: boolean;  // computed: !apiKey
  dispatch: (tool: string, inputs: Record<string, unknown>) => void;
  reset: () => void;
}
```

### AsyncTimeline — estados visuais
```
idle       → linha cinza tracejada
dispatched → ✅ verde "202 Accepted" + job_id monospace
polling    → ⏳ pulse animation + "Computando inferência..."
done       → ✅ verde "Resultado" + JSON expandível
error      → ❌ vermelho + mensagem de erro + trace_id
```

---

## Módulo 3 — Webhook Manager `/docs/webhooks` (G15 MÉDIA)

### Configurador
- Input: URL de destino (Payload URL)
- Checkboxes de eventos:
  - `tpra.assessment.completed`
  - `vendor.risk_score.updated`
  - `ledger.audit.alert`
  - `gap_analysis.approved`
  - `maturity.approved`
- Botão "Salvar" → `POST /api/v1/webhooks`
- Botão "Testar" → dispara evento sintético para a URL configurada

### Delivery History
- Tabela: evento, status HTTP (badge verde 2xx / vermelho 4xx/5xx), timestamp, trace_id
- Paginação client-side (TanStack Query)
- **Linha expansível** → PayloadInspector

### PayloadInspector
- `react-json-view-lite` lazy-loaded (< 15KB)
- Exibe payload JSON com syntax highlight no tema Nordic Tech
- Botão "Copiar payload" 
- Linha "Response body" do servidor destino (se disponível)

---

## Módulo 4 — API Reference `/docs/api`

### Layout
- 3 colunas: navegação por tags (esquerda) | definição + parâmetros (centro) | exemplo resposta (direita)
- Fetch de `GET /openapi.json` na inicialização (TanStack Query, staleTime: Infinity)
- Dropdown de versão no header (`v1`, futuras versões)
- Botão "Try it" → deep-link para MCP Playground pré-preenchido

### `/llms.txt` endpoint
Ficheiro estático servido pelo Vite em `public/llms.txt`:
```
# Standard API — AI Agent Context

## Base URL
https://api.standard.grc/v1

## Authentication
Bearer token via Authorization header
API Keys: POST /api/v1/api-keys

## Key Modules
- SCF Controls: GET /api/v1/scf/controls
- Assessments: POST /api/v1/assessments  
- Gap Analysis: POST /api/v1/gap-analysis
- TPRA: POST /api/v1/tpra/vendors
- MCP Tools: POST /api/v1/mcp (async, returns 202 + job_id)

## OpenAPI Spec
GET /openapi.json

## MCP Tools Schema
GET /api/v1/mcp/tools
```

---

## Dependências novas

```bash
# Runtime
pnpm add zustand sonner react-json-view-lite

# Shadcn components (via CLI sobre Radix existente)
# Sheet, AlertDialog, Badge, Tabs, ScrollArea, Separator, Sonner
```

---

## Gaps — Matriz de Validação

| Gap | Componente | Solução | Status após implementação |
|-----|-----------|---------|--------------------------|
| G12 | Edge tenant isolation | CF Worker shim + X-Tenant-Id header | ⚠️ Parcial (tech debt documentado) |
| G13 | Secret display one-shot | SecretDisplayOverlay + Zustand destroy | ✅ Resolvido |
| G14 | Async MCP 202 | AsyncTimeline + JobStatusPoller | ✅ Resolvido |
| G15 | Webhook payload logs | DeliveryHistory + PayloadInspector | ✅ Resolvido |

---

## Rotas

```ts
// Protegidas (auth required)
/admin/api-keys
/admin/organizations  (existe)
/admin/users          (existe)
/admin/audit-logs     (existe)

// Públicas (sem auth)
/docs                 → redirect /docs/api
/docs/api             → ApiReference
/docs/mcp             → McpPlayground
/docs/webhooks        → Webhooks
/llms.txt             → static file em public/
```
