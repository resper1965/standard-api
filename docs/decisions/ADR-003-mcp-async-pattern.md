# ADR-003 — Padrão Assíncrono para MCP Tools com LLM

**Status:** Aceite  
**Data:** 2026-06-10

---

## Contexto

O handler `POST /mcp` em `mcp.routes.ts` despacha todas as tools de forma síncrona:

```ts
const result = await dispatchMcpTool(toolName, toolArgs, ctx); // bloqueante
return json({ jsonrpc: "2.0", id, result });
```

Tools que invocam LLMs via Cloudflare AI Gateway têm latência de 2–30 segundos.
O Cloudflare Workers tem CPU time limit. Chamadas síncronas causam timeout silencioso.

O padrão correcto **já existe** no repositório em `gap-analysis.routes.ts` L793–797
(`ctx.execCtx?.waitUntil`) para o endpoint de batch de evidências.

---

## Decisão

Classificar tools MCP em dois grupos:

### Grupo A — Síncronas (resposta imediata)
Tools que apenas consultam DB ou fazem cálculos locais:
- `list-scf-controls`, `get-scf-control`, `search-scf-controls`
- `list-scf-frameworks`, `get-scf-framework-coverage`
- `get-strm-relationships`, `compare-frameworks`
- Todas as tools de leitura SCF

### Grupo B — Assíncronas (202 + job_id + webhook)
Tools que invocam LLMs ou processamento pesado:
- `evaluate-evidence`
- `architect-remediation`
- `validar_evidencia_privacidade` (nova)
- `calcular_score_risco_terceiro` (nova)

### Contrato de Resposta Assíncrona

```jsonc
// Request
{ "method": "tools/call", "params": { "name": "evaluate-evidence", "arguments": {...} } }

// Response imediata (202)
{ "jsonrpc": "2.0", "id": 1, "result": { "status": "queued", "job_id": "uuid" } }

// Webhook quando completo (para endpoints registados com evento "mcp.tool.completed")
{
  "event": "mcp.tool.completed",
  "payload": {
    "job_id": "uuid",
    "tool_name": "evaluate-evidence",
    "status": "success",
    "result": { ... },
    "trace_id": "..."
  }
}
```

### Queue a Usar

`AGENT_RUN_QUEUE` — já configurado em `wrangler.toml` para dev/staging/production.
O Worker consumidor deste queue processa a tool e dispara o webhook ao completar.

---

## Ficheiros Afectados

- `apps/api-gateway/src/routes/mcp.routes.ts` — bifurcação sync/async no handler
- `apps/api-gateway/src/mcp/server.ts` — marcar tools assíncronas com flag `isAsync: true`
- Worker consumidor do `AGENT_RUN_QUEUE` — processar e disparar webhook
