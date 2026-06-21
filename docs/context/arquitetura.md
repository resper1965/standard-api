# Arquitetura

## Resumo

O Standard é API-first, SaaS-ready, multi-organization e Cloudflare-oriented. O backend, contracts, packages, workflows, workers e agent runtime são o centro do sistema.

## Camadas Principais

- API Gateway: endpoints versionados, auth, RBAC, organization guard e validação. Helpers em `app-helpers.ts` (rotas) e `index-helpers.ts` (bootstrap).
- Assessment Engine: state machine, transitions, approval gates, invariantes e prerequisite lookup table declarativo.
- Agent Runtime: Council com dispatch map pattern para roteamento de agentes.
- Packages: schemas, domain, contracts, SCF core, SCF catalog, KB, SoA, Gap (validação declarativa), POA&M (validação e action-type declarativos), Reporting, Security, Observability e Agent Runtime.
- Data Layer: Dependência fixa em PostgreSQL transacional (via Drizzle ORM) para Lifecycle artifacts, Standard Native Auth, persistência de Orquestração, Logs de Auditoria e Estado de Agent Runs. O armazenamento de docs usa R2, e KB apoia-se em Vectorize.
## Princípios

- SCF estruturado é fonte normativa.
- KB é evidência candidata.
- Agentes sugerem, humanos aprovam.
- Outputs críticos exigem schema validation e rastreabilidade.
- Nenhum fluxo crítico sem organization/organization/assessment/trace.

## MCP Server

A plataforma expõe um servidor MCP remoto em `POST /mcp` (Streamable HTTP, JSON-RPC 2.0). AI assistants conectam via API Key Bearer e têm acesso a 33 tools cobrindo assessments, SCF, gap analysis, inteligência regulatória e status da plataforma. Tools de IA (Grupo B) usam dispatch assíncrono via `AGENT_RUN_QUEUE` + 202 (ADR-003). Ver [`docs/context/mcp.md`](mcp.md).

## Referências

- `docs/architecture/technical-proposal.md`
- `docs/architecture/agentic-runtime-deployment.md`
- `docs/architecture/production-hardening.md`
- `docs/architecture/external-integration-model.md`
- `docs/architecture/workflow-orchestration.md`

