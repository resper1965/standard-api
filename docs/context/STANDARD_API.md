# STANDARD_API — Contexto de Arquitetura

> **Produto:** Standard
> **Repositório:** `standard-api-standard`
> **Última atualização:** 2026-06-05
> **Status:** Documento normativo de arquitetura atual

---

## Visão Geral

Standard é uma plataforma SaaS API-first para executar assessments de segurança, conformidade e maturidade com base no **Secure Controls Framework (SCF)**. O núcleo é o **Standard Assessment Engine**, executado via o **Standard SCF-Based Assessment Lifecycle**.

O modelo agêntico — **Standard SCF Agentic Assessment Model** — coordena agentes especializados sob orquestração controlada: rastreabilidade obrigatória, validação de schema, controle de escopo e aprovação humana em cada gate crítico.

Todo comportamento de valor está na API. O frontend é apenas um consumidor. Integrações externas, automações e outros clientes consomem os mesmos contratos.

---

## Stack Técnico

| Camada | Tecnologia |
|---|---|
| API Gateway | Cloudflare Workers (roteamento via `RouteDefinition`); helpers em `app-helpers.ts` e `index-helpers.ts` |
| Auth | Standard Native Auth 1.6.11 — Drizzle adapter, plugin `organization`, plugin `admin` |
| Banco transacional | Neon PostgreSQL via Drizzle ORM |
| Storage | Cloudflare R2 (documentos de cliente, evidências, artefatos, relatórios) |
| Filas | Cloudflare Queues (processamento assíncrono, ingestão, fan-out) |
| Workflows | Cloudflare Workflows (orquestração durável, retries, approval gates) |
| Vetores | Cloudflare Vectorize (KB semântica, recuperação de evidências) |
| SCF Core | `packages/scf-core` + `packages/scf-catalog` — 1.468 controles, fonte normativa |
| Observability | `packages/observability` — `StructuredLogger`, `MetricsService` (janela 1h) |
| Schemas compartilhados | `packages/schemas` — contratos TypeScript estrito para toda a API |
| Assessment Engine | `packages/assessment-engine` — regras do lifecycle isoladas de UI; prerequisite lookup table declarativo |

---

## Endpoints Principais

Todos os endpoints de aplicação seguem o prefixo `/api/v1`. O Standard Native Auth opera em `/api/auth/*`.

### Health

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/health` | Saúde básica com DB probe |
| `GET` | `/api/v1/health` | Saúde operacional com métricas (janela 1h) |
| `GET` | `/api/health/auth` | Saúde do stack Standard Native Auth (DB + latência) — retorna 200 ou 503 |

### Auth

| Prefixo | Descrição |
|---|---|
| `/api/auth/*` | Standard Native Auth — sign-in, sign-up, session, organization, admin |

### Assessments e Lifecycle

| Prefixo | Descrição |
|---|---|
| `/api/v1/assessments/*` | CRUD de assessments |
| `/api/v1/assessments/:id/lifecycle/*` | Transições de estado com approval gates |
| `/api/v1/assessments/:id/documents/*` | Upload e gestão de evidências |
| `/api/v1/assessments/:id/scope/*` | Escopo do assessment |
| `/api/v1/assessments/:id/soa/*` | Statement of Applicability (SoA) |
| `/api/v1/assessments/:id/gap-analysis/*` | Gap Analysis — persiste findings por organization/assessment |
| `/api/v1/assessments/:id/maturity/*` | Maturity Assessment |
| `/api/v1/assessments/:id/poam/*` | Plan of Action & Milestones (POA&M) |
| `/api/v1/assessments/:id/reports/*` | Relatórios gerados e aprovados |

### SCF, Organizações e Infraestrutura

| Prefixo | Descrição |
|---|---|
| `/api/v1/scf/*` | SCF Catalog — controles, frameworks, crosswalks |
| `/api/v1/organizations/*` | Gestão de organizações multi-organization |
| `/api/v1/api-keys/*` | API Keys M2M |
| `/api/v1/observability/*` | Audit logs e métricas operacionais |

---

## Princípios Arquiteturais

### API-first
Todo valor reutilizável existe como API, serviço, pacote ou contrato. Frontend, integrações e automações são consumidores — nunca fontes de lógica crítica.

### Declarative-first patterns
Prerequisites (assessment-engine), council agent routing (agent-runtime) e validation rules (gap-analysis, poam) usam tabelas/mapas declarativos em vez de cadeias imperativas. Isso reduz complexidade ciclomática e facilita adição de novas regras sem alterar lógica de controle.

### Multi-tenancy por design
Nenhum fluxo crítico sem `organization_id`, `organization_id` e `assessment_id`. Isolamento preservado em banco, storage (R2 keys), Vectorize namespaces, cache e logs.

### Approval gates obrigatórios
Os seguintes artefatos só são finalizados após aprovação humana explícita:
- Statement of Applicability (SoA)
- Gap Analysis
- Maturity Assessment
- POA&M

Workflows Cloudflare controlam todas as transições duráveis. O frontend nunca muda estado diretamente.

### SCF como fonte normativa
`packages/scf-core` e `packages/scf-catalog` são a única fonte de verdade para controles, frameworks e crosswalks. Mappings só existem quando presentes na base SCF estruturada e versionada. Crosswalks inventados são proibidos.

### KB é evidência — não autoridade
A Knowledge Base (Vectorize) armazena evidências do cliente. RAG apoia recuperação semântica. Nunca substitui SCF estruturado, mappings oficiais, schemas ou approval gates. Ausência de evidência é registrada como `não evidenciado` — nunca inferida como ausência de implementação.

### Agents sugerem — humanos aprovam
Agentes LLM podem sugerir, classificar e propor. Não gravam achados finais diretamente. Todo output de agente passa por schema validation antes de persistência. Registra-se: `agent_run_id`, model, `prompt_version`, `input_hash`, `output_hash`, confidence e `trace_id`.

### Cloudflare-oriented com PostgreSQL transacional externo
Workers para API gateway, autenticação, autorização e validação. Workflows para orquestração durável. Queues para processamento assíncrono. R2 para artefatos. Vectorize para recuperação semântica. **PostgreSQL (Neon) é a fonte transacional crítica** para assessments, findings, audit logs, approvals e estado persistente — não substituível por D1/KV sem decisão formal.

---

## Estados do Lifecycle

Os estados mínimos suportados pelo assessment lifecycle são:

`draft` → `documents_uploaded` → `documents_ingested` → `scf_pre_analysis_ready` → `framework_selected` → `scope_drafted` → `soa_drafted` → `soa_under_review` → `soa_approved` → `soa_ingested` → `evidence_analysis_ready` → `gap_analysis_drafted` → `gap_analysis_under_review` → `gap_analysis_approved` → `maturity_assessed` → `maturity_under_review` → `maturity_approved` → `poam_drafted` → `poam_under_review` → `poam_approved` → `report_generated` → `closed`

Estados terminais adicionais: `archived`, `cancelled`, `failed`, `blocked`.

---

## Agentes Funcionais

| Agente | Escopo |
|---|---|
| Standard Knowledge Steward | Organiza KB e evidências; não decide compliance |
| Standard SCF Control Analyst | Analisa controles; não cria mappings ausentes |
| Standard Framework Mapper | Consulta mappings SCF; não inventa crosswalks |
| Standard Scope & SoA Architect | Propõe escopo/SoA; não finaliza sem aprovação humana |
| Standard Evidence Analyst | Classifica evidências; não transforma ausência em falha |
| Standard Gap Analyst | Propõe gaps; não grava Gap Analysis sem schema validation e aprovação |
| Standard Maturity Assessor | Sugere maturidade; não finaliza sem approval gate |
| Standard POA&M Planner | Propõe atividades; não publica sem aprovação |
| Standard Assessment Report Writer | Monta relatórios; não altera achados finais |

---

## Referências Internas

| Recurso | Localização |
|---|---|
| Regras gerais do agente | `AGENTS.md` (raiz) |
| Schemas compartilhados | `packages/schemas/` |
| Assessment Engine | `packages/assessment-engine/` |
| SCF Core (normativo) | `packages/scf-core/`, `packages/scf-catalog/` |
| Observability | `packages/observability/` |
| Contratos de API | `docs/api/openapi.yaml` |
| Decisões arquiteturais | `docs/decisions/` (ADRs) |
| Fixtures de teste | `evals/fixtures/` (dados sintéticos) |
| Golden outputs | `evals/golden-outputs/` |
| Configuração Cloudflare | `infra/cloudflare/` |
| Docker local | `infra/docker/docker-compose.yml` |

---

> Este documento descreve a arquitetura **atual** do Standard. Referências a "Aegis", "V2", "Prisma", ou endpoints stateless não persistentes são obsoletas e não devem ser usadas como base de implementação.
