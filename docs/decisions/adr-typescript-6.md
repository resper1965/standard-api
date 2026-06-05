# ADR: Manter TypeScript 6.x (versões pinadas)

**Status:** Accepted  
**Date:** 2026-06-05

## Context
TypeScript 6.x é versão bleeding edge. tsx é o executor de TypeScript para testes e scripts internos.
Ambos estavam com range spec (`^`) permitindo drift silencioso entre deploys.

Versões efetivamente instaladas antes do pin:
- `tsx`: `4.22.3` (spec `^4.19.4` havia driftado silenciosamente)
- `typescript`: `6.0.3` (spec `^6.0.3`)

## Decision
Pinar TypeScript e tsx a versões exatas para builds determinísticos.
Aceitar TypeScript 6.x enquanto `pnpm typecheck` e `pnpm test` passem sem flags de
compatibilidade forçadas (`ignoreDeprecations`).

## Monitoring
- Monitorar releases de Drizzle ORM, Zod 4 e Better Auth para incompatibilidades com TS 6.x.
- Para atualizar: bump deliberado com `pnpm add -D typescript@X.Y.Z tsx@X.Y.Z`, run full test suite, commit com justificativa.

## Consequences
Downgrade para TS 5.8.x se qualquer dependência crítica quebrar silenciosamente.
