# Master Roadmap to Production

> [!WARNING]
> **[SUPERSEDED]** Este documento foi substituído pelo `ROADMAP.md` na raiz do projeto. Não atualizar aqui.

> **Visão Geral:** Este documento consolida todo o "Backlog", "Pendências Locais" e "Gaps do release-candidate" anteriores num épico orientativo direto ao lançamento oficial do Standard em ambiente Live (Cloudflare SaaS-ready).

## Trilha 1: Infraestrutura Real (Cloudflare & Persistência)
*Foco primário antes da abertura orgânica do tráfego*

- [ ] **Estratégia Final de Storage Físico:** Provisionar efetivamente os adaptadores R2 para a guarda real e persistente das `evidências` de tenant. O MVP roda com filesystem in-memory mock.
- [x] **Estratégia de PostgreSQL Gerenciado:** ~~Avaliar provedores parceiros~~ → Neon PostgreSQL com drizzle-orm, 8 tabelas Better Auth + domain tables migradas.
- [ ] **Cloudflare Assíncrono Real:** Provisionar filas reais (Queues), Vectorize Workspaces separados por Tenant/Subdomain e aplicar o Workflow durável via nuvem em vez do simulador dev.
- [x] **Provedor de Auth (Staging/Production):** ~~Mudar os MockAuthProviders locais~~ → Better Auth integrado com session cookies, Google OAuth, API keys e organization-based tenancy.

## Trilha 2: Core Funcional & Assessments (Standard Lifecycle)
*Adições mandatórias que faltam no produto-base SaaS*

- [ ] **Pacote de Maturidade:** Arquitetar em base de código e validar o pacote `packages/maturity` (Assessment Engine final gate).
- [ ] **Reporting DOCX/PDF:** Substituir o dummy code atual e gerar saídas estáticas finais auditáveis baseadas no json aprovado em reporting.
- [ ] **Conectores Externos:** Desenhar como os conectores third-party se conectarão à nossa Engine do SCF (Ex: Ingestão passiva de Cloud scanners).

## Trilha 3: Governança, AppSec & Hardening 
*Defesa de negócio e escalabilidade multi-tenant*

- [ ] **Rate Limiting & Quotas Comerciais:** Implementar defesas técnicas de volume (API Gateway Limiters) e limitação de negócios (Quantas requisições IA o tenant contratou).
- [ ] **Anti-Malware Binding:** Garantir scan as-a-service em todos os anexos injetados por usuários antes do storage no R2.
- [ ] **Retenção & Data Residency:** Validar temporalidades (7 dias vs 5 anos) para Auditoria e definir se clientes precisam reter fisicamente vetores logados na UE ou US.
- [ ] **Logs de Auditoria em LongTerm:** Arquivá-los em Cold Storage em contraposição aos logs ephemeros de terminal.

## Trilha 4: IA & Modelos Agênticos
*Desvincular o pipeline simulado da verdadeira AGI*

- [ ] **Prompts e Governança LLM Live:** Trocar `MockLLMProvider` por integrações reais sob políticas de isolamento de tenant no Prompt Engine.
- [ ] **Taxa de Segurança / Prompt Injection:** Garantir validação em camadas para impedir injeção direta de prompt no Standard Knowledge Steward.

