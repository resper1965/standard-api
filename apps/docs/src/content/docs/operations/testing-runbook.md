---
title: "Testing Runbook"
---

# Testing Runbook

## Rodar Todos os Testes Principais

```bash
pnpm test:ci
```

## Rodar Unit Tests

```bash
pnpm test:unit
```

Executa testes dos packages e workers com mocks/adapters locais.

## Rodar Integration Tests

```bash
pnpm test:integration
```

Executa API Gateway e workflows com repositórios in-memory.

## Rodar Evals

```bash
pnpm test:evaluations
```

Os evals padrão usam `MockLLMProvider` e não chamam LLM real.

## Atualizar Golden Outputs

Atualize arquivos em `evals/golden` apenas quando:

- a mudança funcional for intencional;
- a nova saída continuar sintética;
- a mudança preservar tenant isolation, approval gates e traceability;
- a revisão explicar o impacto no lifecycle.

## Quando Atualizar Golden Outputs

Atualizar quando:

- contrato de SoA, Gap, Maturity, POA&M ou Reporting mudar;
- comportamento esperado mudar por decisão arquitetural;
- novo cenário sintético for adicionado.

Não atualizar para mascarar regressão.

## Investigar Falha de Tenant Isolation

1. Identifique tenant do request, body e recurso.
2. Verifique `x-standard-tenant-id`.
3. Verifique filtros de repository/service.
4. Procure security events `tenant_context_mismatch` ou `cross_tenant_access_blocked`.
5. Adicione teste negativo antes de corrigir.

## Investigar Falha de Schema Validation

1. Leia o erro Zod.
2. Confirme se o teste ou schema está errado.
3. Não afrouxe schema sem justificar impacto.
4. Preserve `tenant_id`, `organization_id`, `assessment_id` e `trace_id`.

## Investigar Falha de Guardrail

1. Confirme o agente funcional e tool allowlist.
2. Verifique se output tentou escrever final finding, mapping oficial ou approval.
3. Verifique `assumptions`, `limitations`, `sources` e `confidence_score`.
4. Não remova guardrail para simplificar teste.

## Rodar Testes Opcionais

Cloudflare real e LLM real ficam fora do CI principal. Use somente com fixtures sintéticas e env vars explícitas.

## Checklist antes de PR

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test:unit`
- `pnpm test:contracts`
- `pnpm test:security`
- `pnpm test:regression`
- `pnpm test:evaluations`
- `pnpm test:synthetic-e2e`
- `pnpm build`
- Documentação atualizada quando contratos mudarem.
- Nenhum dado real, secret ou output sensível em fixtures/snapshots.

## Checklist antes de Release

- CI verde.
- Smoke tests de API planejados.
- Testes de tenant isolation e approval gates verdes.
- Golden outputs revisados.
- Runbook atualizado.
- Testes opcionais Cloudflare executados em staging quando aplicável.

