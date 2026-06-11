# Spec: Master Roadmap towards Production

## Resumo
Aglutinar as múltiplas pendências isoladas identificadas nos diversos arquivos markdown do repositório em um "Master Roadmap" convergente, delineado para empurrar o MVP do seu estado validado (Mocks) para um estado Production-Ready na nuvem.

## Motivação
Atualmente, as etapas necessárias para ir de Staging Sintético à Produção Real no Cloudflare estão desmembradas em três arquivos: `docs/architecture/backlog.md`, `docs/context/pendencias.md` e os itens bloqueadores parciais do `docs/releases/mvp-release-candidate-checklist.md`. Manter três listas de tarefas afins gera fricção, perda temporal em triagem e confusão de precedência para times de desenvolvimento (humanos ou agênticos).

## Escopo (Fase 3)
### 1. Criar novo épico centralizado
Criar `docs/releases/roadmap-to-production.md` subdividido em domínios lógicos:
*   **Trilha 1: Infraestrutura Real Cloudflare** (Staging/Production PostgreSQL, Auth provider fixo, Integrações Workers R2 reais).
*   **Trilha 2: Core/Assessments** (Implementação orgânica do `packages/maturity`, Geração final de DOCX/PDF real via workers).
*   **Trilha 3: Segurança & Hardening SaaS** (Rate limiter em tráfego pesado, Scan de provedor Anti-malware de anexos, Auditoria em storage para Eventos e Backup/Restore policy).
*   **Trilha 4: Governança do LLM** (Politicas seguras e rastreamento para o envio de prompts orgânicos que vão aos modelos reais fora do `MockProvider`).

### 2. Aposentar artefatos antigos
- Remover `docs/architecture/backlog.md` e `docs/context/pendencias.md` via terminal usando a política do git.
- Adicionar uma tag *[SUPERSEDED]* no sub-cabeçalho do `mvp-release-candidate-checklist.md`, mantendo-o apenas pelo seu valor fotográfico (histórico da release base validada em synthetic data).

## Validação
Verificar a consistência e a clareza do novo roadmap e assegurar ausência de `git status` quebrando arquivos não controlados.
