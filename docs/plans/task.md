# Task Tracker — Preparação para Produção (2026-05-30)

| # | Task | Status |
|---|------|--------|
| P3-1.1 | Mover API Keys para NavLinks do Organization | done |
| P3-2.1 | Registrar a Rota do Onboarding | done |
| P3-2.2 | Desenvolver a Página `OnboardingPage.tsx` | done |
| P3-2.3 | Redirecionar Automaticamente Usuários sem Organização | done |
| P4-3.1 | Criar o Script `load-test.js` | done |
| P4-4.1 | Escrever a Documentação do Checklist Operacional | done |
| P0-01.1 | Remover secrets de `scripts/create-superadmin.mjs` | done |
| P0-01.2 | Remover secrets de `scripts/check-fw.mjs` | done |
| P0-01.3 | Remover secrets de `scripts/migrations/001-fix-enums.mjs` | done |
| P0-01.4 | Hardening de regras no scanner em `scripts/lint.mjs` | done |
| P0-02.1 | Bloquear bypass de organization em `organization.middleware.ts` | done |
| P0-03.1 | Unificar KV binding em `wrangler.api-gateway.toml` | done |
| P0-03.2 | Ligar `COUNCIL_WORKFLOW` em `wrangler.api-gateway.toml` | done |
| P0-03.3 | Corrigir entrypoint e adicionar `COUNCIL_WORKFLOW` em `wrangler.workflows.toml` | done |
| P0-04.1 | Exigir Lint e Audit no Pipeline do GitHub Actions | done |
| P0-04.2 | Usar Drizzle migrations versionadas em vez de push forçado | done |
| P1-04.1 | Configurar Cron triggers nos workers de queues | done |
| P1-05.1 | Hardening de default scopes no validador (`api-key-scopes.ts`) | done |
| P1-05.2 | Fail-closed em rotas não mapeadas (`scope.middleware.ts`) | done |
| P1-05.3 | Tornar scopes obrigatórios na criação de chaves (`api-keys.routes.ts`) | done |
| P1-05.4 | Corrigir criação de chaves nos testes (`critical.test.ts`) | done |
| P1-06.1 | Adicionar scopes de ferramentas no dispatcher MCP (`server.ts`) | done |
| P1-07.1 | Strict mode em upload antimalware (`malware-scanner.ts` / `documents.routes.ts`) | done |
| P1-08.1 | Falhar em queues se secrets LLM faltarem em produção (`agent-run.consumer.ts`) | done |
| P1-09.1 | Bloquear rota de debug `/api/v1/auth/debug` em produção (`health.routes.ts`) | done |
| P2-05.1 | Adicionar script de lint em `apps/api-gateway/package.json` | done |
| P2-06.1 | Corrigir declaração no state em `Users.tsx` | done |
| P5-01.1 | Corrigir mapeamentos de frameworks no Drizzle Repository eUUIDs vazios | done |
| P5-01.2 | Corrigir placeholders de Account ID em arquivos wrangler.toml | done |
| P5-01.3 | Adicionar suporte a AI Gateway autenticado com cabeçalho especial cf-aig-authorization | done |
| P5-01.4 | Corrigir cron triggers inválidos no Cloudflare (0 -> SUN) e remover consumidores duplicados | done |
| P5-01.5 | Configurar secrets em produção e realizar deploy bem-sucedido de todos os workers | done |

