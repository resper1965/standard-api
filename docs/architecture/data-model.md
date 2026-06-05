# Modelo de Dados Transacional

Este documento descreve o modelo transacional consolidado para o Enterprise-Grade MVP do `standard-api-standard`. O PostgreSQL externo/gerenciado via Drizzle ORM é a fonte crítica e central para organizations, organizações, gestão unificada de Auth/RBAC, assessments, estado, aprovações, achados, versionamento, rastreabilidade e auditoria interativa dos agentes. R2 armazena objetos binários brutos; Vectorize armazena embeddings vetoriais de LLM; o PostgreSQL guarda metadados estruturados, chaves simétricas e logs transacionais.
## Visão Geral

O modelo foi organizado em domínios:

- Tenancy e Auth: O sistema adota rigorosamente a arquitetura 1:1 User=Tenant. `users`, `organizations`, `api_keys` consolidam identidades, cross-tenancy e tokens M2M.
- Assessment: `assessments`, `assessment_frameworks`, `assessment_events`, `approval_events`.
- Documentos e KB: `documents`, `document_versions`, `document_chunks`, `document_extraction_jobs`, `kb_entries`, `vector_references`.
- SCF estruturado: `scf_versions`, `scf_domains`, `scf_controls`, `scf_frameworks`, `scf_framework_requirements`, `scf_mappings`, `scf_strm_relationships`, `scf_control_metadata`.
- Escopo e SoA: `assessment_scope`, `soa_versions`, `soa_items`.
- Evidências: `evidence_findings`, `evidence_sources`.
- Gap Analysis: `gap_analysis_versions`, `gap_findings`.
- Maturidade: `maturity_assessment_versions`, `maturity_scores`.
- POA&M: `poam_versions`, `poam_items`.
- Agentes e rastreabilidade: `agent_runs`, `agent_decisions`, `agent_tool_calls`, `traceability_links`.
- Relatórios e auditoria: `report_versions`, `report_artifacts`, `audit_logs`.

Implementação:

- Drizzle schema: `packages/schemas/src/db/schema.ts`.
- Schemas Zod centrais: `packages/schemas/src/domain.ts`.
- Migrations iniciais e incrementais ficam em `infra/docker/postgres/migrations/`, incluindo `0006_gap_analysis_workflow.sql`, `0007_poam_workflow.sql` e `0008_reporting_export_workflow.sql` para Gap Analysis, POA&M e Reporting/Exports.
- Seed sintético: `infra/docker/postgres/seeds/0001_synthetic_seed.sql`.

## Relações Principais

```text
organization
  -> organizations
  -> users
  -> assessments
       -> assessment_frameworks -> scf_frameworks
       -> documents -> document_versions -> document_chunks
       -> document_chunks -> kb_entries -> vector_references
       -> assessment_scope
       -> soa_versions -> soa_items -> scf_controls / scf_framework_requirements
       -> evidence_findings -> evidence_sources -> document_chunks / soa_items
       -> gap_analysis_versions -> gap_findings -> evidence_findings / soa_items / scf_controls
       -> maturity_assessment_versions -> maturity_scores -> scf_controls
       -> poam_versions -> poam_items -> gap_findings
       -> report_versions -> report_artifacts
       -> agent_runs -> agent_decisions / agent_tool_calls
       -> assessment_events / approval_events / audit_logs / traceability_links

scf_versions
  -> scf_domains -> scf_controls
  -> scf_frameworks -> scf_framework_requirements
  -> scf_mappings -> scf_controls + scf_framework_requirements
  -> scf_strm_relationships
  -> scf_control_metadata
```

## Multi-Tenancy

Toda tabela com dados de cliente carrega `organization_id`. Entidades críticas do lifecycle carregam também `organization_id` e `assessment_id` quando aplicável. Isso inclui documentos, chunks, evidências, gaps, maturidade, POA&M, agent runs, relatórios, auditoria e links de rastreabilidade.

As tabelas SCF globais não possuem `organization_id`, porque representam base normativa compartilhada. Elas são versionadas por `scf_version_id`. O vínculo entre dados de cliente e base normativa acontece por IDs relacionais, como `scf_control_id`, `scf_framework_id` e `scf_framework_requirement_id`.

## Versionamento de Artefatos

Artefatos de assessment que podem ser revisados possuem tabelas versionadas:

- `soa_versions`
- `gap_analysis_versions`
- `maturity_assessment_versions`
- `poam_versions`
- `report_versions`

Cada tabela usa `version_number` e `status` controlado por `artifact_status`: `draft`, `under_review`, `approved`, `superseded`, `archived`. Artefatos aprovados devem ser tratados como imutáveis pela camada de aplicação; correções devem criar nova versão e marcar versões anteriores como `superseded` quando aplicável.

## Aprovação Humana

`approval_events` registra aprovações humanas para os gates obrigatórios: SoA, Gap Analysis, Maturity Assessment e POA&M. As versões aprováveis possuem `approval_event_id` opcional para apontar para a decisão humana. A primeira migration permite gravar drafts sem approval para suportar criação incremental.

## Rastreabilidade

`gap_findings` carrega diretamente os principais IDs de rastreabilidade:

- `organization_id`
- `organization_id`
- `assessment_id`
- `framework_requirement_id`
- `scf_control_id`
- `soa_item_id`
- `evidence_finding_id`
- `agent_run_id`
- `trace_id`

`poam_items` aponta para `related_gap_id`, `scf_control_id` e `framework_requirement_id`. `maturity_scores` aponta para `scf_control_id`; vínculos adicionais com gaps e evidências devem ser registrados em `traceability_links` para evitar tabelas de junção prematuras nesta primeira versão.

`traceability_links` permite registrar relações genéricas, como `gap_finding -> evidence_finding`, `poam_item -> gap_finding`, `maturity_score -> evidence_finding` ou `agent_decision -> gap_finding`, sempre com `trace_id` e metadados seguros.

## SCF Structured Data

O SCF estruturado é a fonte normativa. `scf_controls` pertence a `scf_versions` e `scf_domains`. `scf_framework_requirements` pertence a `scf_frameworks`. `scf_mappings` relaciona requirements oficiais a controles SCF usando IDs relacionais, nunca texto livre isolado.

Campos de relação STRM e mapping foram modelados como:

- `relationship_type`
- `relationship_strength`
- `mapping_rationale`
- `mapping_source`

O seed local usa apenas fixtures sintéticas e não deve ser interpretado como SCF real ou mapping oficial.

## Documentos, Chunks e Vectorize

`documents` registra metadados do arquivo: nome original, provider, chave de storage, hash, MIME type, tamanho, usuário de upload, classificação, tipo documental, data efetiva, label de versão e idioma. `document_versions` registra versões do objeto quando necessário. `document_chunks` registra índice do chunk, hash do texto, página/metadados de localização e contagem aproximada de tokens.

Vetores não são armazenados no PostgreSQL. `vector_references` guarda apenas `vector_provider`, `vector_index_name`, `vector_id`, `kb_entry_id` e metadados seguros. Para o alvo atual, o provider esperado é `cloudflare_vectorize`.

## Evidências, Gaps e Maturidade

`evidence_findings` diferencia `strong`, `partial`, `weak`, `absent` e `conflicting`. Ausência de evidência deve ser registrada como `not_evidenced`, não como `not_implemented`.

`gap_findings` possui status controlado: `met`, `partially_met`, `not_met`, `not_evidenced`, `not_applicable_justified`, `not_applicable_not_justified`, `requires_validation`. `gap_type` também é controlado para separar lacunas documentais, técnicas, governança, evidência e monitoramento.

`maturity_scores` suporta escala 0 a 5, `confidence_score`, `rationale` e `evidence_coverage`. A migration inclui checks de intervalo para score, confiança e cobertura.

## POA&M

`poam_versions` registra a versão do plano, status, Gap Analysis fonte, Maturity Assessment fonte quando disponível, framework, SCF version, aprovação humana, supersedência e metadados seguros de limitações.

`poam_items` registra ação corretiva, tipo de ação, prioridade, severidade, risk rating, esforço, owner sugerido ou papel responsável, data alvo, evidência esperada, critérios de aceitação, status e validação humana. Cada item aponta para `related_gap_finding_id` e preserva `soa_item_id`, `framework_requirement_id`, `scf_control_id`, `scf_domain_id`, `framework_id` e `scf_version_id` quando disponíveis.

`poam_milestones` registra marcos vinculados a cada item, com due date, status, evidência esperada e critério de aceite. `poam_dependencies` registra dependências entre itens do mesmo organization/assessment ou dependências externas descritas.

## Reporting e Exports

`report_versions` registra relatórios derivados, com tipo, status, título, versão, fontes aprovadas (`source_soa_version_id`, `source_gap_analysis_version_id`, `source_maturity_assessment_version_id`, `source_poam_version_id`), `framework_id`, `scf_version_id`, aprovação humana, supersedência, `trace_id` e metadados de limitações.

`report_artifacts` registra artefatos gerados em storage compatível com R2, incluindo `artifact_type`, `format`, provider/bucket/key, `content_hash`, tamanho, MIME type, timestamps e metadados seguros.

`export_jobs` registra pedidos de exportação estruturada, status assíncrono, formato solicitado, ator solicitante, erro seguro quando houver e `trace_id`.

## Agentes e Agent Runs

`agent_runs` registra metadados de execução: agente, versão, provider/modelo, prompt version, hashes de input/output, confiança, status, timestamps e `trace_id`. `agent_decisions` registra decisões, premissas, limitações, fontes e confiança. `agent_tool_calls` registra uso de tools com escopo de organization/assessment, risco, hashes de input/output, status e `trace_id`.

A rastreabilidade dos outputs dos LLMs já está ativamente capturada pela abstração `Repositories` da API Gateway e armazenada fielmente. Eventos de Agentes estão persistindo suas assinaturas de confiança.
## Decisões de Modelagem

- Drizzle ORM foi adotado por ser TypeScript-first, explícito e adequado ao monorepo.
- Zod foi adotado para contratos compartilhados e validação de entidades centrais.
- UUIDs foram usados para entidades principais por opacidade e operação distribuída.
- SCF global ficou fora de tenancy, mas sempre versionado por `scf_version_id`.
- Vectorize é referenciado por ponteiros, sem vetores no PostgreSQL.
- Versionamento foi aplicado a SoA, Gap Analysis, Maturity Assessment, POA&M e Reports.
- `traceability_links` foi incluída para relações cruzadas sem inflar a primeira versão com muitas tabelas de junção.
- Soft delete (`deleted_at`) foi incluído em entidades de negócio principais.
- Dados locais são sintéticos e marcados como tal.
- O enum transacional `assessment_state` foi alinhado aos estados do `Assessment Engine`; a migration `0002` converte nomes antigos para os novos estados canônicos.

## Decisões em Aberto

- Definir política de Row-Level Security no PostgreSQL ou isolamento por camada de serviço.
- Definir se IDs legíveis (`GAP-001`, `POAM-001`) serão sequenciais por assessment ou por versão de artefato.
- Definir estratégia formal para imutabilidade de artefatos aprovados: triggers no banco, regras de service layer ou ambos.
- Definir política de retenção e particionamento para `audit_logs`, `assessment_events` e `agent_runs`.
- Definir se `traceability_links` deve evoluir para tabelas de junção específicas conforme padrões de consulta reais.
- Definir pipeline real de importação SCF sem inventar mappings.

