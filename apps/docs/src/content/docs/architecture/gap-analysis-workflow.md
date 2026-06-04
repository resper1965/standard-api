---
title: "Evidence Analysis e Gap Analysis Workflow"
---

# Evidence Analysis e Gap Analysis Workflow

## Objetivo do Evidence Analysis

O Evidence Analysis classifica evidências candidatas recuperadas da Knowledge Base contra itens da SoA aprovada. Ele cria `evidence_findings` rastreáveis e `evidence_sources` apontando para documento, chunk, vector reference, score e snippet curto.

## Objetivo do Gap Analysis

O Gap Analysis gera uma versão draft de achados frente ao framework selecionado, aos requirements e aos controles SCF oficialmente preservados na SoA aprovada. Ele não gera Maturity Assessment, POA&M ou relatório final.

## Relação Entre SoA, KB, SCF e Framework

- `packages/soa` fornece a SoA aprovada e seus itens aplicáveis, parcialmente aplicáveis ou justificados como não aplicáveis.
- `packages/scf-core` continua sendo a fonte normativa para framework, requirements, controles e mappings oficiais.
- `packages/kb` fornece evidência candidata por organization e assessment.
- `packages/gap-analysis` combina esses insumos sem inventar mappings e sem tratar vector search como conclusão.

## Evidência Candidata, Aceita e Conclusão

Resultados da KB são `candidate_evidence: true`. Uma evidência candidata pode virar `evidence_status: candidate`, `accepted`, `insufficient`, `conflicting` ou `not_evidenced`, mas a primeira versão mantém classificação conservadora e exige revisão humana para conclusões finais.

Conclusões de gap ficam em `gap_findings` e preservam separadamente:

- evidência encontrada;
- força da evidência;
- lacuna;
- inferência;
- limitação;
- recomendação preliminar.

## Classificação de Evidência

Status de força:

- `strong`
- `partial`
- `weak`
- `absent`
- `conflicting`
- `not_checked`

Regras iniciais:

- sem resultados KB: `evidence_strength = absent`, `evidence_status = not_evidenced`;
- resultado parcial: `partial`;
- resultado fraco: `weak` e `insufficient`;
- sinais conflitantes ou negativos explícitos: `conflicting`;
- evidência forte ainda é candidata e não é, por si só, conclusão normativa.

## Status do Gap Analysis

Versões usam `draft`, `under_review`, `approved`, `superseded` e `archived`. Achados usam `met`, `partially_met`, `not_met`, `not_evidenced`, `not_applicable_justified`, `not_applicable_not_justified` e `requires_validation`.

## `not_evidenced` Não É `not_implemented`

Ausência de evidência indica que a KB consultada não trouxe material suficiente. Isso não prova que o controle não existe ou não foi implementado. `not_met` só deve ser usado quando houver evidência explícita de não atendimento ou lacuna clara com rationale.

## Fluxo de Criação

1. O serviço recebe `assessment_id` e `soa_version_id`.
2. Valida que a SoA existe, pertence ao organization/assessment e está `approved`.
3. Para cada item de SoA, busca evidências candidatas na KB limitada ao organization e assessment.
4. Gera ou atualiza `evidence_findings`.
5. Preserva fontes em `evidence_sources` com snippet curto.
6. Cria `gap_analysis_version` em `draft`.
7. Gera `gap_findings` ligados a SoA item, framework requirement, SCF control e evidence finding.

## Revisão e Aprovação

`submit-review` valida findings obrigatórios antes de mover a versão para `under_review`. `approve` exige `actor_id` e `approval_event_id` humano do gate `gap_analysis`.

Versões aprovadas são imutáveis. Qualquer alteração posterior deve gerar nova versão draft, e versões aprovadas anteriores podem ser marcadas como `superseded`.

## Integração com Assessment Engine

O API Gateway chama o Assessment Engine quando a transição está disponível:

- Evidence Analysis concluído: `evidence_analysis_ready`;
- Gap draft criado: `gap_analysis_drafted`;
- Submit review: `gap_analysis_under_review`;
- Approval válido: `gap_analysis_approved`.

A state machine não é duplicada no pacote de Gap Analysis.

## Integração com KB

A busca usa `KbSearchService` com contexto de `organization_id`, `organization_id` e `assessment_id`. Sources armazenam apenas ponteiros e snippets, nunca documentos completos.

## Integração com SCF Data Service

O Gap Analysis usa `framework_requirement_id`, `scf_control_id` e `scf_version_id` preservados nos itens da SoA. Se metadados adicionais forem necessários, devem vir de `packages/scf-core`. Mappings ausentes não são inferidos.

## Limitações do MVP

- Repositórios são in-memory no gateway local.
- Classificação é heurística e conservadora; interfaces estão prontas para agentes LLM schema-validated.
- Persistência PostgreSQL real ainda depende de adapters.
- Workflows/Queues reais ainda não orquestram o processo.
- RBAC/ABAC fino e audit log persistente seguem como placeholders.

## Decisões em Aberto

- Critérios formais para promover `candidate` para `accepted`.
- Política de confiança mínima para `met` sem validação humana adicional.
- Adapter PostgreSQL transacional com imutabilidade reforçada.
- Design de jobs assíncronos para reprocessamento em massa.
- Avaliação de qualidade de retrieval separada do julgamento de gap.
