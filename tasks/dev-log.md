# Dev Log

Este arquivo registra aprendizados relevantes, testes importantes, contexto não óbvio e observações que ajudam outros devs ou agentes a continuar o trabalho sem perder histórico.

## Regras

- Registrar apenas contexto útil para continuidade.
- Não incluir secrets, dados reais, tokens, credenciais, dumps ou documentos de cliente.
- Preferir links para PRs, ADRs, docs e arquivos alterados.
- Manter entradas objetivas e datadas.

## Formato Sugerido

```text
## YYYY-MM-DD - Título curto

- Contexto:
- O que foi aprendido:
- Testes/validações relevantes:
- Arquivos relacionados:
- Pendências:
```

## Entradas

### 2026-04-29 - Estrutura inicial de preservação de contexto

- Contexto: criada estrutura mínima para versionar contexto, decisões, prompts, regras de IA e branch context.
- O que foi aprendido: o projeto já possui documentação arquitetural extensa; a nova estrutura atua como índice operacional e camada de governança de colaboração.
- Testes/validações relevantes: pendente validação no PR/CI.
- Arquivos relacionados: `CONTEXT.md`, `DEVELOPMENT.md`, `DECISIONS.md`, `docs/context/`, `adr/`, `prompts/`, `tasks/`, `.cursor/rules/`, `.github/`.
- Pendências: manter branch contexts específicos conforme novas branches forem criadas.
