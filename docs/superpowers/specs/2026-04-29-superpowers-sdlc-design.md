# Superpowers SDLC Design

## Objetivo

Formalizar o uso do Superpowers como processo de desenvolvimento do `standard-api-standard`, sem comprometer as regras já definidas em `AGENTS.md`, `CONTEXT.md`, `.cursor/rules/`, arquitetura API-first, tenant isolation, approval gates e governança de segurança.

## Decisão de Precedência

O Superpowers orienta o processo, mas não substitui o modelo operacional do Standard.

Ordem obrigatória:

```text
AGENTS.md + CONTEXT.md + regras Standard
>
Superpowers
>
comportamento padrão do agente
```

Se uma skill do Superpowers pedir algo que conflite com as regras do Standard, o agente deve parar e pedir consentimento antes de continuar.

## Escopo

O Superpowers deve ser tratado como gate estrito para tarefas relevantes:

- implementação de features;
- bugfixes;
- refactors;
- mudanças de arquitetura;
- mudanças de API ou contratos;
- mudanças de segurança, tenant isolation, observabilidade ou approval gates;
- mudanças em agent runtime, prompts, evals ou workflows;
- documentação estrutural que altera processo ou governança.

Tarefas triviais podem usar fluxo reduzido, mas ainda devem respeitar `using-superpowers`, contexto obrigatório e validação antes de conclusão.

## Fluxo Oficial

```text
Pedido do usuário
↓
Ler contexto aplicável
↓
using-superpowers
↓
brainstorming, quando houver escopo, design ou trade-off
↓
spec aprovada pelo usuário
↓
writing-plans, quando houver execução multi-step
↓
executing-plans ou subagent-driven-development
↓
test-driven-development, quando houver comportamento
↓
systematic-debugging, se houver falha
↓
requesting-code-review, quando houver mudança relevante
↓
verification-before-completion
↓
finishing-a-development-branch
```

## Uso das Skills

### `using-superpowers`

Gate de entrada. Deve ser considerado antes de responder ou agir quando houver chance de uma skill se aplicar.

### `brainstorming`

Usar para transformar ideias, mudanças de processo, arquitetura ou escopo em design aprovado antes de implementar.

No Standard, brainstorming não autoriza alteração de stack, arquitetura ou governança sem consentimento explícito.

### `writing-plans`

Usar para tarefas multi-step antes de tocar código ou documentação estrutural. Planos devem ser salvos em:

```text
docs/superpowers/plans/YYYY-MM-DD-<tema>.md
```

Se o plano for específico de branch, também pode referenciar:

```text
tasks/branch-context/<branch>.md
```

### `executing-plans`

Usar para executar plano aprovado em sequência, com checkpoints e validações.

### `subagent-driven-development`

Usar quando as tarefas forem independentes e puderem ser executadas por subagentes com revisão entre etapas.

### `test-driven-development`

Usar para feature, bugfix, refactor ou mudança comportamental.

Não é obrigatório para documentação pura, mas documentação estrutural exige validação de consistência e contexto.

### `systematic-debugging`

Usar antes de corrigir erros, testes quebrados, build falhando ou comportamento inesperado.

### `requesting-code-review` e `receiving-code-review`

Usar para revisão técnica e tratamento rigoroso de feedback.

### `verification-before-completion`

Obrigatório antes de afirmar que algo está pronto. Exige evidência recente de validação.

### `finishing-a-development-branch`

Usar para fechamento de branch, resumo, opções de PR/merge/push e pendências.

## Limites do Standard

O Superpowers não pode:

- burlar approval gates humanos;
- alterar tenant isolation;
- transformar KB ou Vectorize em fonte normativa;
- inventar mappings SCF oficiais;
- mover lógica crítica para o frontend;
- introduzir tecnologia fora das regras do projeto sem consentimento;
- versionar secrets, dados reais ou credenciais;
- declarar conclusão sem validação;
- substituir documentação e contexto versionados por memória de chat.

## Política de Consentimento

O agente deve pedir consentimento antes de:

- mudar stack, dependências ou runtime;
- alterar arquitetura documentada;
- mudar local oficial de specs, planos, prompts ou contexto;
- versionar novas famílias de skills ou ferramentas;
- relaxar gate de segurança, teste ou aprovação;
- fazer commit, push ou PR quando não solicitado explicitamente.

## Integração com Contexto

Mudanças geradas a partir do Superpowers devem atualizar contexto quando relevante:

- `CONTEXT.md`;
- `DEVELOPMENT.md`;
- `DECISIONS.md`;
- `adr/`;
- `docs/context/`;
- `docs/superpowers/specs/`;
- `docs/superpowers/plans/`;
- `tasks/branch-context/`;
- `tasks/dev-log.md`.

## Versionamento de Skills

O repositório pode versionar `skills-lock.json` e `skills/` para reproduzir o processo entre agentes, desde que:

- a instalação tenha sido revisada;
- a origem seja conhecida;
- a avaliação de risco não indique bloqueio;
- não exista secret ou dado sensível;
- qualquer alerta material seja levado ao usuário antes do commit.

## Validação

Validação mínima para mudanças documentais:

```bash
pnpm lint
```

Para mudanças de código ou contratos, aplicar validações do `AGENTS.md`, incluindo typecheck e testes relevantes.

## Riscos

- Fricção excessiva em tarefas pequenas.
- Conflito entre instruções de skill e regras do Standard.
- Versionamento de skills externas sem revisão.
- Planos excessivamente detalhados para mudanças documentais simples.

Mitigação:

- manter precedência explícita;
- usar consentimento para conflitos;
- ajustar rigor ao risco da tarefa;
- preservar contexto no GitHub.

