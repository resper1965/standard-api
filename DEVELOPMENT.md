# Desenvolvimento Colaborativo

## Fluxo Git

1. Criar branch curta e descritiva a partir da base atual.
2. Implementar mudanças pequenas e revisáveis.
3. Atualizar testes, contratos e documentação aplicável.
4. Registrar contexto relevante em `tasks/branch-context/` quando a tarefa tiver impacto arquitetural, operacional, de segurança ou agentic.
5. Abrir Pull Request com template preenchido.
6. Não fazer merge sem validação e contexto preservado.

## Branches

Padrão sugerido:

```text
feature/<descricao-curta>
fix/<descricao-curta>
docs/<descricao-curta>
chore/<descricao-curta>
security/<descricao-curta>
```

Use branches específicas para workstreams grandes. Evite misturar refactors, docs e feature behavior no mesmo PR sem justificativa.

## Commits

Preferir mensagens claras e verificáveis. Sugestão:

```text
tipo: resumo curto
```

Tipos comuns:

- `feat`
- `fix`
- `docs`
- `test`
- `refactor`
- `chore`
- `security`

Commits feitos por agentes de IA devem seguir a regra do `AGENTS.md` e incluir atribuição `Co-Authored-By` quando aplicável.

## Pull Requests

Todo PR deve explicar:

- o que mudou;
- por que mudou;
- impacto em arquitetura, segurança, multi-tenancy e APIs;
- validações executadas;
- contexto atualizado;
- riscos e pendências.

## Atualização Obrigatória de Contexto

Atualize contexto quando houver:

- decisão arquitetural;
- mudança em API, lifecycle, agent runtime, security, observability ou Cloudflare;
- prompt/regras/agentes reutilizáveis;
- limitação ou risco novo;
- aprendizado que evita retrabalho;
- alteração de comportamento relevante.

Locais recomendados:

- `CONTEXT.md`;
- `docs/context/`;
- `adr/`;
- `prompts/`;
- `tasks/branch-context/`;
- `tasks/dev-log.md`;
- documentação específica em `docs/`.

## Checklist Antes de Finalizar Tarefa

- `pnpm lint` executado quando aplicável.
- `pnpm typecheck` executado quando aplicável.
- Testes relevantes executados ou gap documentado.
- Nenhum secret, token, credencial, dump ou dado real foi adicionado.
- Tenant isolation e approval gates preservados.
- Contratos/API/docs atualizados quando aplicável.
- Contexto relevante persistido no repositório.
- `tasks/branch-context/` atualizado quando a branch exigir contexto próprio.
- PR descreve decisões, riscos, validação e arquivos de contexto alterados.
