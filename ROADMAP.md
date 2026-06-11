# Roadmap

> Este é o documento central de fases e milestones do Standard.

## Fases

### Fase 0: Foundation ✅ COMPLETE

**Objetivo**: Estabelecer a fundação do monorepo, infraestrutura e autenticação.

**Entregues**:
- [x] Monorepo com pnpm workspaces e estrutura `packages/` + `apps/` + `workers/`
- [x] Cloudflare Workers como runtime principal (Hono API gateway)
- [x] Neon PostgreSQL como banco transacional com driver `@neondatabase/serverless`
- [x] Drizzle ORM com migrations, schema e type-safe queries
- [x] better-auth para autenticação (Standard Native Auth)
- [x] SCF core data layer (`packages/scf-core`) com XLSX importer e catálogo estruturado
- [x] RBAC com roles (platform_admin, org_admin, assessor, viewer) e permissões granulares
- [x] Ambientes local, staging e production separados
- [x] ADRs retroativos registrados

---

### Fase 1: Assessment Engine ✅ COMPLETE

**Objetivo**: Implementar o lifecycle completo de assessments SCF end-to-end.

**Entregues**:
- [x] Assessment lifecycle state machine (27 estados)
- [x] SoA drafting e lifecycle (draft → review → approval)
- [x] Gap Analysis engine com findings por controle
- [x] Maturity Assessment com SCR-CMM L0–L5 scoring
- [x] POA&M draft, priorização e lifecycle
- [x] Rejection/rework loops (transições de volta)
- [x] Immutability enforcement em artefatos aprovados
- [x] Reprocessamento com rastreabilidade (motivo, versão anterior, ator)
- [x] Human approval gates para SoA, Gap Analysis, Maturity e POA&M

---

### Fase 2: AI Agents ✅ COMPLETE

**Objetivo**: Integrar IA agêntica ao assessment lifecycle com rastreabilidade e governança.

**Entregues**:
- [x] MCP Server remoto em `POST /mcp` (MCP 2025-03-26, Streamable HTTP)
- [x] Agent runtime com Council pattern (`packages/agent-runtime`)
- [x] Knowledge Base e RAG (`packages/kb`) com Vectorize e recuperação semântica
- [x] Document ingestion pipeline (`packages/document-ingestion`, `workers/ingestion`)
- [x] AI Gateway para observabilidade, rate limiting e governança de chamadas LLM
- [x] Async MCP dispatch pattern (202 + KV polling) — ADR-003
- [x] 32+ MCP tools expostas (Assessment, SCF Catalog, Intelligence, KB, Gap, SoA, Platform)
- [x] Agent output schema validation e guardrails
- [x] `agent_runs` com trace, model, prompt_version, input/output hash

---

### Fase 3: Production Hardening 🔧 IN PROGRESS

**Objetivo**: Endurecer segurança, performance e integridade para produção.

**Concluídos**:
- [x] STRM weights algorithm (ADR-001 — NIST IR 8477)
- [x] Ledger append-only para `assessment_control_events` (ADR-002)
- [x] Cursor-based pagination em list endpoints
- [x] AI token quota com 429 rate limiting por organization
- [x] Security hardening (auth, RBAC, organization isolation, audit logs)
- [x] TPRA tools no MCP (tpra-vendor-risk, tpra-assessment, tpra-risk-score)
- [x] MCP resources/list, resources/read, prompts/list, prompts/get (JSON-RPC)

**Próximos**:
- [x] Sparse fields selection em API responses
- [x] STRM relationship_type filter em endpoints SCF
- [x] API Key caching via KV com TTL (eliminar query Neon por request — IMPLEMENTATION-CONSTRAINTS.md)
- [ ] Contract tests para endpoints compartilhados
- [ ] Regression tests para agent outputs

---

### Fase 4: Scale & Compliance 📋 PLANNED

**Objetivo**: Escalar a plataforma para multi-region e completar integrações avançadas.

**Planejado**:
- [ ] TPRA ↔ SoA integration (Third-Party Risk Assessment vinculado ao SoA)
- [ ] `pg_partman` automation para particionamento de tabelas de alto volume
- [ ] Auth containment (ADR-015 — isolamento e limites de sessão)
- [ ] Multi-region deployment (Cloudflare edge + PostgreSQL read replicas)
- [ ] Custom domains via Cloudflare for SaaS
- [ ] SOC/SIEM integration (pelo menos logging estruturado)
- [ ] DOCX/PDF renderer para relatórios exportáveis
- [ ] Production go-live checklist executado
- [ ] Primeiro organization real onboarded

---

## Decisões de Sequência

- Fase 3 é a prioridade ativa; itens são executados incrementalmente
- Fase 4 é bloqueada pela conclusão dos itens críticos da Fase 3
- ADRs em `docs/decisions/` documentam decisões arquiteturais por fase
- Anti-padrões ativos documentados em `docs/decisions/IMPLEMENTATION-CONSTRAINTS.md`
