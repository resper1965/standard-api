# ADR-0006: Drizzle ORM

**Status**: aceita
**Data**: 2026-04-29
**Contexto**: O projeto precisava de um ORM/query builder para PostgreSQL compatível com Cloudflare Workers (edge runtime, sem Node.js APIs).
**Decisão**: Adotar Drizzle ORM com driver `@neondatabase/serverless` para PostgreSQL.
**Consequências**:
- Schemas definidos em TypeScript em `packages/schemas/src/db/schema.ts`
- Migrations geradas via `drizzle-kit generate` e aplicadas via `drizzle-kit migrate`
- Compatível com edge runtime (sem dependência de `pg` nativo)
- Type-safe queries sem necessidade de tipos manuais
- Migrations versionadas em `infra/docker/postgres/migrations/`
**Alternativas consideradas**:
- Prisma: não compatível com Cloudflare Workers edge runtime na época da decisão
- Kysely: type-safe mas sem migration system integrado
- Raw SQL: sem type safety, manutenção difícil
**Referências**: `packages/schemas/`, `drizzle.config.ts`, `infra/docker/postgres/migrations/`
