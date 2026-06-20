# Índice de Decisões

Este arquivo é o índice central de decisões arquiteturais e operacionais do Standard.

---

## ADRs Fundacionais (raiz `adr/`)

| # | Ficheiro | Decisão |
|---|----------|---------|
| F-001 | [`adr/0001-estrutura-base-do-projeto.md`](adr/0001-estrutura-base-do-projeto.md) | GitHub como fonte única de verdade para código, contexto, prompts e decisões |
| F-002 | [`adr/0002-colapsar-tenants-em-organizations.md`](adr/0002-colapsar-tenants-em-organizations.md) | Colapsar tenants em organizations — multi-tenancy simplificado |

---

## ADRs Plataforma (`docs/decisions/`)

### Arquitectura & Infra

| # | Ficheiro | Decisão | Status |
|---|----------|---------|--------|
| 0001 | [`0001-platform-boundaries.md`](docs/decisions/0001-platform-boundaries.md) | Limites de plataforma e responsabilidades | ✅ Accepted |
| 0002 | [`0002-neon-serverless-postgres.md`](docs/decisions/0002-neon-serverless-postgres.md) | Neon PostgreSQL como banco transacional gerenciado | ✅ Accepted |
| 0003 | [`0003-cloudflare-infra-automation.md`](docs/decisions/0003-cloudflare-infra-automation.md) | Automação de infraestrutura Cloudflare | ✅ Accepted |
| 0004 | [`0004-scf-data-source-of-truth.md`](docs/decisions/0004-scf-data-source-of-truth.md) | SCF como fonte de dados normativa | ✅ Accepted |
| 0005 | [`0005-standard-native-auth-identity-provider.md`](docs/decisions/0005-standard-native-auth-identity-provider.md) | Standard Native Auth (Edge Hash) como identity provider | ✅ Accepted |
| 0006 | [`0006-drizzle-orm.md`](docs/decisions/0006-drizzle-orm.md) | Drizzle ORM para PostgreSQL | ✅ Accepted |
| 0007 | [`0007-design-system-trust-authority.md`](docs/decisions/0007-design-system-trust-authority.md) | Design system "Trust & Authority" | ✅ Accepted |
| 0008 | [`0008-scf-official-xlsx-2026.md`](docs/decisions/0008-scf-official-xlsx-2026.md) | SCF Official XLSX 2026.1.1 como fonte de dados | ✅ Accepted |
| 0009 | [`0009-superpowers-sdlc.md`](docs/decisions/0009-superpowers-sdlc.md) | Superpowers SDLC como processo de desenvolvimento | ✅ Accepted |
| 0010 | [`adr-0010-discard-architecture-refactoring-branch.md`](docs/decisions/adr-0010-discard-architecture-refactoring-branch.md) | Descarte da branch `feature/architecture-refactoring` | ✅ Accepted |
| 0011 | [`0011-hitl-fully-headless.md`](docs/decisions/0011-hitl-fully-headless.md) | HITL é 100% no app do cliente; Standard é headless | ✅ Accepted |

### Segurança & Auth

| # | Ficheiro | Decisão | Status |
|---|----------|---------|--------|
| ADR-012 | [`ADR-012-xlsx-security-risk.md`](docs/decisions/ADR-012-xlsx-security-risk.md) | Risco de segurança do XLSX (prototype pollution) | ✅ Accepted |
| ADR-013 | [`ADR-013-wrangler-cve-dev-tool.md`](docs/decisions/ADR-013-wrangler-cve-dev-tool.md) | Wrangler CVE (dev-only, accepted risk) | ✅ Accepted |
| ADR-015 | [`ADR-015-better-auth-containment.md`](docs/decisions/ADR-015-better-auth-containment.md) | Contenção do better-auth via AuthRepository | ✅ Accepted |
| ADR-017 | [`ADR-017-auth-hardening-and-tenancy-link.md`](docs/decisions/ADR-017-auth-hardening-and-tenancy-link.md) | Hardening de Autenticação e Vinculação de Tenancy no SaaS 1:1 | ✅ Accepted |
| — | [`adr-auth-accepted-risks.md`](docs/decisions/adr-auth-accepted-risks.md) | Riscos aceites da autenticação Standard | ✅ Accepted |
| — | [`adr-auth-standard-native-auth-behaviors.md`](docs/decisions/adr-auth-standard-native-auth-behaviors.md) | Comportamentos nativos do Standard Auth | ✅ Accepted |
| — | [`adr-typescript-6.md`](docs/decisions/adr-typescript-6.md) | Adopção do TypeScript 6 | ✅ Accepted |

### Assessment Engine & SCF

| # | Ficheiro | Decisão | Status |
|---|----------|---------|--------|
| ADR-001 | [`ADR-001-strm-weights-algorithm.md`](docs/decisions/ADR-001-strm-weights-algorithm.md) | Algoritmo STRM Weights (NIST IR 8477) — **NÃO usar fórmula binária** | ✅ Critical |
| ADR-002 | [`ADR-002-ledger-append-only.md`](docs/decisions/ADR-002-ledger-append-only.md) | Ledger append-only — **NÃO fazer UPDATE** | ✅ Critical |
| ADR-003 | [`ADR-003-mcp-async-pattern.md`](docs/decisions/ADR-003-mcp-async-pattern.md) | MCP dispatch assíncrono — **NÃO despachar síncrono** | ✅ Critical |
| ADR-014 | [`ADR-014-scr-rmm-roc-summary.md`](docs/decisions/ADR-014-scr-rmm-roc-summary.md) | SCR-RMM/ROC compliance summary model | ✅ Accepted |
| ADR-016 | [`ADR-016-llamaparse-ingestion-fallback.md`](docs/decisions/ADR-016-llamaparse-ingestion-fallback.md) | Ingestão com LlamaParse e Fallback Híbrido | ✅ Accepted |

### Operacional

| Ficheiro | Descrição |
|----------|-----------|
| [`IMPLEMENTATION-CONSTRAINTS.md`](docs/decisions/IMPLEMENTATION-CONSTRAINTS.md) | **LEITURA OBRIGATÓRIA** — Anti-padrões activos e constraints de implementação |
| [`PARTITION-MAINTENANCE.md`](docs/decisions/PARTITION-MAINTENANCE.md) | Manutenção de partições PostgreSQL |
| [`adr-refactoring-sprint-2026-06-05.md`](docs/decisions/adr-refactoring-sprint-2026-06-05.md) | Sprint de refatoração — patterns declarativos |

---

## Como Registrar Nova Decisão

Crie um novo arquivo em `docs/decisions/` seguindo numeração incremental `ADR-NNN-titulo.md`:

Cada ADR deve registrar:

- status;
- contexto;
- decisão;
- consequências;
- alternativas consideradas;
- links para documentação relacionada.

## Regras

- Decisões não devem ficar apenas em chat, issue ou memória local.
- Decisões que afetam arquitetura, segurança, API, workflows, dados, agentes ou produção exigem ADR.
- Se uma decisão substituir outra, atualizar este índice e marcar a anterior como superseded.
