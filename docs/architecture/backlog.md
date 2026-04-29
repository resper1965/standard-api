# Backlog Técnico

## Milestone 0: Fundação do Repositório

- Criar scaffold do monorepo.
- Documentar arquitetura inicial.
- Definir estados do lifecycle.
- Definir contrato OpenAPI inicial.
- Definir modelo relacional inicial.
- Criar `AGENTS.md`.

## Milestone 1: API e Persistência Transacional

- Escolher ORM ou query builder para PostgreSQL.
- Implementar conexão segura com PostgreSQL.
- Implementar criação e consulta de assessments.
- Implementar autenticação e autorização por tenant.
- Implementar auditoria mínima de comandos.

## Milestone 2: Ingestão e Storage

- Implementar registro de documentos.
- Definir estratégia de upload para R2.
- Criar fila de processamento de documentos.
- Implementar status de ingestão.
- Definir política de retenção e isolamento por tenant.

## Milestone 3: SCF Core

- Definir formato estruturado do SCF.
- Importar dados sintéticos ou fixture controlada.
- Implementar lookup por `scf_version`, `framework_id` e `control_id`.
- Implementar validação de mapeamentos oficiais.

## Milestone 4: Knowledge Base Auxiliar

- Implementar chunking e metadados.
- Implementar namespace por tenant/assessment no Vectorize.
- Persistir ponteiros entre chunks, documentos e evidências.
- Garantir que vector search seja usado apenas como apoio.

## Milestone 5: Workflow Durável

- Implementar transições idempotentes do lifecycle.
- Integrar Workflows com Queues.
- Implementar gates de aprovação humana.
- Adicionar reprocessamento e tratamento de falha.

## Milestone 6: Agent Runtime e Governança LLM

- Definir contratos de entrada/saída dos agentes.
- Integrar AI Gateway com metadados de rastreabilidade.
- Implementar agent runs sem dados reais.
- Adicionar avaliações e revisão humana.

## Milestone 7: Relatórios e POA&M

- Gerar Gap Analysis revisável.
- Gerar Maturity Assessment revisável.
- Gerar POA&M revisável.
- Armazenar relatórios em R2.
- Criar trilha de auditoria de aprovações.

## Milestone 8: Hardening SaaS

- Testar isolamento multi-tenant.
- Adicionar rate limiting e quotas.
- Adicionar observabilidade operacional.
- Criar backups e procedimentos de restore.
- Preparar ambientes dev/staging/prod.
