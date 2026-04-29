# Agentes do Aegis

Nesta fase não há código de agente LLM. Este documento define papéis arquiteturais, contratos futuros e limites de responsabilidade.

## Agentes Planejados

- **Document Ingestion Agent**: extrai texto e metadados de documentos enviados.
- **Evidence Normalization Agent**: normaliza evidências e preserva origem/rastreabilidade.
- **SCF Preliminary Analysis Agent**: compara evidências contra controles globais do SCF sem decidir aplicabilidade final.
- **Scope & SoA Agent**: propõe escopo e Statement of Applicability para aprovação humana.
- **Gap Analysis Agent**: identifica lacunas com base em documentos, SCF estruturado e SoA aprovado.
- **Maturity Assessment Agent**: avalia maturidade contra framework escolhido.
- **POA&M Agent**: propõe plano de ação e milestones de remediação.
- **Traceability Auditor Agent**: verifica se achados têm IDs, evidências, versão SCF e confiança.

## Procedimentos Reutilizáveis

- **SCF Control Mapping Procedure**: sempre consultar `packages/scf-core` antes de usar Vectorize.
- **Evidence Qualification Procedure**: diferenciar evidência direta, indireta, contraditória e não evidenciada.
- **Human Approval Gate Procedure**: bloquear conclusão de SoA, Gap Analysis, Maturity e POA&M sem aprovação humana.
- **Traceability Enforcement Procedure**: rejeitar achados sem contexto completo.
- **LLM Call Governance Procedure**: toda chamada LLM futura deve passar pelo AI Gateway com metadados de tenant, assessment e agent run.
- **Tenant Isolation Procedure**: filtrar dados por `tenant_id` em PostgreSQL, R2 keys, Vectorize namespaces e logs.
