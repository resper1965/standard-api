---
title: "POA&M Workflow"
---

# POA&M Workflow

## Objetivo

O POA&M Workflow transforma Gap Analysis aprovado em um Plan of Action & Milestones versionado, rastreável, revisável e aprovável. O plano não é relatório final e não executa remediações; ele prepara ações operacionais futuras com responsável sugerido, prazo, evidência esperada, critério de aceite, milestones e dependências.

## Ação Executável vs Recomendação Genérica

Uma recomendação genérica descreve intenção, como "melhorar controles". Um `poam_item` executável precisa apontar para gap, requisito do framework, controle SCF, SoA item e evidência ausente ou insuficiente quando disponível. Também precisa definir `corrective_action`, `action_type`, `priority`, `severity`, `owner_role` ou `suggested_owner`, `due_date`, `expected_evidence`, `acceptance_criteria` e `status`.

A validação bloqueia ações genéricas sem rastreabilidade. Exceções administrativas só são aceitas quando há rationale explícito.

## Relação Com Gap Analysis, Maturidade, SCF e SoA

- `packages/gap-analysis` fornece a versão aprovada de Gap Analysis e seus `gap_findings`.
- `packages/soa` é a origem indireta de SoA item, framework requirement e controle SCF preservados nos gaps.
- `packages/scf-core` fornece contexto normativo de controles e domínios. Mappings não são inventados.
- Maturity Assessment é opcional no MVP. Quando um provider de maturidade está disponível, scores baixos elevam prioridade e sugerem `target_maturity_score`. Quando não está disponível, o POA&M é permitido e registra limitação em `metadata.limitations`.

## Regras de Geração

POA&M só pode ser criado a partir de Gap Analysis `approved`. Os status de gap que geram ação obrigatória são:

- `not_met`
- `partially_met`
- `not_evidenced`
- `requires_validation`
- `not_applicable_not_justified`

`not_applicable_justified` não gera ação por padrão. `met` não gera ação obrigatória no MVP.

Mapeamento inicial de ação:

- `not_evidenced` ou `evidence_gap`: `evidence_collection`
- `requires_validation` e `not_applicable_not_justified`: `validation_required`
- `documentation_gap`: `policy_update`
- `implementation_gap` ou `technical_gap`: `technical_implementation`
- `effectiveness_gap` ou `monitoring_gap`: `monitoring_improvement`
- `governance_gap`: `governance_improvement`
- `contractual_gap`: `third_party_action`

## Priorização

A prioridade considera severidade, tipo de gap, confiança de evidência, maturidade e metadados SCF disponíveis. Regras conservadoras do MVP:

- `critical` e `high` tendem a `urgent` ou `high`.
- maturidade 0-1 adiciona peso forte.
- maturidade 2 adiciona peso moderado.
- baixa confiança aumenta necessidade de validação.
- ausência de peso SCF é registrada como limitação futura, não como inferência.

## Prazos e Esforço

O serviço sugere `effort_estimate` por action type:

- `evidence_collection` e `validation_required`: `small`
- política, procedimento e treinamento: `medium`
- implementação técnica: `large`
- terceira parte: `unknown`

`due_date` é sugerido por prioridade e esforço. O usuário pode alterar prazo e esforço enquanto a versão estiver editável.

## Milestones e Dependências

Cada item gerado recebe pelo menos um milestone inicial para confirmar abordagem, owner e caminho de evidência. Dependências são detectadas de forma conservadora e não podem cruzar tenant ou assessment. A detecção mais sofisticada fica preparada para evolução futura.

## Evidência Esperada e Critério de Aceite

Todo item exige `expected_evidence` e `acceptance_criteria`. Para `evidence_collection`, a evidência esperada é um artefato aceito ou referência curta vinculada ao SoA item. Para implementação técnica, espera-se registro de mudança e evidência de operação do controle. Para monitoramento, espera-se procedimento, dashboard ou cadência de revisão.

## Versionamento e Imutabilidade

`poam_versions` usa `draft`, `under_review`, `approved`, `superseded` e `archived`. Versões aprovadas são imutáveis. Qualquer alteração posterior exige nova versão draft. O serviço pode superseder versões aprovadas anteriores quando uma nova versão é aprovada.

## Revisão e Aprovação

`submit-review` valida itens obrigatórios. A aprovação exige `approval_event_id` humano do gate `poam` e `actor_id`. O pacote POA&M valida o contrato e o API Gateway valida o approval event contra o repositório de aprovações antes de avançar o lifecycle.

## Integração Com Assessment Engine

O pacote POA&M não duplica state machine. O API Gateway chama o Assessment Engine quando a transição está disponível:

- draft criado: `poam_drafted`
- submit review: `poam_under_review`
- approval válido: `poam_approved`

O lifecycle agora permite POA&M após `gap_analysis_approved` mesmo sem maturidade aprovada, porque Maturity Assessment é opcional para este MVP.

## Integração Com Gap Analysis

O serviço busca apenas Gap Analysis `approved` e grava `source_gap_analysis_version_id`. Cada item mantém vínculo com `related_gap_finding_id`, `soa_item_id`, `framework_requirement_id`, `scf_control_id`, `framework_id` e `scf_version_id` quando esses campos existem no gap.

## Integração Com Maturity Assessment

O MVP define uma interface opcional de provider de maturidade. Como `packages/maturity` ainda não está implementado neste repositório, o pacote POA&M não cria dependência rígida. Quando a maturidade não existe, a limitação é explícita no draft. Quando existe, scores baixos elevam prioridade e sugerem alvo:

- score 0-1: alvo 3
- score 2: alvo 3
- score 3: alvo 4
- score 4-5: sem elevação obrigatória

## Limitações do MVP

- Repositórios locais são in-memory.
- Priorização, esforço, prazo e milestones são heurísticos.
- Não há execução operacional de tarefas ainda.
- Audit log persistente ainda é placeholder no gateway.
- Workflows/Queues reais ainda não orquestram o POA&M.
- O pacote `packages/maturity` ainda não existe; integração foi preparada via interface.
- Persistência PostgreSQL real depende de adapters.

## Decisões em Aberto

- Política formal de atualização pós-aprovação e comparação entre versões POA&M.
- Regras oficiais de `control_weight` SCF quando metadados reais existirem.
- Estratégia de sequenciamento de POA&M por assessment em ambiente concorrente.
- Adapter PostgreSQL transacional com locks por assessment.
- Integração operacional futura com tickets, owners reais e evidências anexadas.
