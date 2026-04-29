# Proposta Técnica Inicial

## Objetivo

O `aegis-api-standard` será um monorepo TypeScript para uma plataforma SaaS API-first que executa assessments baseados no Secure Controls Framework. A aplicação web é apenas consumidora da API; a lógica do ciclo de assessment pertence ao **Aegis Assessment Engine**.

Este repositório é a implementação API-first padrão do Aegis. Toda lógica reutilizável do assessment deve viver em serviços, pacotes e contratos de API, não no frontend.

## Identidade Canônica

- Repository name: `aegis-api-standard`
- Product name: `Aegis`
- Projeto: `aegis-api-standard`
- Produto: `Aegis`
- Núcleo: `Aegis Assessment Engine`
- Método: `Aegis SCF-Based Assessment Lifecycle`
- Arquitetura: `API-first / SaaS-ready / Cloudflare-oriented`
- Purpose: The `aegis-api-standard` repository contains the API-first standard implementation of the Aegis SCF-Based Assessment Lifecycle. It defines the reusable backend, schemas, workflows, workers, assessment engine, SCF data layer, KB integration and agent runtime rules used by the Aegis platform and future consumers.

## Estrutura de Diretórios

```text
aegis-api-standard/
├── AGENTS.md
├── apps/
│   ├── web/
│   └── api-gateway/
├── workers/
│   ├── workflows/
│   ├── queues/
│   └── ingestion/
├── packages/
│   ├── assessment-engine/
│   ├── scf-core/
│   ├── agent-runtime/
│   ├── document-ingestion/
│   ├── kb/
│   ├── schemas/
│   └── reporting/
├── infra/
│   ├── cloudflare/
│   └── docker/
├── docs/
│   ├── architecture/
│   ├── api/
│   ├── agents/
│   └── decisions/
└── evals/
    ├── fixtures/
    └── golden-outputs/
```

## Módulos Principais

- `apps/web`: frontend em Cloudflare Pages. Deve consumir contratos públicos da API e nunca duplicar lógica do assessment engine.
- `apps/api-gateway`: API gateway/BFF em Cloudflare Workers. Recebe chamadas HTTP, autentica, valida autorização, grava comandos transacionais e dispara workflows/queues. Não executa análise pesada.
- `workers/workflows`: orquestração durável do Aegis SCF-Based Assessment Lifecycle. Controla estados, retries, checkpoints e esperas por aprovação humana.
- `workers/queues`: processamento assíncrono via Cloudflare Queues. Responsável por jobs longos, retries e DLQ.
- `workers/ingestion`: worker dedicado para ingestão, extração, chunking e vetorização.
- `packages/assessment-engine`: entidades, invariantes e regras centrais independentes de Cloudflare, banco ou UI.
- `packages/scf-core`: futura fonte normativa estruturada do SCF. Vector search não substitui este catálogo.
- `packages/agent-runtime`: contratos de execução, rastreabilidade e governança para agentes futuros.
- `packages/document-ingestion`: procedimentos reutilizáveis para documentos, evidências e normalização.
- `packages/kb`: abstrações de Knowledge Base, chunks e integração vetorial auxiliar.
- `packages/schemas`: tipos, estados, DTOs e eventos compartilhados entre API, workflows, filas e frontend.
- `packages/reporting`: contratos de Gap Analysis, Maturity Assessment, POA&M e relatórios.
- `infra/cloudflare`: configuração e notas operacionais dos recursos Cloudflare.
- `infra/docker`: Docker Compose e inicialização local.

## Decisão de Execução por Camada

| Responsabilidade | Local |
| --- | --- |
| UI e fluxos humanos | Cloudflare Pages |
| API pública, BFF, autenticação, autorização, roteamento | Cloudflare Workers |
| Orquestração durável do lifecycle | Cloudflare Workflows |
| Extração, normalização, chunking, embedding, relatórios | Cloudflare Queues + Workers consumers |
| Documentos, evidências e relatórios | Cloudflare R2 |
| Knowledge Base semântica auxiliar | Cloudflare Vectorize |
| Observabilidade, rate limit e controle de chamadas LLM | Cloudflare AI Gateway |
| Dados transacionais críticos | PostgreSQL gerenciado externo |
| Flags, cache, metadados leves | KV ou D1, apenas quando fizer sentido |

## Princípios de Dados e Rastreabilidade

Todo achado deve carregar:

- `assessment_id`
- `tenant_id`
- `scf_version`
- `framework_id`
- `control_id`
- `evidence_id`
- `agent_run_id`
- `confidence`

Ausência de evidência deve ser registrada como `not_evidenced`, nunca como ausência de implementação.

## Estados do Lifecycle

Os estados canônicos estão em `docs/architecture/assessment-lifecycle.md` e no pacote `@aegis/schemas`.

## Contratos de API

O contrato inicial está em `docs/api/openapi.yaml`. A primeira versão prioriza:

- criação de assessment;
- upload controlado de documentos;
- seleção de framework;
- aprovação humana de SoA, Gap Analysis, Maturity Assessment e POA&M;
- consulta de achados, evidências e estado.

## Agentes do Aegis

Nesta fase não há código de agente LLM. Os agentes são papéis arquiteturais a serem implementados depois:

- **Document Ingestion Agent**: extrai texto e metadados de documentos enviados.
- **Evidence Normalization Agent**: normaliza evidências e preserva origem/rastreabilidade.
- **SCF Preliminary Analysis Agent**: compara evidências contra controles globais do SCF sem decidir aplicabilidade final.
- **Scope & SoA Agent**: propõe escopo e Statement of Applicability para aprovação humana.
- **Gap Analysis Agent**: identifica lacunas com base em documentos, SCF estruturado e SoA aprovado.
- **Maturity Assessment Agent**: avalia maturidade contra framework escolhido.
- **POA&M Agent**: propõe plano de ação e milestones de remediação.
- **Traceability Auditor Agent**: verifica se achados têm IDs, evidências, versão SCF e confiança.

## Skills e Procedimentos Reutilizáveis

- **SCF Control Mapping Procedure**: sempre consultar o catálogo estruturado antes de usar Vectorize.
- **Evidence Qualification Procedure**: diferenciar evidência direta, indireta, contraditória e não evidenciada.
- **Human Approval Gate Procedure**: bloquear conclusão de SoA, Gap Analysis, Maturity e POA&M sem aprovação humana.
- **Traceability Enforcement Procedure**: rejeitar achados sem contexto completo.
- **LLM Call Governance Procedure**: toda chamada LLM deve passar pelo AI Gateway com metadados de tenant, assessment e agent run.
- **Tenant Isolation Procedure**: filtrar dados por `tenant_id` em PostgreSQL, R2 keys, Vectorize namespaces e logs.

## Decisões Iniciais

1. PostgreSQL externo é a fonte transacional para assessments, tenants, evidências, aprovações e achados.
2. R2 armazena documentos e relatórios; o banco guarda metadados e ponteiros.
3. Vectorize é auxiliar para busca semântica e RAG, não fonte normativa.
4. Workflows governam o lifecycle e estados, não o frontend.
5. Queues isolam processamento pesado e permitem retry/DLQ.
6. A primeira versão não implementa agentes LLM nem integra dados reais.

## Riscos Técnicos

- Limites e maturidade operacional de Workflows/Vectorize devem ser validados com provas de carga.
- Mapeamentos SCF exigem controle de versão rigoroso para evitar drift normativo.
- Multi-tenancy precisa ser testada desde o primeiro milestone.
- Extração de documentos pode gerar falsos negativos; por isso o status `not_evidenced` é obrigatório.
- Custos de LLM e embeddings podem crescer rápido sem AI Gateway, cache e quotas por tenant.

## Decisões em Aberto

- Provedor de autenticação e modelo de RBAC/ABAC.
- ORM ou query builder para PostgreSQL.
- Formato oficial de importação do SCF estruturado.
- Estratégia de criptografia por tenant para objetos sensíveis em R2.
- Modelo de maturidade inicial por framework.
- Critérios de confidence e calibração humana.
