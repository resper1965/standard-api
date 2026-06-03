---
title: "Reporting & Export Workflow"
---

# Reporting & Export Workflow

## Objetivo

O Reporting & Export Workflow gera relatórios versionados, exports estruturados e artefatos de auditoria a partir dos artefatos aprovados do assessment. Ele não decide compliance, não altera SoA, Gap Analysis, Maturity Assessment ou POA&M, e não usa Vectorize como fonte normativa.

## Tipos de Relatório e Export

Tipos de relatório suportados no contrato:

- `full_assessment_report`
- `executive_summary`
- `soa_export`
- `gap_analysis_report`
- `maturity_report`
- `poam_report`
- `audit_package`
- `machine_readable_export`

Formatos suportados no contrato:

- `json`
- `markdown`
- `html`
- `docx`
- `pdf`
- `csv`
- `xlsx`
- `zip`

O MVP implementa JSON e Markdown. HTML é derivado simples de Markdown. DOCX/PDF ficam como interface e placeholders documentados para renderer server-side futuro.

## Fontes Exigidas

`full_assessment_report` exige:

- SoA `approved`;
- Gap Analysis `approved`;
- Maturity Assessment `approved` ou limitação registrada;
- POA&M `approved` ou limitação registrada.

SoA e Gap Analysis ausentes ou não aprovados bloqueiam o relatório completo por padrão. Maturity e POA&M podem ficar ausentes no MVP, desde que a limitação seja preservada em `metadata.limitations`.

Relatórios parciais podem usar o artefato aprovado correspondente.

## Versionamento e Imutabilidade

`report_versions` usa `draft`, `under_review`, `approved`, `superseded` e `archived`. Relatório aprovado é imutável. Alterações após aprovação exigem nova versão. Quando uma nova versão do mesmo `report_type` é aprovada, versões aprovadas anteriores podem ser marcadas como `superseded`.

Cada versão preserva:

- `source_soa_version_id`;
- `source_gap_analysis_version_id`;
- `source_maturity_assessment_version_id`, quando houver;
- `source_poam_version_id`, quando houver;
- `framework_id`;
- `scf_version_id`;
- `trace_id`.

## Estrutura do Relatório Completo

O relatório completo contém seções mínimas:

1. Cover / Metadata
2. Executive Summary
3. Assessment Scope
4. Methodology
5. SCF and Framework Basis
6. Statement of Applicability Summary
7. Evidence and Gap Analysis Summary
8. Detailed Gap Findings
9. Maturity Assessment Summary
10. Maturity by Domain
11. POA&M Summary
12. Detailed POA&M
13. Limitations and Assumptions
14. Traceability Appendix
15. Evidence Index
16. Approval and Version History

## Evidência e Rastreabilidade

O relatório não inclui documentos completos por padrão. O índice de evidências usa referências seguras: IDs de finding, SoA item, documento/chunk quando disponíveis e snippets/resumos curtos.

Toda afirmação relevante deve apontar para artefato-fonte ou aparecer como limitação, premissa ou recomendação. Vector search continua sendo apenas mecanismo de recuperação da KB; a base normativa permanece em `packages/scf-core`.

## Storage R2-Compatible

`report_artifacts` registra metadados de armazenamento e `content_hash`. O storage adapter local usa provider `r2_compatible_mock` e chave segura:

```text
tenants/{tenant_id}/organizations/{organization_id}/assessments/{assessment_id}/reports/{report_version_id}/{artifact_type}.{format}
```

Download URL é placeholder e respeita tenant/assessment, com expiração documentada.

## Segurança e Multi-Tenancy

Todo serviço exige `tenant_id`, `organization_id`, `assessment_id` e `trace_id`. Criação, renderização, storage e aprovação exigem `actor_id`. Repositórios in-memory filtram por tenant e assessment. Export sem tenant context é bloqueado.

## Integrações

- Assessment Engine: a API avança para `report_generated` quando a transição está disponível. O approval formal usa gate `report`.
- SoA: o relatório inclui contagens por `applicability_status`.
- Gap Analysis: o relatório inclui resumo por status e findings detalhados.
- Maturity: integração preparada por provider opcional.
- POA&M: o relatório inclui ações por prioridade, status, owner role, evidências esperadas e critérios de aceite quando há versão aprovada.
- SCF Data Service: `framework_id` e `scf_version_id` são preservados; mappings não são inventados.

## Limitações do MVP

- Repositórios são in-memory.
- JSON e Markdown são os formatos reais implementados.
- DOCX/PDF são placeholders.
- Export jobs são executados de forma síncrona no mock, embora o contrato represente fila/job.
- Audit log persistente ainda é placeholder no API Gateway.
- `packages/maturity` ainda não existe; a maturidade é provider opcional.
- Storage R2 real depende de adapter Cloudflare futuro.

## Decisões em Aberto

- Renderer final de PDF/DOCX e ambiente de execução.
- Adapter PostgreSQL transacional para reporting.
- Política formal de audit package ZIP e inclusão controlada de evidências completas.
- Fechamento automático do assessment após report aprovado versus aprovação manual final.
