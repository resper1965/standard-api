# Security Operations

## Configurar Auth por Ambiente

Local/test:

- usar `x-aegis-actor-id`;
- opcionalmente `Authorization: Bearer dev:<role>`;
- `mock_dev` é placeholder explícito.

Staging/production:

- não usar `MockAuthProvider`;
- configurar JWT/API key/Cloudflare Access provider antes de exposição pública;
- bloquear wildcard CORS;
- proteger admin com Cloudflare Access/Zero Trust.

## Configurar Secrets

Seguir `docs/operations/secrets-and-env.md`.

Nunca versionar:

- JWT signing keys;
- API keys;
- Cloudflare tokens;
- service tokens;
- database URLs reais;
- storage credentials.

## Validar Tenant Isolation

Checklist:

- toda rota de cliente recebe `x-aegis-tenant-id`;
- `tenant_id` do body não diverge do tenant context;
- assessment carregado pertence ao tenant;
- storage keys preservam tenant/organization/assessment;
- KB search usa assessment scope;
- report downloads validam tenant.

## Revisar Permissões

Revisar `DEFAULT_ROLE_PERMISSIONS` em `packages/security/src/constants.ts`.

Ao adicionar rota crítica:

1. Definir permissão.
2. Declarar `permissions` no route definition.
3. Adicionar teste positivo/negativo.
4. Verificar audit event em permission denied.

## Auditar Permission Denied

Eventos `security_permission_denied` registram:

- actor;
- tenant;
- trace;
- motivo;
- permissões exigidas.

Use o `trace_id` para correlacionar com request, workflow e lifecycle events.

## Investigar Upload Rejeitado

Verificar:

- `FILE_TOO_LARGE`;
- `UNSUPPORTED_EXTENSION`;
- `UNSUPPORTED_MIME_TYPE`;
- `INVALID_FILE_SIGNATURE`;
- `INVALID_TEXT_FILE`;
- filename normalizado;
- quarantine flag;
- malware scan status quando provider real existir.

Não registrar conteúdo do arquivo.

## Investigar Prompt Injection

Verificar se o conteúdo foi tratado como `untrusted_evidence`.

Sinais comuns:

- "ignore previous instructions";
- tentativa de revelar system prompt;
- tentativa de alterar tool allowlist;
- tentativa de aprovar artefatos;
- tentativa de declarar KB como fonte normativa.

## Operar Admin Endpoints

Admin endpoints devem exigir:

- auth real em staging/production;
- permissão `admin:*`, `scf:import` ou equivalente;
- Cloudflare Access;
- audit log;
- rate limiting.

## Rotacionar API Keys e Service Tokens

Processo futuro esperado:

1. Criar nova key/token escopada por tenant/org.
2. Aplicar permissões mínimas.
3. Atualizar consumidor.
4. Revogar key/token antigo.
5. Registrar evento de rotação.

## Checklist de Produção

- `MockAuthProvider` desabilitado.
- JWT/API key provider implementado.
- CORS sem wildcard.
- Admin protegido por Cloudflare Access.
- Rate limiting real configurado.
- Malware scanning definido.
- Audit log persistente.
- Secrets em secret manager/bindings.
- Testes cross-tenant passando.
- Nenhum endpoint crítico sem permission.
