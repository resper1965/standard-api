# Human-in-the-Loop Governance

## 1. Definição

**Human-in-the-Loop Governance** no Standard é o conjunto de mecanismos que garantem que decisões críticas não sejam tomadas automaticamente por agentes, exigindo validação, revisão e aprovação humana antes de se tornarem artefatos oficiais.

Esse modelo existe para tornar o Standard auditável, controlado, aceitável em ambientes regulados e alinhado a expectativas de governança como ISO, SOC 2, auditorias internas e revisões de risco.

Princípio central:

```text
Agentes sugerem.
Humanos decidem.
```

Agentes podem gerar drafts, evidências candidatas, sugestões, análises e seções de relatório. Eles não aprovam artefatos, não finalizam achados e não assumem accountability por decisões formais.

## 2. Princípios de Governança

O modelo segue estes princípios:

- accountability humana obrigatória;
- separation of duties;
- least privilege;
- auditabilidade completa;
- non-repudiation;
- versionamento de decisões;
- reversibilidade controlada;
- rastreabilidade ponta a ponta;
- aprovação explícita por papel autorizado;
- imutabilidade de artefatos aprovados;
- ausência de auto-approval.

Regra operacional:

```text
Nenhum output agentic vira artefato oficial sem aprovação humana quando o lifecycle exige gate.
```

## 3. Artefatos que Exigem Aprovação Humana

Artefatos com approval gate:

- Scope, opcional dependendo da política do organization ou framework;
- SoA;
- Gap Analysis;
- Maturity Assessment;
- POA&M;
- Final Report.

Regra:

```text
Nenhum desses artefatos pode ser aprovado por agente.
```

Para o MVP, SoA, Gap Analysis, Maturity Assessment, POA&M e Final Report são gates obrigatórios. Scope pode ser tratado como gate opcional ou como parte do SoA approval, conforme política do organization.

## 4. Tipos de Aprovação

### Single approval

Um aprovador autorizado decide o artefato.

Uso típico:

- Scope simples;
- SoA de baixo risco;
- revisão operacional de pequena alteração.

### Multi-step approval

O artefato passa por revisão e aprovação em etapas.

Uso típico:

- Gap Analysis com achados materiais;
- Report final antes de export/publicação.

### Multi-role approval

Papéis diferentes precisam revisar/validar dimensões diferentes.

Uso típico:

- Gap Analysis com validação técnica e validação de risco;
- POA&M com validação operacional e owner de remediação;
- Report com revisão técnica e aprovação executiva.

### Conditional approval

Aprovação condicionada a ajustes, restrições ou pendências documentadas.

Uso típico:

- SoA aprovada com itens marcados como `requires_validation`;
- POA&M aprovado com milestones condicionais;
- Report aceito com limitações explícitas.

Exemplo de política:

| Artefato | Modelo recomendado | Papel mínimo |
| --- | --- | --- |
| Scope | Single approval ou integrado ao SoA | Approver técnico |
| SoA | Single approval | Aprovador técnico |
| Gap Analysis | Multi-step ou multi-role | Aprovador técnico + validação de risco |
| Maturity Assessment | Review sênior | Reviewer sênior ou approver GRC |
| POA&M | Multi-role | Validação operacional + approver |
| Final Report | Multi-step | Revisão técnica + aprovação executiva |

## 5. Modelo de Approval Workflow

Schema lógico:

```text
Approval
├── approval_id
├── organization_id
├── organization_id
├── assessment_id
├── artifact_type
├── artifact_version
├── status
│   ├── pending
│   ├── approved
│   ├── rejected
│   └── needs_revision
├── requested_by
├── assigned_to
├── approved_by
├── decision_reason
├── comments
├── created_at
├── decided_at
└── trace_id
```

Campos:

- `approval_id`: identificador único.
- `organization_id`: escopo obrigatório de organization.
- `organization_id`: escopo obrigatório de organização.
- `assessment_id`: assessment associado.
- `artifact_type`: Scope, SoA, Gap Analysis, Maturity, POA&M ou Report.
- `artifact_version`: versão exata em revisão.
- `status`: estado de aprovação.
- `requested_by`: ator que solicitou revisão.
- `assigned_to`: humano ou grupo responsável pela revisão.
- `approved_by`: humano que aprovou, quando aplicável.
- `decision_reason`: justificativa da decisão.
- `comments`: comentários de revisão.
- `created_at`: timestamp de criação.
- `decided_at`: timestamp de decisão.
- `trace_id`: rastreabilidade ponta a ponta.

Regra: `approved_by` nunca pode ser agente, sistema genérico ou processo automatizado.

## 6. Estados de Aprovação

Estados:

- `pending`;
- `in_review`;
- `approved`;
- `rejected`;
- `requires_revision`.

Regras:

- Apenas `approved` permite avanço do workflow.
- `pending` e `in_review` mantêm o workflow em espera.
- `rejected` bloqueia avanço.
- `requires_revision` reinicia ciclo de draft/review.
- Estado de aprovação deve ser validado contra a versão do artefato.

Normalização: se a implementação usar `needs_revision`, ela deve ser tratada como equivalente operacional de `requires_revision`.

## 7. Integração com Workflow

Workflow deve:

- parar em approval gates;
- emitir evento `waiting_for_approval`;
- aguardar signal humano;
- validar approval no banco/repositório transacional;
- validar organization, organization, assessment e artifact version;
- continuar somente após approval válido.

Workflow nunca deve:

- auto-approve;
- bypass approval;
- aceitar signal sem approval event;
- aceitar approval de outro organization;
- avançar com artifact version diferente da aprovada;
- fechar assessment sem report acceptance.

Fluxo:

```text
Workflow step reaches gate
  ↓
workflow emits waiting_for_approval
  ↓
approval request is created
  ↓
human reviews artifact
  ↓
human approves/rejects/requires revision
  ↓
workflow receives signal
  ↓
workflow validates approval
  ↓
Assessment Engine validates transition
  ↓
workflow continues or blocks
```

## 8. Integração com Orchestrator

Orchestrator deve:

- detectar necessidade de aprovação;
- retornar `wait_for_approval`;
- incluir `requires_human_review: true`;
- explicar o motivo da espera;
- preservar `trace_id`;
- nunca decidir aprovação.

Orchestrator nunca deve:

- substituir o aprovador;
- marcar approval como concluído;
- pular gate;
- inferir aprovação por ausência de rejeição;
- usar output de agente como aprovação.

Contrato esperado:

```text
next_action: wait_for_approval
requires_human_review: true
decision_reason: artifact requires human approval gate
```

## 9. Papéis Envolvidos

### Assessor

Responsável por criar ou revisar drafts operacionais.

Pode:

- iniciar ou apoiar assessment;
- revisar outputs de agentes;
- solicitar nova versão de draft;
- preparar material para review.

Não pode:

- aprovar artefato que criou, quando separation of duties se aplica;
- bypassar gate.

### Reviewer

Responsável por revisar conteúdo antes da aprovação formal.

Pode:

- comentar;
- solicitar revisão;
- validar coerência técnica;
- sinalizar riscos.

Não pode:

- aprovar formalmente sem permissão explícita.

### Approver

Responsável por aprovação formal.

Pode:

- aprovar;
- rejeitar;
- solicitar revisão;
- registrar decisão e justificativa.

Deve:

- ter permissão explícita;
- pertencer ao mesmo organization;
- ter acesso ao assessment;
- ser humano identificável.

### Auditor

Responsável por leitura e verificação independente.

Pode:

- consultar artefatos aprovados;
- consultar audit trail;
- verificar decisions e versions.

Não pode:

- alterar drafts;
- aprovar;
- administrar sistema.

### Admin

Responsável por gestão do sistema, políticas e configuração.

Pode:

- configurar papéis e permissões;
- gerenciar organizations conforme política;
- operar controles administrativos.

Não deve:

- substituir approval de negócio sem atribuição formal;
- acessar conteúdo de cliente fora de política explícita.

## 10. Separation of Duties

Regra obrigatória:

```text
Quem cria NÃO aprova.
```

Exemplo:

```text
Agente cria SoA draft
  ↓
Assessor revisa
  ↓
Approver aprova
```

Regras:

- agente nunca aprova;
- humano que criou ou solicitou draft não deve ser aprovador final do mesmo artefato;
- reviewer não é automaticamente approver;
- admin não substitui approver de negócio por padrão;
- exceções exigem policy explícita, justificativa e audit event.

## 11. Regras de Autorização

Para aprovar, o usuário precisa:

- role apropriada;
- permissão explícita;
- mesmo `organization_id`;
- acesso ao `organization_id`;
- acesso ao `assessment_id`;
- assignment ou escopo de responsabilidade válido;
- sessão/autenticação válida;
- não violar separation of duties.

Permissões mínimas:

- `scope:approve`, quando Scope for gate;
- `soa:approve`;
- `gap:approve`;
- `maturity:approve`;
- `poam:approve`;
- `report:approve`.

Regras de bloqueio:

- usuário sem permissão → deny;
- organization divergente → deny + security event;
- artifact version divergente → deny;
- approval duplicado → deny/idempotent no-op conforme policy;
- artefato já aprovado → deny para alteração direta.

## 12. Imutabilidade

Após aprovação:

- artefato não pode ser alterado;
- apenas nova versão pode ser criada;
- histórico deve ser preservado;
- approval deve referenciar versão exata;
- hash ou checksum do artefato aprovado deve ser preservado quando aplicável.

Correções pós-approval:

```text
approved artifact v1
  ↓
change requested
  ↓
new draft v2
  ↓
review/approval cycle
  ↓
approved artifact v2
```

Nunca editar `v1` aprovado in-place.

## 13. Versionamento

Cada aprovação deve gerar ou fixar:

- versão do artefato;
- referência à versão anterior;
- trilha completa de mudanças;
- autor do draft;
- reviewer/approver;
- timestamps;
- decision reason;
- trace.

Versionamento deve permitir:

- comparar versões;
- reconstruir decisão;
- demonstrar que approval ocorreu sobre conteúdo específico;
- auditar reprocessamento;
- preservar artefatos aprovados imutáveis.

## 14. Audit Trail

Registrar:

- quem aprovou;
- quando aprovou;
- o que aprovou;
- versão;
- comentários;
- decisão: approve, reject ou requires revision;
- `trace_id`;
- organization/organization/assessment;
- role e permissões relevantes;
- origem do signal;
- artifact hash, quando disponível.

Eventos mínimos:

- `approval_created`;
- `approval_in_review`;
- `approval_approved`;
- `approval_rejected`;
- `approval_requires_revision`;
- `approval_permission_denied`;
- `cross_tenant_approval_attempt`;
- `approval_duplicate_attempt`;
- `approved_artifact_mutation_attempt`.

Audit logs não devem conter conteúdo sensível integral de documentos, prompts completos, secrets ou credenciais.

## 15. Rejeição e Revisão

Se rejeitado:

- status muda para `requires_revision` ou `rejected`;
- workflow permanece bloqueado;
- comentários e decision reason são obrigatórios;
- agente pode gerar novo draft somente por fluxo controlado;
- nova versão deve ser criada;
- processo de revisão reinicia.

Fluxo:

```text
draft submitted
  ↓
human rejects / requires revision
  ↓
decision reason recorded
  ↓
workflow blocked for revision
  ↓
agent/assessor produces new draft version
  ↓
approval request restarts
```

## 16. Accountability

Toda decisão formal deve ser atribuída a um humano identificável.

Permitido:

- humano autenticado;
- identity provider user id;
- enterprise identity;
- service desk identity humana vinculada, quando auditável.

Nunca permitido:

- sistema;
- agente;
- LLM;
- service account genérica;
- "admin" sem identidade individual;
- aprovação implícita por timeout.

Accountability exige non-repudiation: a decisão precisa ser vinculada a identidade, timestamp, artifact version e trace.

## 17. Segurança

Controles obrigatórios:

- impedir aprovação via API sem auth;
- impedir aprovação cross-organization;
- impedir aprovação duplicada;
- impedir alteração pós-approval;
- validar role e permission;
- validar assessment access;
- validar artifact version;
- validar separation of duties;
- registrar security event em tentativa indevida;
- aplicar rate limiting em endpoints de approval;
- retornar erros seguros sem vazar dados sensíveis.

Security events:

- `approval_permission_denied`;
- `cross_tenant_approval_attempt`;
- `approval_without_auth_attempt`;
- `approval_duplicate_attempt`;
- `approved_artifact_mutation_attempt`;
- `approval_sod_violation_attempt`.

## 18. UX Lógico

Sem definir frontend, o fluxo lógico esperado é:

1. Agente gera draft.
2. Sistema registra draft.
3. Usuário recebe tarefa de aprovação.
4. Usuário revisa.
5. Usuário aprova, rejeita ou solicita revisão.
6. Workflow continua ou permanece bloqueado.

Informações mínimas para a tarefa de aprovação:

- artifact type;
- artifact version;
- resumo;
- fontes;
- assumptions;
- limitations;
- diff contra versão anterior, quando aplicável;
- decision options;
- campos de comentário/justificativa;
- trace/audit metadata.

## 19. Failure Modes

Failure modes críticos:

- aprovação sem permissão;
- aprovação cruzada de organization;
- aprovação duplicada;
- bypass de workflow;
- artefato alterado após aprovação;
- ausência de audit trail;
- aprovação por agente;
- aprovação por conta genérica;
- approval sobre versão errada;
- separation of duties violada;
- rejeição sem motivo;
- workflow continua com status não aprovado.

Mitigações:

- RBAC explícito;
- TenantGuard;
- immutable artifacts;
- version binding;
- audit events;
- approval status validation;
- workflow waits;
- Assessment Engine gates;
- tests/evals de bypass.

## 20. Testes Obrigatórios

Testes mínimos:

- agente não aprova artefato;
- usuário sem permissão não aprova;
- aprovação requer organization correto;
- aprovação muda estado;
- rejeição bloqueia workflow;
- artefato aprovado não pode ser editado;
- nova versão pode ser criada;
- audit log é gerado;
- separation of duties validado.

Testes adicionais:

- approval signal sem approval event é bloqueado;
- approval de artifact version errada é bloqueado;
- duplicate approval é bloqueado ou tratado idempotentemente conforme policy;
- report não fecha assessment sem acceptance;
- admin sem assignment não aprova artefato de cliente;
- auditor_readonly não aprova;
- agent runtime não possui approval tools;
- cross-organization approval gera security event.

## 21. Integração com Observabilidade

Registrar eventos operacionais:

- `approval_created`;
- `approval_approved`;
- `approval_rejected`;
- `approval_requires_revision`;
- `approval_permission_denied`;
- `approval_wait_started`;
- `approval_wait_completed`;
- `approval_signal_received`;
- `approval_signal_invalid`.

Métricas:

- approvals pending count;
- approvals approved count;
- approvals rejected count;
- approval cycle time;
- approval denial count;
- cross-organization approval attempt count;
- revision rate;
- stale approval count, futuro.

Cada evento deve carregar:

- `trace_id`;
- `organization_id`;
- `organization_id`;
- `assessment_id`;
- `artifact_type`;
- `artifact_version`;
- `actor_id`;
- role;
- status;
- decision reason hash ou metadata segura.

## 22. Integração com Security

Gerar security events:

- `approval_permission_denied`;
- `cross_tenant_approval_attempt`;
- `approval_without_auth_attempt`;
- `approved_artifact_mutation_attempt`;
- `approval_sod_violation_attempt`.

Integração com segurança:

- Auth middleware valida identidade.
- Organization middleware resolve organization.
- RBAC valida permissão.
- TenantGuard bloqueia divergência.
- Assessment Engine valida gate.
- Audit service registra decisão.
- Security event service registra tentativa indevida.

## 23. Limitações do MVP

- Sem multi-level approval avançado.
- Sem delegation complexa.
- Sem SLA de aprovação.
- Sem automação de reminder.
- Sem assinatura digital formal.
- Sem integração real com IdP corporativo.
- Sem assignment sofisticado por conflito de interesse.
- Sem policy dinâmica por risco.

Impacto no projeto: o MVP ainda é governado e auditável, mas usa regras mais simples. Produção regulada deve exigir evolução de identity, assignment, multi-role approval e retenção/auditoria persistente.

## 24. Evolução Futura

Evoluções previstas:

- multi-level approvals;
- approval SLA;
- escalation automática;
- integração com e-mail/Slack;
- assinatura digital;
- aprovação via identidade corporativa e SSO;
- trilha de auditoria compatível com ISO/SOC2;
- approval policies por organization/framework;
- conflict-of-interest checks;
- delegation com validade temporal;
- evidence package para auditoria;
- legal hold e retention policy;
- export de audit trail para compliance.

Condição para evolução: nenhuma automação futura pode transformar aprovação humana em auto-approval. Escalation e reminders podem mover tarefas, mas não decidir pelo humano.

## 25. Resultado Esperado

Este documento define:

- onde humanos intervêm;
- como approvals funcionam;
- quais artefatos exigem gate;
- quais papéis existem;
- como separation of duties é aplicada;
- como decisões são versionadas e auditadas;
- como o workflow e Orchestrator aguardam aprovação;
- como o Standard impede decisões automáticas críticas.

Definition of done para implementação futura:

- approval workflow persistente;
- approval schema validado;
- RBAC aplicado a approvals;
- TenantGuard aplicado a approvals;
- separation of duties testado;
- artefatos aprovados imutáveis;
- versionamento de artefatos aprovado;
- audit/security events emitidos;
- Workflow waits integrados;
- Assessment Engine gates impossíveis de bypassar;
- agent runtime sem approval capability.

