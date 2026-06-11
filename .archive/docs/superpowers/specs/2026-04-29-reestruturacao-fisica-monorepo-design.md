# Spec: Reestruturação Física do Monorepo

## Resumo
Limpeza das pastas fantasmas criadas acidentalmente dentro de `apps/` para garantir alinhamento com a arquitetura definida no `README.md` do repositório.

## Motivação
A documentação base diz que a pasta `apps/` deve conter apenas serviços client-facing (e.g., `web` e `api-gateway`). No entanto, apareceram pastas sobrepostas (`apps/queue-consumer`, `apps/api-worker`, `apps/workflows`) que causam confusão arquitetural. Elas não possuem arquivo `package.json` real e suas pastas `src/` estão vazias, indicando que são resquícios inúteis (ghost directories), visto que as lógicas já residem com sucesso nas respectivas subpastas originais de `workers/`.

## Escopo (Fase 1)
- Excluir o diretório `apps/api-worker`.
- Excluir o diretório `apps/queue-consumer`.
- Excluir o diretório `apps/workflows`.

## Trade-offs e Riscos
- Risco nulo à base de código. Pastas não estão registradas nos workspaces do `pnpm` por não terem `package.json`.

## Validação e Próximos Passos
- Nenhuma validação adicional (`pnpm test` ou `pnpm lint`) deve falhar pois não há código deletado de compilação.
- Uma vez concretizado e commitado, iniciaremos a Fase 2 (Documentação/Arquitetura).
