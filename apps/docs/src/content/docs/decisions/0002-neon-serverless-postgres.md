---
title: "ADR-0002: PostgreSQL Gerenciado via Neon Serverless"
---

# ADR-0002: PostgreSQL Gerenciado via Neon Serverless

**Data:** 2026-04-30
**Status:** Aceita
**Contexto:** Production Database Provisioning

---

## Contexto

O Standard requer um banco PostgreSQL transacional externo como fonte de verdade para organizations, assessments, approvals, findings, audit logs e estado persistente. A arquitetura Cloudflare-oriented exige que o banco seja acessível a Workers via URL segura, sem infraestrutura gerenciada pelo time de desenvolvimento.

## Decisão

Adotar o **Neon Serverless Postgres** como banco de dados de produção gerenciado.

- **Projeto:** `standard-prod`
- **Endpoint:** `ep-blue-breeze-anyfua57.c-6.us-east-1.aws.neon.tech`
- **Região:** us-east-1 (AWS)
- **Versão PostgreSQL:** 17
- **Organização:** Ricardo (`org-green-lake-88296093`)

A string de conexão (`DATABASE_URL`) é injetada como secret nos Workers via `wrangler secret put`, nunca hardcoded em repositório ou TOML.

## Justificativa

| Critério | Neon |
|---|---|
| Serverless / auto-scale | ✅ Sim — branches escaláveis por demanda |
| Compatível com Cloudflare Workers | ✅ Acesso via HTTP/WebSocket desde Edge |
| Isolamento por branch (dev/staging/prod) | ✅ Branches separadas por ambiente |
| Custo | ✅ Free tier generoso para MVP |
| CLI disponível (`neonctl`) | ✅ Automatizável |
| Suporte a Drizzle ORM | ✅ Driver `postgres-js` nativo |

## Consequências

- O schema é gerenciado via Drizzle ORM (`packages/schemas/src/db/schema.ts`).
- Migrations estão em `infra/docker/postgres/migrations/`.
- O runner de migração é `packages/schemas/migrate.ts` (script `postgres-js` customizado), pois o `drizzle-kit` CLI requer resolução de dependências peer que conflitam com o ambiente monorepo pnpm.
- Toda consulta ao banco deve incluir `organization_id` no escopo — nunca dados sem isolamento.
- O banco de branch de desenvolvimento (`local`) continua via Docker conforme `infra/docker/docker-compose.yml`.

## Alternativas Consideradas

- **Cloudflare D1**: descartado por não suportar PKs sequenciais, JOINs complexos, transações ACID completas e escala enterprise necessária para compliance.
- **Edge Auth Postgres**: descartado pela complexidade de auth/API camada adicional desnecessária.
- **RDS Aurora Serverless**: descartado pelo custo de operação e latência adicional fora do ecossistema escolhido.

