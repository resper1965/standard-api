# Sincronização Documental de Superfície Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Harmonizar a arvore ASCII das Docs principais bem como explicações dos pacotes ausentes na arquitetura.

**Architecture:** Modificações precisas de parágrafos nos blocos textuais (`README.md`, `AGENTS.md` e `arquitetura.md`) e árvores listadas.

**Tech Stack:** FileSystem, markdown, git

---

### Task 1: Atualizar o README.md

**Files:**
- Modify: `c:/Users/resper/OneDrive/Área de Trabalho/standard-api/README.md`

- [ ] **Step 1: Substituir a arvore ASCII incompleta.**
Substituir o bloco código de "Estrutura do Repositório" atual da documentação pela listagem verdadeira de pastas de pacotes e removendo diretórios ghosts.

- [ ] **Step 2: Expandir listagem verbal de "Como Entender os Packages"**
Acrescentar sentenças explicativas baseadas no setup real para `contracts`, `domain`, `scf-catalog`, e separar documentação para os outputs base.

### Task 2: Cimentar sincronização ao Contexto e Agentes

**Files:**
- Modify: `c:/Users/resper/OneDrive/Área de Trabalho/standard-api/docs/context/arquitetura.md`
- Modify: `c:/Users/resper/OneDrive/Área de Trabalho/standard-api/AGENTS.md`

- [ ] **Step 1: Modificar `arquitetura.md`**
Alinhar as diretrizes compactas mencionando as separações puras da arquitetura na listagem de domínios.

- [ ] **Step 2: Modificar `AGENTS.md`**
Assimilar a exata arvore ASCII documentada no README consolidado em direção às regras AI.

- [ ] **Step 3: Commit**

```bash
git add docs/superpowers/
git add README.md
git add docs/context/arquitetura.md
git add AGENTS.md
git commit -m "docs: sincronizar as arvores arquiteturais, mapeando pacotes novos ocultos e purificando arvores"
```

