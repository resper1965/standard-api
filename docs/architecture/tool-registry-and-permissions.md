# Tool Registry & Permissions

## 1. Definição de Tool

Uma **Tool** é uma interface controlada que permite a um agente ler dados, consultar serviços, gerar drafts ou interagir com o sistema Standard por meio de um contrato explícito.

Uma Tool permite:

- leitura segura de dados escopados;
- consulta a serviços internos;
- criação de sugestões e drafts;
- registro auditável de ações;
- interação controlada com partes do sistema.

Uma Tool não permite:

- acesso irrestrito;
- execução arbitrária;
- queries diretas ao banco;
- acesso direto a storage;
- chamadas externas sem allowlist;
- escrita em artefatos finais por agentes.

Separação central:

```text
Agents = reasoning
Tools = execution
```

Agentes não fazem nada diretamente. Tudo que toca dados, serviços, artefatos, storage ou sistemas externos deve passar por uma Tool registrada, validada, escopada, auditada e autorizada.

## 2. Princípios do Tool Registry

O Tool Registry segue princípios de segurança por padrão:

- allowlist explícita;
- deny by default;
- least privilege;
- separation of duties;
- auditabilidade completa;
- nenhum acesso direto a DB;
- nenhum acesso direto a storage;
- nenhum acesso direto a APIs externas;
- schema validation obrigatória para input e output;
- organization scope obrigatório;
- rastreabilidade por `trace_id`.

Regra operacional:

```text
Se uma tool não está registrada, ela não existe para o Agent Runtime.
Se um agente não está explicitamente autorizado, a tool é bloqueada.
```

## 3. Classificação de Tools

### `read_only`

Tools de leitura segura, sem side effects.

Exemplos:

- consultar controles SCF;
- ler metadados de documentos;
- buscar evidências candidatas na KB;
- ler artefatos aprovados.

Risco típico: `low` ou `medium`, dependendo da sensibilidade dos dados.

### `draft_write`

Tools que criam sugestões, drafts ou registros intermediários. Não alteram estado final e não aprovam artefatos.

Exemplos:

- sugerir item de SoA;
- criar draft de finding;
- sugerir maturity score;
- sugerir ação de POA&M;
- gerar seção de relatório em draft.

Risco típico: `medium`.

### `final_write`

Tools que alteram estado oficial, publicam artefatos finais, aprovam versões ou fecham etapas formais.

Exemplos:

- aprovar SoA;
- aprovar Gap Analysis;
- aprovar Maturity Assessment;
- aprovar POA&M;
- aceitar relatório;
- fechar assessment.

Risco típico: `high` ou `critical`.

### `admin`

Tools sensíveis de configuração, importação normativa, manutenção ou operação privilegiada.

Exemplos:

- importação oficial de SCF;
- alteração de registry global;
- migração administrativa;
- configuração de organization ou política;
- operação de retenção/exclusão.

Risco típico: `critical`.

### `external_call`

Tools que chamam APIs externas, LLM providers, scanners, conectores ou sistemas fora do boundary controlado.

Regra MVP: desabilitado por default.

Risco típico: `high` ou `critical`, por envolver exfiltração, custo, disponibilidade, compliance e prompt injection.

Regra crítica:

```text
Agents só podem usar read_only e draft_write.
Agents nunca recebem final_write ou admin.
external_call permanece bloqueada por default.
```

## 4. Estrutura do Tool Contract

Schema lógico:

```text
ToolContract
├── name
├── description
├── category
├── input_schema
├── output_schema
├── allowed_agents
├── required_context
├── side_effects
├── requires_approval
├── reads_from
├── writes_to
└── risk_level
```

Campos:

- `name`: identificador único da tool.
- `description`: descrição operacional e limites.
- `category`: `read_only`, `draft_write`, `final_write`, `admin` ou `external_call`.
- `input_schema`: schema validável de entrada.
- `output_schema`: schema validável de saída.
- `allowed_agents`: lista explícita de agentes autorizados.
- `required_context`: campos obrigatórios como `organization_id`, `organization_id`, `assessment_id`, `trace_id`.
- `side_effects`: descrição de efeitos colaterais, se existirem.
- `requires_approval`: indica se depende de aprovação humana antes/depois.
- `reads_from`: fontes lógicas consultadas.
- `writes_to`: destinos lógicos escritos.
- `risk_level`: `low`, `medium`, `high` ou `critical`.

Níveis de risco:

- `low`: leitura não sensível e sem side effects.
- `medium`: leitura sensível escopada ou draft write.
- `high`: escrita oficial, external call, ação reversível com impacto alto.
- `critical`: admin, final approval, exclusão, import normativo ou ação irreversível.

## 5. Tool Registry

O **ToolRegistry** é o registro central de todas as tools disponíveis ao Agent Runtime.

Ele deve ser:

- carregado em runtime;
- versionado;
- auditável;
- determinístico no MVP;
- testável por contrato;
- fechado por padrão.

Funções lógicas:

- `getTool(name)`;
- `listTools()`;
- `getAllowedTools(agent)`;
- `validateToolAccess(agent, tool)`;
- `validateRequiredContext(tool, context)`;
- `validateToolInput(tool, input)`;
- `validateToolOutput(tool, output)`;
- `recordToolCall(tool, agent, context, result)`.

Regras:

- Tool não registrada deve falhar como `tool_not_registered`.
- Agente não autorizado deve falhar como `unauthorized_tool_access`.
- Contexto incompleto deve falhar como `missing_required_context`.
- Categoria proibida deve falhar como `tool_category_blocked`.
- Output inválido deve falhar como `tool_output_schema_invalid`.

## 6. SCF Tools

SCF Tools consultam a fonte normativa estruturada do SCF. São `read_only`.

| Tool | Categoria | Risco | Agentes permitidos | Descrição |
| --- | --- | --- | --- | --- |
| `get_scf_version` | `read_only` | `low` | SCF Control Analyst, Framework Mapper, SoA Architect, Gap Analyst, Maturity Assessor | Retorna versão SCF disponível/ativa. |
| `list_scf_frameworks` | `read_only` | `low` | SCF Control Analyst, Framework Mapper, SoA Architect | Lista frameworks suportados. |
| `get_scf_framework_requirements` | `read_only` | `medium` | Framework Mapper, SoA Architect, Gap Analyst | Retorna requirements por framework/version. |
| `get_scf_control` | `read_only` | `low` | SCF Control Analyst, Framework Mapper, SoA Architect, Evidence Analyst, Gap Analyst, Maturity Assessor | Consulta controle por ID. |
| `get_scf_control_by_code` | `read_only` | `low` | SCF Control Analyst, Framework Mapper, Gap Analyst | Consulta controle por código. |
| `get_official_scf_mappings` | `read_only` | `medium` | Framework Mapper, SoA Architect, Gap Analyst | Retorna apenas mappings oficiais existentes. |

Guardrail:

- Se `get_official_scf_mappings` não retornar mapping, o agente deve produzir `mapping_absence`.
- Nenhuma SCF Tool permite criar mapping oficial.

## 7. KB Tools

KB Tools consultam evidências candidatas e contexto documental. São `read_only`.

| Tool | Categoria | Risco | Agentes permitidos | Descrição |
| --- | --- | --- | --- | --- |
| `search_assessment_kb` | `read_only` | `medium` | Knowledge Steward, Evidence Analyst, Gap Analyst | Busca semântica escopada ao assessment. |
| `get_chunk_context` | `read_only` | `medium` | Knowledge Steward, Evidence Analyst, Gap Analyst, Report Writer | Retorna contexto rastreável de chunk. |
| `list_document_metadata` | `read_only` | `medium` | Knowledge Steward, Evidence Analyst, Report Writer | Lista metadados documentais. |
| `get_evidence_candidates` | `read_only` | `medium` | Evidence Analyst, Gap Analyst, POA&M Planner | Retorna evidências candidatas já qualificadas. |

Regra:

```text
Resultado de KB = candidate evidence.
Resultado de KB nunca é fonte normativa.
```

KB Tools devem sempre retornar fonte, documento, chunk, hash, `organization_id`, `organization_id`, `assessment_id` e confidence/relevance quando aplicável.

## 8. SoA Tools

| Tool | Categoria | Risco | Agentes permitidos | Descrição |
| --- | --- | --- | --- | --- |
| `get_approved_soa` | `read_only` | `medium` | Evidence Analyst, Gap Analyst, Report Writer | Retorna SoA aprovada e versionada. |
| `list_soa_items` | `read_only` | `medium` | SoA Architect, Evidence Analyst, Gap Analyst | Lista itens de SoA e status. |
| `suggest_soa_item_update_draft` | `draft_write` | `medium` | Scope & SoA Architect | Cria sugestão/draft de atualização de item SoA. |

Proibido:

- `suggest_soa_item_update_draft` não aprova SoA.
- SoA final requer approval humano e Assessment Engine.

## 9. Gap Tools

| Tool | Categoria | Risco | Agentes permitidos | Descrição |
| --- | --- | --- | --- | --- |
| `get_approved_gap_analysis` | `read_only` | `medium` | Maturity Assessor, POA&M Planner, Report Writer | Retorna Gap Analysis aprovado. |
| `list_gap_findings` | `read_only` | `medium` | Gap Analyst, Maturity Assessor, POA&M Planner, Report Writer | Lista findings em draft/aprovados conforme contexto. |
| `suggest_gap_finding_draft` | `draft_write` | `medium` | Gap Analyst | Cria sugestão de finding em draft. |

Proibido:

- Gap Analyst não pode aprovar gap.
- Gap Tools não podem converter `not_evidenced` em `not_implemented` sem evidência e rationale.

## 10. Maturity Tools

| Tool | Categoria | Risco | Agentes permitidos | Descrição |
| --- | --- | --- | --- | --- |
| `get_maturity_context` | `read_only` | `medium` | Maturity Assessor, POA&M Planner, Report Writer | Retorna contexto de maturidade e evidência aprovada. |
| `suggest_maturity_score_draft` | `draft_write` | `medium` | Maturity Assessor | Cria score de maturidade em draft. |

Proibido:

- Maturity Assessor não pode aprovar maturity.
- Score alto exige evidência operacional rastreável.

## 11. POA&M Tools

| Tool | Categoria | Risco | Agentes permitidos | Descrição |
| --- | --- | --- | --- | --- |
| `get_poam_context` | `read_only` | `medium` | POA&M Planner, Report Writer | Retorna contexto aprovado de gaps, maturity e ações existentes. |
| `suggest_poam_item_draft` | `draft_write` | `medium` | POA&M Planner | Cria item de POA&M em draft. |

Proibido:

- POA&M Planner não pode aprovar POA&M.
- Item sem vínculo com gap/control/requirement deve ser rejeitado.

## 12. Reporting Tools

| Tool | Categoria | Risco | Agentes permitidos | Descrição |
| --- | --- | --- | --- | --- |
| `get_report_sources` | `read_only` | `medium` | Assessment Report Writer | Retorna artefatos aprovados e fontes rastreáveis para relatório. |
| `suggest_report_section_draft` | `draft_write` | `medium` | Assessment Report Writer | Cria seção de relatório em draft. |

Proibido:

- Report Writer não pode aprovar relatório.
- Report Writer não pode alterar findings aprovados.

## 13. Tools Proibidas para Agentes

As seguintes tools nunca devem ser expostas a agentes funcionais:

- `approve_soa`;
- `approve_gap`;
- `approve_maturity`;
- `approve_poam`;
- `approve_report`;
- `delete_document`;
- `admin_scf_import`;
- `raw_database_query`;
- `external_api_call`.

Classificação:

| Tool proibida | Categoria | Motivo |
| --- | --- | --- |
| `approve_soa` | `final_write` | Approval humano obrigatório. |
| `approve_gap` | `final_write` | Approval humano obrigatório. |
| `approve_maturity` | `final_write` | Approval humano obrigatório. |
| `approve_poam` | `final_write` | Approval humano obrigatório. |
| `approve_report` | `final_write` | Acceptance humana obrigatória. |
| `delete_document` | `admin` | Ação destrutiva e sensível. |
| `admin_scf_import` | `admin` | Altera fonte normativa. |
| `raw_database_query` | `admin` | Bypass de tenancy/RBAC/schemas. |
| `external_api_call` | `external_call` | Exfiltração/custo/risco externo; bloqueado por default. |

## 14. Tool Permissions por Agente

Matriz de permissões:

| Agente | Pode usar | Não pode usar |
| --- | --- | --- |
| Standard Knowledge Steward | `list_document_metadata`, `search_assessment_kb`, `get_chunk_context` | `suggest_gap_finding_draft`, approval tools, `final_write`, `admin`, `external_call` |
| Standard SCF Control Analyst | `get_scf_version`, `get_scf_control`, `get_scf_control_by_code`, `list_scf_frameworks` | KB como fonte normativa, mapping write, approval tools, `final_write`, `admin` |
| Standard Framework Mapper | `get_scf_version`, `list_scf_frameworks`, `get_scf_framework_requirements`, `get_official_scf_mappings` | criar mapping, KB normative tools, approval tools, `final_write`, `admin` |
| Standard Scope & SoA Architect | `get_scf_version`, `get_scf_framework_requirements`, `get_scf_control`, `get_official_scf_mappings`, `list_soa_items`, `suggest_soa_item_update_draft` | `approve_soa`, Gap final tools, `final_write`, `admin` |
| Standard Evidence Analyst | `get_approved_soa`, `list_soa_items`, `search_assessment_kb`, `get_chunk_context`, `get_evidence_candidates`, `get_scf_control` | qualquer approval, `final_write`, `admin`, raw DB, external calls |
| Standard Gap Analyst | `get_approved_soa`, `get_evidence_candidates`, `list_gap_findings`, `suggest_gap_finding_draft`, `get_scf_control`, `get_official_scf_mappings` | `approve_gap`, `suggest_maturity_score_draft`, `final_write`, `admin` |
| Standard Maturity Assessor | `get_approved_gap_analysis`, `list_gap_findings`, `get_maturity_context`, `suggest_maturity_score_draft`, `get_scf_control` | `approve_maturity`, POA&M finalization, Report finalization, `final_write`, `admin` |
| Standard POA&M Planner | `get_approved_gap_analysis`, `list_gap_findings`, `get_maturity_context`, `get_poam_context`, `suggest_poam_item_draft` | `approve_poam`, Report approval, `final_write`, `admin` |
| Standard Assessment Report Writer | `get_report_sources`, `get_approved_soa`, `get_approved_gap_analysis`, `get_maturity_context`, `get_poam_context`, `suggest_report_section_draft` | alterar findings, `approve_report`, `final_write`, `admin`, `external_call` |

Regra de interpretação:

- "Pode usar" não significa uso irrestrito.
- Toda tool ainda exige contexto válido, schema válido, organization scope e decisão de runtime.

## 15. Enforcement

O **ToolPermissionGuard** valida cada tentativa de tool call.

Valida:

- agente autorizado;
- tool registrada;
- contexto válido;
- categoria permitida;
- organization/organization/assessment scope;
- input schema;
- risk policy;
- approval dependency;
- trace context.

Bloquear:

- tool não permitida;
- tool de alto risco;
- tool fora do contexto;
- ausência de `organization_id`;
- ausência de `organization_id`;
- ausência de `assessment_id`;
- ausência de `trace_id`;
- tentativa de `final_write`;
- tentativa de `admin`;
- `external_call` sem allowlist explícita e aprovação de política.

Resultado de bloqueio deve gerar security/audit event.

## 16. Integração com RBAC

RBAC e Tool Registry têm responsabilidades diferentes.

```text
RBAC controla usuários.
Tool Registry controla agentes.
```

RBAC:

- valida usuário, service account ou system actor;
- define permissões humanas;
- controla approval humano;
- controla acesso a endpoints administrativos.

Tool Registry:

- valida capacidade de agentes;
- restringe tools por agente;
- aplica risk category;
- registra tool calls;
- impede execução indevida.

Nunca misturar diretamente:

- um agente não herda permissão humana ampla;
- um usuário admin não transforma agente em admin;
- approval humano não concede `final_write` ao agente;
- Tool Registry não substitui RBAC.

Integração correta:

1. RBAC valida quem iniciou ou autorizou o fluxo.
2. Workflow/Orchestrator define contexto.
3. Tool Registry limita o que o agente pode fazer.
4. Audit trail registra ambos: ator humano/sistema e agente.

## 17. Integração com Agent Runtime

Fluxo:

```text
Agent
  ↓ solicita tool
Tool Registry valida
  ↓
ToolPermissionGuard autoriza ou bloqueia
  ↓
Tool executa
  ↓
Resultado validado por schema
  ↓
Agent Runtime registra tool_call
```

Agent Runtime deve:

- carregar Tool Registry versionado;
- resolver allowlist por agente;
- validar input antes da execução;
- validar output depois da execução;
- registrar tool call com hashes;
- rejeitar output sem schema;
- propagar `trace_id`;
- aplicar redaction nos logs.

## 18. Guardrails Críticos

- Tool não permitida → bloqueio.
- `final_write` → bloqueado para agentes.
- `external_call` → bloqueado por default.
- `admin` → nunca exposto a agentes.
- Ausência de contexto → bloqueio.
- Cross-organization → bloqueio.
- Raw DB query → bloqueio.
- Direct storage access → bloqueio.
- KB como fonte normativa → bloqueio lógico.
- Mapping oficial inventado → bloqueio/validation failure.
- Output sem schema válido → bloqueio.

## 19. Observabilidade

Registrar:

- `tool_calls`;
- `tool_failures`;
- `unauthorized_tool_access`;
- `risk_level_usage`;
- `tool_output_schema_failures`;
- `tool_context_failures`;
- `cross_tenant_tool_attempts`;
- `external_call_blocked`;
- `admin_tool_blocked`.

Campos mínimos:

- `tool_call_id`;
- `agent_run_id`;
- `agent_name`;
- `tool_name`;
- `tool_category`;
- `risk_level`;
- `organization_id`;
- `organization_id`;
- `assessment_id`;
- `trace_id`;
- input hash;
- output hash;
- status;
- failure reason;
- duration.

Logs não devem conter:

- conteúdo integral de documentos;
- prompts completos com dados de cliente;
- secrets;
- credenciais;
- raw query text sensível;
- payload externo não redigido.

## 20. Failure Modes

Failure modes críticos:

- agente tenta usar tool proibida;
- tool retorna dados fora do organization;
- tool sem validação de schema;
- tool expõe dados sensíveis;
- tool executa ação indevida;
- tool cria side effect não declarado;
- tool `read_only` escreve estado;
- tool `draft_write` vira `final_write`;
- external call exfiltra dado;
- admin tool exposta por erro de registry;
- output inválido aceito pelo runtime.

Mitigações:

- deny by default;
- tool contract versionado;
- testes por categoria;
- audit event obrigatório;
- schema validation;
- organization guard;
- allowlist por agente;
- security event em bloqueio.

## 21. Testes Obrigatórios

Testes mínimos:

- agente não usa tool proibida;
- tool respeita organization;
- tool valida schema;
- tool bloqueia sem contexto;
- tool não executa `final_write`;
- tool não executa `admin`;
- `external_call` bloqueada por default;
- KB tool não é tratada como fonte normativa;
- Framework Mapper não cria mapping;
- Evidence Analyst não usa approval tool;
- Report Writer não altera finding aprovado;
- Tool Registry rejeita tool não registrada;
- ToolPermissionGuard registra evento de bloqueio.

Testes de matriz:

- cada agente só recebe suas tools permitidas;
- cada tool lista explicitamente agentes permitidos;
- nenhuma tool `final_write` aparece em `allowed_agents` de agentes;
- nenhuma tool `admin` aparece em `allowed_agents` de agentes.

## 22. Limitações do MVP

- Sem policy dinâmica.
- Sem runtime adaptive permissions.
- Sem sandbox por organization avançado.
- Sem controle fino por contexto semântico.
- Sem external calls habilitadas por agente.
- Sem execução real de admin tools pelo Agent Runtime.
- Sem autorização baseada em risco calculado dinamicamente.
- Sem delegação temporal de tools.

Impacto no projeto: o MVP fica mais conservador e previsível. Isso reduz risco operacional e facilita teste, auditoria e aprovação antes de produção.

## 23. Evolução Futura

Evoluções possíveis:

- policy engine dinâmico;
- tool sandboxing por organization;
- runtime adaptive tool access;
- scoring de risco por execução;
- approval-aware tools;
- temporal grants com expiração;
- per-assessment tool policy;
- semantic context restrictions;
- anomaly detection em tool usage;
- automated kill switch por risco;
- external calls via AI Gateway com DLP e budget enforcement.

Condições para evolução:

- manter deny by default;
- manter audit trail obrigatório;
- manter `final_write` fora de agentes;
- manter `admin` fora de agentes;
- exigir evals e testes de abuso antes de liberar novas categorias.

## 24. Resultado Esperado

Este documento permite:

- implementar Tool Registry;
- integrar Tool Registry com Agent Runtime;
- garantir segurança do sistema agentic;
- evitar execução indevida;
- controlar capacidades dos agentes;
- testar permissões por matriz;
- auditar uso de tools;
- separar RBAC humano de permissões agentic;
- evoluir para políticas dinâmicas sem quebrar guardrails.

Definition of done para implementação futura:

- Tool contracts versionados;
- registry central carregado em runtime;
- ToolPermissionGuard ativo;
- matriz de agente/tool testada;
- bloqueio de `final_write`, `admin` e `external_call` para agentes;
- schema validation em input/output;
- audit/security events por tool call;
- organization isolation validado;
- documentação operacional atualizada quando tool nova for adicionada.

