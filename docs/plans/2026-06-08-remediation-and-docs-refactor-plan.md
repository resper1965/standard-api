# Plano de Ajustes e Refatoração de Documentação — Standard API

> **Data:** 2026-06-08
> **Origem:** Auditoria profunda (backend, frontend, segurança, mercado) + correções de posicionamento do owner.
> **Posicionamento canônico (decisão):** Standard **não é uma plataforma de GRC**. É uma **API — um "cérebro" de inteligência de compliance**. O consumidor (app/vendor) tem a UI, as integrações e a coleta de evidência. O `apps/web` é **Platform Console** (admin de orgs/keys/users), não dashboard de GRC.

Este plano tem duas frentes que andam em paralelo:
- **Parte A — Correções de código/produto** (o que torna a API confiável de vender).
- **Parte B — Refatoração completa da documentação** (ênfase do pedido: documento, contexto, e principalmente docs para desenvolvedores).

A régua aqui é a de **uma API**, não a de um SaaS de GRC: isolamento multi-tenant M2M, contrato estável, proveniência/qualidade de output, determinismo e reprodutibilidade do catálogo.

---

## Fatos de base (verificados na auditoria)

| Item | Realidade |
|---|---|
| Catálogo SCF | **Existe no Neon**: 1468 controles, 33 domínios, 231 frameworks (4 import runs xlsx `succeeded`). Versão rotulada `SYNTH-SCF-1`. **Não versionado no repo** — seed do repo é sintético. |
| Rotas | **331 reais** (não 86), registradas em `app.ts`. OpenAPI gerado por código (`src/openapi/generator.ts`). |
| Persistência | Drizzle + Neon, 33 migrations. Multi-tenant via `withOrganization()`. |
| LLM | Caminho ativo: **Cloudflare AI Gateway → OpenAI `gpt-4o`** (`ai-gateway.adapter.ts:35`), com cache/retry/observability e custo por tenant. CLAUDE.md (`gpt-4o`) **está correto**. Workers AI/Llama 3.3 é provider secundário não-default. Único gap: fallback **mock** (`"{}"`) só com `console.warn` se env faltar (há teste `llm-provider-validation.test.ts`). |
| Segurança | **C1 CRÍTICO: IDOR cross-tenant** via header `x-standard-tenant-id`. Maioria do audit anterior já corrigida. |
| CI | Testes de segurança/regressão/e2e com `continue-on-error: true` (não bloqueiam). |
| Docs | ~190 arquivos .md fragmentados. `docs/api/openapi.json` defasado (9 endpoints). `CONTEXT.md` com links `file:///c:/Users/...` quebrados. |

---

## Pontos fortes (preservar, não mexer)

A base é competente — o plano endurece arestas, não reescreve. Manter e **documentar como diferencial**:
- **AI Gateway → gpt-4o** com cache nativo, retry exponencial, observabilidade e custo por tenant (`ai-gateway.adapter.ts`).
- **331 rotas reais**, OpenAPI gerado por código, Zod em todo input, RFC 7807, SDK zero-dep.
- **SoA draft determinístico** (projeção, não LLM) — reprodutível, ideal para API.
- **Multi-tenant via Drizzle/Neon**, 33 migrations, audit trail completo.
- Higiene: maioria do audit anterior corrigida (KV dev/prod separados, `as any` removido, secret validado, CORS via env, CSRF, security headers, SQL parametrizado).

---

# PARTE A — Correções de Código / Produto

Ordem por risco. P0 bloqueia qualquer tráfego multi-tenant de produção.

## A1 (P0) — Corrigir IDOR cross-tenant (C1)

**Problema.** `tenant.middleware.ts:17` dá precedência ao header `x-standard-tenant-id` sobre a org da sessão; o check de mismatch só dispara quando há `:organizationId` no path (minoria das rotas). `session.allowedOrganizations` é populado mas **nunca consumido**. Resultado: usuário/key da org A acessa dados da org B trocando 1 header.

**Mudança.**
1. Em `tenant.middleware.ts`, após resolver `resolvedTenantId`, **validar pertencimento** contra o principal:
   - Sessão de usuário → `resolvedTenantId` ∈ `session.allowedOrganizations`.
   - M2M (API key) → `resolvedTenantId` === org vinculada à key (`auth.middleware.ts:87`). **Header não pode sobrescrever a org da key.**
   - Falha → `403 FORBIDDEN` + `SecurityEventService` (cross-tenant attempt).
2. Tratar a org da sessão/key como **fonte da verdade**; header só pode **selecionar** entre orgs permitidas, nunca expandir.
3. Adicionar guarda padrão: rota sem `permissions: [...]` declarada deve **negar** por omissão (revisar `rbac.middleware.ts:60`).

**Arquivos.** `apps/api-gateway/src/middleware/tenant.middleware.ts`, `adapters/tenant-mapping.ts`, `middleware/auth.middleware.ts`, `middleware/rbac.middleware.ts`.

**Aceite.** Teste que prova: user da org A + header org B → 403; key da org A + header org B → 403; user multi-org troca header entre orgs permitidas → 200. Teste vira **bloqueante no CI** (ver A5).

**Esforço.** 1–2 dias (fix focado, não reescrita).

## A2 (P0) — LLM: falhar alto em prod + proveniência

**Contexto correto.** O caminho ativo é **AI Gateway → OpenAI `gpt-4o`** (`apps/api-gateway/src/adapters/ai-gateway.adapter.ts`), com cache nativo, retry exponencial e observabilidade/custo por tenant (`cf-aig-*`). Isso é um **ponto forte** — documentar, não mexer. O modelo na doc (`gpt-4o`) está certo. O provider Workers AI/Llama 3.3 (`packages/agent-runtime/src/providers/workers-ai.provider.ts`) é secundário/não-default; `total_tokens: 0` é desse provider não-usado.

**Problema remanescente.** `apps/api-gateway/src/adapters/compose-agent-runtime.ts:16-26` cai em **mock LLM** (devolve `"{}"`) com só `console.warn` se `AI_GATEWAY_BASE_URL`/`OPENAI_API_KEY` faltam → prod mal-configurado gera IA vazia silenciosamente. Já existe `apps/api-gateway/tests/llm-provider-validation.test.ts` cobrindo o cenário.

**Mudança.**
1. Em produção (`STANDARD_ENV=production`), **lançar erro no boot** se o provider AI Gateway não estiver configurado (espelhar o guard de DB em `index-helpers.ts:204`). Mock permitido só fora de prod, e explícito. Tornar o teste existente bloqueante.
2. Expor **proveniência no output** dos endpoints de IA: `model` (gpt-4o), `provider` (ai-gateway), `confidence_score`, distinção `is_inference` vs `evidence_backed`, e uso de tokens real do AI Gateway.

**Arquivos.** `apps/api-gateway/src/adapters/compose-agent-runtime.ts`, `apps/api-gateway/src/workers/queue-consumer.ts:236`, `apps/api-gateway/src/index-helpers.ts`, schemas de output em `packages/schemas`.

**Aceite.** Boot de prod sem AI Gateway **falha** com erro claro (teste bloqueante). Output de gap/SoA inclui bloco de proveniência com modelo/provider/uso real.

**Esforço.** 1–2 dias.

## A3 (P1) — Catálogo SCF: versionar e tornar reprodutível

**Problema.** Dado vive só no Neon, import manual, versão `SYNTH-SCF-1`, linhas `is_synthetic`. DR / novo ambiente / staging / CI = catálogo vazio ou fake. Para uma API que vende "avalie contra o SCF", a integridade do catálogo **é o ativo**.

**Mudança.**
1. Pipeline de seed reproduzível que importa o XLSX oficial (`assets/Secure Controls Framework (SCF) - 2026.1.1.xlsx`) → tabelas `scf_*`, idempotente, via `scf-core/src/importers/xlsx-importer.ts`.
2. **Versão real**: `SCF-2026.1.1` com `content_hash` e `source_uri`, em vez de `SYNTH-SCF-1`. Reservar `is_synthetic=true` só para fixtures de teste/dev.
3. Job de verificação de integridade (contagem esperada: 1468/33/231) como check pós-seed.
4. Documentar licença/redistribuição do dataset SCF (o XLSX é de terceiro — confirmar termos antes de commitar dado bruto; se não puder, commitar o **importador + manifesto de versão**, não o dado).

**Arquivos.** `packages/scf-core/scripts/`, `infra/docker/postgres/seeds/`, novo script de import-seed.

**Aceite.** `pnpm db:seed` em banco limpo → 1468 controles, versão `SCF-2026.1.1`, check de integridade passa.

**Esforço.** 3–4 dias (depende da licença do dataset).

## A4 (P1) — Alinhar contrato de erro (schema ↔ server)

**Problema.** `packages/schemas/src/errors.ts` publica ~11 códigos; server emite ~54 (`ACCOUNT_PENDING_APPROVAL`, `ORGANIZATION_REQUIRED`, etc). Cliente da API quebra ao validar contra o enum publicado.

**Mudança.** Fonte única de códigos de erro: gerar o enum público a partir de `apps/api-gateway/src/errors/error-codes.ts` (ou vice-versa). Teste de contrato que falha se divergir.

**Arquivos.** `packages/schemas/src/errors.ts`, `apps/api-gateway/src/errors/error-codes.ts`, `tests/contracts/`.

**Aceite.** Todo código emitido pelo server está no enum publicado; teste de contrato bloqueia divergência.

**Esforço.** 1 dia.

## A5 (P1) — CI: tornar testes de segurança bloqueantes

**Problema.** `.github/workflows/ci.yml:96-108` — security/regression/e2e/eval com `continue-on-error: true`. Badge verde mente; o teste do A1 não bloquearia merge.

**Mudança.** Remover `continue-on-error` de **security** e **regression** no mínimo. Manter eval/e2e como aviso só se forem flaky por design (documentar o porquê). `security-nightly` Semgrep sem `|| true` para findings high.

**Aceite.** Falha em `test:security` reprova PR.

**Esforço.** 0.5 dia (+ estabilizar suíte se houver flaky).

## A6 (P2) — Defesa em profundidade

- **Rate limit** auth (`/auth/sign-in`, `forgot-password`) sai de contador per-isolate (`rate-limit.middleware.ts:71`) para Cloudflare Rate Limiting / Durable Object.
- **Remover métodos base não-escopados** dos repositórios (`artifact.drizzle.repository.ts:84`, `approval.repository.ts:108`) — forçar `withOrganization()` no tipo.
- **Remover `set_config` RLS morto** (`tenant-db.ts:35`) ou documentar como no-op; avaliar RLS real via Neon non-HTTP.
- Reports binários (DOCX `docx-renderer.placeholder.ts`, PDF=HTML) — rebaixados: opcionais para uma API; entregar via worker+R2 só se houver demanda. Não bloqueiam.

**Esforço.** 2–4 dias distribuídos.

## A7 (P1) — Triagem de dependências (Dependabot)

**Problema.** O push reportou **37 vulnerabilidades** na branch default (4 críticas, 6 altas, 23 moderadas, 4 baixas) via Dependabot. Para um produto de compliance, dívida de vuln de dependência é incoerente com a proposta.

**Mudança.** Triar as 4 críticas + 6 altas primeiro: atualizar/substituir, ou registrar exceção justificada. Avaliar o caso `xlsx` (vem de `cdn.sheetjs.com`, fora do npm — quebra install reprodutível, ver nota de perf). `deploy-production.yml` já roda `audit --audit-level=high` bloqueante — alinhar o threshold com a triagem.

**Arquivos.** `package.json` dos pacotes afetados, `pnpm-lock.yaml`, `.github/dependabot.yml` (criar se ausente).

**Aceite.** Zero críticas/altas abertas ou todas com exceção documentada; install reprodutível sem CDN externo.

**Esforço.** 1–2 dias.

## Nota de performance (issues existentes)

Perf não foi medida sob carga; dois riscos de escala **já rastreados** e válidos: **#61** (limites de conexão Neon na borda → Hyperdrive/pooler) e **#62** (payload de contexto dos Cloudflare Workflows → trafegar referências, não documentos). Ambos são pré-requisito de tráfego M2M agressivo e devem entrar no Sprint 4. Paginação presente em só ~14/46 arquivos de rota — auditar antes de expor listas grandes.

---

# PARTE B — Refatoração Completa da Documentação

Objetivo: **uma fonte da verdade**, posicionamento consistente de "API/cérebro", e **docs de desenvolvedor de primeira classe**. Hoje há ~190 .md fragmentados, snapshots defasados e links quebrados.

## B0 (P0) — Reposicionamento: "API / cérebro de compliance"

Mensagem única a propagar em todos os docs: *"Standard é uma API de inteligência de compliance. Sua aplicação chama a API; o Standard faz o raciocínio SCF→SoA→gap→POA&M. Não é uma plataforma de GRC end-to-end e não coleta evidência por você."*

Adicionar a **README e docs de entrada** uma seção explícita **"O que é / O que NÃO é"**:
- **É:** API-first; motor de avaliação SCF; SoA determinístico; gap/POA&M assistidos por IA; multi-tenant; SDK.
- **NÃO é:** dashboard de GRC para usuário final; conectores de evidência (AWS/Okta/GitHub); monitoramento contínuo; substituto de auditor.

**Arquivos a corrigir:** `README.md`, `CLAUDE.md` (remove "platform" como produto, alinha gpt-4o→modelo real), `llms.txt` + gerador (`src/openapi/docs/llms-*`), `apps/docs` home.

## B1 (P1) — Arquitetura da informação (consolidar os ~190 docs)

Adotar **Diátaxis** como esqueleto e colapsar duplicatas (38 em `architecture`, 31 `plans`, duplicação `docs/api` vs `apps/docs/content`):

```
docs/
  product/        # o que é, posicionamento, o-que-é/não-é, casos de uso
  developers/     # ⭐ PRIORIDADE — ver B2
  architecture/   # decisões e diagramas vivos (mesclar 38→~10, mover obsoletos p/ archive)
  operations/     # runbooks, deploy, DR, seed do catálogo
  decisions/      # ADRs (manter)
  archive/        # planos/auditorias datados e concluídos (mover, não apagar)
```
- Mover `docs/plans/*` concluídos e `audit.md` para `docs/archive/`.
- Uma única home de docs (`apps/docs` Astro/Starlight) como portal; `docs/*` é fonte, não destino duplicado.

## B2 (P1) — Docs para Desenvolvedores (PRIORIDADE)

Estrutura mínima em `docs/developers/` (e refletida no site Astro), cada uma com exemplo `curl` + SDK:

1. **Quickstart** — key, primeira chamada, criar assessment, ler summary (5 min).
2. **Autenticação** — API key vs sessão; formato `Authorization: ApiKey`; escopos.
3. **Multi-tenancy / `x-standard-tenant-id`** — ⚠️ **reescrever após A1**: explicar que o header só seleciona entre orgs permitidas, nunca expande; comportamento M2M (org da key é fixa). Doc atual descreve o comportamento inseguro.
4. **Referência de endpoints** — **auto-gerada do OpenAPI** (331 rotas), não tabela manual. Ver B3.
5. **SDK (`@standard/sdk`)** — instalação, client, métodos, paginação, tipos.
6. **Cookbook / receitas** — ISO 27001, dashboard, CI/CD compliance-gate, audit logs (consolidar `docs/api/COOKBOOK.md` + `apps/docs/.../cookbook.md` — hoje duplicados).
7. **Referência de erros** — RFC 7807, lista completa de códigos (sai do A4), retries.
8. **Webhooks** — eventos (`assessment.*`, `member.*`...), payloads, verificação de assinatura.
9. **Rate limits** — limites reais por endpoint (alinhar com A6).
10. **Contrato de output da IA** — modelo usado, `confidence_score`, inferência vs evidência, determinismo (SoA determinístico, gap = LLM). Gerencia expectativa do consumidor.
11. **Versionamento** — versionamento da API (`/api/v1`) e do catálogo SCF (`SCF-2026.1.1`).
12. **Lifecycle do assessment** — máquina de 26 estados + 4 gates, com diagrama, e como dirigir via API.

## B3 (P1) — OpenAPI como fonte única

- **Parar de commitar** `docs/api/openapi.json` defasado (9 endpoints). Ou gerá-lo em CI a partir de `src/openapi/generator.ts` cobrindo as 331 rotas, ou servir só o endpoint vivo `/docs/openapi.json`.
- Check de CI: toda rota tem entrada no OpenAPI (descrição, params, schema de erro). Falha se faltar.
- Reconciliar `docs/api/openapi.{json,yaml,md}` → um artefato gerado.

## B4 (P1) — CONTEXT / AGENTS / CLAUDE: alinhar e desquebrar

- `CONTEXT.md`: trocar links `file:///c:/Users/resper/...` (quebrados, máquina-específicos) por **paths relativos do repo**; remover linguagem "platform"; refletir estado real (catálogo no Neon, não versionado → item de risco).
- `CLAUDE.md`: manter `gpt-4o` (correto); **adicionar** que roda via Cloudflare AI Gateway (cache/retry/observability/custo por tenant); "platform" → "API"; alinhar contagem de endpoints (86→331 ou "ver OpenAPI").
- `AGENTS.md`: revisar a lista dos "7 agentes" vs as 9 IDs reais em `schemas/agent-runtime.ts`.
- `ROADMAP.md` / `CHANGELOG.md`: refletir prioridades deste plano.

## B5 (P1) — Passagem de honestidade (remover claims não suportados)

Auditar marketing vs realidade e corrigir/qualificar:
- "audit-ready PDF reports" → hoje HTML/MD/JSON; PDF requer Puppeteer do consumidor; DOCX é stub. Reescrever.
- "platform" → "API".
- IA: documentar o stack real como diferencial — **AI Gateway → gpt-4o** com cache/retry/observability/custo por tenant (não é um claim a remover, é um a destacar).
- Números 1468/231 — manter (são reais no Neon), mas linkar à **versão do catálogo** e ao job de integridade (A3).

---

# PARTE C — Developer Experience (consumidor: SDK / MCP / API)

Avaliado no papel de quem vai **construir em cima**. A API tem amplitude (≈40 domínios, 16 resources no SDK, idempotência, paginação, webhooks assinados, `jobs`, `privacy/DSAR`) mas falta **profundidade de DX**: o SDK não carrega o peso, a ingestão empurra o trabalho sujo, e o consumidor voa cego em rate-limit/custo. O que torna "uma API que existe" em "uma API que eu adoto":

## C1 (P1) — SDK não protege o consumidor (resiliência & segurança)
`packages/sdk/src/` não tem **retry/backoff, verificador de webhook, auto-paginação nem `waitForCompletion`** (grep vazio). Hoje cada consumidor reimplementa o chato e o perigoso.
- **`webhooks.constructEvent(payload, sig, secret)`** — verificação HMAC-SHA256 timing-safe pronta (server já assina em `services/webhook-dispatcher.ts`). Hoje é footgun de segurança terceirizado.
- **Retry/backoff** em 429/5xx (respeitando `Retry-After` de C3).
- **Auto-paginação** — async iterator sobre `PaginatedResponse{has_more}`.
- **`jobs.waitForCompletion(jobId)`** — polling encapsulado (existe `jobs.routes.ts` + `poll_job_status`, mas nenhum açúcar no SDK).

## C2 (P1) — Ingestão só de texto empurra o trabalho sujo
`apps/api-gateway/src/openapi/docs/llms-constants.ts:103`: *"Clients MUST NOT upload raw binary streams, PDFs, or raw image screenshots."* Logo, o consumidor tem que fazer parsing de PDF/DOCX + OCR de screenshot **antes**. Para um produto cujo input é documento, é a maior cratera de DX.
- Endpoint/worker de ingestão que aceite binário (PDF/DOCX/imagem) com extração + OCR server-side (já há `ingestion-worker`, R2, ClamAV no env), devolvendo texto normalizado para o pipeline. Senão, documentar explicitamente o pré-processamento exigido e oferecer um utilitário de extração.

## C3 (P1) — Operabilidade cega (rate-limit / custo / sandbox)
- **Headers de rate-limit:** emitir `Retry-After` + `X-RateLimit-Remaining/Limit/Reset` (hoje 429 sem nada — grep vazio). Pré-requisito do retry de C1.
- **Usage/cost por key:** endpoint de consumo (tokens/custo/quota) — é API metered em gpt-4o; consumidor precisa enxergar gasto antes da fatura.
- **Sandbox / test mode:** key de teste com resposta determinística (sem catálogo carregado, sem queimar LLM) para integração local.
- **Política de versionamento/deprecation** documentada além de `/api/v1`.

## C4 (P2) — MCP fino demais para a narrativa "agentic"
4 tools (`get_scf_control`, `run_gap_analysis`, `dispatch_grc_council`, `poll_job_status`) vs ≈40 domínios. Um agente consumidor **não dirige o lifecycle** via MCP (criar assessment, subir evidência, aprovar gate). Expandir cobertura MCP para o ciclo completo (com guardrails dos gates humanos).

## C5 (P2) — Kit de Human-in-the-Loop (headless — ADR 0011)
**Decisão (ADR `0011-hitl-fully-headless.md`):** o HITL é 100% no app do cliente; o Standard permanece headless — sem página hospedada, widget ou tela no console. Entregar só o **kit**:
- Feed unificado "pendentes de aprovação" (cross-assessment, filtrável por gate).
- Par **webhook→approve/reject** com atribuição de ator (existe `approvals.routes.ts` com `requireActor` + RBAC).
- Açúcar no SDK para o loop.
- **Corrigir a suposição meio-construída do `reviewUrl`:** o botão "Review & Approve" do e-mail (`packages/email/src/templates.ts:196`) aponta para uma página que ninguém entrega. Documentar e tipar `reviewUrl` como **valor configurado pelo consumidor** (URL da tela de revisão do próprio app), não um endpoint do Standard.
- Guia de desenvolvedor "Gates de aprovação / integração HITL" (parte do épico de docs, #78/B2).

> **Proveniência da IA** (modelo/confiança/inferência-vs-evidência no output) e **contrato de erro** são DX mas já cobertos por A2/A4 (#72/#74) — referenciar, não duplicar.

---

# Sequenciamento & Esforço

| Fase | Itens | Bloqueia | Esforço |
|---|---|---|---|
| **Sprint 1 (segurança)** | A1, A5, B2.3 (doc do header), B0 | tráfego multi-tenant | ~1 sem |
| **Sprint 2 (confiabilidade + DX base)** | A2, A4, B3, B5, C3 | confiar no output e operar a API | ~1 sem |
| **Sprint 3 (catálogo+IA prod + SDK)** | A3, B4, B1, C1 | DR/reprodutibilidade e adoção do SDK | ~1.5 sem |
| **Sprint 4 (ingestão + polish)** | A6, A7, C2, B2 (restante), B1 (archive) | input real (binário) | ~1.5 sem |
| **Sprint 5 (agentic + HITL)** | C4, C5 | automação completa via MCP | ~1 sem |

## Critérios de "pronto para vender a API"
1. **A1** (IDOR) fechado e testado, com teste bloqueante no CI.
2. IA falha alto em prod; output com proveniência.
3. Catálogo versionado e reproduzível em banco limpo.
4. Contrato de erro alinhado schema↔server.
5. Docs de desenvolvedor completos, OpenAPI cobrindo 331 rotas, posicionamento "API/cérebro" consistente, zero links quebrados, zero claims falsos.
6. **DX mínima:** SDK com retry + verificação de webhook + auto-paginação + `waitForCompletion`; headers de rate-limit; usage/cost por key; sandbox/test mode.
