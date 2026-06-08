# 0011 — Human-in-the-Loop (gates de aprovação) totalmente headless

## Status

Aceito — 2026-06-08.

## Contexto

O lifecycle de assessment tem 4 gates de aprovação humana (SoA, Gap Analysis, Maturidade, POA&M). O cérebro já é dono da *governança* do gate:

- `POST /api/v1/assessments/:assessmentId/approvals` com `requireActor: true` e RBAC (`soa:approve`, `gap:approve`, `maturity:approve`, `poam:approve`);
- atribuição de ator, trilha de auditoria e transição de estado;
- webhook na transição do gate;
- template de e-mail `renderApprovalRequestEmail` com botão "Review & Approve" apontando para um `reviewUrl`.

Lacuna identificada na auditoria de 2026-06-08: **não existe superfície onde o humano efetivamente clica "aprovar"**. O `apps/web` é Platform Console (admin-only) e não tem tela de revisão/aprovação de artefato (ver ADR de fronteiras de plataforma, `0001-platform-boundaries.md`). O campo `reviewUrl` do e-mail presumia uma página de revisão que nenhum componente entrega.

## Decisão

O HITL é **100% responsabilidade da aplicação do cliente**. O Standard permanece headless:

- O Standard expõe API (listar pendências, aprovar/rejeitar com ator), webhook e o e-mail de notificação.
- O **`reviewUrl` é fornecido/configurado pelo consumidor** e aponta para a tela de revisão do próprio app do cliente.
- O Standard **não** entregará página de aprovação hospedada (magic-link), widget embutível, nem tela de aprovação no console web.

## Consequências

- Coerente com o posicionamento "API/cérebro" e com `0001-platform-boundaries.md`.
- O contrato de e-mail/approval deve documentar explicitamente que `reviewUrl` é um valor do consumidor (corrigir a suposição meio-construída).
- A documentação de desenvolvedor (épico #78, B2) precisa de um guia "Gates de aprovação / integração HITL": feed de pendências, par webhook→approve com atribuição de ator, e o que o cliente precisa construir.
- A #83 fica restrita a um **kit** (feed unificado de pendências + açúcar no SDK + contrato claro do `reviewUrl`), sem qualquer superfície hospedada.
- Consumidores menores arcam com o custo de construir a UX de aprovação — risco de adoção aceito em favor do foco headless.

## Alternativas consideradas

- **Página hospedada (magic-link)** para onde o `reviewUrl` apontaria — rejeitada: adiciona superfície hospedada e auth de aprovador, fora do escopo headless.
- **Widget embutível** (iframe/web component) — rejeitada por ora: meio-termo com custo de manutenção de UI.
- **Tela de aprovação no console web** — rejeitada: contradiz "console não é dashboard de GRC".

## Links

- `docs/decisions/0001-platform-boundaries.md`
- `docs/decisions/0004-durable-workflows.md`
- `docs/plans/2026-06-08-remediation-and-docs-refactor-plan.md` (Parte C, C5)
- Issue #83 (kit de HITL), Épico #78 (docs)
