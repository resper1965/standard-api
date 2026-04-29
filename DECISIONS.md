# Índice de Decisões

Este arquivo é o índice central de decisões arquiteturais e operacionais relevantes do projeto.

## ADRs

- `adr/0001-estrutura-base-do-projeto.md`: GitHub como fonte única de verdade para código, contexto, prompts e decisões.

## Decisões Arquiteturais Existentes

- `docs/decisions/0001-platform-boundaries.md`: limites de plataforma e responsabilidades.

## Como Registrar Nova Decisão

Crie um novo arquivo em `adr/` seguindo numeração incremental:

```text
adr/0002-titulo-curto-da-decisao.md
```

Cada ADR deve registrar:

- status;
- contexto;
- decisão;
- consequências;
- alternativas consideradas;
- links para documentação relacionada.

## Regras

- Decisões não devem ficar apenas em chat, issue ou memória local.
- Decisões que afetam arquitetura, segurança, API, workflows, dados, agentes ou produção exigem ADR ou documentação equivalente.
- Se uma decisão substituir outra, atualizar este índice e marcar a decisão anterior como superseded.
