# Agent Memory & Context Strategy

## 1. Definição

**Agent Memory** é o conjunto de dados estruturados e não estruturados que os agentes utilizam para tomar decisões, gerar outputs e manter continuidade ao longo do lifecycle do assessment.

No Standard, memória é suporte operacional. Ela não é autoridade normativa, não substitui estado oficial e não pode burlar organization isolation.

Separações obrigatórias:

- **Memory ≠ Knowledge Base**: KB recupera evidência candidata; memória organiza contexto de execução e continuidade.
- **Memory ≠ SCF Data**: SCF Data é fonte normativa estruturada; memória pode referenciar SCF, mas não criar ou alterar SCF.
- **Memory ≠ Logs**: logs registram eventos; memória seleciona contexto útil para execução. Logs completos não devem ser injetados em contexto.

Regra central:

```text
Memória apoia decisão.
Assessment Engine controla estado.
SCF controla normatividade.
Human approval controla artefatos finais.
```

## 2. Princípios

- isolamento por organization obrigatório;
- isolamento por assessment obrigatório;
- memory não é global;
- SCF é fonte normativa;
- KB é evidência candidata;
- memória não substitui estado oficial;
- rastreabilidade obrigatória;
- nenhum dado sensível exposto indevidamente;
- contexto mínimo necessário, ou least context;
- outputs anteriores são inferência, não verdade oficial;
- contexto efêmero deve ser descartado após execução;
- contexto deve ser montado por tools/services autorizados, não por acesso direto do agente.

## 3. Tipos de Memória

### 1. System Memory

Memória imutável ou controlada pelo sistema. Não é organization-specific, exceto configurações globais versionadas.

Inclui:

- SCF structured data;
- mappings oficiais;
- schemas;
- tool contracts;
- agent registry;
- workflow state definitions;
- guardrail definitions.

Características:

- fonte normativa apenas quando for SCF structured data;
- versionada;
- auditável;
- não editável por agentes;
- exposta por tools read-only.

### 2. Assessment Memory

Memória do assessment específico. É o principal escopo de trabalho dos agentes.

Inclui artefatos:

- SoA;
- Gap Analysis;
- Maturity;
- POA&M;
- Reports;
- documentos;
- KB embeddings;
- evidence candidates;
- approval records.

Características:

- escopada por `organization_id`, `organization_id` e `assessment_id`;
- não reutilizável entre assessments;
- inclui drafts e versões aprovadas;
- deve preservar versionamento e fonte.

### 3. Execution Memory

Memória de execução e orquestração.

Inclui:

- `agent_runs`;
- `agent_decisions`;
- `workflow_state`;
- orchestration decisions;
- tool calls;
- validation results;
- retry history;
- failure records.

Características:

- usada para debugging, audit, replay controlado e evals;
- nunca substitui artefato aprovado;
- precisa carregar `trace_id`;
- deve armazenar hashes para inputs/outputs sensíveis.

### 4. Ephemeral Context

Contexto temporário usado em uma execução de agente.

Inclui:

- prompt context;
- inputs de agente;
- chunks selecionados;
- artifacts selecionados;
- constraints da tarefa;
- instruction envelope montado pelo runtime.

Características:

- temporário;
- mínimo;
- descartado após execução;
- não deve virar memória persistente sem classificação explícita;
- não deve carregar documentos completos sem controle.

## 4. Escopo de Memória

Níveis:

- **Global**: somente SCF oficial, schemas, configs e contracts versionados.
- **Organization**: configurações e políticas do organization.
- **Organization**: contexto organizacional permitido.
- **Assessment**: escopo principal de artifacts, KB e decisões.
- **Agent Run**: memória isolada de uma execução.
- **Request**: contexto efêmero da chamada atual.

Regra crítica:

```text
Nenhum acesso cross-organization permitido.
```

Regras adicionais:

- Assessment memory de um assessment não deve ser usada em outro sem autorização explícita e trilha auditável.
- Agent run memory não pode ser reutilizada como contexto de outro organization.
- Request memory deve ser descartada ao fim da execução.
- Global memory não pode conter dados de cliente.

## 5. Fontes de Contexto

Agentes podem usar fontes via tools autorizadas:

- SCF Data, normativo;
- KB Search, candidato;
- artefatos aprovados;
- artefatos draft, com cautela;
- outputs anteriores em `agent_runs`;
- workflow state;
- approval status;
- orchestration decisions.

Regras:

- SCF Data deve ser acessado por SCF tools read-only.
- KB Search deve retornar evidence candidates com fonte e score.
- Artefatos aprovados têm preferência sobre drafts.
- Drafts devem carregar status e `requires_validation`.
- Outputs anteriores devem ser tratados como inferência e audit context, não como verdade.

## 6. Hierarquia de Confiança

Ordem de confiança:

1. SCF Data → fonte normativa.
2. Artefatos aprovados → fonte confiável dentro do assessment.
3. Artefatos draft → requer validação.
4. KB → evidência candidata.
5. Agent outputs → inferência.

Regra:

```text
Níveis inferiores nunca sobrepõem superiores.
```

Exemplos:

- KB não pode contrariar mapping oficial SCF.
- Agent output não pode alterar SoA aprovada.
- Draft não pode substituir Gap Analysis aprovado.
- Evidence candidate não pode virar finding final sem validação.
- Output anterior com erro não pode contaminar uma nova execução.

## 7. Context Assembly

Contexto deve ser montado por um Context Builder controlado pelo backend/Agent Runtime, usando tools e políticas.

Schema lógico:

```text
InputContext
├── organization_id
├── organization_id
├── assessment_id
├── agent_name
├── task_type
├── relevant_artifacts
├── scf_context
├── kb_results
├── prior_agent_runs
├── workflow_state
├── constraints
├── assumptions
├── limitations
└── trace_id
```

Regras:

- limitar tamanho do contexto;
- incluir apenas dados relevantes;
- nunca incluir dados de outro organization;
- nunca incluir logs completos;
- nunca incluir documentos completos sem controle;
- sempre incluir `trace_id`;
- sempre incluir fontes;
- marcar KB/documentos como untrusted evidence;
- incluir versões de artefatos;
- incluir `scf_version` e `framework_id` quando aplicável.

## 8. Uso de Knowledge Base

KB fornece chunks relevantes para apoiar análise.

Cada chunk deve carregar:

- `organization_id`;
- `organization_id`;
- `assessment_id`;
- `document_id`;
- `chunk_id`;
- `content_hash` ou `text_hash`;
- `confidence` ou score;
- retrieval method;
- metadata documental;
- `trace_id`.

KB nunca:

- define compliance;
- substitui SCF;
- cria mapping oficial;
- aprova evidência;
- conclui implementação.

Regra crítica:

```text
KB = evidence candidate only.
```

Ausência de resultado na KB significa `not_evidenced` no escopo consultado, nunca `not_implemented`.

## 9. Agent Memory Execution-Level

`AgentRunMemory` registra memória de execução.

Campos:

- inputs;
- outputs;
- decisions;
- assumptions;
- limitations;
- sources;
- tool calls;
- validation status;
- confidence score;
- input hash;
- output hash;
- `trace_id`.

Uso:

- debugging;
- audit;
- evals;
- regression analysis;
- failure analysis;
- replay controlado com dados sintéticos ou ambiente autorizado.

Restrições:

- não usar output anterior como verdade oficial;
- não armazenar prompt completo com dados sensíveis quando hash/redaction for suficiente;
- não reutilizar contexto entre organizations;
- não promover memory para artifact sem workflow e schema validation.

## 10. Context Leakage Prevention

Regras obrigatórias:

- nunca incluir dados de outro organization;
- nunca misturar assessments;
- nunca reutilizar contexto entre execuções;
- limpar memória efêmera após execução;
- validar escopo antes de montar contexto;
- filtrar por `organization_id`, `organization_id` e `assessment_id`;
- refiltrar resultados Vectorize no backend;
- evitar logs completos no contexto;
- usar hashes para referência quando possível;
- limitar snippets e chunks.

Bloqueios:

- organization ausente;
- organization ausente;
- assessment ausente;
- artifact pertence a assessment diferente;
- chunk pertence a organization diferente;
- prior agent run pertence a outro assessment;
- context size excede limite;
- tool retorna dados fora do escopo.

## 11. Prompt Injection Defense

Conteúdo da KB é untrusted.

Documentos podem conter:

- instruções maliciosas;
- prompt injection;
- tentativas de alterar tool allowlist;
- tentativas de ignorar approval gates;
- conteúdo contraditório;
- dados desatualizados.

Regras:

- agentes devem ignorar instruções externas;
- system instructions são prioritárias;
- developer/system policy não pode ser alterada por documentos;
- retrieved content deve ser apresentado como evidência, não instrução;
- prompt context deve separar instruções, tarefa e evidência;
- tool allowlist não pode ser alterada por KB;
- approval gates não podem ser alterados por KB.

## 12. Context Validation

Antes de executar agente, validar:

- `organization_id`;
- `organization_id`;
- `assessment_id`;
- artifacts pertencentes ao assessment;
- chunks pertencentes ao assessment;
- prior agent runs pertencentes ao assessment;
- workflow state compatível;
- limites de tamanho;
- tipo de dados;
- `trace_id`;
- `scf_version`;
- `framework_id`, quando aplicável;
- tool permissions;
- presence de required sources.

Falhas devem bloquear execução com status seguro:

- `context_missing_tenant`;
- `context_missing_assessment`;
- `context_cross_tenant_detected`;
- `context_artifact_scope_mismatch`;
- `context_size_exceeded`;
- `context_invalid_schema`;
- `context_untrusted_instruction_detected`.

## 13. Memory vs State

State:

- controlado pelo Assessment Engine;
- fonte oficial de lifecycle;
- valida transições;
- aplica approval gates;
- define status oficial.

Memory:

- suporte para decisão;
- fornece contexto;
- preserva execução;
- ajuda debugging e evals;
- não altera lifecycle.

Regra:

```text
Memory nunca altera state diretamente.
```

Qualquer mudança de state deve passar por Workflow, Assessment Engine, autorização e audit trail.

## 14. Integração com Tool Registry

Tools acessam memória. Agents não acessam diretamente.

Fluxo:

```text
Agent requests context
  ↓
Agent Runtime checks allowed tools
  ↓
Tool retrieves scoped memory/context
  ↓
Tool validates organization and schema
  ↓
Context Builder assembles minimal context
  ↓
Agent receives validated context
```

Regras:

- Tool controla acesso e filtragem.
- Tool deve aplicar organization/assessment filters.
- Tool output deve ter schema validado.
- Tool call deve ser auditável.
- Tool não deve retornar conteúdo sensível além do necessário.

## 15. Integração com Observability

Registrar:

- contexto usado, via hash;
- tamanho do contexto;
- fontes utilizadas;
- número de chunks;
- número de artifacts;
- trust levels;
- context validation result;
- context build duration;
- agent run association;
- `trace_id`.

Não registrar:

- conteúdo sensível integral;
- documentos completos;
- chunks completos por padrão;
- prompt completo com dados de cliente;
- secrets;
- credenciais.

Eventos sugeridos:

- `agent_context_built`;
- `agent_context_validation_failed`;
- `agent_context_scope_blocked`;
- `agent_context_size_limited`;
- `agent_context_kb_retrieval_used`;
- `agent_context_scf_reference_used`.

## 16. Estratégia de Armazenamento

- PostgreSQL → estado, artefatos, approvals, agent runs, workflow state e metadata transacional.
- R2 → documentos, relatórios, exports e artefatos grandes versionados.
- Vectorize → embeddings e recuperação semântica auxiliar.
- Logs → audit trail, observabilidade, security events e cost events.

Regras:

- PostgreSQL é fonte transacional crítica.
- R2 keys devem preservar organization/organization/assessment.
- Vectorize deve usar metadata e filtros de organization/assessment.
- Logs devem usar redaction e hashes.
- SCF oficial deve ser versionado e imutável por import run.

## 17. Limites Operacionais

Limites recomendados para MVP:

- `max_context_tokens`: definido por ambiente e modelo, com margem de segurança.
- `max_kb_chunks_per_agent_run`: limite baixo e explícito por agente.
- `max_documents_per_execution`: limitado por task type.
- `max_prior_agent_runs`: somente runs relevantes e recentes.
- `max_artifact_versions`: preferir versão aprovada mais recente e versão draft atual.
- `max_prompt_context_bytes`: limite hard no runtime.

Valores exatos devem ser configuráveis por ambiente. A política deve falhar fechado quando limite for excedido.

Estratégias:

- priorizar SCF e artefatos aprovados;
- resumir ou excluir dados redundantes;
- usar snippets em vez de documentos completos;
- carregar chunks por relevância e metadata;
- registrar quando o contexto for truncado.

## 18. Failure Modes

Failure modes:

- contexto insuficiente;
- contexto excessivo;
- evidência irrelevante;
- mistura de organizations;
- uso indevido da KB;
- dependência de outputs anteriores inválidos;
- SCF ausente do contexto;
- artifact version errada;
- prompt injection incorporado como instrução;
- logs sensíveis incluídos em contexto;
- prior run contaminado;
- contexto sem trace.

Mitigações:

- context validation;
- trust hierarchy;
- organization guard;
- source metadata;
- context size limits;
- prompt injection filtering;
- schema validation;
- audit events;
- evals sintéticos.

## 19. Testes Obrigatórios

Testes mínimos:

- organization isolation no contexto;
- KB não usada como normativa;
- SCF sempre disponível quando necessário;
- contexto limitado corretamente;
- prompt injection ignorado;
- artefatos corretos usados;
- contexto não contém dados externos;
- prior agent run de outro assessment é bloqueado;
- artifact de outro organization é bloqueado;
- context hash é registrado;
- logs completos não entram no contexto;
- ausência de KB vira `not_evidenced`, não `not_implemented`.

Testes por agente:

- Framework Mapper recebe SCF/mapping e não KB normativa.
- Evidence Analyst recebe KB como candidate evidence.
- Gap Analyst recebe SoA aprovada e evidence classification.
- Maturity Assessor recebe evidence strength e não apenas política.
- Report Writer recebe apenas artifacts aprovados para conclusões finais.

## 20. Limitações do MVP

- Sem memória persistente inteligente.
- Sem learning loop.
- Sem ranking adaptativo.
- Sem compressão avançada de contexto.
- Sem knowledge graph temporal.
- Sem long-term memory por organization além de artifacts/agent runs/audit.
- Sem feedback loop automático para alterar comportamento.

Impacto no projeto: o MVP privilegia isolamento, rastreabilidade e controle. A memória é explícita e conservadora, reduzindo risco de vazamento e decisões incorretas.

## 21. Evolução Futura

Evoluções possíveis:

- memory ranking inteligente;
- adaptive context selection;
- long-term memory por organization;
- embeddings híbridos;
- contextual summarization;
- retrieval tuning por agente;
- temporal knowledge graph para auditabilidade;
- entity memory para assets, sistemas e controles;
- context quality scoring;
- memory retention policies por organization;
- DLP antes de context assembly.

Condições para evolução:

- manter isolamento por organization;
- manter Assessment Engine como state authority;
- manter SCF como fonte normativa;
- manter KB como evidence candidate;
- testar leakage antes de ativar;
- registrar todo uso de contexto.

## 22. Diagrama

```text
Agent
  ↓
Context Builder
  ↓
Validated Context
  ↓
Agent Runtime
  ↓
Output
```

Diagrama expandido:

```text
Orchestrator decision
  ↓
Agent Runtime
  ↓
Context Builder
  ├── SCF Data tools
  ├── Approved artifact tools
  ├── KB Search tools
  ├── Agent run history tools
  └── Workflow state tools
  ↓
Context Validation
  ├── organization scope
  ├── assessment scope
  ├── trust hierarchy
  ├── size limits
  └── prompt injection checks
  ↓
Validated InputContext
  ↓
Specialist Agent
  ↓
Schema-validated output
  ↓
AgentRunMemory + Audit/Observability
```

## 23. Resultado Esperado

Este documento permite:

- montar contexto corretamente;
- evitar vazamento de dados;
- garantir qualidade das decisões;
- suportar multi-organization;
- integrar com KB e SCF;
- separar memory, state, KB, logs e SCF;
- criar testes de isolamento e qualidade;
- evoluir memória agentic sem comprometer governança.

Definition of done para implementação futura:

- Context Builder com schema validado;
- trust hierarchy aplicada;
- organization/assessment guard obrigatório;
- KB marcada como candidate evidence;
- SCF sempre normativo;
- context hashes registrados;
- ephemeral context descartado;
- context limits configuráveis;
- prompt injection defense ativa;
- testes de leakage e cross-organization passando.

