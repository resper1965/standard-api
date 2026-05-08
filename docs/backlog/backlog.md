# Backlog Unificado

> Fonte única de verdade para TODO o trabalho pendente do Standard. Consolida `post-mvp-backlog.md`, `pendencias.md` e `roadmap-to-production.md`.

## Legenda

- **Fase**: vinculada ao `ROADMAP.md`
- **Prioridade**: P0 (bloqueador), P1 (essencial), P2 (importante), P3 (futuro)
- **Status**: `pendente`, `em_andamento`, `concluído`, `descartado`

---

## Fase 0: Organização do SDLC

| # | Item | Prioridade | Status |
|---|------|:----------:|--------|
| 0.1 | ROADMAP.md com fases e milestones | P0 | concluído |
| 0.2 | Backlog unificado (este documento) | P0 | concluído |
| 0.3 | Reescrita de `docs/context/produto.md` | P0 | pendente |
| 0.4 | `docs/operations/environments.md` | P1 | pendente |
| 0.5 | Status headers em planos legados | P1 | pendente |
| 0.6 | ADRs retroativos (0005–0009) | P1 | pendente |
| 0.7 | Deprecar pendencias.md, post-mvp-backlog.md, roadmap-to-production.md | P1 | pendente |
| 0.8 | Atualizar DECISIONS.md | P1 | pendente |
| 0.9 | Atualizar dev-log.md | P2 | pendente |

---

## Fase 1: Estabilização & Infraestrutura Real

| # | Item | Prioridade | Status | Origem |
|---|------|:----------:|--------|--------|
| 1.1 | `pnpm lint` + `pnpm typecheck` sem erros | P0 | concluído | CI |
| 1.2 | `pnpm test` todos passando | P0 | concluído | CI |
| 1.3 | Rate limiting real por tenant (KV provisionado) | P0 | concluído | post-mvp P0 |
| 1.4 | Audit log persistence + Observability Drizzle repos | P0 | concluído | post-mvp P0 |
| 1.5 | Backup/restore PostgreSQL + R2 | P0 | concluído | post-mvp P0 |
| 1.6 | Cloudflare resources staging separados | P0 | descartado | user: sem staging |
| 1.7 | Cloudflare Workflows real — smoke tests docs | P1 | concluído | RC checklist |
| 1.8 | Data retention e legal holds — política definida | P0 | concluído | post-mvp P0 |
| 1.9 | Avaliar branch `feature/architecture-refactoring` — descartada | P1 | concluído | — |
| 1.10 | Stress tests — plano de testes documentado | P2 | concluído | pendencias |

---

## Fase 2: Core Funcional Completo

| # | Item | Prioridade | Status | Origem |
|---|------|:----------:|--------|--------|
| 2.1 | `packages/maturity` — Maturity Assessment package | P0 | pendente | roadmap T2 |
| 2.2 | Rejection/rework loops no assessment engine | P1 | pendente | engine analysis |
| 2.3 | Reprocessamento com rastreabilidade (motivo, versão, ator) | P1 | pendente | AGENTS.md §11 |
| 2.4 | Immutability enforcement em artifacts aprovados | P1 | pendente | engine analysis |
| 2.5 | LLM provider real via AI Gateway | P1 | pendente | post-mvp P1 |
| 2.6 | DOCX/PDF renderer para relatórios | P2 | pendente | roadmap T2 |
| 2.7 | Anti-malware scanning em uploads | P1 | pendente | roadmap T3 |
| 2.8 | SCF official importer hardening (XLSX/OSCAL validation) | P1 | pendente | post-mvp P1 |
| 2.9 | Advanced evals (adversarial, prompt injection, regression) | P1 | pendente | post-mvp P1 |
| 2.10 | Conectores externos (webhooks, DLQ, third-party scanners) | P2 | pendente | pendencias |
| 2.11 | SOC monitoring (alertas, DLQ, tenant mismatch) | P1 | pendente | post-mvp P1 |

---

## Fase 3: Frontend SaaS

| # | Item | Prioridade | Status | Origem |
|---|------|:----------:|--------|--------|
| 3.1 | API Playground | P1 | pendente | plano novo |
| 3.2 | Organization Self-Service (perfil, membros, convites) | P1 | pendente | plano novo |
| 3.3 | API Keys Self-Service (criação, revogação, monitoramento) | P1 | pendente | pendencias |
| 3.4 | Billing/Plans dashboard | P2 | pendente | plano novo |
| 3.5 | Onboarding wizard | P2 | pendente | plano novo |
| 3.6 | Separação Master Admin vs Tenant Admin vs User | P0 | pendente | plano novo |
| 3.7 | Backend endpoints faltantes (org update, invites, billing) | P1 | pendente | analysis |

---

## Fase 4: Produção

| # | Item | Prioridade | Status | Origem |
|---|------|:----------:|--------|--------|
| 4.1 | Production go-live checklist executado | P0 | pendente | ops docs |
| 4.2 | Custom domains configurados | P1 | pendente | ops docs |
| 4.3 | Monitoring e alertas ativos | P0 | pendente | post-mvp P1 |
| 4.4 | Data retention enforcement | P0 | pendente | post-mvp P0 |
| 4.5 | Revisão legal/privacy | P0 | pendente | — |
| 4.6 | Primeiro tenant real onboarded | P0 | pendente | — |
| 4.7 | Workers for Platforms (se necessário) | P3 | pendente | post-mvp P3 |
| 4.8 | Customer custom domains (Cloudflare for SaaS) | P3 | pendente | post-mvp P2 |
| 4.9 | Performance/load testing com k6 | P2 | pendente | post-mvp P2 |
| 4.10 | Billing/usage previsão, budgets, chargeback | P3 | pendente | post-mvp P3 |

---

## Itens Concluídos (Histórico)

| Item | Fase | Data |
|------|------|------|
| Monorepo TypeScript com packages reutilizáveis | — | MVP |
| API Gateway com rotas versionadas `/api/v1` | — | MVP |
| State machine do lifecycle com approval gates | — | MVP |
| Better Auth como identity provider | 1 | 2026-05 |
| Neon PostgreSQL com Drizzle ORM | 1 | 2026-05 |
| SCF official XLSX 2026.1.1 importado | 2 | 2026-05 |
| QNRCS 2019 seed integrado | 2 | 2026-05 |
| Rebranding Aegis → Standard | — | 2026-05 |
| Git stabilization (362 arquivos commitados) | 0 | 2026-05-06 |
| Aegis purge final (zero referências) | 0 | 2026-05-06 |
| Architecture refactoring (KV cache, ABAC, CQRS scaffold) | 1 | 2026-05-05 |
| Typecheck + lint limpos | 1 | 2026-05-08 |
| Todos os testes passando (51 testes) | 1 | 2026-05-08 |
| Rate limiting real via KV provisionado | 1 | 2026-05-08 |
| Observability Drizzle persistence (security events, metrics, usage) | 1 | 2026-05-08 |
| Backup/restore strategy + R2 script | 1 | 2026-05-08 |
| Data retention & legal hold policy | 1 | 2026-05-08 |
| Branch architecture-refactoring descartada (ADR-0010) | 1 | 2026-05-08 |
| Stress test plan documentado | 1 | 2026-05-08 |
