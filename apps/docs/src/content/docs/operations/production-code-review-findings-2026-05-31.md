---
title: "Production Code Review Findings"
---

# Production Code Review Findings

Data da revisão: 2026-05-31  
Escopo: arquitetura, soluções, código e ambiente de produção do Standard API.

## Sumário executivo

Esta revisão encontrou bloqueadores reais para produção. Os principais riscos são:

- Credenciais reais versionadas em scripts rastreados pelo Git.
- Possível bypass de isolamento multi-organization via `:organizationId` em path.
- Rate limiting e revogação de sessão/API key potencialmente inoperantes em produção por mismatch de binding KV.
- Pipeline de produção configurado para ignorar falhas de lint/audit e aplicar schema com `drizzle-kit push --force`.
- Drift relevante entre documentação de go-live, configs Wrangler e código efetivamente executado.

Recomendação: não aprovar produção até que todos os achados P0 estejam corrigidos, credenciais expostas sejam rotacionadas e os caminhos de deploy/config sejam reconciliados.

## Metodologia

- Revisão estática de código, configs Cloudflare/Wrangler, workflows GitHub Actions, scripts operacionais e documentação de go-live.
- Validação local pontual com `pnpm`.
- Consulta de documentação Cloudflare atual via Context7 para conferir práticas recomendadas de Workers/Wrangler.
- Nenhum arquivo de código foi alterado durante a revisão. Este documento consolida os achados.

Fontes Cloudflare consultadas:

- https://developers.cloudflare.com/workers/best-practices/workers-best-practices/
- https://developers.cloudflare.com/workers/wrangler/commands/

## Achados P0

### P0-01: Credenciais reais estão versionadas

Severidade: P0 / bloqueador de produção  
Status: aberto

Arquivos rastreados pelo Git contêm connection string Neon e credenciais de superadmin. Os valores não são reproduzidos aqui para não propagar segredo.

Evidências:

- `scripts/create-superadmin.mjs:14` contém connection string de banco.
- `scripts/create-superadmin.mjs:16` contém e-mail administrativo hardcoded.
- `scripts/create-superadmin.mjs:17` contém senha de superadmin hardcoded.
- `scripts/check-fw.mjs:2` contém connection string de banco.
- `scripts/migrations/001-fix-enums.mjs:4` contém connection string de banco.
- `git ls-files` confirmou que `scripts/check-fw.mjs`, `scripts/create-superadmin.mjs` e `scripts/migrations/001-fix-enums.mjs` estão versionados.

Impacto:

- Comprometimento potencial do banco de produção.
- Comprometimento potencial de conta superadmin.
- Histórico Git deve ser tratado como exposição, não apenas o estado atual da working tree.
- A documentação de go-live declara ausência de secrets, mas isso não corresponde ao repositório.

Evidência adicional:

- `docs/operations/go-live-status.md:15` declara `P0 Secrets` como `PASS`.
- `docs/operations/go-live-status.md:70` declara que `pnpm lint` não encontrou secrets.
- `scripts/lint.mjs:8` define padrões de secrets, mas não cobre `postgresql://`, Neon ou tokens `npg_`.
- `pnpm lint` informou "nenhum secret óbvio encontrado" antes de falhar em lint do web, confirmando falso negativo do scanner.

Correção recomendada:

- Rotacionar imediatamente senha do banco Neon e credenciais de superadmin.
- Invalidar sessões/tokens relacionados.
- Remover secrets dos scripts e substituir por env vars/secrets manager.
- Adicionar scanner robusto, por exemplo Gitleaks/TruffleHog com regras para Postgres/Neon.
- Bloquear deploy se secret scan falhar.
- Revisar e, se necessário, limpar histórico Git ou tratar o repositório como permanentemente exposto.

### P0-02: Bypass de isolamento por organization via path param

Severidade: P0 / bloqueador de produção  
Status: aberto

O middleware de organization permite que `:organizationId` do path substitua o organization autenticado quando não há header de organization. A comparação existente só valida path contra header, não path contra o organization já resolvido da sessão/API key.

Evidências:

- `apps/api-gateway/src/middleware/organization.middleware.ts:7` lê `context.params.organizationId`.
- `apps/api-gateway/src/middleware/organization.middleware.ts:12` escolhe `headerOrganizationId ?? pathOrganizationId ?? context.organizationId`.
- `apps/api-gateway/src/middleware/organization.middleware.ts:46` só compara path contra header.
- `apps/api-gateway/src/middleware/organization.middleware.ts:89` sobrescreve `context.organizationId = resolvedOrganizationId`.

Rotas afetadas observadas:

- `apps/api-gateway/src/routes/organizations.routes.ts:48` define `/api/v1/organizations/:organizationId/organizations`.
- `apps/api-gateway/src/routes/organizations.routes.ts:61` usa `deps.organizations.withTenant(organizationId!)`.
- `apps/api-gateway/src/routes/organizations.routes.ts:62` lista organizações do organization resolvido.
- `apps/api-gateway/src/routes/dashboard.routes.ts:168` define `/api/v1/organizations/:organizationId/audit-logs`.
- `apps/api-gateway/src/routes/dashboard.routes.ts:172` compara `routeParam(params, "organizationId") !== organizationId`, mas `organizationId` já pode ter sido sobrescrito pelo path.
- `apps/api-gateway/src/routes/observability.routes.ts:115` define `/api/v1/organizations/:organizationId/usage`.
- `apps/api-gateway/src/routes/observability.routes.ts:119` tem a mesma guarda tautológica.

Impacto:

- Usuário autenticado ou API key de um organization pode tentar acessar dados de outro organization se souber/adivinhar UUID de organization.
- A arquitetura do produto exige isolamento por `organization_id`; esse bug viola a premissa central multi-organization.

Correção recomendada:

- Tratar organization autenticado como fonte autoritativa.
- Permitir path organization apenas se for idêntico ao organization da sessão/API key.
- Separar claramente organization solicitado, organization autenticado e organization resolvido.
- Adicionar testes negativos para path organization diferente do organization da sessão/API key.
- Aplicar validação equivalente para `organization_id` em rotas e tools.

### P0-03: Rate limiting e revogação podem estar desligados em produção

Severidade: P0 / bloqueador de produção  
Status: aberto

O código espera binding `STANDARD_CACHE`, mas o Wrangler usado pelo deploy produtivo expõe `STANDARD_CACHE_KV`. Como o rate limiter falha aberto quando não recebe KV, produção pode estar sem rate limiting efetivo e sem checagem de revogação baseada em KV.

Evidências no código:

- `apps/api-gateway/src/app.ts:310` chama `assertRateLimit(..., env?.STANDARD_CACHE)`.
- `apps/api-gateway/src/middleware/auth.middleware.ts:108` verifica `context.env?.STANDARD_CACHE`.
- `apps/api-gateway/src/middleware/auth.middleware.ts:109` consulta `context.env.STANDARD_CACHE.get(...)`.
- `apps/api-gateway/src/middleware/rate-limit.middleware.ts:8` documenta que sem `STANDARD_CACHE` o rate limiting é no-op.
- `apps/api-gateway/src/middleware/rate-limit.middleware.ts:90` retorna quando `kvNamespace` não existe.

Evidências de config:

- `apps/api-gateway/wrangler.toml:63` binda `STANDARD_CACHE`.
- `apps/api-gateway/wrangler.toml:131` binda `STANDARD_CACHE` em produção.
- `infra/cloudflare/wrangler.api-gateway.toml:49` binda `STANDARD_CACHE_KV`.
- `infra/cloudflare/wrangler.api-gateway.toml:105` binda `STANDARD_CACHE_KV` em staging.
- `infra/cloudflare/wrangler.api-gateway.toml:165` binda `STANDARD_CACHE_KV` em produção.
- `.github/workflows/deploy-production.yml:121` usa `infra/cloudflare/wrangler.${{ matrix.worker }}.toml -e production`.

Impacto:

- Brute force e abuso de API podem não ser bloqueados no gateway.
- Revogações de sessão/API key cacheadas podem não ser aplicadas.
- `docs/operations/go-live-status.md:16` e `docs/operations/go-live-status.md:76` declaram rate limiting ativo, mas a configuração produtiva contradiz o código.

Correção recomendada:

- Unificar nome de binding entre código e todos os Wrangler configs.
- Preferir tipos `Env` gerados por Wrangler para detectar drift.
- Fazer o rate limiter falhar fechado em produção quando o binding obrigatório não existir.
- Adicionar teste/smoke de produção que valide headers e comportamento de rate limit.

### P0-04: Deploy de produção ignora falhas e aplica schema com push forçado

Severidade: P0 / bloqueador de produção  
Status: aberto

O workflow de produção ignora falhas de lint e audit, e aplica schema com `drizzle-kit push --force`, em vez de executar migrations versionadas.

Evidências:

- `.github/workflows/deploy-production.yml:39` executa `pnpm lint || true`.
- `.github/workflows/deploy-production.yml:48` executa `pnpm audit --audit-level=high || true`.
- `.github/workflows/deploy-production.yml:79` executa `pnpm --filter @standard/schemas drizzle-kit push --config drizzle.config.ts --force`.
- `packages/schemas/package.json:13` define `db:migrate`.
- `packages/schemas/migrate.ts:17` aponta para `../../infra/docker/postgres/migrations`.
- `docs/operations/production-go-live-checklist.md:11` orienta executar `pnpm db:migrate` em produção.

Impacto:

- Falhas de segurança/lint não bloqueiam deploy produtivo.
- `drizzle-kit push --force` pode aplicar diff direto no banco, fora do fluxo auditável de migrations.
- O estado real do banco pode divergir do histórico versionado.

Correção recomendada:

- Remover `|| true` de lint/audit no deploy produtivo.
- Usar `pnpm db:migrate` ou migration runner equivalente, nunca schema push forçado.
- Exigir aprovação manual para migrations destrutivas ou potencialmente destrutivas.
- Fixar versão de Wrangler em vez de instalar `wrangler@latest` no deploy.

## Achados P1

### P1-01: Configuração Wrangler está duplicada e divergente

Severidade: P1  
Status: aberto

Há dois conjuntos de configs: arquivos nos diretórios das apps/workers e arquivos em `infra/cloudflare`. O deploy usa `infra/cloudflare`, enquanto scripts locais e documentação podem apontar para os arquivos locais.

Evidências:

- `apps/api-gateway/wrangler.toml:63` usa `STANDARD_CACHE`.
- `infra/cloudflare/wrangler.api-gateway.toml:165` usa `STANDARD_CACHE_KV`.
- `apps/api-gateway/wrangler.toml:84` e `apps/api-gateway/wrangler.toml:150` bindam `COUNCIL_WORKFLOW`.
- `infra/cloudflare/wrangler.api-gateway.toml:169` binda apenas `ASSESSMENT_WORKFLOW`.
- `scripts/deploy-cloudflare.mjs:12` a `scripts/deploy-cloudflare.mjs:16` usam configs `infra/cloudflare`.
- `.github/workflows/deploy-production.yml:121` também usa configs `infra/cloudflare`.

Impacto:

- Deploy manual, deploy CI e dev local podem apontar para sistemas diferentes.
- Bindings esperados pelo código podem não existir em produção.
- A revisão operacional fica pouco confiável.

Correção recomendada:

- Eleger uma única fonte de verdade para Wrangler.
- Gerar tipos `Env` a partir do config efetivo de deploy.
- Adicionar check CI que compara bindings obrigatórios contra o `Env` esperado.

### P1-02: Council Workflow não está ligado no caminho produtivo

Severidade: P1  
Status: aberto

O código tem caminho para usar `COUNCIL_WORKFLOW`, mas o gateway não injeta esse binding nas dependências e o config produtivo não o declara. Quando um council run cai na queue, o consumidor pula a execução.

Evidências:

- `apps/api-gateway/src/routes/intelligence.routes.ts:417` verifica `deps.COUNCIL_WORKFLOW`.
- `apps/api-gateway/src/routes/intelligence.routes.ts:418` tenta criar workflow se o binding existir.
- `apps/api-gateway/src/index.ts:44` injeta `AGENT_RUN_QUEUE`.
- `apps/api-gateway/src/index.ts:45` injeta `SOC_TRIAGE_QUEUE`.
- `apps/api-gateway/src/http.ts:218` declara `COUNCIL_WORKFLOW` em `AppDependencies`.
- `infra/cloudflare/wrangler.workflows.toml:2` aponta para `workers/workflows/src/assessment-lifecycle.ts`.
- `infra/cloudflare/wrangler.workflows.toml:11` binda apenas `ASSESSMENT_WORKFLOW`.
- `workers/workflows/wrangler.toml:17` binda `COUNCIL_WORKFLOW`, mas esse não é o config usado no deploy de produção.
- `workers/queues/src/agent-run.consumer.ts:57` detecta `council_orchestrator`.
- `workers/queues/src/agent-run.consumer.ts:58` pula a execução na queue.

Impacto:

- Orquestração council pode ser aceita pela API e nunca executada de forma durável.
- O comportamento real diverge da arquitetura documentada de agentes colaborativos.

Correção recomendada:

- Decidir se Council roda em Cloudflare Workflows ou queue worker.
- Configurar e injetar `COUNCIL_WORKFLOW` no gateway produtivo se for o caminho escolhido.
- Remover fallback que enfileira jobs que o consumidor explicitamente ignora.
- Adicionar teste end-to-end para criação e execução de council assessment.

### P1-03: Workflow produtivo aponta para entrypoint mínimo

Severidade: P1  
Status: aberto

O config produtivo de workflows aponta para `workers/workflows/src/assessment-lifecycle.ts`, que implementa um checkpoint mínimo. O código mais rico parece estar em outro entrypoint.

Evidências:

- `infra/cloudflare/wrangler.workflows.toml:2` usa `main = "../../workers/workflows/src/assessment-lifecycle.ts"`.
- `workers/workflows/src/assessment-lifecycle.ts:9` exporta `AssessmentLifecycleWorkflow`.
- `workers/workflows/src/assessment-lifecycle.ts:30` retorna checkpoint.
- `workers/workflows/wrangler.toml:2` usa `main = "src/index.ts"`.

Impacto:

- Produção pode estar executando uma orquestração mínima, não o lifecycle completo esperado.
- Risco de falso senso de durabilidade/approval gates no runtime Cloudflare.

Correção recomendada:

- Consolidar entrypoint de workflows.
- Garantir que o deploy produtivo aponte para o orchestrator completo.
- Criar teste de workflow cobrindo estados e approval gates mínimos.

### P1-04: Cron de data retention não está configurado

Severidade: P1  
Status: aberto

O worker implementa `scheduled()`, mas os configs Wrangler inspecionados não possuem trigger cron.

Evidências:

- `workers/queues/src/index.ts:104` documenta scheduled cron.
- `workers/queues/src/index.ts:105` diz que deveria existir `crons = ["0 2 * * 0"]`.
- `workers/queues/src/index.ts:110` implementa `async scheduled(...)`.
- `workers/queues/src/index.ts:116` cria mensagem `data_retention_purge`.
- Não foi encontrado `cron`, `crons` ou `triggers` em `workers/queues/wrangler.toml` ou `infra/cloudflare/wrangler.queues-worker.toml`.
- `docs/operations/go-live-status.md:21` declara `P0 Data Retention` como `PASS`.

Impacto:

- Dados que deveriam ser purgados por política podem permanecer indefinidamente.
- Declaração operacional e comportamento real divergem.

Correção recomendada:

- Adicionar `[triggers] crons = [...]` no Wrangler efetivo de produção.
- Criar auditoria/alerta para última execução bem-sucedida.
- Avaliar dry-run e proteção operacional antes de hard-delete.

### P1-05: Modelo de API key scopes é permissivo demais

Severidade: P1  
Status: aberto

API keys sem scopes são tratadas como wildcard, e rotas não mapeadas são tratadas como abertas.

Evidências:

- `packages/schemas/src/api-key-scopes.ts:5` documenta que chave sem scopes age como wildcard.
- `packages/schemas/src/api-key-scopes.ts:163` reforça `Empty keyScopes = wildcard`.
- `packages/schemas/src/api-key-scopes.ts:179` diz que rota não mapeada cai em array vazio.
- `packages/schemas/src/api-key-scopes.ts:185` retorna `ROUTE_SCOPE_MAP[...] ?? []`.
- `apps/api-gateway/src/routes/api-keys.routes.ts:12` documenta que array vazio significa wildcard.
- `apps/api-gateway/src/routes/api-keys.routes.ts:13` torna `scopes` opcional.

Impacto:

- Uma API key criada sem scopes pode ganhar acesso amplo.
- Qualquer rota esquecida no mapa de scopes vira acessível para M2M autenticado.
- O risco cresce com endpoints críticos e MCP tools.

Correção recomendada:

- Inverter default: sem scopes deve significar sem acesso, exceto em migração explícita.
- Fazer rota não mapeada falhar fechada.
- Exigir scopes explícitos na criação de API key.
- Criar teste que falha quando rota protegida não tem scope ou permissão definida.

### P1-06: MCP não aplica autorização por ferramenta

Severidade: P1  
Status: aberto

O endpoint MCP é autenticado, mas não há checagem central de scopes/permissions por tool antes do dispatch.

Evidências:

- `apps/api-gateway/src/routes/mcp.routes.ts:56` define `POST /mcp`.
- `apps/api-gateway/src/routes/mcp.routes.ts:57` marca `protected: true`.
- `apps/api-gateway/src/routes/mcp.routes.ts:59` marca `authRequired: true`.
- `apps/api-gateway/src/routes/mcp.routes.ts:95` processa `tools/call`.
- `apps/api-gateway/src/routes/mcp.routes.ts:107` chama `dispatchMcpTool(toolName, toolArgs, ctx)`.
- `apps/api-gateway/src/mcp/tools/assessment.tools.ts:46` aceita `organization_id` de args ou `ctx.organizationId`.
- `apps/api-gateway/src/mcp/tools/assessment.tools.ts:50` lista assessments por `orgId` e `organizationId`, sem validar se `orgId` pertence ao contexto da API key.

Impacto:

- Chaves M2M com acesso ao MCP podem executar ferramentas além do necessário.
- Organização pode ser parâmetro controlado pelo cliente, abrindo risco de cross-org dentro do organization.

Correção recomendada:

- Criar matriz `tool -> required scopes/roles`.
- Validar `organization_id` contra `ctx.organizationId` quando API key for org-scoped.
- Fazer `dispatchMcpTool` falhar fechado para ferramenta sem política explícita.

### P1-07: Upload antimalware falha aberto

Severidade: P1  
Status: aberto

Se ClamAV está indisponível ou falha, o scanner cai para resultado limpo. Além disso, não foi encontrado `CLAMAV_API_URL` nos Wrangler do gateway.

Evidências:

- `apps/api-gateway/src/routes/documents.routes.ts:78` chama `scanForMalware(fileBytes, file.name, env?.CLAMAV_API_URL)`.
- `apps/api-gateway/src/utils/malware-scanner.ts:76` só usa ClamAV se `clamavApiUrl` existir.
- `apps/api-gateway/src/utils/malware-scanner.ts:84` loga falha de ClamAV e fallback.
- `apps/api-gateway/src/utils/malware-scanner.ts:85` documenta fail-open.
- `apps/api-gateway/src/utils/malware-scanner.ts:91` retorna `clean: true`.
- Não foi encontrado `CLAMAV_API_URL` em `apps/api-gateway/wrangler.toml` ou `infra/cloudflare/wrangler.api-gateway.toml`.

Impacto:

- Uploads de evidências de cliente podem ser aceitos sem scanning externo efetivo.
- O scanner builtin cobre apenas padrões simples e não substitui antimalware de produção.

Correção recomendada:

- Em produção, falha do scanner deve bloquear, colocar em quarentena ou exigir revisão manual.
- Configurar provider antimalware explicitamente.
- Expor métrica/alerta quando scanner externo está ausente.

### P1-08: Worker de agent run usa mock LLM em produção se secrets faltarem

Severidade: P1  
Status: aberto

Se `OPENAI_API_KEY` ou `AI_GATEWAY_BASE_URL` não estiverem presentes, o worker continua com mock em vez de falhar o job.

Evidências:

- `workers/queues/src/agent-run.consumer.ts:28` verifica `env.OPENAI_API_KEY && env.AI_GATEWAY_BASE_URL`.
- `workers/queues/src/agent-run.consumer.ts:39` loga fallback para mock.

Impacto:

- Jobs agênticos podem ser processados com saída vazia/mock.
- Resultados de assessment podem aparentar sucesso operacional sem execução real de LLM.

Correção recomendada:

- Em produção, falhar explicitamente com erro configuracional.
- Enviar mensagem para DLQ/alerta quando provider LLM estiver ausente.
- Adicionar healthcheck de configuração para queue worker.

### P1-09: Rota de debug de auth expõe contexto

Severidade: P1  
Status: aberto

Há endpoint de debug que retorna sessão, actor e scopes M2M.

Evidências:

- `apps/api-gateway/src/routes/health.routes.ts:117` define `/api/v1/auth/debug`.
- `apps/api-gateway/src/routes/health.routes.ts:120` retorna `session`.
- `apps/api-gateway/src/routes/health.routes.ts:121` retorna `actorId`.
- `apps/api-gateway/src/routes/health.routes.ts:122` retorna `m2mScopes`.

Impacto:

- Exposição desnecessária de informações de autenticação/autorização.
- Pode auxiliar enumeração e debugging por usuários não autorizados.

Correção recomendada:

- Remover de produção.
- Se necessário, proteger com `platform_admin` e flag de ambiente.

## Achados P2

### P2-01: RLS não está no caminho oficial de migration e não parece ativado por request

Severidade: P2  
Status: aberto

Existe script para habilitar RLS, mas ele não está no diretório usado pelo migration runner oficial. O app também não parece setar `app.current_tenant` por request/transação.

Evidências:

- `scripts/migrations/011-enable-rls.mjs:5` documenta uso de `app.current_tenant`.
- `scripts/migrations/011-enable-rls.mjs:11` mostra `SET app.current_tenant = '<organization-uuid>'`.
- `scripts/migrations/011-enable-rls.mjs:97` habilita RLS.
- `scripts/migrations/011-enable-rls.mjs:113` cria policy com `current_setting('app.current_tenant', true)::text`.
- `scripts/migrations/011-enable-rls.mjs:123` executa `FORCE ROW LEVEL SECURITY`.
- `packages/schemas/migrate.ts:17` roda migrations de `../../infra/docker/postgres/migrations`, não de `scripts/migrations`.

Impacto:

- Isolamento permanece principalmente no nível da aplicação.
- Dado o achado P0-02, falta uma segunda camada de contenção.

Correção recomendada:

- Mover RLS para migration versionada oficial, se for a estratégia escolhida.
- Setar organization no início de cada transação/request.
- Validar tipos da policy, especialmente se `organization_id` for UUID.
- Criar testes de isolamento em nível de banco.

### P2-02: Tipos `Env` são manuais e divergem dos Wrangler efetivos

Severidade: P2  
Status: aberto

Os tipos de ambiente são escritos manualmente, aumentando risco de drift entre código e bindings reais.

Evidências:

- `apps/api-gateway/src/types/env.ts:8` declara `interface Env`.
- `apps/api-gateway/src/types/env.ts:29` declara `STANDARD_CACHE`.
- `workers/queues/src/index.ts:12` declara `interface Env`.
- `workers/queues/src/index.ts:19` usa `AI: any`.
- `infra/cloudflare/wrangler.api-gateway.toml:165` usa `STANDARD_CACHE_KV`, divergindo do tipo/código.

Impacto:

- Typecheck passa mesmo quando produção não tem o binding esperado.
- Bindings críticos podem ficar ausentes até runtime.

Correção recomendada:

- Gerar tipos com Wrangler para o config efetivo.
- Adicionar validação de startup para bindings obrigatórios por ambiente.

### P2-03: Observability Cloudflare não está habilitada nos Wrangler revisados

Severidade: P2  
Status: aberto

Não foi encontrado bloco `[observability] enabled = true` nos configs Wrangler revisados.

Evidências:

- Busca por `observability`, `head_sampling_rate` e `enabled` não retornou configuração nos Wrangler principais revisados.

Impacto:

- Menor visibilidade operacional nativa em Workers.
- Mais difícil depurar incidentes de produção, especialmente filas/workflows.

Correção recomendada:

- Habilitar observability nos Workers produtivos.
- Definir sampling e retenção coerentes com segurança e custo.

### P2-04: Script manual de deploy omite queues worker

Severidade: P2  
Status: aberto

O script `scripts/deploy-cloudflare.mjs` não inclui `queues-worker`, embora o workflow GitHub inclua.

Evidências:

- `scripts/deploy-cloudflare.mjs:12` inclui workflows.
- `scripts/deploy-cloudflare.mjs:13` inclui api-gateway.
- `scripts/deploy-cloudflare.mjs:14` inclui ingestion.
- `scripts/deploy-cloudflare.mjs:15` inclui kb.
- `scripts/deploy-cloudflare.mjs:16` inclui reporting.
- `.github/workflows/deploy-production.yml:94` inclui `queues-worker`.

Impacto:

- Deploy manual pode deixar consumers antigos rodando.
- Deploy CI e deploy manual não são equivalentes.

Correção recomendada:

- Incluir `queues-worker` no script manual ou remover o script em favor do workflow único.
- Adicionar checklist que valide versões implantadas de todos os Workers.

### P2-05: CI filtrado referencia lint inexistente no api-gateway

Severidade: P2  
Status: aberto

O comando `pnpm --filter @standard/api-gateway lint` não executa lint porque o pacote não tem script `lint`.

Evidência de validação:

- Comando executado: `pnpm --filter @standard/api-gateway lint`.
- Resultado: `None of the selected packages has a "lint" script`.

Impacto:

- O gateway pode não estar sendo lintado no caminho esperado.
- Se o CI assume esse comando como validação, a cobertura é menor do que parece.

Correção recomendada:

- Adicionar script `lint` ao pacote `@standard/api-gateway`.
- Garantir que o CI falhe se um pacote crítico não tiver lint obrigatório.

### P2-06: Lint raiz falha no web

Severidade: P2  
Status: aberto

O lint raiz falha por erro no web.

Evidência:

- `apps/web/src/pages/admin/Users.tsx:234` acessa `setHasMore`.
- `apps/web/src/pages/admin/Users.tsx:254` declara `const [hasMore, setHasMore] = useState(false)`.
- Comando: `pnpm --filter @standard/web lint -- --quiet`.
- Resultado: erro `Cannot access variable before it is declared`.

Impacto:

- Pipeline saudável deveria bloquear nesse ponto.
- O workflow de produção ignora `pnpm lint` com `|| true`, então o erro não impede deploy.

Correção recomendada:

- Mover a declaração do state antes do uso.
- Remover `|| true` do deploy.

## Divergências de documentação operacional

### Go-live status declara PASS para itens não confirmados pelo código

Evidências:

- `docs/operations/go-live-status.md:15` declara `P0 Secrets` como `PASS`, mas há secrets versionados.
- `docs/operations/go-live-status.md:16` declara rate limiting ativo, mas o binding produtivo diverge.
- `docs/operations/go-live-status.md:21` declara data retention cron implementado, mas não há cron no Wrangler revisado.
- `docs/operations/go-live-status.md:118` declara `0 de 9 itens em falha`, o que não corresponde aos achados desta revisão.

Recomendação:

- Marcar go-live como bloqueado até reconciliação.
- Atualizar documento com status real e links para issues/PRs de correção.

## Validações executadas

### `pnpm --filter @standard/api-gateway typecheck`

Resultado: passou.

### `pnpm --filter @standard/api-gateway lint`

Resultado: não executou lint porque o pacote não tem script `lint`.

Saída relevante:

```text
None of the selected packages has a "lint" script
```

### `pnpm lint`

Resultado: falhou no lint do web.

Observação relevante:

- Antes de falhar no web, o scanner próprio informou que não encontrou secrets, apesar dos secrets versionados identificados na revisão.

### `pnpm --filter @standard/web lint -- --quiet`

Resultado: falhou.

Erro relevante:

```text
apps/web/src/pages/admin/Users.tsx:234:9
Cannot access variable before it is declared
```

## Ordem recomendada de correção

1. Rotacionar credenciais expostas e remover secrets versionados.
2. Corrigir organization middleware para impedir path organization override.
3. Unificar binding `STANDARD_CACHE` e fazer rate limit falhar fechado em produção.
4. Corrigir workflow de produção: remover `|| true`, trocar `drizzle-kit push --force` por migrations versionadas e fixar Wrangler.
5. Reconciliar Wrangler configs e gerar tipos `Env`.
6. Ligar corretamente Council Workflow ou remover fallback inconsistente.
7. Configurar cron real de data retention.
8. Reestruturar scopes de API key/MCP para fail-closed.
9. Configurar antimalware produtivo com fail-closed/quarentena.
10. Corrigir lint do web e adicionar lint obrigatório ao api-gateway.
11. Atualizar `docs/operations/go-live-status.md` para refletir o estado real.

## Critério sugerido para liberar produção

- Nenhum P0 aberto.
- Credenciais rotacionadas e scanner de secrets bloqueando CI.
- Teste negativo de cross-organization passando para path/header/session/API key.
- Rate limit validado contra o binding produtivo.
- Deploy usando migrations versionadas.
- Workflow/queue/cron testados no ambiente staging com os mesmos configs de produção.
- Documentação de go-live atualizada e coerente com evidências.
