# Contexto do Projeto

## Objetivo

O `aegis-api-standard` é a implementação API-first padrão do Aegis SCF-Based Assessment Lifecycle. O repositório concentra backend reutilizável, contratos, schemas, workflows, workers, assessment engine, SCF data layer, Knowledge Base, agent runtime, segurança, observabilidade, testes e documentação operacional.

## Princípios de Desenvolvimento

- API-first: comportamento reutilizável deve existir em APIs, serviços, pacotes ou contratos.
- Backend como fonte do lifecycle: lógica crítica não deve ficar apenas no frontend.
- Multi-tenant by design: fluxos críticos carregam `tenant_id`, `organization_id`, `assessment_id` e `trace_id`.
- SCF estruturado é fonte normativa; KB é fonte de evidência candidata.
- Agentes sugerem; humanos aprovam artifacts críticos.
- Segurança, auditoria, rastreabilidade e approval gates são requisitos de arquitetura, não complementos opcionais.
- Dados reais, secrets, tokens, credenciais e dumps são proibidos no repositório.

## Onde Encontrar Contexto

- `README.md`: visão geral, comandos e documentação principal.
- `AGENTS.md`: regras operacionais para agentes de coding assistido.
- `docs/architecture/`: arquitetura, workflows, agentic model, segurança, runtime e integrações.
- `docs/api/`: contratos e diretrizes de API.
- `docs/operations/`: runbooks e checklists operacionais.
- `docs/testing/`: cenários de aceitação e validação.
- `docs/context/`: contexto resumido e vivo para colaboração.
- `adr/`: decisões arquiteturais no formato ADR.
- `prompts/`: prompts, templates e orientações reutilizáveis.
- `tasks/`: contexto de branches, dev log e registros de trabalho.
- `docs/superpowers/specs/`: specs de design aprovadas para mudanças guiadas por Superpowers.
- `docs/superpowers/plans/`: planos de implementação gerados a partir de specs aprovadas.

## Fonte Única de Verdade

O GitHub é a fonte única de verdade para código, documentação, contexto, prompts, decisões, regras de IA e histórico relevante do projeto.

Contexto importante não deve ficar apenas em chat, terminal local, memória de IDE, notas privadas ou histórico de agente. Se uma decisão, limitação, prompt, regra, aprendizado ou pendência afeta o projeto, ela deve ser persistida no repositório.

## Superpowers e Google Antigravity no Processo

O Superpowers é o SDLC operacional para tarefas relevantes, mas não substitui as regras do Aegis.

Ao utilizar o **Google Antigravity**, o processo de planejamento nativo do agente (Planning Mode) atua como camada extra de garantia:
1. **Contexto Ativo**: O agente deve obrigatoriamente validar `CONTEXT.md` e `AGENTS.md` como base fundamental antes de propor tarefas.
2. **Approval Gate Nativo (Implementation Plan)**: Antes de escrever soluções complexas, o Antigravity gerará um `implementation_plan.md` no painel do usuário. Nenhuma execução complexa ocorre sem o devido *approval*.
3. **Persistência de Conhecimento**: Walkthroughs e planos conclusivos relevantes gerados pelo agente não devem ficar limitados aos seus arquivos temporários. Se alterarem o contexto do projeto, devem convergir para o SDLC do Superpowers (e.g., `docs/superpowers/plans/` ou `tasks/`).

Precedência:

```text
AGENTS.md + CONTEXT.md + regras Aegis
>
Superpowers
>
comportamento padrão do agente
```

Se uma skill pedir algo que altere ou conflite com arquitetura, stack, segurança, tenant isolation, approval gates, local oficial de contexto, versionamento ou fluxo Git, o agente deve pedir consentimento antes de continuar.

Designs aprovados devem ficar em `docs/superpowers/specs/`. Planos de implementação devem ficar em `docs/superpowers/plans/` quando aplicável.

## Obrigação de Persistir Contexto

Toda alteração relevante deve considerar atualização de contexto. Exemplos:

- mudança arquitetural;
- novo endpoint, schema, workflow ou guardrail;
- decisão de produto ou segurança;
- nova limitação conhecida;
- alteração de prompt/agente/regra;
- aprendizado de debugging ou teste;
- pendência que afeta próximos devs/agentes;
- risco aceito.

Se não houver mudança de contexto, o PR deve explicar isso explicitamente usando o marcador `[no-context-change]`.
