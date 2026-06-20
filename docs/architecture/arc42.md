# Documento de Arquitetura (Arc42) - Standard API

## 1. Introdução e Objetivos
A **Standard API** é uma plataforma SaaS API-first desenhada para orquestrar Assessments de GRC (Governança, Risco e Conformidade) utilizando um modelo de automação baseada em Inteligência Artificial Agêntica. O objetivo é cruzar a base de conhecimento (evidências) de uma empresa contra milhares de controles normativos (SCF, NIST, ISO) de forma transitiva e segura.

**Stakeholders principais:** 
- CTOs/CISOs consumindo a API.
- Plataformas terceiras integrando via Model Context Protocol (MCP).
- Auditores de conformidade (revisão Human-In-The-Loop).

## 2. Restrições de Arquitetura
1. **Cloudflare-Native:** Todo código lógico deve rodar na Cloudflare (Workers, Workflows, Queues, R2). Nenhum container Docker monolítico em runtime.
2. **Neon Serverless PostgreSQL:** O banco transacional relacional é o Neon. Devido ao ambiente Edge, o acesso se dá via driver nativo sobre WebSockets/Fetch com Drizzle ORM.
3. **Multi-Organization Mandatório:** O sistema *não possui* conceito de "tenant" abstrato sem vínculo. O isolamento é estrito via `organization_id` no código e banco.
4. **Agentic API-First:** A UI (apps/web) é burra. Todas as regras de negócio de IA e validações de compliance ocorrem exclusivamente no backend.

## 3. Escopo e Contexto
O sistema interage com as seguintes entidades externas:
- **Client SaaS:** Consome os endpoints REST autônomos.
- **Agent Desktop (ex: Claude/Cursor):** Consome a API nativa de ferramentas B2B via servidor `mcp-server`.
- **Neon Cloud DB:** Armazena o Ledger (Assessment Pipeline e IAM).
- **LLMs (OpenAI, Anthropic):** Consumidos através do AI Gateway da Cloudflare para processamento inteligente.

## 4. Estratégia de Solução
A plataforma utiliza o padrão de **Máquina de Estados Durável**. Os ciclos de GRC (Ingestão de Documentos -> Scope -> SoA -> Gap Analysis -> Maturity -> POA&M) são eventos assíncronos isolados. O motor central usa a base STRM (Standardized Transitive Relationship Matrix) para garantir que IAs não alucinem em "peso" de controles, calculando a matemática da conformidade via cruzamento de grafos relacionais e não por mera proporção de "sucesso".

## 5. Visão de Blocos (Building Block View)
1. **API Gateway (`apps/api-gateway`)**: Worker principal, BFF e validação Zod OpenAPI. Exposição de API Keys e M2M.
2. **Workers Assíncronos (`workers/`)**: Processadores de Queues e Workflows que evitam sobrecarga HTTP.
3. **Packages Core (`packages/`)**:
   - `scf-core`: O Catálogo Normativo Imutável.
   - `assessment-engine`: Core logic de compliance e matemática STRM.
   - `agent-runtime`: Motor de controle das respostas dos LLMs (validação de schemas antes de aceitar achados).
   - `reporting`: Exportação legal (Ledger Append-only).

*(Veja [`PLATFORM_CAPABILITIES.md`](./PLATFORM_CAPABILITIES.md) para documentação atômica dos domínios).*

## 6. Visão de Runtime
- **Fluxos Assíncronos (Ex: Ingestão de PDF):** O Cliente faz POST do arquivo; a API Gateway faz upload do buffer para o Storage R2 e retorna um `202 Accepted` com um `trace_id`. A *Queue* de ingestão roda em background consumindo o PDF e extraindo os "Chunks" (vetores) para o Vectorize.
- **Integração MCP:** A IA do Cliente bate no endpoint `/mcp`. A API valida o `Bearer Token`, roteia a intent localmente na API e despacha a requisição de contexto pesado assincronamente (Queue), retornando ao cliente externo um sinalizador de status da tool executada.

## 7. Visão de Implantação (Deployment)
- **Edge Layer:** Hospedado via **Cloudflare Pages** (Frontend apps/web) e **Cloudflare Workers** (API e Processos Assíncronos).
- **Data Layer:** 
  - Estruturado: Neon PostgreSQL provisionado nas regiões core B2B.
  - Não-Estruturado (Evidências e Logs): Cloudflare R2.
  - Vetorial (Embeddings RAG): Cloudflare Vectorize.

## 8. Conceitos Transversais (Cross-cutting)
- **Autenticação:** Baseada no Better-Auth customizado. Tokens Live/Test para M2M e Session Cookies para o dashboard.
- **Auditabilidade (Append-Only):** Alterações nas notas de maturidade de controles NUNCA dão `UPDATE` na linha. Gravam novas linhas na `assessment_control_events` para o Ledger legal não ser quebrado.
- **RAG Controlado:** O Vectorize é estritamente usado como "Recuperação de Evidência", nunca como oráculo de validação (isso cabe ao `scf-core`).

## 9. Decisões de Arquitetura (ADRs)
- `ADR-001` - Algoritmo STRM baseado em NIST IR 8477.
- `ADR-002` - Ledger Append-Only. Não uso de DELETE/UPDATE em tabelas vitais de assessment.
- `ADR-003` - MCP Assíncrono para agentes pesados via `AGENT_RUN_QUEUE`.

## 10. Requisitos de Qualidade
- **Segurança B2B:** Nenhuma requisição transita sem validação da propriedade multi-org (Tenant Filter forçado nas consultas do ORM Drizzle).
- **Alta Disponibilidade:** Separação do tráfego web do tráfego intenso de AI Inference usando Workflows.
- **Isolamento de Cache:** O `KV` nunca mescla metadados de duas organizações diferentes.

### Defesa em Profundidade (SOC 2 / ISO 27001 Posture)
A plataforma é projetada com as seguintes defesas arquiteturais intransponíveis para auditorias Tier-1:
1. **Ledger Defense (Separação de Funções):** O `Append-Only Ledger` não confia no ORM (Typescript). Possui Triggers nativos no PostgreSQL bloqueando `UPDATE/DELETE` na tabela `assessment_control_events`. Nenhuma mutação humana direta no banco é aceita sem gerar alarmes de violação.
2. **RAG Cross-Tenant Leak Prevention:** A limitação de isolamento em namespaces de índice vetorial é contornada com *Tenant-Key Encryption*. O texto no Vectorize repousa criptografado com chaves únicas por organização. Vazamentos lógicos de vetores por bugs de filtro resultam em lixo decifrado no tenant de destino.
3. **API Keys Zero-Knowledge:** A aplicação armazena e cacheia no `KV` exclusivamente hashes `SHA-256` irreversíveis das API Keys dos clientes M2M. Um vazamento do banco expõe apenas artefatos inofensivos em Plaintext.
4. **Network Access Boundaries:** Acesso à porta TCP 5432 do banco relacional Neon é fechado de forma autoritária por *IP Allowlisting*, transitando exclusivamente por túneis do Cloudflare Hyperdrive, barrando acesso do DBA de forma não autorizada pela internet pública.

## 11. Riscos e Dívida Técnica
- **Avanço LLMs vs Gateway Limits:** A Cloudflare impõe limite de timeout de requisição. Ferramentas que travam o processador aguardando a resposta longa da Anthropic/OpenAI precisam de roteamento assíncrono.
- **Tamanho do Banco SCF:** Tabelas normativas com 32 mil requisitos e 15 mil mapeamentos exigem cursores de paginação rígidos (Keyset Pagination) para não travar conexões serverless.

## 12. Glossário
- **SCF (Secure Controls Framework):** Metamodelo de controles que serve de bússola para o mapeamento da plataforma.
- **STRM:** Relações Transitivas Padronizadas.
- **SoA (Statement of Applicability):** Declaração documentada dos controles aplicáveis ou não-aplicáveis.
- **RoPA:** Registro de Atividades de Tratamento (Privacidade de Dados).
- **HITL (Human-In-The-Loop):** Portão obrigatório onde a aprovação de IA requer carimbo de auditor humano.
