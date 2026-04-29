# Prompts

Este diretório armazena prompts, templates e orientações reutilizáveis relevantes para o desenvolvimento do Aegis.

## Objetivo

Garantir que prompts importantes não fiquem apenas em conversas locais e possam ser revisados, versionados e reutilizados.

## Estrutura

- `prompts/agents/`: prompts e instruções relacionados a agentes funcionais.
- `prompts/system/`: prompts de sistema ou regras estruturais, quando aprovados.
- `prompts/templates/`: modelos reutilizáveis para tarefas recorrentes.

## Regras

- Não incluir secrets, tokens, credenciais ou dados reais.
- Não incluir prompts com dados sensíveis de clientes.
- Usar dados sintéticos em exemplos.
- Explicar objetivo, contexto e quando usar cada prompt.
- Versionar mudanças relevantes e relacionar com ADR/docs quando aplicável.
- Prompts de produção para LLM real exigem revisão de segurança, evals e guardrails.

## Template Sugerido

```text
# Nome do Prompt

## Objetivo

## Quando Usar

## Entradas Esperadas

## Prompt

## Guardrails

## Validação Esperada

## Histórico de Mudanças
```
