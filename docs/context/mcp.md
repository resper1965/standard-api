# Standard MCP Server — Contexto

> **Última atualização:** 2026-05-30

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
- **Organization isolation:** automático — cada API key é escopada ao organization do criador

## Tools (32)

### Assessment Management (4)
- `list-assessments` — lista assessments do organization (filtro por status)
- `get-assessment` — detalhes de um assessment
- `get-assessment-status` — estado lifecycle do assessment
- `list-assessment-documents` — documentos de evidência de conformidade

### SCF Catalog (8)
- `search-scf-controls` — busca controles por keyword, domínio ou framework
- `get-scf-control` — detalhe de um controle específico (ex: `CRY-01`)
- `list-scf-frameworks` — frameworks de conformidade disponíveis
- `list-scf-domains` — domínios do Secure Controls Framework (SCF)
- `list-framework-requirements` — requisitos associados a um framework
- `get-framework-coverage` — taxa de cobertura de controles de um framework
- `get-control-mappings` — mappings de um controle SCF para múltiplos frameworks
- `cross-framework-mapping` — mapeia controles entre dois frameworks regulatórios distintos

### Intelligence Engine (6)
- `calculate-blast-radius` — estima o raio de impacto de um incidente em sistemas e regulação
- `calculate-roi-path` — caminho ótimo de ROI para atingir conformidade regulatória
- `calculate-compliance-score` — score de compliance projetado de um assessment
- `calculate-dpia-score` — calcula score de impacto de privacidade de dados (DPIA/LGPD/GDPR)
- `check-breach-sla` — analisa tempos de conformidade e SLA em caso de vazamento
- `calculate-cross-coverage` — sobreposição e sinergia de controles entre múltiplos frameworks

### KB & Evidence AI (3)
- `search-kb` — busca semântica em chunks de evidências na base vetorial (RAG)
- `evaluate-evidence` — avalia a conformidade de uma evidência com base em regras SCF
- `architect-remediation` — propõe planos de remediação inteligentes para gaps

### Gap Analysis (3)
- `get-gap-analysis` — gap analysis ativo do assessment
- `list-findings` — lista findings/gaps identificados (filtro por severidade)
- `get-finding` — detalhes de um gap de conformidade específico

### SoA Lifecycle (6)
- `list-soa-versions` — versões da Declaração de Aplicabilidade (SoA)
- `get-soa-version` — detalhes de uma versão do SoA
- `list-soa-items` — itens pertencentes ao SoA
- `get-soa-item` — detalhes de conformidade de um controle aplicável
- `validate-soa` — valida a integridade lógica e assinaturas do SoA
- `get-soa-summary` — estatísticas gerais de aplicabilidade do SoA

### Platform (2)
- `get-platform-health` — saúde da API (taxa de erro, latência em janela de 1h)
- `list-soc-alerts` — alertas SOC e incidentes de segurança recentes (requer platform admin)

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
