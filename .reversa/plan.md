# Plano de Exploração — standard-api

> Criado pelo Reversa em 2026-05-01
> Atualizado em 2026-05-23 por Antigravity
> Marque cada tarefa com ✅ quando concluída.

---

## Fase 1: Reconhecimento 🔍

- [x] **Scout** — Mapeamento de estrutura de pastas e tecnologias
- [x] **Scout** — Análise de dependências e gerenciadores de pacotes
- [x] **Scout** — Identificação de entry points, CI/CD e configurações

## Fase 2: Escavação 🏗️

- [x] **Arqueólogo** — Análise dos 19 módulos do workspace (packages, apps, workers)

## Fase 3: Interpretação 🧠

- [x] **Arquiteto** — Diagramas C4 (Contexto, Containers, Componentes)
- [x] **Arquiteto** — Diagrama de dependências entre packages
- [x] **Arquiteto** — State Machine do Assessment Lifecycle
- [x] **Arquiteto** — Identity & RBAC Model (Better Auth mapping)
- [x] **Detetive** — Arqueologia Git e ADRs retroativos
- [x] **Detetive** — Regras de negócio implícitas e máquinas de estado
- [x] **Detetive** — Matriz de permissões (RBAC/ACL)
- [x] **Arquiteto** — ERD completo e integrações externas
- [x] **Arquiteto** — Spec Impact Matrix

## Fase 4: Geração 📝

- [x] **Redator** — Specs SDD por componente (6 documentos)
- [x] **Redator** — Índice de navegação (00-indice.md)
- [x] **Redator** — Resumo executivo integrado
- [ ] **Redator** — OpenAPI (já existente em `docs/api/`)
- [ ] **Redator** — User Stories (escopo futuro)

## Fase 5: Revisão ✅

- [x] **Revisor** — Revisão cruzada de specs
- [x] **Revisor** — Commit final no GitHub
- [x] **Revisor** — State.json atualizado para `concluido`

---

## Agentes Independentes

> Execute estes agentes quando os recursos estiverem disponíveis — podem rodar em qualquer fase.

- [ ] **Visor** — Análise de interface via screenshots
- [ ] **Data Master** — Análise completa do banco de dados
- [x] **Design System** — Extração de tokens de design
- [ ] **Tracer** — Análise dinâmica (requer sistema acessível)

---

> ✅ **Análise Reversa concluída em 2026-05-23.**
> Documentos SDD disponíveis em `_reversa_sdd/`.
