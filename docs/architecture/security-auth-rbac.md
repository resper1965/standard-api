# Security, Auth and RBAC

## Objetivo

A camada de segurança inicial do Standard cria contratos reutilizáveis para autenticação, organization context, RBAC, upload security, prompt security e auditabilidade segura. A implementação fica em `packages/security` e é integrada ao `apps/api-gateway`.

## Modelo de Autenticação

O MVP define `AuthContext` com:

- `actor_id`
- `actor_type`
- `organization_id`
- `organization_ids`
- `roles`
- `permissions`
- `auth_method`
- `session_id`
- `api_key_id`
- `issued_at`
- `expires_at`
- `trace_id`

Auth methods modelados:

- `jwt`
- `api_key`
- `cloudflare_access`
- `service_token`
- `mock_dev`

No MVP, integramos o provedor definitivo usando o **Standard Native Auth Plugin**, que assume JWT, Auth Session, Database Persistence (Drizzle) e a hierarquia oficial do sistema, além da gestão madura via o plugin API Keys.

## Organization Resolution

`TenantResolver` resolve o organization por:

- header interno `x-standard-organization-id`;
- route param `organizationId`;
- placeholders futuros para JWT, API key e hostname.

Regra: `organization_id` vindo do body nunca é suficiente isoladamente. Divergência entre body/contexto deve ser bloqueada por `TenantGuard`.

## RBAC

`PolicyEngine` avalia:

- auth context presente;
- organization context presente quando a permissão não é global;
- organization do auth compatível com organization resolvido;
- permissões requeridas pela rota/operação.

Roles iniciais:

- `owner`
- `contributor`
- `auditor`
- `system`

As permissões iniciais cobrem organization, organization, assessment, documents, KB, SCF, SoA, Gap, Maturity, POA&M, Reports, Agents e Admin.

## Organization Isolation

Toda operação de cliente deve carregar `organization_id`. Para assessment, o backend valida que o assessment pertence ao organization resolvido antes de acessar dados.

`TenantGuard` fornece:

- validação de `organization_id` divergente no body;
- validação de organization/assessment context;
- bloqueio de cross-organization access.

## Authorization Flow

1. Resolver `trace_id`.
2. Resolver organization context.
3. Resolver auth context.
4. Executar RBAC se a rota declarar `permissions`.
5. Aplicar rate limit placeholder em rotas sensíveis.
6. Registrar audit event seguro.
7. Executar handler.

## Approval Authorization

Criação de approval events exige permissão específica:

- `soa:approve`
- `gap:approve`
- `maturity:approve`
- `poam:approve`
- `report:approve`

O Assessment Engine continua responsável por validar approval gates e bloquear bypass.

## Upload Security

`FileSecurityService` consolida política de upload:

- tamanho máximo;
- extensões permitidas;
- MIME types permitidos;
- content hash;
- neutralização de path traversal via filename normalization;
- quarantine flag em rejeição;
- malware scan placeholder.

O serviço de ingestão continua validando assinatura e tipo do arquivo antes de processar.

## Prompt Injection Defenses

`PromptSecurityService` marca conteúdo de KB/documentos como `untrusted_evidence`.

Regras:

- conteúdo recuperado não pode alterar system/developer instructions;
- conteúdo recuperado não pode mudar tool allowlist;
- KB não é fonte normativa SCF;
- agents devem manter evidência separada de instruções;
- outputs passam schema validation.

## Agent Runtime Security

`ToolUsePolicyService` bloqueia tools não permitidas, external calls por default e approval tools por default. O Agent Runtime existente segue com allowlist por contrato funcional e guardrails contra final findings ou mappings oficiais.

## API Security

O API Gateway agora suporta:

- auth middleware;
- organization middleware;
- RBAC middleware;
- rate limit placeholder;
- secure error handling;
- audit metadata com auth method e roles.

Rotas críticas com permissões explícitas incluem upload/reprocess, KB index/search, Agent Runtime start/list, workflow start/cancel/resume/signals, report download e SCF admin import.

## Admin Protection

`/api/v1/admin/scf/import-runs` exige `scf:import`. Cloudflare Access/Zero Trust deve proteger consoles e ambientes administrativos quando houver deployment público.

## Audit Logs Seguros

Eventos preparados:

- auth/permission denied;
- API requests;
- rate limit placeholder checks;
- uploads/reprocess;
- KB search/index;
- agent run;
- workflow start/cancel/resume/signals;
- report download;
- admin imports.

Não logar documento completo, chunks completos, prompt completo, tokens, secrets, API keys ou output sensível integral.

## Maturidade do MVP Enterprise-Grade

- **Auth real (Session e DB Persistence):** Utiliza Standard Native Auth (`@standard-native-auth/api-key` encapsulados no PostgreSQL pelo Schema Drizzle).
- **Tenant Context:** O sistema implementa o modelo 1:1 User=Tenant. Não há assignment multi-organization no core do MVP API-first. A identidade está atrelada à API Key gerada para o Tenant.
- **RBAC Ativo:** Funcionalidades seguras integradas via `rbac.middleware.ts` para checar `context.auth.roles`.
- **API Keys / Revogações:** Plugin nativo que interage com as tabelas na DB garantindo segurança transacional.
- Toda lógica in-memory simulada foi deprecada na fase Enterprise-Grade e desativada nas rotas de produção operando na porta 3000 do Gateway.

