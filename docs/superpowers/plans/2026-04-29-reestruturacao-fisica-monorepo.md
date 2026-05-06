# Reestruturação Física do Monorepo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Limpar pastas e pacotes 'fantasmas' no diretório apps/ para alinhar a estrutura real com a base documental do monorepo Standard.

**Architecture:** A arquitetura do projeto já possui a raiz `workers/` populada e corretamente configurada. Por equívoco no setup, scaffolds vazios foram instanciados dentro de `apps/` com nomes similares, causando dualidade e quebra do schema estrutural de pnpm dev workspaces. Excluir estes diretórios resolve a entropia sem impacto no CI.

**Tech Stack:** FileSystem, git

---

### Task 1: Remover Pastas Fantasmas Duplicadas

**Files:**
- Delete: `c:/Users/resper/OneDrive/Área de Trabalho/standard-api/apps/api-worker`
- Delete: `c:/Users/resper/OneDrive/Área de Trabalho/standard-api/apps/queue-consumer`
- Delete: `c:/Users/resper/OneDrive/Área de Trabalho/standard-api/apps/workflows`

- [ ] **Step 1: Apagar pasta `api-worker`**

```bash
Remove-Item -Recurse -Force "c:\Users\resper\OneDrive\Área de Trabalho\standard-api\apps\api-worker"
```

- [ ] **Step 2: Apagar pasta `queue-consumer`**

```bash
Remove-Item -Recurse -Force "c:\Users\resper\OneDrive\Área de Trabalho\standard-api\apps\queue-consumer"
```

- [ ] **Step 3: Apagar pasta `workflows`**

```bash
Remove-Item -Recurse -Force "c:\Users\resper\OneDrive\Área de Trabalho\standard-api\apps\workflows"
```

- [ ] **Step 4: Commit**

```bash
git add "c:\Users\resper\OneDrive\Área de Trabalho\standard-api\apps"
git commit -m "chore(estrutura): remover pastas vazias e configs superpostas de workers na raiz apps"
```

