# Master Roadmap to Production

> [!WARNING]
> **[SUPERSEDED]** Este documento foi substituído pelo `ROADMAP.md` na raiz do projeto. Não atualizar aqui.

> **Visão Geral:** Este documento consolida todo o "Backlog", "Pendências Locais" e "Gaps do release-candidate" anteriores num épico orientativo direto ao lançamento oficial do Standard em ambiente Live (Cloudflare SaaS-ready).

## Trilha 1: Infraestrutura Real (Cloudflare & Persistência)
*Foco primário antes da abertura orgânica do tráfego*

- [x] **Estratégia Final de Storage Físico:** R2 provisionado com buckets `standard-documents-prod` e `standard-exports-prod`. Backup script `scripts/backup-r2.mjs` operacional.
- [x] **Estratégia de PostgreSQL Gerenciado:** Neon PostgreSQL com drizzle-orm, 8 tabelas Standard Native Auth + domain tables + 4 tabelas observability migradas.
- [ ] **Cloudflare Assíncrono Real:** Provisionar filas reais (Queues), Vectorize Workspaces separados por Tenant/Subdomain e aplicar o Workflow durável via nuvem em vez do simulador dev.
- [x] **Provedor de Auth (Staging/Production):** Standard Native Auth integrado com session cookies, Google OAuth, API keys e organization-based tenancy.

## Trilha 2: Core Funcional & Assessments (Standard Lifecycle)
*Adições mandatórias que faltam no produto-base SaaS*

- [ ] **Pacote de Maturidade:** Arquitetar em base de código e validar o pacote `packages/maturity` (Assessment Engine final gate).
- [ ] **Reporting DOCX/PDF:** Substituir o dummy code atual e gerar saídas estáticas finais auditáveis baseadas no json aprovado em reporting.
- [ ] **Conectores Externos:** Desenhar como os conectores third-party se conectarão à nossa Engine do SCF (Ex: Ingestão passiva de Cloud scanners).

## Trilha 3: Governança, AppSec & Hardening 
*Defesa de negócio e escalabilidade multi-tenant*

- [x] **Rate Limiting & Quotas Comerciais:** KV namespace `STANDARD_CACHE` provisionado. Rate limiting ativo no API Gateway.
- [ ] **Anti-Malware Binding:** Garantir scan as-a-service em todos os anexos injetados por usuários antes do storage no R2.
- [x] **Retenção & Data Residency:** Política de retenção documentada em `docs/operations/data-retention-policy.md` com legal holds.
- [x] **Logs de Auditoria em LongTerm:** Tabelas `security_events`, `operational_metrics`, `usage_records`, `agent_usage_records` persistidas em PostgreSQL.

## Trilha 4: IA & Modelos Agênticos
*Desvincular o pipeline simulado da verdadeira AGI*

- [x] **Prompts e Governança LLM Live:** `CloudflareAiGatewayAdapter` integrado com AI Gateway para observabilidade e rate limiting de chamadas LLM.
- [ ] **Taxa de Segurança / Prompt Injection:** Garantir validação em camadas para impedir injeção direta de prompt no Standard Knowledge Steward.

