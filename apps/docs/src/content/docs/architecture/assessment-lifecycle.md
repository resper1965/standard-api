---
title: "Estados do Assessment Lifecycle"
---

# Estados do Assessment Lifecycle

## Estados Canônicos

1. `draft`: assessment criado, ainda sem execução.
2. `documents_uploaded`: há pelo menos um documento associado.
3. `documents_ingested`: extração, normalização, chunking e KB concluídos ou formalmente dispensados.
4. `scf_pre_analysis_ready`: análise preliminar contra controles globais do SCF registrada.
5. `framework_selected`: standard/framework suportado foi associado ao assessment.
6. `scope_drafted`: escopo preliminar criado.
7. `soa_drafted`: versão draft de SoA criada.
8. `soa_under_review`: SoA submetida para revisão humana.
9. `soa_approved`: SoA aprovada por approval gate.
10. `soa_ingested`: SoA aprovada reingerida na Knowledge Base.
11. `evidence_analysis_ready`: matriz de evidências ou findings preliminares disponíveis.
12. `gap_analysis_drafted`: versão draft do Gap Analysis criada.
13. `gap_analysis_under_review`: Gap Analysis submetido para revisão humana.
14. `gap_analysis_approved`: Gap Analysis aprovado por approval gate.
15. `maturity_assessed`: avaliação de maturidade executada.
16. `maturity_under_review`: maturidade submetida para revisão humana.
17. `maturity_approved`: maturidade aprovada por approval gate.
18. `poam_drafted`: versão draft do POA&M criada.
19. `poam_under_review`: POA&M submetido para revisão humana.
20. `poam_approved`: POA&M aprovado por approval gate.
21. `report_generated`: relatório gerado.
22. `closed`: assessment encerrado.
23. `archived`: assessment arquivado.
24. `cancelled`: assessment cancelado por usuário autorizado.
25. `failed`: falha técnica ou de integridade que exige intervenção.
26. `blocked`: assessment bloqueado por pendência operacional.

## Gates de Aprovação Humana

Os estados abaixo não podem avançar automaticamente:

- `soa_under_review`
- `gap_analysis_under_review`
- `maturity_under_review`
- `poam_under_review`

## Transições de Rejeição (Rework Loops)

Cada gate de aprovação humana pode resultar em rejeição, retornando o assessment ao estado de draft para rework:

| De | Para | Evento |
|----|------|--------|
| `soa_under_review` | `soa_drafted` | `soa_rejected` |
| `gap_analysis_under_review` | `gap_analysis_drafted` | `gap_analysis_rejected` |
| `maturity_under_review` | `maturity_assessed` | `maturity_rejected` |
| `poam_under_review` | `poam_drafted` | `poam_rejected` |

## Reprocessamento e Rastreabilidade

- Quando um artifact é rejeitado, registra-se: `rejectedBy`, `rejectedAt`, `rejectionReason`.
- Uma nova versão (rework) é criada com `supersedesVersionId` apontando para a versão rejeitada.
- O artifact rejeitado torna-se imutável com status `rejected`.
- Artifacts aprovados são imutáveis; correções geram nova versão.
- Todo reprocessamento deve registrar motivo, versão anterior, versão nova, ator e trace.

## Regras de Transição

- O frontend nunca altera estado diretamente; ele envia comandos para a API.
- Workflows é o único componente responsável por avanço durável de estado.
- Jobs assíncronos devem ser idempotentes.
- Falhas recuperáveis devem usar retry; falhas definitivas devem registrar `failed` com motivo rastreável.
- Nenhum achado final pode existir sem `organization_id`, `assessment_id`, `scf_version`, `framework_id`, `control_id`, `evidence_id`, `agent_run_id` e `confidence`.
