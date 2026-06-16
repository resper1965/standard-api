# Reversa SDD — Índice de Navegação

> **Projeto:** standard-api-standard v0.1.0
> **Análise concluída em:** 2026-05-23
> **Agente:** Antigravity (Google DeepMind)
> **Status:** ✅ Completa

---

## Documentos do SDD

| # | Fase | Documento | Conteúdo Principal |
|---|---|---|---|
| 01 | Reconhecimento | [01-reconhecimento.md](./01-reconhecimento.md) | Identidade do projeto, stack, workspace packages, entry points, CI/CD, domínios |
| 02 | Inventário Técnico | [02-inventario-tecnico.md](./02-inventario-tecnico.md) | Tabelas Drizzle, bindings Cloudflare (R2/Queues/AI), auth, agentes |
| 03 | Arquitetura C4 | [03-arquitetura-c4.md](./03-arquitetura-c4.md) | Diagramas C4 (3 níveis), state machine do assessment, RBAC model |
| 04 | Fluxo de Dados | [04-fluxo-de-dados.md](./04-fluxo-de-dados.md) | Pipeline RAG, lifecycle workflow, orquestração Council |
| 05 | Dependências Runtime | [05-dependencias-runtime.md](./05-dependencias-runtime.md) | ENV vars, CORS, CSP, security headers, bindings de infra |
| 06 | Diagnóstico de Saúde | [06-diagnostico-saude.md](./06-diagnostico-saude.md) | Dívida técnica, riscos de tenancy, roadmap de evolução |
| 07 | Design System | [07-design.md](./07-design.md) | Tokens de design system (Nordic Tech), cores, tipografia e micro-interações |

---

## Resumo Executivo

O **Standard API** é uma plataforma SaaS API-first para assessments de segurança, conformidade e maturidade baseados no **Secure Controls Framework (SCF)**.

### Stack
- **Runtime:** Cloudflare Workers (API Gateway, Ingestion, Queues, Workflows)
- **Banco:** Neon PostgreSQL (Drizzle ORM)
- **Auth:** Better Auth + Neon Auth + Google OAuth
- **Frontend:** React 19 + Vite 8 (Cloudflare Pages)
- **IA:** Council Orchestrator com agentes especializados (Evidence Evaluator, POAM Architect, Board Translator)

### Pontos Fortes
- Arquitetura madura para Phase 0
- Multi-tenancy rigoroso (`tenant_id` + `organization_id`)
- Schema validation obrigatória (Zod) para outputs de agentes
- Pipeline RAG assíncrono com Queues
- 4 approval gates no lifecycle

### Dívida Técnica Conhecida
- Drizzle bridge (`asDb` casting manual)
- Workflows parcialmente implementados
- OCR dependente de serviço externo
- Audit logs síncronos em caminhos críticos

---

> 📁 Configuração Reversa: [`.reversa/`](../.reversa/)
> 📊 Plano original: [`.reversa/plan.md`](../.reversa/plan.md)
