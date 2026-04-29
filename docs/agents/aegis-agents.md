# Aegis SCF Agentic Assessment Model

O Aegis SCF Agentic Assessment Model é um modelo de IA agêntica para conduzir assessments baseados no Secure Controls Framework, no qual agentes especializados colaboram sob orquestração controlada para ingerir documentos, construir KB, mapear frameworks, gerar SoA, avaliar evidências, produzir Gap Analysis, medir maturidade, gerar POA&M e preparar relatórios, sempre com rastreabilidade, validação de schema, controle de escopo e aprovação humana.

Nesta fase, o runtime de agentes é contratual e testável com mocks. O modelo agentic é implementado de forma controlada por workflows, Assessment Engine, schemas e approval gates; agentes LLM futuros não terão autoridade para aprovar artefatos finais, alterar estados diretamente ou criar mappings oficiais ausentes.

## Estrutura Conceitual

```text
Aegis SCF Agentic Assessment Model
├── Orchestrator / Workflow Layer
│   └── controla lifecycle, signals, waits e próximos passos permitidos
├── Specialist Agents
│   ├── Knowledge Steward
│   ├── SCF Control Analyst
│   ├── Framework Mapper
│   ├── SoA Architect
│   ├── Evidence Analyst
│   ├── Gap Analyst
│   ├── Maturity Assessor
│   ├── POA&M Planner
│   └── Report Writer
├── Tool Layer
│   ├── SCF Data Service
│   ├── KB Search
│   ├── Document Ingestion
│   ├── Assessment Engine
│   ├── Reporting
│   └── Approval/Audit APIs
├── Memory / State
│   ├── PostgreSQL
│   ├── R2
│   ├── Vectorize
│   └── Audit Trail
└── Human Governance
    ├── approval gates
    ├── review
    └── final accountability
```

## Comportamento Agentic Alvo

1. Recebe assessment novo.
2. Verifica documentos disponíveis.
3. Aciona ingestão.
4. Consulta SCF estruturado.
5. Aguarda escolha de framework.
6. Propõe SoA.
7. Aguarda aprovação.
8. Executa Evidence Analysis.
9. Gera Gap Analysis.
10. Aguarda aprovação.
11. Mede maturidade.
12. Gera POA&M.
13. Gera relatório.
14. Fecha assessment.

## Agentes Planejados

- **Knowledge Steward**: organiza documentos, chunks, KB e evidências recuperadas; não decide compliance.
- **SCF Control Analyst**: interpreta controles SCF; não cria mapping oficial ausente.
- **Framework Mapper**: consulta mappings oficiais SCF; não inventa crosswalks.
- **SoA Architect**: propõe escopo e Statement of Applicability para aprovação humana.
- **Evidence Analyst**: classifica evidências e preserva origem/rastreabilidade.
- **Gap Analyst**: identifica gaps com base em SoA aprovada, evidências e SCF estruturado.
- **Maturity Assessor**: sugere maturidade com score conservador e limitações explícitas.
- **POA&M Planner**: propõe plano de ação, milestones, expected evidence e acceptance criteria.
- **Report Writer**: prepara relatórios a partir de fontes aprovadas, sem alterar achados finais.

## Procedimentos Reutilizáveis

- **SCF Control Mapping Procedure**: sempre consultar `packages/scf-core` antes de usar Vectorize.
- **Evidence Qualification Procedure**: diferenciar evidência direta, indireta, contraditória e não evidenciada.
- **Human Approval Gate Procedure**: bloquear conclusão de SoA, Gap Analysis, Maturity e POA&M sem aprovação humana.
- **Traceability Enforcement Procedure**: rejeitar achados sem contexto completo.
- **LLM Call Governance Procedure**: toda chamada LLM futura deve passar pelo AI Gateway com metadados de tenant, assessment e agent run.
- **Tenant Isolation Procedure**: filtrar dados por `tenant_id` em PostgreSQL, R2 keys, Vectorize namespaces e logs.
