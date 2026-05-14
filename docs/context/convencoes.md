# Convenções

## Idioma

Documentação operacional e contexto do projeto devem estar em português, salvo contratos técnicos, nomes de APIs, schemas e termos padronizados.

## Dados

- Usar apenas dados sintéticos em testes, fixtures, exemplos e docs.
- Nunca versionar dados reais, dumps ou documentos de cliente.

## IDs e Rastreabilidade

Fluxos críticos devem preservar:

- `tenant_id`;
- `organization_id`;
- `assessment_id`;
- `trace_id`;
- `agent_run_id`, quando aplicável.

## Documentação

- Mudanças arquiteturais: `docs/architecture/`.
- APIs: `docs/api/`.
- Operação: `docs/operations/`.
- Testes e aceitação: `docs/testing/`.
- Decisões: `adr/` e `DECISIONS.md`.
- Prompts e regras reutilizáveis: `prompts/` e `.cursor/rules/`.

## Branch Context

Branches com impacto relevante devem criar arquivo em `tasks/branch-context/` usando `TEMPLATE.md`.

## Commits e PRs

PRs devem listar contexto atualizado e validações. Se não houver contexto a atualizar, usar `[no-context-change]` no título ou descrição.
