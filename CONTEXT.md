# Project context: Standard API

## Current State

- **Phase:** Production / SaaS API Ready — `https://standard-api.bekaa.eu`
- **Version:** 2026.1 (SCF 2026.1, SCR-CMM 2026.1, SCR-RMM aligned)
- **Base Architecture:** Cloudflare-native monorepo + Neon PostgreSQL + Standard Native Auth v1.6.11

### Key Modules

| Module | Status | Notes |
|---|---|---|
| `api-gateway` | ✅ Production | 50 route files, ~400 endpoints, custom domain |
| `apps/web` | ✅ Production | Platform Console — orgs, users, API keys only |
| `packages/sdk` | ✅ v1.0.0 | `@standard/sdk` npm public, zero-dep |
| `assessment-workflow` | ✅ Production | Durable states via Cloudflare Workflows |
| `ingestion-worker` | ✅ Production | RAG pipeline R2 + Vectorize + Neon |
| `scf-core` | ✅ Production | SCF 2026.1 normative catalog |
| `assessment-engine` | ✅ Production | State machine + declarative lookup table |
| `agent-runtime` | ✅ Production | Council with dispatch map pattern |
| `gap-analysis` | ✅ Production | Declarative validation + ROC determination |
| `maturity` | ✅ Production | SCR-CMM scoring (L0–L5), domain breakdown |
| `poam` | ✅ Production | Declarative validation rules |
| `reporting` | ✅ Production | PDF/DOCX via Worker/R2 |
| `scf-catalog` (scf-data) | ✅ Production | 1,468 controls, 231 frameworks, 33 domains |
| `mcp-server` | ✅ Production | MCP endpoint at `/mcp`, docs at `/docs/mcp` |

### Codebase Health (Fallow 2026-06-05)

- Maintainability: **91.0**
- Avg cyclomatic complexity: **2.2**
- Refactoring targets remaining: **38**

---

## SCR-RMM & SCR-CMM Modules (2026-06-09)

Implementados nesta sprint:

| Feature | Schema | API | Migrations |
|---|---|---|---|
| Risk Register | `assessment_risk_register` | `POST/GET/PATCH/DELETE /api/v1/assessments/:id/risk-register` | 0043, 0044 |
| Risk Appetite Input (GRC-external) | `risk_appetite_input`, `risk_tolerance_input`, `risk_threshold_input`, `within_tolerance` | via risk-register body | 0044 |
| ROC Determination auto-calc | `roc_determination` em `gap_findings` | via gap-analysis PATCH | 0042 |
| Assessment Rigor (SCR-RMM Step 8) | `assurance_level` em `assessments` | via assessments POST/PATCH | 0042 |
| Assessment Method (SCR-CMM) | `assessment_method` em `maturity_scores` | via maturity scoring | 0045 |
| Maturity Domain Targets (SCR-CMM) | `maturity_domain_targets` JSONB em `assessments` | `PUT/GET /api/v1/assessments/:id/maturity-targets` | 0045 |
| SCF Risk Catalog API | `scf_risks`, `scf_risk_control_mappings` | `GET /api/v1/scf/risks[/:id]` | — |
| SCF Threat Catalog API | `scf_threats`, `scf_threat_control_mappings` | `GET /api/v1/scf/threats[/:id]` | — |

**Regra de design (ADR-014):**
- `risk_appetite`, `risk_tolerance`, `risk_threshold` são **inputs da aplicação consumidora** (GRC/frontend externo)
- O Standard **NÃO gerencia** risk appetite como configuração da plataforma
- `within_tolerance` é calculado deterministicamente: `residual_risk_score <= risk_tolerance_input`
- `null` quando `risk_tolerance_input` não for fornecido

---

## Workers em Produção (2026-06-09)

| Worker | URL / Trigger | Função |
|---|---|---|
| `standard-api-gateway-production` | `https://standard-api.bekaa.eu` | API REST, MCP, Auth, todas as rotas |
| `standard-workflows-production` | (internal) | Assessment Lifecycle + Council Orchestration |
| `standard-queues-production` | Cron domingo 02h | 6× consumers: ingestion, kb, report, agent, soc, user-lifecycle |
| `standard-ingestion-production` | Queue consumer | Document ingestion → R2 + Vectorize |
| `standard-kb-worker-production` | Queue consumer | KB embedding pipeline |
| `standard-reporting-worker-production` | Queue consumer | Report export PDF/DOCX |
| `standard-smoke-tester-production` | Cron `*/5 * * * *` | Healthcheck automatizado |

---

## Database Migrations — Estado atual (Neon Production)

| Migration | Conteúdo | Aplicada em |
|---|---|---|
| 0001–0039 | Base do projeto | Histórico |
| 0040 | SCF risks, threats, mappings | 2026-06 |
| 0041 | STRM relationships | 2026-06 |
| 0042 | ROC determination, assurance_level | 2026-06-09 |
| 0043 | `assessment_risk_register` table | 2026-06-09 |
| 0044 | Risk appetite inputs + `within_tolerance` | 2026-06-09 |
| 0045 | `assessment_method` enum + `maturity_domain_targets` | 2026-06-09 |

---

## Active Work / Backlog

- Redução dos 38 Fallow refactoring targets restantes
- ADR-AR-03 pendente: dual API key tables (`baApikey` + `apiKeys`) — decisão de consolidação pré-v1 GA
- ADR-AR-07: migração dual user system ainda em progresso
- GRC Dashboard (aplicação consumidora externa — fora deste repositório)

---

## Important Links

| Recurso | Link |
|---|---|
| API Produção | <https://standard-api.bekaa.eu> |
| Health Check | <https://standard-api.bekaa.eu/health> |
| OpenAPI Spec | <https://standard-api.bekaa.eu/docs/openapi.yaml> |
| Scalar Docs | <https://standard-api.bekaa.eu/docs> |
| MCP Docs | <https://standard-api.bekaa.eu/docs/mcp> |
| llms.txt | <https://standard-api.bekaa.eu/llms.txt> |
| llms-full.txt | <https://standard-api.bekaa.eu/llms-full.txt> |
| Arc42 | [docs/architecture/arc42.md](docs/architecture/arc42.md) |
| OpenAPI YAML | [docs/api/openapi.yaml](docs/api/openapi.yaml) |
| Data Model | [docs/architecture/data-model.md](docs/architecture/data-model.md) |
| API Reference | [docs/api/API_REFERENCE.md](docs/api/API_REFERENCE.md) |
| ADRs | [docs/decisions/](docs/decisions/) |
| Rules | [AGENTS.md](AGENTS.md) |

---

## Recent Decisions (2026-06-09)

- **SCR-RMM integration:** Risk Register API com GRC-external risk appetite strategy (ADR-014)
- **SCR-CMM alignment:** `assessment_method` (examine/interview/test) + maturity domain targets para spider chart
- **SCF Catalog API:** `/scf/risks` e `/scf/threats` expostos como catálogos globais consultáveis
- **Deploy completo em produção:** migrations 0042–0045 + 7 workers deployed em `standard-api.bekaa.eu`

## Older Decisions

- Use Cloudflare Workflows for both long-running Assessment Lifecycle and fast Agent Council loops.
- Adopt Neon for DB Branching to enable high-fidelity preview environments.
- Enforce strict tenancy isolation at the API Gateway level.
- Standard Native Auth v1.6.11 as authentication provider (ADR 0005).
- `apps/web` defined as API Platform Console, not GRC dashboard.
- Refactoring sprint 2026-06-05: declarative patterns, helper extraction, component decomposition.
