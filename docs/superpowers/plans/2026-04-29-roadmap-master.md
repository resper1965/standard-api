# Master Roadmap to Production Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Centralizar as falhas e pontas da produção para o Cloudflare via um Roadmap-Épico, enquanto expurgamos as pontas arquivadas.

**Architecture:** Módulo Docs e Git FS logic.

**Tech Stack:** FileSystem, markdown, git

---

### Task 1: Construir `roadmap-to-production.md`

**Files:**
- Create: `c:/Users/resper/OneDrive/Área de Trabalho/aegis-api/docs/releases/roadmap-to-production.md`

- [ ] **Step 1: Sintetizar as pendências sob categorização**
Usar `write_to_file` para criar o roadmap épico agrupando Auth, DB, Maturity, Rate Limiting, e Governança num documento só seguindo o formato listado na Spec `2026-04-29-roadmap-master-design.md`.

### Task 2: Modificações de Controle em Arquivos Base

**Files:**
- Modify: `c:/Users/resper/OneDrive/Área de Trabalho/aegis-api/docs/releases/mvp-release-candidate-checklist.md`
- Delete: `c:/Users/resper/OneDrive/Área de Trabalho/aegis-api/docs/architecture/backlog.md`
- Delete: `c:/Users/resper/OneDrive/Área de Trabalho/aegis-api/docs/context/pendencias.md`

- [ ] **Step 1: Inserir tag deprecated no Release Candidate Checklist**
Utilizar `replace_file_content` para inserir aviso no topo informando que as pendências agora rodam pelo Roadmap Master.

- [ ] **Step 2: Expedição Git**
Remover de fato os velhos e inserir os novos:
```bash
git rm docs/architecture/backlog.md docs/context/pendencias.md
git add docs/superpowers/
git add docs/releases/
git commit -m "docs(roadmap): consolidar backlog de mvp e pendencias legadas em roadmap global unificado de producao"
```
