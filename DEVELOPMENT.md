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

## Superpowers SDLC

O processo de desenvolvimento do Standard usa o Superpowers como gate estrito para tarefas relevantes, sem substituir as regras do repositório.

Precedência obrigatória:

```text
AGENTS.md + CONTEXT.md + regras Standard
>
Superpowers
>
comportamento padrão do agente
```

Se uma skill do Superpowers exigir mudança de stack, arquitetura, segurança, tenant isolation, approval gates, local de contexto, política de versionamento ou fluxo Git, o agente deve parar e pedir consentimento antes de continuar.

Fluxo oficial:

1. **Entrada**: usar `using-superpowers` para verificar skills aplicáveis.
2. **Design**: usar `brainstorming` quando houver escopo, trade-off, arquitetura, processo ou decisão relevante.
3. **Spec**: salvar designs aprovados em `docs/superpowers/specs/`.
4. **Plano**: usar `writing-plans` para tarefas multi-step e salvar planos em `docs/superpowers/plans/`.
5. **Execução**: usar `executing-plans` ou `subagent-driven-development` para executar planos aprovados.
6. **TDD**: usar `test-driven-development` para features, bugfixes, refactors e mudanças de comportamento.
7. **Debugging**: usar `systematic-debugging` antes de corrigir erro, teste quebrado ou comportamento inesperado.
8. **Revisão**: usar `requesting-code-review` antes de considerar pronta uma mudança relevante.
9. **Feedback**: usar `receiving-code-review` para tratar review sem aceitar sugestões cegamente.
10. **Validação final**: usar `verification-before-completion` antes de declarar conclusão.
11. **Fechamento**: usar `finishing-a-development-branch` para fechamento de branch, PR, pendências e próximos passos.

Limites:

- Superpowers não pode burlar approval gates humanos.
- Superpowers não pode relaxar tenant isolation, auditabilidade ou rastreabilidade.
- Superpowers não pode transformar KB/Vectorize em fonte normativa.
- Superpowers não pode introduzir tecnologia fora das regras do projeto sem consentimento.
- Superpowers não elimina a obrigação de persistir contexto no GitHub.

Resultado esperado de cada ciclo:

- escopo claro;
- design/spec aprovado quando aplicável;
- plano rastreável para tarefas multi-step;
- critérios de aceite explícitos;
- contexto preservado;
- validação executada ou gap documentado;
- PR revisável;
- nenhum requisito crítico apenas em memória local.

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

