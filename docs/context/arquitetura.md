# Arquitetura

## Resumo

O Standard é API-first, SaaS-ready, multi-tenant e Cloudflare-oriented. O backend, contracts, packages, workflows, workers e agent runtime são o centro do sistema.

## Camadas Principais

- API Gateway: endpoints versionados, auth, RBAC, tenant guard e validação.
- Assessment Engine: state machine, transitions, approval gates e invariantes.
- Packages: schemas, domain, contracts, SCF core, SCF catalog, KB, SoA, Gap, POA&M, Reporting, Security, Observability e Agent Runtime.
- Data Layer: Dependência fixa em PostgreSQL transacional (via Drizzle ORM) para Lifecycle artifacts, Better Auth, persistência de Orquestração, Logs de Auditoria e Estado de Agent Runs. O armazenamento de docs usa R2, e KB apoia-se em Vectorize.
## Princípios

- SCF estruturado é fonte normativa.
- KB é evidência candidata.
- Agentes sugerem, humanos aprovam.
- Outputs críticos exigem schema validation e rastreabilidade.
- Nenhum fluxo crítico sem tenant/organization/assessment/trace.

## MCP Server

A plataforma expõe um servidor MCP remoto em `POST /mcp` (Streamable HTTP, JSON-RPC 2.0). AI assistants conectam via API Key Bearer e têm acesso a 12 tools cobrindo assessments, SCF, gap analysis e status da plataforma. Ver [`docs/context/mcp.md`](mcp.md).

## Referências

- `docs/architecture/technical-proposal.md`
- `docs/architecture/agentic-runtime-deployment.md`
- `docs/architecture/production-hardening.md`
- `docs/architecture/external-integration-model.md`
- `docs/architecture/workflow-orchestration.md`

