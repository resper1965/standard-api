# ADR 0001: GitHub como Fonte Única de Verdade

## Status

Aceita.

## Contexto

O `standard-api-standard` envolve código, contratos de API, schemas, workflows, documentação de arquitetura, regras de agentes, prompts, decisões, testes, evals e runbooks operacionais.

O desenvolvimento colaborativo com agentes de IA e humanos pode perder contexto se decisões e aprendizados ficarem apenas em chats, IDEs, terminais ou memórias locais.

## Decisão

Usar o GitHub como fonte única de verdade para:

- código;
- documentação;
- contexto;
- decisões arquiteturais;
- prompts e templates;
- regras de IA;
- logs de desenvolvimento relevantes;
- contexto de branches;
- checklists e runbooks.

## Consequências

Benefícios:

- onboarding mais rápido;
- menos perda de contexto entre sessões;
- PRs mais auditáveis;
- decisões rastreáveis;
- agentes de IA recebem orientação persistente;
- menor risco de conhecimento crítico ficar local.

Custos:

- PRs precisam atualizar contexto quando houver mudança relevante;
- documentação deve ser mantida junto com código;
- mudanças pequenas precisam declarar quando não há contexto a atualizar.

## Alternativas Consideradas

- Manter contexto apenas em chats ou issues: rejeitado por baixa rastreabilidade.
- Usar ferramenta externa separada como fonte principal: rejeitado para evitar fragmentação.
- Versionar apenas código: rejeitado porque o projeto depende de decisões, prompts, regras e governança.

## Links Relacionados

- `CONTEXT.md`
- `DEVELOPMENT.md`
- `DECISIONS.md`
- `.cursor/rules/00-contexto-obrigatorio.mdc`
- `docs/context/`

