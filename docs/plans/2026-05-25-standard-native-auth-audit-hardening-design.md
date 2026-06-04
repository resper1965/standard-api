# Standard Native Auth — Auditoria e Hardening

**Data:** 2026-05-25  
**Status:** Aprovado  
**Contexto:** Após 2 semanas de instabilidade em produção com dois bugs críticos descobertos em runtime (double-mapping Drizzle adapter, additionalFields obrigatórios por default), foi decidido executar auditoria completa e hardening do Standard Native Auth v1.6.x em vez de substituição.

---

## Contexto e Motivação

### Bugs críticos recentes

| Data | Bug | Impacto | Root cause |
|------|-----|---------|-----------|
| 2026-05-25 | Login 500 | Autenticação completamente bloqueada | `account/session/verification.fields` em conflito duplo com Drizzle adapter |
| 2026-05-25 | Org create 400 | Criação de organização bloqueada | `additionalFields` sem `required: false` — obrigatórios por default |

### Padrão observado no histórico

```
Neon Auth → Standard Native Auth → pin 1.2.10 (crash) → Neon Auth → revert →
Standard Native Auth 1.6.x → double-mapping bug → optional fields bug
```

### Decisão

Auditoria + Hardening do Standard Native Auth atual. Não reescrever agora. Tornar o comportamento previsível, testado e monitorado.

---

## Escopo — 5 Camadas

### 1. Inventário de Touch Points

| Área | Arquivo | Risco atual |
|------|---------|-------------|
| Drizzle adapter + schema | `packages/auth/src/auth.ts` | ⚠️ Alto |
| Plugin `organization` | `auth.ts` → Standard Native Auth internal | ⚠️ Alto |
| Plugin `admin` | `auth.ts` → Standard Native Auth internal | 🟡 Médio |
| `additionalFields` user | `auth.ts` | 🟡 Médio |
| Session cookie em Workers | `apps/api-gateway/src/index.ts` | 🟡 Médio |
| Trusted origins | `auth.ts` | 🟢 Baixo |
| `BETTER_AUTH_SECRET` rotation | env vars | 🔴 Crítico |

### 2. Documentação de Comportamentos

Criar `docs/decisions/adr-auth-standard-native-auth-behaviors.md` com cada comportamento não-óbvio descoberto.

**Regras já documentadas:**

**Drizzle Adapter**
- ❌ NUNCA usar `fields` mapping para campos que já seguem convenção camelCase→snake_case no schema Drizzle. O adapter faz isso automaticamente via column metadata.
- ✅ Usar `fields` mapping APENAS para campos que divergem da convenção padrão.
- ✅ Usar `additionalFields` com `fieldName` para campos custom.

**additionalFields**
- ❌ NUNCA declarar `type: "string"` sem `required: false` para campos opcionais. Standard Native Auth trata como obrigatório por default.
- ✅ Sempre declarar `required: false` para campos que não são coletados na criação.
- Tipos disponíveis: `"string" | "number" | "boolean" | "date"`

**A verificar na auditoria:**
- Quais campos o `/api/auth/organization/create` aceita internamente?
- Slugs duplicados — comportamento e erro retornado?
- `activeOrganizationId` na session — quem seta, quando, e como limpar?
- Plugin `admin`: endpoints `/api/auth/admin/*` exigem role `admin` na session?
- Impersonation em Workers — funciona? Limites?
- `ban/unban` — invalida sessões existentes imediatamente?

**BETTER_AUTH_SECRET**
- Rotacionar o secret invalida TODAS as sessões ativas imediatamente.
- Não existe grace period.
- Requer runbook documentado e comunicação aos usuários antes.

### 3. Testes de Integração

**Estrutura:**
```
apps/api-gateway/tests/auth/
├── sign-in.test.ts
├── sign-up.test.ts
├── session.test.ts
├── organization.test.ts
├── organization-member.test.ts
└── admin.test.ts
```

**Casos obrigatórios:**

`sign-in.test.ts`
- ✅ login com credenciais corretas → 200 + session cookie
- ✅ senha errada → 401 sem stack trace exposto
- ✅ email inexistente → 401 (mesma resposta — não enumerar users)
- ✅ body malformado → 400
- ✅ origin não confiável → 403

`organization.test.ts` ← regressão do bug de hoje
- ✅ criar org sem campos opcionais → 200
- ✅ criar org com todos os campos → 200
- ✅ slug duplicado → erro tratado graciosamente
- ✅ campos billingEmail, taxId, etc. aceitam undefined/null

`session.test.ts` ← regressão do bug de login
- ✅ sign-in → get-session retorna user correto
- ✅ request sem cookie → 401
- ✅ cookie expirado → 401

**Gate de CI — obrigatório antes de todo deploy production:**
```yaml
auth-integration-tests:
  runs-on: ubuntu-latest
  steps:
    - uses: neon-actions/create-branch@v1
    - run: pnpm db:migrate
    - run: pnpm test --filter=auth
    - uses: neon-actions/delete-branch@v1
```

### 4. Version Lock + Processo de Update

**Package.json — versão exata:**
```json
"standard-native-auth": "1.6.11"   // sem ^ ou ~ — nunca permitir update automático
```

**Processo obrigatório para qualquer update:**
1. Branch isolada: `feature/standard-native-auth-X.Y.Z`
2. Neon branch isolado para teste
3. Ler CHANGELOG entre versões — foco em adapters, plugins, schema, validators
4. Atualizar e rodar suite de testes auth — qualquer falha = não avança
5. Deploy em staging → smoke test manual (sign-in, org create, get-session)
6. Atualizar `docs/decisions/adr-auth-standard-native-auth-behaviors.md`
7. PR com evidência dos testes → merge → production

**Runbook de rotação do BETTER_AUTH_SECRET:**
```
Arquivo: docs/runbooks/auth-secret-rotation.md
Frequência: a cada 90 dias ou em caso de comprometimento
Impacto: todas as sessões ativas invalidadas imediatamente
Mitigação: comunicar usuários antes (email ou banner)
Processo:
  1. Gerar: openssl rand -base64 64
  2. Adicionar como BETTER_AUTH_SECRET_NEW no Cloudflare
  3. Deploy com novo secret
  4. Remover secret antigo
  5. Registrar data no runbook
```

### 5. Observabilidade

**Logs estruturados no Worker:**
```typescript
// Categorias: auth.sign-in, auth.session, auth.org, auth.error
logger.auth("sign-in.failed", {
  reason: "invalid_credentials",
  email_domain: "bekaa.eu",     // nunca email completo
  trace_id: ctx.traceId,
  organization_id: ctx.organizationId,
});
```

**Alertas — 3 métricas críticas:**
- Taxa de erro em `/api/auth/*` > 1% em 5 min → alerta imediato
- Erros 500 em auth > 0 em 1 min → alerta imediato
- Erros 400 em org/create > 5 em 10 min → investigação

**Health check:**
```
GET /api/health/auth
→ verifica conexão Neon
→ verifica que Standard Native Auth responde
→ sem detalhes internos expostos
→ usado pelo CI antes de marcar deploy como saudável
```

---

## Estimativa

| Camada | Esforço |
|--------|---------|
| Inventário + documentação de comportamentos | 0.5 dia |
| Testes de integração (6 arquivos, ~40 casos) | 1.5 dias |
| Version lock + runbooks | 0.5 dia |
| Observabilidade (logs + health check) | 0.5 dia |
| **Total** | **~3 dias** |

---

## Entregáveis

| # | Entregável | Onde |
|---|-----------|------|
| 1 | ADR de comportamentos Standard Native Auth | `docs/decisions/adr-auth-standard-native-auth-behaviors.md` |
| 2 | Suite de testes auth (6 arquivos) | `apps/api-gateway/tests/auth/` |
| 3 | Version lock em package.json | `packages/auth/package.json` |
| 4 | Runbook de rotação de secret | `docs/runbooks/auth-secret-rotation.md` |
| 5 | Logs estruturados + health check | `apps/api-gateway/src/` |
| 6 | Gate de CI auth antes de deploy | `.github/workflows/` |

---

## Critério de Sucesso

- Nenhum bug de auth chega a produção sem ser detectado pelos testes primeiro.
- Qualquer update do Standard Native Auth passa pelo processo de update documentado.
- Erros em `/api/auth/*` geram alerta antes do usuário relatar.
- O comportamento de cada plugin está documentado e testado.
