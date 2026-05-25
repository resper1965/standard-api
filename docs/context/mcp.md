# Standard MCP Server — Contexto

> **Última atualização:** 2026-05-25

## O que é

O Standard expõe um servidor MCP (Model Context Protocol) remoto em `POST /mcp`, permitindo que AI assistants (Antigravity, Claude, Cursor, Copilot) interajam com a plataforma GRC via linguagem natural.

## Endpoints

| Endpoint | Auth | Descrição |
|----------|------|-----------|
| `GET /mcp` | Não | Discovery — retorna capabilities e número de tools |
| `POST /mcp` | Bearer API Key | JSON-RPC 2.0 — processa tool calls |
| `GET /docs/mcp` | Não | Página HTML de integração (guia completo) |

## Protocol

- **MCP version:** 2025-03-26
- **Transport:** Streamable HTTP (JSON response)
- **Auth:** `Authorization: Bearer <api-key>` — mesmo sistema de API Keys M2M da plataforma
- **Tenant isolation:** automático — cada API key é escopada ao tenant do criador

## Tools (12)

### Assessment Management
- `list-assessments` — lista assessments do tenant (filtro por status)
- `get-assessment` — detalhes de um assessment
- `get-assessment-status` — estado lifecycle do assessment
- `list-assessment-documents` — documentos de evidência

### SCF Catalog
- `search-scf-controls` — busca controles por keyword, domínio ou framework
- `get-scf-control` — detalhe de um controle (ex: `CRY-01`)
- `list-scf-frameworks` — frameworks disponíveis (ISO 27001, SOC 2, NIST, etc.)

### Gap Analysis
- `get-gap-analysis` — gap analysis de um assessment
- `list-findings` — findings (filtro por severity)
- `get-finding` — detalhe de um finding

### Platform (admin)
- `get-platform-health` — saúde da API (error rate, latency 1h window)
- `list-soc-alerts` — alertas SOC recentes (requer platform admin)

## Configuração (AI clients)

```json
{
  "mcpServers": {
    "standard-grc": {
      "command": "npx",
      "args": [
        "-y",
        "mcp-remote",
        "https://standard-api.bekaa.eu/mcp",
        "--header",
        "Authorization: Bearer <sua-api-key>"
      ]
    }
  }
}
```

## Referências

- Guia de integração: [`docs/api/mcp-integration-guide.md`](../api/mcp-integration-guide.md)
- Página online: `https://standard-api.bekaa.eu/docs/mcp`
- Código: `apps/api-gateway/src/mcp/`
- Routes: `apps/api-gateway/src/routes/mcp.routes.ts`, `mcp-docs.routes.ts`
