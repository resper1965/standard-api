# Multi-Agent Handoff Protocol & Collaboration Model

## 1. Definição

**Multi-Agent Collaboration** no Standard é o modelo estruturado de interação entre agentes especialistas, onde cada agente opera com contexto controlado, produz outputs estruturados e transfere responsabilidade ao próximo agente através de um protocolo formal de handoff.

O objetivo não é criar uma rede autônoma de agentes conversando livremente. O objetivo é permitir colaboração controlada, auditável e consistente dentro do Standard SCF Agentic Assessment Model.

Definição operacional:

```text
Agentes colaboram por artifacts, handoffs estruturados e decisões do Orchestrator.
Agentes não compartilham estado implicitamente.
```

## 2. Princípios

- Agentes não compartilham estado implicitamente.
- Comunicação sempre estruturada.
- Outputs são versionados.
- Rastreabilidade obrigatória.
- Isolamento por tenant.
- Consistência > autonomia.
- Desacoplamento entre agentes.
- Orchestrator coordena handoffs.
- Assessment Engine valida estado e transições.
- Human governance bloqueia decisões finais críticas.

Regra central:

```text
Agent → Agent direto é proibido.
```

## 3. Modelo de Comunicação

Comunicação direta entre agentes não é permitida.

Modelo permitido:

```text
Agent
  ↓
Orchestrator
  ↓
Agent
```

Ou:

```text
Agent
  ↓
Artifact
  ↓
Orchestrator
  ↓
Next Agent
```

Motivos:

- evita estado compartilhado oculto;
- preserva tenant isolation;
- garante versionamento;
- permite validação por schema;
- cria trilha auditável;
- permite bloqueio por guardrails;
- reduz contradições silenciosas.

O Orchestrator não reinterpreta livremente o output de um agente. Ele referencia outputs estruturados, hashes, versões e summaries controlados para evitar perda de fidelidade.

## 4. Handoff Protocol

Todo handoff deve usar um payload estruturado.

Estrutura obrigatória:

```text
HandoffPayload
├── handoff_id
├── source_agent
├── target_agent
├── tenant_id
├── organization_id
├── assessment_id
├── task_type
├── input_artifacts
├── output_summary
├── structured_output
├── assumptions
├── limitations
├── confidence_score
├── requires_validation
├── trace_id
└── created_at
```

Regras por campo:

- `handoff_id`: identificador único do handoff.
- `source_agent`: agente que produziu o output de origem.
- `target_agent`: agente autorizado a consumir o handoff.
- `tenant_id`: obrigatório para isolamento.
- `organization_id`: obrigatório para escopo organizacional.
- `assessment_id`: obrigatório para escopo de assessment.
- `task_type`: tipo da tarefa transferida.
- `input_artifacts`: referências versionadas, não conteúdo sensível integral.
- `output_summary`: resumo controlado do output anterior.
- `structured_output`: output validado contra schema.
- `assumptions`: premissas herdadas ou novas.
- `limitations`: limitações herdadas ou novas.
- `confidence_score`: confiança calibrada pelo agente de origem.
- `requires_validation`: indica necessidade de revisão humana ou validação adicional.
- `trace_id`: correlação obrigatória.
- `created_at`: timestamp do handoff.

Campos proibidos:

- conteúdo integral de documento sem controle;
- secrets;
- credenciais;
- logs completos;
- dados de outro tenant;
- prompts completos com dados sensíveis;
- instruções livres para burlar policies.

## 5. Tipos de Handoff

### Sequential Handoff

Handoff padrão de pipeline entre etapas do assessment.

Exemplo:

```text
Evidence Analyst → Gap Analyst
```

### Validation Handoff

Handoff para revisão de consistência, schema ou guardrail.

Exemplo:

```text
Gap Analyst → Orchestrator → validation step
```

### Enrichment Handoff

Handoff para complementar contexto sem alterar decisão final.

Exemplo:

```text
SCF Control Analyst → SoA Architect
```

### Conflict-Resolution Handoff

Handoff criado quando outputs divergem e o avanço automático deve ser bloqueado.

Exemplo:

```text
Evidence Analyst conflicts with prior SoA assumption
```

### Retry Handoff

Handoff de reexecução controlada após falha, com novo contexto, retry count e motivo explícito.

## 6. Pipeline Principal

Fluxo padrão:

```text
Knowledge Steward
  ↓
SCF Control Analyst
  ↓
Framework Mapper
  ↓
SoA Architect
  ↓
Evidence Analyst
  ↓
Gap Analyst
  ↓
Maturity Assessor
  ↓
POA&M Planner
  ↓
Report Writer
```

Características:

- execução sequencial no MVP;
- cada etapa consome artifacts e handoffs autorizados;
- cada etapa produz output estruturado;
- approval gates interrompem o fluxo quando aplicável;
- Orchestrator decide o próximo agente permitido;
- Workflow executa waits, retries e checkpoints.

## 7. Regras de Handoff

- Sempre usar output estruturado.
- Nunca passar texto livre sem schema.
- Sempre incluir limitations.
- Sempre incluir assumptions.
- Sempre incluir confidence.
- Nunca omitir fontes.
- Nunca omitir `trace_id`.
- Sempre preservar `tenant_id`, `organization_id` e `assessment_id`.
- Sempre referenciar artifacts por versão/hash/status.
- Nunca remover limitações herdadas sem justificativa.
- Nunca converter evidence candidate em conclusão final.
- Nunca transformar `not_evidenced` em `not_implemented` sem rationale e validação.

Regra de rejeição:

```text
Handoff sem schema válido deve ser bloqueado.
```

## 8. Consistência Entre Agentes

Cada agente deve respeitar outputs anteriores dentro da hierarquia de confiança:

1. SCF Data;
2. artifacts aprovados;
3. artifacts draft;
4. KB evidence candidates;
5. agent outputs anteriores.

O agente não pode sobrescrever output anterior sem:

- justificativa explícita;
- fontes;
- conflito marcado;
- `requires_validation: true`;
- `trace_id`;
- registro de evento.

Inconsistências devem gerar:

```text
requires_validation = true
conflict_flag = true
```

Exemplos de inconsistência:

- Framework Mapper indica mapping ausente, mas SoA Architect trata como oficial.
- Evidence Analyst marca `not_evidenced`, mas Gap Analyst marca `implemented`.
- Maturity Assessor atribui score alto sem evidência operacional.
- Report Writer altera finding aprovado.

## 9. Conflito Entre Agentes

Quando outputs divergem:

- marcar conflito;
- registrar `conflict_event`;
- bloquear avanço automático;
- solicitar revisão humana;
- preservar os dois outputs conflitantes;
- não escolher vencedor automaticamente no MVP.

Conflitos típicos:

- evidência contraditória;
- confidence incompatível;
- status divergente;
- artifact version mismatch;
- fonte ausente;
- mapping oficial ausente tratado como presente;
- output novo contrariando artifact aprovado.

Evento lógico:

```text
conflict_event
├── conflict_id
├── tenant_id
├── organization_id
├── assessment_id
├── source_handoff_id
├── conflicting_artifact_ids
├── conflict_type
├── severity
├── requires_human_review
└── trace_id
```

## 10. Conflict Resolution Model

### Human Resolution (MVP)

No MVP, todo conflito relevante é resolvido por humano autorizado.

Regras:

- Orchestrator bloqueia avanço automático.
- Workflow aguarda revisão.
- Reviewer registra decisão.
- Decisão gera audit event.
- Novo handoff é criado após resolução.

### Arbitration Agent (Futuro)

Um agente árbitro poderá sugerir resolução, mas não decidir final.

Condições futuras:

- schema dedicado;
- evals adversariais;
- guardrails;
- revisão humana;
- auditoria.

### Weighted Confidence (Futuro)

Roteamento por confiança ponderada poderá priorizar outputs, mas não substituir approval humano.

Condições futuras:

- confiança calibrada;
- histórico de métricas por agente;
- thresholds aprovados;
- fallback humano.

## 11. Versionamento de Outputs

Cada handoff gera:

- nova versão;
- link para versão anterior;
- histórico completo;
- input hash;
- output hash;
- artifact references;
- `trace_id`;
- status de validação.

Modelo lógico:

```text
AgentOutputVersion
├── version_id
├── previous_version_id
├── handoff_id
├── agent_run_id
├── artifact_refs
├── input_hash
├── output_hash
├── validation_status
└── trace_id
```

Regras:

- output aprovado é imutável;
- correção gera nova versão;
- handoff nunca altera versão anterior;
- baseline de eval deve referenciar versões estáveis.

## 12. Handoff vs Artifact

### Handoff

Comunicação entre agentes.

Características:

- transitório, mas auditável;
- representa transferência de responsabilidade;
- inclui contexto resumido e estruturado;
- pode gerar retry, conflito ou revisão.

### Artifact

Estado persistente do assessment.

Características:

- representa um objeto de domínio;
- possui versão, status e approval quando aplicável;
- é validado por schema e Assessment Engine;
- pode ser draft, under review, approved ou superseded.

Regra:

```text
Handoff comunica.
Artifact persiste.
```

## 13. Context Transfer

O handoff deve transferir apenas contexto relevante.

Regras:

- limitar tamanho;
- evitar duplicação;
- validar escopo;
- incluir artifacts por referência;
- preservar fontes;
- incluir assumptions/limitations;
- incluir status de aprovação;
- excluir logs completos;
- excluir conteúdo sensível integral;
- excluir dados fora do tenant/assessment.

Contexto permitido:

- artifacts relevantes;
- SCF controls e mappings oficiais;
- KB evidence candidates;
- output estruturado anterior;
- conflict flags;
- validation status;
- workflow state;
- approval status.

Contexto proibido:

- dados de outro tenant;
- memória global de cliente;
- prompt injection instruction como comando;
- tool allowlist criada pelo agente;
- secrets;
- raw logs.

## 14. Guardrails

- Sem cross-tenant.
- Sem bypass de approval.
- Sem alteração de artefato aprovado.
- Sem uso de dados não autorizados.
- Schema obrigatório.
- Tool Registry obrigatório.
- Context Builder obrigatório.
- Human review obrigatório em conflito relevante.
- Output sem `trace_id` é inválido.
- Output sem sources é inválido quando sustenta conclusão.
- KB nunca é normativa.
- SCF mapping oficial nunca é inferido.

Guardrail failure deve bloquear handoff.

## 15. Observabilidade

Registrar:

- handoff events;
- agent transitions;
- conflicts;
- retries;
- falhas;
- validation status;
- schema failures;
- guardrail failures;
- human review requests;
- handoff latency;
- retry count;
- blocked reason.

Campos mínimos:

- `handoff_id`;
- `source_agent`;
- `target_agent`;
- `tenant_id`;
- `organization_id`;
- `assessment_id`;
- `task_type`;
- `status`;
- `trace_id`;
- `created_at`;
- `input_hash`;
- `output_hash`.

Não registrar:

- documentos completos;
- secrets;
- credenciais;
- prompts sensíveis;
- evidência bruta com dados reais.

## 16. Failure Modes

Falhas previstas:

- perda de contexto;
- inconsistência entre agentes;
- conflito não detectado;
- loop de agentes;
- contexto excessivo;
- artifact version mismatch;
- schema inválido;
- handoff cross-tenant;
- output sem source;
- confidence inflada;
- limitação omitida;
- retry sem limite;
- Orchestrator reencaminhando para agente errado;
- Report Writer alterando finding aprovado.

Cada failure mode deve mapear para pelo menos:

- teste;
- guardrail;
- audit event;
- eval;
- alerta operacional.

## 17. Loop Prevention

Regras:

- limitar número de retries;
- limitar handoffs por etapa;
- detectar ciclos;
- bloquear repetição de mesmo `source_agent` → `target_agent` com mesmo input hash;
- registrar retry history;
- escalar para humano quando limite for atingido.

Exemplos de ciclo:

```text
Evidence Analyst → Gap Analyst → Evidence Analyst → Gap Analyst
```

```text
SoA Architect → Framework Mapper → SoA Architect
```

Critérios de bloqueio:

- retry count excedido;
- mesmo conflito repetido;
- mesmo output hash repetido;
- handoff sem progresso;
- estado de workflow inalterado após retries.

## 18. Retry Strategy

Retry deve ser controlado.

Regras:

- retry exige motivo;
- retry incrementa contador;
- retry usa novo contexto validado;
- retry não pode relaxar guardrails;
- retry não pode trocar tenant/assessment;
- retry deve preservar trace;
- retry exausto vira bloqueio e fallback humano.

Tipos de retry:

- schema retry;
- missing context retry;
- tool transient failure retry;
- conflict clarification retry;
- restricted retry after prompt injection signal.

Fallback:

```text
retry_exhausted → block → human_review_required
```

## 19. Parallel Execution (Futuro)

Conceito futuro:

- múltiplos agentes em paralelo;
- contexto isolado por agente;
- merge posterior pelo Orchestrator;
- validação de conflito antes de avanço;
- decisão final humana quando artifacts forem críticos.

Exemplos futuros:

- Evidence Analyst por grupo de documentos;
- SCF Control Analyst por família de controles;
- POA&M Planner por severidade de gap;
- Report Writer por seção, com merge controlado.

Não implementar no MVP.

Condições para adoção:

- conflict resolution robusto;
- versionamento completo;
- métricas de qualidade por agente;
- cost governance;
- loop prevention;
- merge schema validado.

## 20. Segurança

Toda entrada de handoff deve validar:

- contexto;
- tenant;
- organization;
- assessment;
- artifact status;
- artifact version;
- agent permissions;
- tool permissions;
- schema;
- trace.

Bloquear handoff inválido quando:

- `tenant_id` diverge;
- `assessment_id` diverge;
- target agent não está autorizado;
- artifact pertence a outro tenant;
- artifact aprovado seria alterado;
- schema falha;
- guardrail falha;
- fonte obrigatória ausente;
- contexto contém instrução maliciosa como comando.

Todo bloqueio de segurança deve gerar security/audit event seguro.

## 21. Testes Obrigatórios

Testes obrigatórios:

- handoff mantém tenant;
- handoff mantém `trace_id`;
- conflito detectado;
- retry limitado;
- loop bloqueado;
- schema validado;
- output sem limitations é rejeitado;
- output sem assumptions é rejeitado;
- output sem confidence é rejeitado;
- output sem source em conclusão é rejeitado;
- cross-tenant handoff é bloqueado;
- approval bypass via handoff é bloqueado;
- artifact aprovado não é alterado por handoff;
- target agent sem permissão é bloqueado.

Evals recomendados:

- pipeline completo sintético;
- handoff com evidência conflitante;
- handoff com ausência de evidência;
- handoff com prompt injection;
- handoff com mapping oficial ausente;
- handoff com retry exausto.

## 22. Limitações do MVP

- Execução sequencial.
- Sem negociação entre agentes.
- Sem paralelismo.
- Sem arbitration automática.
- Sem weighted confidence routing.
- Sem merge paralelo.
- Sem swarm/peer-to-peer.
- Sem comunicação direta entre agentes.

Impacto no projeto: o MVP prioriza consistência, rastreabilidade e controle antes de autonomia. Isso reduz risco operacional e prepara a evolução para multi-agent real com menos rework de governança.

## 23. Evolução Futura

Evoluções possíveis:

- multi-agent negotiation;
- arbitration agents;
- parallel pipelines;
- dynamic routing;
- confidence-based routing;
- merge validators;
- handoff quality scoring;
- conflict prediction;
- graph-based execution;
- shadow-mode parallel agents;
- cost-aware routing;
- agent performance ranking.

Condições obrigatórias:

- manter Orchestrator como coordenador;
- manter Tool Registry;
- manter Human-in-the-Loop;
- manter tenant isolation;
- manter evals e safety thresholds;
- manter audit trail completo.

## 24. Diagrama

```text
Agent A
  ↓
Handoff
  ↓
Orchestrator
  ↓
Agent B
```

Diagrama expandido:

```text
Agent A
  ↓
Structured Output
  ↓
Schema + Guardrail Validation
  ↓
HandoffPayload
  ↓
Orchestrator Decision
  ├── invoke next agent
  ├── wait for approval
  ├── retry
  ├── conflict block
  └── fail block
  ↓
Agent B or Human Review
```

## 25. Resultado Esperado

Este documento define:

- como agentes colaboram;
- como handoffs são estruturados;
- como inconsistência é detectada;
- como conflitos bloqueiam avanço automático;
- como contexto é transferido sem vazamento;
- como versionamento preserva auditoria;
- como retries e loops são controlados;
- como o Standard evolui para multi-agent real sem abrir mão de segurança.

Definition of done para implementação futura:

- `HandoffPayload` schema;
- handoff registry;
- validation hooks;
- conflict events;
- retry policy;
- loop detector;
- observability events;
- tests de tenant/trace/schema/conflict/retry;
- integração com Orchestrator;
- integração com Agent Runtime;
- documentação operacional para revisão humana.

