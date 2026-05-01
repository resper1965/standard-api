# Arquitetura

## Resumo

O Aegis é API-first, SaaS-ready, multi-tenant e Cloudflare-oriented. O backend, contracts, packages, workflows, workers e agent runtime são o centro do sistema.

## Camadas Principais

- API Gateway: endpoints versionados, auth, RBAC, tenant guard e validação.
- Assessment Engine: state machine, transitions, approval gates e invariantes.
- Packages: schemas, domain, contracts, SCF core, SCF catalog, KB, SoA, Gap, POA&M, Reporting, Security, Observability e Agent Runtime.
- Workers/Workflows/Queues: execução assíncrona e lifecycle durável.
- Data Layer futuro: PostgreSQL transacional, R2 para artifacts, Vectorize para KB auxiliar.

## Princípios

- SCF estruturado é fonte normativa.
- KB é evidência candidata.
- Agentes sugerem, humanos aprovam.
- Outputs críticos exigem schema validation e rastreabilidade.
- Nenhum fluxo crítico sem tenant/organization/assessment/trace.

## Referências

- `docs/architecture/technical-proposal.md`
- `docs/architecture/agentic-runtime-deployment.md`
- `docs/architecture/production-hardening.md`
- `docs/architecture/external-integration-model.md`
- `docs/architecture/workflow-orchestration.md`
