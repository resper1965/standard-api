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

### 2026-05-06 - Fase 0: Organização do SDLC

- Contexto: diagnóstico identificou que o projeto avançou muito em código (17 packages, 3 workers, 31 docs de arquitetura) mas o ciclo de vida de desenvolvimento permanecia desorganizado — 3 backlogs concorrentes, planos sem status, ADRs faltantes, produto pouco definido.
- O que foi aprendido:
  - O backlog estava espalhado em `pendencias.md`, `post-mvp-backlog.md` e `roadmap-to-production.md` — nenhum era fonte de verdade.
  - 13 planos em `docs/plans/` e `docs/superpowers/plans/` sem indicação de status.
  - Decisões críticas (Standard Native Auth, Drizzle, Design System, SCF XLSX, Superpowers SDLC) não tinham ADR formal.
  - `docs/context/produto.md` tinha 6 linhas; sem visão, personas ou modelo de negócio.
  - Templates de branch context e dev log existiam mas nunca foram usados.
- Ações executadas:
  - Criado `ROADMAP.md` na raiz com 5 fases e critérios de saída.
  - Criado `docs/backlog/backlog.md` consolidando todos os backlogs.
  - Reescrito `docs/context/produto.md` com visão, proposta de valor, personas e modelo de negócio.
  - Criado `docs/operations/environments.md` com strategy de ambientes.
  - Registrados ADR-0005 a ADR-0009 retroativamente.
  - Deprecados 3 documentos legados com header `[SUPERSEDED]`.
  - Atualizado `DECISIONS.md` com 9 decisões indexadas.
  - Adicionado status a planos em `docs/plans/`.
  - Git estabilizado: 362 arquivos dirty commitados na main.
  - Aegis purge final: zero referências no repositório.
- Arquivos criados/modificados:
  - `ROADMAP.md`, `DECISIONS.md`, `docs/backlog/backlog.md`
  - `docs/context/produto.md`, `docs/operations/environments.md`
  - `docs/decisions/0005-*` a `docs/decisions/0009-*`
  - `docs/context/pendencias.md`, `docs/releases/post-mvp-backlog.md`, `docs/releases/roadmap-to-production.md`
  - `docs/plans/*` (status headers)
- Pendências: Fase 1 (estabilização técnica) pode iniciar após validação do usuário.

### 2026-05-30 - Integração de SoA no MCP & Hotfix de Deploy

- Contexto: Exposição do ciclo de vida de Statement of Applicability (SoA) no Model Context Protocol (MCP) com 6 novas tools (totalizando 33 no gateway).
- O que foi aprendido:
  - Identificada e corrigida a ausência do arquivo `wrangler.queues-worker.toml` no diretório `infra/cloudflare`, que quebrava a matriz de deployment do GitHub Actions para o `queues-worker`.
  - Mapeado o erro de deploy do `queues-worker` devido a consumidores associados a filas que não existiam no painel do Cloudflare (`standard-soc-triage-prod` e `standard-soc-triage-dlq-prod`).
- Ações executadas:
  - Criadas as 6 novas tools de SoA (`list-soa-versions`, `get-soa-version`, `list-soa-items`, `get-soa-item`, `validate-soa`, `get-soa-summary`).
  - Atualizadas as rotas HTML e guias markdown de integração MCP.
  - Criado o arquivo `infra/cloudflare/wrangler.queues-worker.toml` com os mappings relativos corretos.
  - Usuário provisionou as filas pendentes no Cloudflare.
- Arquivos relacionados:
  - `apps/api-gateway/src/mcp/server.ts`
  - `apps/api-gateway/src/mcp/tools/soa.tools.ts`
  - `docs/api/mcp-integration-guide.md`
  - `infra/cloudflare/wrangler.queues-worker.toml`
- Pendências: Monitorar nova execução do pipeline de deploy.

