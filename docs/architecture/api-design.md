# API Design

## Objetivo da API

A API versionada do `standard-api-standard` expõe os comandos e consultas iniciais do Standard SCF-Based Assessment Lifecycle. Ela serve web app, integrações, automações e consumidores futuros sem acoplar regra crítica ao frontend.

## API-First

O comportamento reutilizável fica em contratos, handlers, adapters e pacotes compartilhados. A UI deve consumir a API; ela não muda estados de assessment diretamente, não aprova gates e não decide versionamento de artefatos.

## Relação com Assessment Engine

Os endpoints de lifecycle chamam `packages/assessment-engine` para validar e executar transições. A API apenas resolve contexto, valida payload, chama adapters e formata resposta. Regras de state machine, approval gates e imutabilidade continuam no engine.

## Relação com Cloudflare Workers

`apps/api-gateway` usa o runtime Fetch API, compatível com Cloudflare Workers. A implementação atual evita framework novo e mantém endpoints leves. Persistência real, Workflows, Queues, R2 e Vectorize entram por bindings/adapters futuros.

## Multi-Tenancy

Rotas protegidas exigem `organization_id` resolvido por placeholder via `x-standard-organization-id` ou path `:organizationId`. Quando os dois aparecem, a API rejeita divergência. `assessment_id` é sempre validado contra `organization_id` e `organization_id` nos mocks.

## Approvals

`POST /api/v1/assessments/:assessmentId/approvals` cria approval events formais com `actor_id` obrigatório via `x-standard-actor-id`. Transições que exigem approval recebem `approval_event_id` e delegam a validação final ao Assessment Engine.

## Artifact Versions

Artefatos suportam `scope`, `soa`, `gap_analysis`, `maturity_assessment`, `poam` e `report`. Status suportados: `draft`, `under_review`, `approved`, `superseded`, `archived`. Aprovação de artefato usa helpers do Assessment Engine e bloqueia edição direta de versões aprovadas.

## Traceability

Toda request recebe ou reutiliza `x-trace-id`. Erros, responses críticas, lifecycle events, approvals e artifact versions carregam `trace_id`. O audit log real ainda é placeholder, mas a interface de audit já existe.

## Decisões Implementadas

- Auth implementado via Standard Native Auth v1.6.11 (ADR 0005) com modelo dual: sessões (cookies) para Platform Console e M2M API Keys (SHA-256 hash) para acesso programático.
- RBAC/ABAC baseado em roles (owner/contributor/auditor) com permissions por recurso.
- Persistência PostgreSQL via Drizzle ORM (ADR 0006).
- Rate limiting/quota por organization.
- SCF real e parser SCF integrado.
- OpenAPI gerado automaticamente a partir de schemas.

## Decisões em Aberto

- ~~Escolher se o API gateway adotará Hono/itty-router ou manterá roteador Fetch nativo.~~ **Decidido:** Hono como framework do API gateway.
- ~~Definir política de autenticação oficial e claims obrigatórias.~~ **Decidido:** Standard Native Auth v1.6.11 (ADR 0005).
- Definir granularidade de RBAC para approvals, transitions e artifacts.
- Substituir mocks restantes por repositories PostgreSQL com transações.
- Gerar OpenAPI completo a partir de Zod ou manter documentação manual nesta fase.

