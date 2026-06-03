---
title: "ADR 0009: Superpowers SDLC"
---

# ADR 0009: Superpowers SDLC

## Status

Aceita.

## Contexto

Deseja-se manter um processo de desenvolvimento ágil de alta qualidade, garantindo documentação, testes de regressão automatizados e rastreabilidade estrita em todas as interações com agentes de inteligência artificial de codificação.

## Decisão

Adotamos a metodologia **Superpowers SDLC** como o padrão operacional do ciclo de vida de desenvolvimento:
- Todo trabalho de agentes exige um plano de execução detalhado e uma checklist de tarefas (`task.md`).
- Manutenção rigorosa de integridade de comentários e tipos nas camadas do repositório.
- A verificação de código após cada mudança deve rodar typecheck e as suítes de testes aplicáveis.
- Manutenção do histórico de decisões no arquivo de índice central `DECISIONS.md`.

## Consequências

- Rastreabilidade total sobre mudanças arquiteturais.
- Menor taxa de erros e regressões em builds no ambiente de CI.
- Processo de desenvolvimento claro e auditável de ponta a ponta.
