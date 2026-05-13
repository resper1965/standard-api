# Documentação Contextual para AI-Assisted Development

## Goal
Atualizar a documentação para que um dev usando Cursor, Codex, Claude Code ou Antigravity possa perguntar "faz um assessment ISO 27001 com esses documentos" e o AI assistant saiba exatamente quais endpoints chamar, em que ordem, e como interpretar cada resposta.

## Tasks

- [x] 1. Atualizar `docs/api/llms-full.txt` com 9 endpoints novos (G5/G4/G1) + seções Dashboard, Members, Audit → Verify: grep todos os novos paths no arquivo
- [x] 2. Atualizar `docs/api/llms.txt` com seções Dashboard, Members, Audit Trail na lista → Verify: diff mostra 3 linhas novas
- [x] 3. Adicionar bloco `openapi.yaml` com os 9 endpoints novos (summary, dashboard, tenant audit-logs, org audit-logs, 5 member CRUD) → Verify: yaml lint válido
- [x] 4. Criar `docs/api/COOKBOOK.md` com 5 receitas end-to-end em SDK TypeScript: (a) assessment ISO 27001, (b) dashboard org, (c) audit trail, (d) member management, (e) CI/CD compliance gate → Verify: arquivo existe com 5 seções h2
- [x] 5. Atualizar `packages/sdk/README.md` com exemplos de `summary()`, `dashboard()`, `auditLogs()`, `listMembers()`, `inviteMember()` → Verify: grep novos métodos no README
- [x] 6. Criar `.cursor/rules/standard-api.md` com regras contextuais para Cursor AI: lifecycle states, endpoint catalog, SDK patterns → Verify: arquivo existe
- [x] 7. Criar `.github/copilot-instructions.md` com instruções Copilot/Codex: API patterns, auth, common flows → Verify: arquivo existe
- [x] 8. Criar `CLAUDE.md` (raiz) com instruções Claude Code/Antigravity: monorepo map, SDK usage, assessment flow → Verify: arquivo existe

## Done When
- [x] Dev AI-assisted pergunta "como criar assessment ISO 27001" e o context files tem a resposta completa
- [x] `llms-full.txt` documenta 100% dos endpoints ativos
- [x] SDK README mostra exemplos de todos os novos métodos
- [x] Cursor, Copilot, e Claude Code encontram regras contextuais nos diretórios padrão

## Notes
- `.cursor/rules/` é o padrão Cursor para project context
- `.github/copilot-instructions.md` é o padrão GitHub Copilot
- `CLAUDE.md` na raiz é lido por Claude Code e Antigravity
- `llms.txt` / `llms-full.txt` segue padrão llmstxt.org para AI crawlers
