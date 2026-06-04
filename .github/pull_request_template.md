# Descrição

Explique o que mudou e por quê.

## Contexto

Quais documentos, decisões, prompts, regras ou informações de branch são relevantes para revisar este PR?

## Decisões Tomadas

- Placeholder: listar decisões ou apontar ADR/docs.

## Impacto

- Arquitetura:
- API/contratos:
- Segurança/multi-tenancy:
- Agent runtime/prompts/workflows:
- Operação/Cloudflare:
- Testes/evals:

## Arquivos de Contexto Atualizados

- [ ] `CONTEXT.md`, se necessário.
- [ ] `docs/context/`, se necessário.
- [ ] `DECISIONS.md` ou `adr/`, se necessário.
- [ ] `prompts/`, `.agent/` ou docs de agentes, se necessário.
- [ ] `tasks/branch-context/`, se necessário.

Se nenhum contexto mudou, incluir `[no-context-change]` no título ou descrição do PR e justificar aqui:

```text
Justificativa:
```

## Validação

- [ ] `pnpm lint`
- [ ] `pnpm typecheck`
- [ ] Testes relevantes executados ou gap documentado.
- [ ] Nenhum secret, token, credencial, dump ou dado real foi adicionado.

## Checklist Obrigatório

- [ ] `CONTEXT.md` atualizado, se necessário.
- [ ] `docs/context/` atualizado, se necessário.
- [ ] ADR criado, se necessário.
- [ ] Prompts/agentes/regras atualizados, se necessário.
- [ ] Branch context atualizado, se necessário.
- [ ] Nenhum contexto relevante ficou apenas localmente.
- [ ] Impacto em organization isolation, approval gates e auditabilidade foi considerado.
