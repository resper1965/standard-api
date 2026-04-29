# SoA Workflow

## Objetivo

O SoA Workflow cria, mantém, revisa, aprova e versiona a Statement of Applicability de um assessment. No Aegis, a SoA é o artefato governante que define quais requisitos/controles entram no assessment antes de Gap Analysis, Maturity Assessment ou POA&M.

## Artefato Governante

Uma SoA aprovada fixa a base de análise do assessment: framework selecionado, versão SCF, escopo aprovado ou draft, requisitos do framework, mappings oficiais e decisões humanas de aplicabilidade. O Gap Analysis só deve operar contra uma SoA aprovada.

Versões aprovadas são imutáveis. Qualquer correção posterior deve gerar nova versão draft e só supersede a versão anterior quando a nova versão for aprovada.

## Relação Entre Framework, SCF, Escopo e KB

- `packages/scf-core` é a fonte normativa para frameworks, requirements, controles e mappings oficiais.
- `packages/soa` transforma requirements e mappings oficiais em itens de SoA rastreáveis.
- `assessment_scope` descreve limites informados pelo usuário: unidades, processos, sistemas, locais, terceiros, exclusões, premissas e restrições.
- `packages/kb` fornece evidências candidatas. Vector search não cria mapping, não decide aplicabilidade e não conclui implementação.

## Fluxo de Criação

1. O usuário cria um escopo draft via API.
2. O escopo pode ser submetido e aprovado com `approval_event`.
3. A SoA draft é criada a partir de `framework_id` e `scf_version_id`.
4. O serviço carrega requirements do framework e mappings oficiais do SCF.
5. Para cada mapping oficial, cria um item com `framework_requirement_id`, `scf_control_id`, `source_mapping_id`, `relationship_type` e `relationship_strength`.
6. Se um requirement não tiver mapping oficial, cria item sem controle SCF com `mapping_status: no_official_mapping` e `applicability_status: requires_validation`.

## Revisão e Aprovação

Durante revisão, o usuário pode atualizar `applicability_status`, `implementation_status`, rationale, cobertura de evidência e notas de validação. `submit-review` bloqueia itens `to_be_defined` sem justificativa de exceção.

A aprovação exige:

- `actor_id`;
- `trace_id`;
- `approval_event_id` humano para gate `soa`;
- SoA em `under_review`;
- validações de rationale.

## Regras de Aplicabilidade

Status suportados:

- `applicable`
- `partially_applicable`
- `not_applicable`
- `to_be_defined`
- `requires_validation`
- `out_of_scope`

`applicable` deve preservar `framework_requirement_id`. Itens com `scf_control_id` também preservam `scf_version_id`. Itens com `source_mapping_id` preservam relacionamento SCF.

## Não Aplicabilidade

`not_applicable` exige `non_applicability_rationale`. `out_of_scope` exige `scope_rationale`. Ausência de evidência nunca vira `not_applicable` automaticamente.

## Evidências Candidatas

`SoaEvidenceService` consulta a KB por requirement/control com filtros de tenant, organization e assessment. O resultado é registrado como evidência candidata e conservadora.

Se nada for encontrado, o item pode receber `implementation_status: not_evidenced`, `evidence_coverage: absent` e `applicability_status: requires_validation`. Isso não significa `not_implemented`.

## Versionamento e Imutabilidade

`soa_versions` usa `version_number` e status `draft`, `under_review`, `approved`, `superseded` e `archived`. O serviço bloqueia edição de itens quando a versão está `approved`. A supersessão de versões anteriores aprovadas ocorre apenas depois que uma nova versão é aprovada.

## Integração com Assessment Engine

O API Gateway chama o Assessment Engine quando a transição está disponível no snapshot atual:

- criação de escopo prepara `scope_drafted`;
- criação de SoA prepara `soa_drafted`;
- submissão prepara `soa_under_review`;
- approval válido prepara `soa_approved`;
- marcação de ingestão prepara `soa_ingested`.

A state machine permanece em `packages/assessment-engine`; handlers não duplicam regras de gate.

## Integração com KB

Após aprovação, a SoA recebe status de reingestão via `metadata.soa_ingestion_status`. O MVP prepara o contrato para reingestão e expõe endpoint de marcação, mas não gera embeddings reais da SoA aprovada.

## Integração com SCF Data Service

O SoA Workflow consome `ScfFrameworkService` e `ScfMappingService`. Apenas mappings oficiais (`is_official`) são usados como mapping normativo. Mappings ausentes ficam explícitos como `no_official_mapping`.

## Limitações do MVP

- Repositórios de SoA são in-memory no gateway local.
- Persistência PostgreSQL real ainda depende de adapters.
- Reingestão da SoA aprovada no KB está preparada por contrato/status, sem embedding real.
- Não há agentes LLM finais.
- Políticas RBAC/ABAC finas ainda são placeholders.

## Decisões em Aberto

- Definir política final para aprovar SoA com exceções pendentes.
- Definir adapter PostgreSQL transacional com bloqueio forte de imutabilidade.
- Definir formato documental da SoA reingerida no KB.
- Definir se `mark-ingested` será chamado por workflow, queue ou worker dedicado.
