# Standard SCF Agentic Assessment Model

## 1. Executive Summary

O **Standard SCF Agentic Assessment Model** é um modelo de IA agêntica para conduzir assessments de segurança, conformidade e maturidade com base no Secure Controls Framework. Agentes especializados colaboram sob orquestração controlada para ingerir documentos, construir KB, mapear frameworks, gerar SoA, avaliar evidências, produzir Gap Analysis, medir maturidade, gerar POA&M e preparar relatórios, sempre com rastreabilidade, validação de schema, controle de escopo e aprovação humana.

Ele é agentic AI porque executa um processo multi-etapa com agentes especializados, handoffs, tools, memória operacional, avaliação de outputs e governança humana. Não é apenas um chatbot: o modelo não depende de conversa livre para decidir compliance. Ele opera dentro de workflows, contratos de API, schemas, state machine, tools autorizadas e approval gates.

A relação central é:

- workflow controla o processo;
- agentes produzem análises e drafts;
- tools dão acesso controlado a dados e serviços;
- memória/estado preserva contexto, rastreabilidade e histórico;
- humanos aprovam artefatos críticos;
- audit trail registra decisões, eventos e tentativas de bypass.

## 2. Core Operating Principle

O Standard é **workflow-first, agent-assisted**.

- Workflow controla o processo.
- Assessment Engine controla estados, transições e gates.
- Agentes executam análise e geração de drafts.
- Tools dão acesso controlado a dados e serviços.
- Humanos aprovam artefatos críticos.
- Audit trail registra tudo.

Essa separação impede que agentes LLM assumam autoridade normativa, alterem estados diretamente, aprovem artefatos finais ou gravem achados finais sem validação.

## 3. Agentic Architecture

```text
Standard SCF Agentic Assessment Model
├── Orchestrator Layer
├── Specialist Agents
├── Tool Layer
├── Memory / State Layer
├── Governance Layer
└── Evaluation & Safety Layer
```

### Orchestrator Layer

Coordena o lifecycle, dispara etapas, chama agentes especialistas quando necessário, aguarda approval gates e registra falhas. No MVP, essa camada é representada por Cloudflare Workflows, API Gateway e Assessment Engine. O Orchestrator Agent futuro deve operar dentro desses limites.

### Specialist Agents

Agentes funcionais produzem análise, classificação, drafts e recomendações. Eles não aprovam artefatos, não criam mappings oficiais e não gravam final findings diretamente.

### Tool Layer

Expõe capabilities controladas para SCF, KB, ingestion, SoA, Gap, Maturity, POA&M, Reporting, Audit e Approval. Cada tool tem risco, schema, permissão e allowlist por agente.

### Memory / State Layer

Preserva estado transacional, documentos, artefatos, vetores, workflow runs, agent runs, audit logs e decisões.

### Governance Layer

Define approval gates, RBAC, tenant isolation, auditability, responsabilidades humanas e accountability final.

### Evaluation & Safety Layer

Executa evals sintéticos, regression tests, schema validation e guardrail checks para detectar hallucination, approval bypass, tenant leakage e erro de classificação.

## 4. Orchestrator Layer

O Orchestrator Agent é o coordenador lógico do processo agentic. Ele decide qual etapa executar a seguir somente dentro do lifecycle permitido e com base em estado validado.

Responsabilidades:

- ler estado atual do assessment;
- verificar documentos disponíveis;
- acionar ingestion e KB indexing;
- consultar resultados de SCF pre-analysis;
- aguardar escolha de framework;
- chamar agentes especialistas para gerar drafts;
- aguardar aprovação humana nos gates;
- bloquear o processo quando faltar dado, aprovação ou configuração;
- registrar falhas técnicas, bloqueios e eventos auditáveis.

Relação com Cloudflare Workflows:

- Cloudflare Workflows fornece durabilidade, retries, waits, signals e checkpoints;
- o Orchestrator não deve duplicar a state machine fora do workflow;
- signals de aprovação e retomada devem carregar `trace_id`, `tenant_id`, `organization_id`, `assessment_id` e idempotency key.

Relação com Assessment Engine:

- Assessment Engine é a autoridade para estados, transições e gates;
- Orchestrator pode solicitar transição, mas não pode forçar transição inválida;
- Orchestrator não substitui o Assessment Engine.

Quando chama agentes especialistas:

- após documentos e KB estarem prontos;
- após framework selecionado;
- quando há artefato draft a produzir;
- quando evidências precisam ser classificadas;
- quando relatório precisa compor fontes aprovadas.

Quando aguarda humano:

- SoA approval;
- Gap Analysis approval;
- Maturity Assessment approval;
- POA&M approval;
- Report approval/acceptance.

Quando bloqueia:

- tenant context ausente ou divergente;
- assessment sem documentos mínimos;
- framework não selecionado;
- approval_event ausente ou inválido;
- output de agente inválido;
- tentativa de mapping oficial inventado;
- evidência insuficiente para conclusão;
- erro de tool, quota ou configuração.

## 5. Specialist Agents

Todos os agentes devem respeitar `tenant_id`, `organization_id`, `assessment_id`, `trace_id`, `scf_version` e `framework_id` quando aplicável. Todo output deve conter `confidence_score`, `assumptions`, `limitations`, `sources` e `requires_user_validation`.

### Standard Knowledge Steward

- Missão: organizar documentos, chunks, metadados, KB e evidências recuperáveis.
- Entradas: documentos ingeridos, hashes, metadata, tenant/assessment context.
- Saídas: KB index status, evidence candidates, document/chunk references.
- Tools permitidas: Document Ingestion tools, KB Search/indexing tools, Audit tools read/write seguro.
- Decisões permitidas: sugerir qualidade de ingestão, duplicidade, chunk status e necessidade de reprocessamento.
- Decisões proibidas: decidir compliance, aprovar evidência final, alterar SCF.
- Output schema esperado: `AgentOutputSchema` com `output_type: "knowledge_steward_result"`, evidence references e limitations.
- Handoff anterior: Orchestrator após upload/ingestion request.
- Handoff posterior: SCF Control Analyst, Evidence Analyst.
- Riscos: vazamento de conteúdo sensível; indexação cross-tenant; prompt injection em documentos.
- Guardrails: não logar conteúdo integral; preservar hashes; marcar conteúdo recuperado como untrusted evidence.

### Standard SCF Control Analyst

- Missão: analisar controles SCF estruturados e preparar contexto de controle.
- Entradas: `scf_version`, controls, domains, framework candidate, assessment context.
- Saídas: control summaries, relevant control candidates, analysis assumptions.
- Tools permitidas: SCF Data Service read-only, Audit tools.
- Decisões permitidas: sugerir controles relevantes e limitações de interpretação.
- Decisões proibidas: criar mapping oficial ausente; substituir SCF estruturado por KB.
- Output schema esperado: `AgentOutputSchema` com `output_type: "scf_control_analysis"`.
- Handoff anterior: Knowledge Steward ou Orchestrator.
- Handoff posterior: Framework Mapper, SoA Architect.
- Riscos: inferir relação normativa inexistente.
- Guardrails: mapping oficial só quando presente no SCF structured database.

### Standard Framework Mapper

- Missão: consultar mappings oficiais entre framework selecionado e controles SCF.
- Entradas: `framework_id`, `scf_version`, requirements, mappings oficiais.
- Saídas: mapping set oficial, gaps de mapping, `requires_validation` quando ausente.
- Tools permitidas: SCF mapping lookup read-only, framework lookup, Audit tools.
- Decisões permitidas: distinguir mapping oficial, derivação técnica e inferência consultiva.
- Decisões proibidas: inventar crosswalk; gravar inferência como mapping oficial.
- Output schema esperado: `AgentOutputSchema` com `output_type: "framework_mapping_result"`.
- Handoff anterior: SCF Control Analyst.
- Handoff posterior: Scope & SoA Architect.
- Riscos: hallucinated mapping count acima de zero.
- Guardrails: bloquear output que declare official mapping sem source SCF estruturada.

### Standard Scope & SoA Architect

- Missão: propor escopo e Statement of Applicability com base no framework, SCF mappings e contexto do assessment.
- Entradas: framework selection, official mappings, scope constraints, evidence context.
- Saídas: scope draft, SoA draft, applicability rationale, validation flags.
- Tools permitidas: SCF read-only, SoA draft_write, artifact draft create, Audit tools.
- Decisões permitidas: propor applicable, not_applicable com justificativa, out_of_scope com justificativa, requires_validation.
- Decisões proibidas: aprovar SoA; marcar ausência de evidência como não aplicabilidade.
- Output schema esperado: `AgentOutputSchema` com `output_type: "soa_draft"`.
- Handoff anterior: Framework Mapper.
- Handoff posterior: humano para SoA approval; depois Evidence Analyst.
- Riscos: escopo amplo demais, not_applicable sem justificativa, mapping ausente tratado como oficial.
- Guardrails: SoA final exige approval_event humano.

### Standard Evidence Analyst

- Missão: avaliar evidências candidatas contra requisitos e controles em escopo.
- Entradas: SoA aprovada, KB results, document/chunk references, control requirements.
- Saídas: evidence findings, evidence strength, conflicts, not_evidenced status.
- Tools permitidas: KB Search read-only, artifact read, evidence draft_write, Audit tools.
- Decisões permitidas: classificar evidência como direct, indirect, partial, conflicting, not_evidenced.
- Decisões proibidas: transformar not_evidenced em not_implemented; concluir compliance final.
- Output schema esperado: `AgentOutputSchema` com `output_type: "evidence_analysis"`.
- Handoff anterior: SoA approval.
- Handoff posterior: Gap Analyst.
- Riscos: evidência fraca tratada como forte; prompt injection em chunks.
- Guardrails: sources por document/chunk; untrusted KB content; confidence obrigatório.

### Standard Gap Analyst

- Missão: gerar Gap Analysis draft a partir de SoA aprovada e Evidence Analysis.
- Entradas: SoA approved, evidence findings, SCF controls, framework requirements.
- Saídas: gap findings, status conservador, rationale, limitations.
- Tools permitidas: Gap Analysis draft_write, SCF read-only, evidence read, Audit tools.
- Decisões permitidas: propor met, partially_met, not_met, not_evidenced, conflicting.
- Decisões proibidas: aprovar Gap Analysis; tratar ausência de evidência como falha sem rationale.
- Output schema esperado: `AgentOutputSchema` com `output_type: "gap_analysis_draft"`.
- Handoff anterior: Evidence Analyst.
- Handoff posterior: humano para Gap Analysis approval; depois Maturity Assessor e POA&M Planner.
- Riscos: gap superestimado/subestimado, status sem fonte.
- Guardrails: Gap final exige schema validation e approval_event humano.

### Standard Maturity Assessor

- Missão: sugerir maturity score conservador com base em evidência aprovada e gaps.
- Entradas: Gap Analysis approved, evidence strength, implementation context, limitations.
- Saídas: maturity scores, rationale, confidence, limitations.
- Tools permitidas: Maturity draft_write, evidence/gap read-only, Audit tools.
- Decisões permitidas: sugerir score e confidence por domínio/controle.
- Decisões proibidas: aprovar maturity; score alto sem evidência operacional.
- Output schema esperado: `AgentOutputSchema` com `output_type: "maturity_assessment_draft"`.
- Handoff anterior: Gap Analysis approval.
- Handoff posterior: humano para Maturity approval; depois POA&M Planner/Report Writer.
- Riscos: high maturity without evidence.
- Guardrails: score alto exige source operacional forte e limitations explícitas.

### Standard POA&M Planner

- Missão: propor plano de ação e milestones para gaps aprovados.
- Entradas: Gap Analysis approved, maturity context, severity, priority, expected evidence.
- Saídas: POA&M draft, items, milestones, expected evidence, acceptance criteria.
- Tools permitidas: POA&M draft_write, gap/maturity read-only, Audit tools.
- Decisões permitidas: propor owner, due date, priority, remediation type e dependencies.
- Decisões proibidas: aprovar POA&M; criar ação genérica sem vínculo com gap/control/requirement.
- Output schema esperado: `AgentOutputSchema` com `output_type: "poam_draft"`.
- Handoff anterior: Gap Analysis approval e/ou Maturity Assessor.
- Handoff posterior: humano para POA&M approval; depois Report Writer.
- Riscos: generic POA&M action, prioridade sem rationale.
- Guardrails: todo item deve referenciar gap/control/requirement e acceptance criteria.

### Standard Assessment Report Writer

- Missão: preparar relatórios a partir de fontes aprovadas e rastreáveis.
- Entradas: SoA approved, Gap approved, Maturity approved, POA&M approved, evidence index.
- Saídas: report draft/export, executive summary, traceability appendix, limitations.
- Tools permitidas: Reporting draft_write/export draft, artifact read, Audit tools.
- Decisões permitidas: organizar narrativa, sumarizar achados aprovados, destacar limitações.
- Decisões proibidas: alterar achados finais; aprovar relatório; inserir fonte não aprovada.
- Output schema esperado: `AgentOutputSchema` com `output_type: "assessment_report_draft"`.
- Handoff anterior: POA&M approval e Maturity approval.
- Handoff posterior: humano para report acceptance; Orchestrator para close assessment.
- Riscos: relatório sem rastreabilidade, omissão de limitações.
- Guardrails: report deve listar sources, limitations e traceability appendix.

## 6. Tool Layer

Tool classes:

- `read_only`: consulta estado, SCF, KB, artifacts e audit trail.
- `draft_write`: cria drafts, validation results e work-in-progress records.
- `final_write`: grava artefatos finais/aprovados ou estado final.
- `admin`: importação SCF, configuração global, tenant/admin operations.
- `external_call`: chama serviços externos, LLM providers, scanners ou APIs fora do boundary.

Regra: agentes não devem ter acesso direto a `final_write` ou `admin` tools. `external_call` exige allowlist explícita, policy check e audit event.

| Grupo | Exemplos | Classe | Acesso de agentes |
| --- | --- | --- | --- |
| SCF Data Service tools | `scf_control_lookup`, `scf_mapping_lookup`, `framework_requirement_lookup` | `read_only` | Permitido conforme agente |
| KB Search tools | `kb_evidence_search`, `kb_vector_reference_read` | `read_only` | Permitido com tenant/assessment scope |
| Document Ingestion tools | `document_metadata_read`, `document_ingestion_status_read`, `document_reprocess_request` | `read_only`, `draft_write` | Reprocess somente via workflow/policy |
| SoA tools | `soa_draft_create`, `soa_item_update_draft`, `soa_read` | `read_only`, `draft_write` | Permitido para SoA Architect |
| Gap Analysis tools | `gap_draft_create`, `evidence_findings_read`, `gap_findings_read` | `read_only`, `draft_write` | Permitido para Evidence/Gap agents |
| Maturity tools | `maturity_draft_create`, `maturity_read` | `read_only`, `draft_write` | Permitido para Maturity Assessor |
| POA&M tools | `poam_draft_create`, `poam_item_draft_create`, `poam_read` | `read_only`, `draft_write` | Permitido para POA&M Planner |
| Reporting tools | `report_draft_create`, `report_export_prepare`, `artifact_read` | `read_only`, `draft_write` | Permitido para Report Writer |
| Audit tools | `audit_event_record`, `security_event_record`, `trace_context_read` | `read_only`, `draft_write` | Permitido por runtime, com redaction |
| Approval tools | `approval_event_read`, `approval_event_create`, `artifact_approve` | `read_only`, `final_write` | Agentes só podem ler; criação/aprovação é humana/API |

## 7. Memory and State

- PostgreSQL: estado transacional de tenants, organizations, assessments, approvals, artifacts, findings, audit logs e agent runs.
- R2: armazenamento de documentos, evidências, exports, relatórios e artefatos versionados.
- Vectorize: KB vetorial para recuperação semântica auxiliar, sempre escopada por tenant/assessment.
- SCF structured database: fonte normativa de controles, frameworks, requirements, mappings oficiais e STRM.
- Audit logs: memória de decisões, eventos críticos, approvals, tool calls e tentativas de bypass.
- `agent_runs`: histórico de execução, modelo, prompt version, input/output hash, confidence e trace.
- Workflow state: memória operacional de steps, waits, retries, signals, blocked/failed/cancelled/completed.

## 8. Handoff Protocol

Todo handoff entre agentes deve ser um registro estruturado e validável.

Campos obrigatórios:

- `tenant_id`;
- `organization_id`;
- `assessment_id`;
- `source_agent`;
- `target_agent`;
- `task_type`;
- `input_artifacts`;
- `output_schema`;
- `assumptions`;
- `limitations`;
- `trace_id`;
- `confidence_threshold`;
- `human_review_required`.

Exemplo conceitual:

```json
{
  "tenant_id": "tenant_synth_standard",
  "organization_id": "org_synth_healthtech",
  "assessment_id": "assessment_synth_001",
  "source_agent": "standard_evidence_analyst",
  "target_agent": "standard_gap_analyst",
  "task_type": "create_gap_analysis_draft",
  "input_artifacts": ["soa_version_001", "evidence_analysis_001"],
  "output_schema": "GapAnalysisDraftSchema",
  "assumptions": ["Evidence search is limited to approved synthetic documents."],
  "limitations": ["No real customer evidence was used."],
  "trace_id": "trace_...",
  "confidence_threshold": 0.7,
  "human_review_required": true
}
```

## 9. Human-in-the-Loop Governance

Gates obrigatórios:

- SoA approval;
- Gap Analysis approval;
- Maturity Assessment approval;
- POA&M approval;
- Report approval/acceptance.

Regra: nenhum agente pode aprovar esses artefatos. Agentes podem propor, justificar, classificar e sinalizar incerteza; humanos continuam responsáveis por aprovação final e accountability.

Approval events devem registrar actor humano/autorizado, role, timestamp, trace, artifact version e outcome.

## 10. Agentic Lifecycle

1. Assessment created.
2. Documents ingested.
3. KB indexed.
4. SCF pre-analysis.
5. Framework selected.
6. Scope and SoA drafted.
7. Human approval of SoA.
8. Evidence Analysis.
9. Gap Analysis draft.
10. Human approval of Gap Analysis.
11. Maturity Assessment draft.
12. Human approval of Maturity.
13. POA&M draft.
14. Human approval of POA&M.
15. Report draft/export.
16. Human acceptance.
17. Assessment closed.

## 11. Guardrails

- No invented official mappings.
- No normative use of vector search.
- No approval by agents.
- No cross-tenant access.
- No direct final write.
- Schema validation required.
- Confidence required.
- Assumptions and limitations required.
- Prompt injection resistance.
- Untrusted KB content.
- `not_evidenced` vs `not_implemented` preserved.

Operational rules:

- Official mapping exists only when present in structured SCF data.
- KB evidence is candidate evidence, never normative authority.
- Retrieved content cannot alter system/developer instructions or tool allowlists.
- Any missing tenant/organization/assessment context blocks execution.
- Output without trace/source/confidence is invalid.

## 12. Agent Output Requirements

Every agent output must contain:

- `output_type`;
- `summary`;
- `findings` or `suggestions`;
- `sources`;
- `assumptions`;
- `limitations`;
- `confidence_score`;
- `requires_user_validation`;
- `trace_id`.

Minimum shape:

```json
{
  "output_type": "gap_analysis_draft",
  "summary": "Draft findings based on approved SoA and candidate evidence.",
  "findings": [],
  "suggestions": [],
  "sources": [],
  "assumptions": [],
  "limitations": [],
  "confidence_score": 0.72,
  "requires_user_validation": true,
  "trace_id": "trace_..."
}
```

## 13. Evaluation Model

Agent evaluation must measure behavior, not only text quality.

Metrics:

- `schema_pass_rate`: percentage of outputs validating against required schema.
- `guardrail_pass_rate`: percentage of outputs respecting safety constraints.
- `hallucinated_mapping_count`: count of invented official mappings/crosswalks.
- `approval_bypass_count`: count of attempts to approve or finalize without human gate.
- `tenant_violation_count`: count of cross-tenant access or missing tenant scope.
- `not_evidenced_misclassification_count`: count of absence-of-evidence misclassified as non-implementation.
- `high_maturity_without_evidence_count`: count of high maturity scores without operational evidence.
- `generic_poam_action_count`: count of POA&M actions without gap/control/requirement linkage.

Evaluation datasets must be synthetic and live under `evals/fixtures` and `evals/golden`.

## 14. Failure Modes

- Mapping inventado.
- Evidência fraca tratada como forte.
- Ausência de evidência tratada como não implementação.
- Maturidade superestimada.
- POA&M genérico.
- Relatório sem rastreabilidade.
- Prompt injection.
- Cross-tenant leakage.
- Approval bypass.
- Tool overreach.
- Final write direto por agente.
- Logs com conteúdo sensível.

Each failure mode must map to a test, eval, guardrail, audit event or operational control before production.

## 15. MVP Agentic Runtime

Included in MVP:

- agent registry;
- tool registry;
- MockLLMProvider;
- schemas de output;
- guardrails;
- `agent_runs`;
- handoff records;
- dry-run execution;
- evals sintéticos.

Out of MVP:

- autonomia total;
- auto-approval;
- uso de dados reais;
- integração LLM real obrigatória;
- execução de tools externas sem allowlist;
- Workers for Platforms para extensões de clientes.

MVP stance: deterministic workflows and schema-validated mock agent runtime first; real LLM execution only after safety, telemetry, cost governance and human approval workflows are validated.

## 16. Production Readiness

Before production:

- auth/RBAC completo;
- tenant isolation validado;
- audit logs persistentes;
- evals e regression tests;
- observability com trace, metrics e security events;
- cost governance por tenant/assessment/model;
- prompt injection tests;
- approval workflow validado;
- SCF official importer validado;
- backup/restore testado;
- incident response definido.

Production No-Go conditions:

- tenant isolation failure;
- approval gate bypass;
- real secrets in repository/logs;
- official mappings can be invented by agents;
- KB/vector search treated as normative;
- production deploy without approval;
- agent final_write/admin access without policy gate.

## 17. Diagrams

### Agentic Architecture

```text
Tenant Assessment
  │
  ▼
Orchestrator Layer ──► Assessment Engine
  │                         │
  │                         └── validates states, transitions and gates
  │
  ├──► Specialist Agents
  │       ├── Knowledge Steward
  │       ├── Framework Mapper
  │       ├── SoA Architect
  │       ├── Evidence Analyst
  │       ├── Gap Analyst
  │       ├── Maturity Assessor
  │       ├── POA&M Planner
  │       └── Report Writer
  │
  ├──► Tool Layer
  │       ├── SCF Data Service
  │       ├── KB Search
  │       ├── Document Ingestion
  │       ├── Reporting
  │       └── Audit/Approval APIs
  │
  └──► Human Governance
          └── approval gates and final accountability
```

### Handoff Sequence

```text
Knowledge Steward
  └── handoff: evidence candidates + ingestion limitations
      ▼
SCF Control Analyst
  └── handoff: control context + mapping constraints
      ▼
Framework Mapper
  └── handoff: official mappings + requires_validation gaps
      ▼
SoA Architect
  └── draft SoA
      ▼
Human Approval Gate
      ▼
Evidence Analyst → Gap Analyst → Human Approval Gate
      ▼
Maturity Assessor → Human Approval Gate
      ▼
POA&M Planner → Human Approval Gate
      ▼
Report Writer → Human Acceptance
```

### Lifecycle With Approval Gates

```text
Assessment created
  → Documents ingested
  → KB indexed
  → SCF pre-analysis
  → Framework selected
  → Scope and SoA drafted
  → [Human SoA Approval]
  → Evidence Analysis
  → Gap Analysis draft
  → [Human Gap Approval]
  → Maturity Assessment draft
  → [Human Maturity Approval]
  → POA&M draft
  → [Human POA&M Approval]
  → Report draft/export
  → [Human Report Acceptance]
  → Assessment closed
```

### Workflow, Agents and Tools

```text
Workflow
  ├── decides allowed next step from state
  ├── calls Agent Runtime for draft/analysis
  ├── grants tools through allowlist
  ├── receives schema-validated output
  ├── writes audit event
  └── waits for human approval when gate is reached

Agent Runtime
  ├── validates context
  ├── validates tool allowlist
  ├── executes dry-run or LLM-backed agent
  ├── validates output schema
  └── records agent_run and tool calls

Tools
  ├── expose scoped data
  ├── enforce tenant/assessment boundaries
  ├── return source references
  └── never bypass Assessment Engine gates
```

## 18. Decisions and Open Questions

### Decisions

- The operating model is named **Standard SCF Agentic Assessment Model**.
- The system is workflow-first and agent-assisted.
- Assessment Engine remains authority for state transitions and approval gates.
- SCF structured data is normative.
- KB and Vectorize provide candidate evidence only.
- Agents cannot approve artifacts.
- Agents cannot invent official mappings.
- Agents cannot write final findings without schema validation and governed persistence.
- Agent tests use synthetic fixtures and MockLLMProvider by default.

### Open Questions

- Exact implementation boundary of future Orchestrator Agent versus Cloudflare Workflows.
- Final handoff record schema and persistence table.
- Prompt registry format, versioning and review workflow.
- Real LLM provider and AI Gateway metadata contract.
- Policy model for tool risk classes and per-agent allowlists.
- Retention policy for prompts, hashes, agent outputs and audit trail.
- Whether maturity remains part of Assessment Engine or becomes `packages/maturity`.
- How to represent human reviewer assignments and conflicts of interest.

