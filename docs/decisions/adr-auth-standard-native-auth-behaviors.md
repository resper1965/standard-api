# ADR-AUTH-001: Standard Native Auth — Comportamentos e Regras Operacionais

**Status:** Ativo  
**Data:** 2026-05-25  
**Versão Standard Native Auth:** 1.6.11  
**Contexto:** Dois bugs críticos em produção revelaram defaults não-documentados do Standard Native Auth v1.6.x. Este documento é a fonte canônica de regras para usar o Standard Native Auth corretamente neste projeto. Atualizar a cada bug descoberto ou update de versão.

---

## Regra 1 — Drizzle Adapter: nunca duplicar field mappings

**Comportamento observado (bug 2026-05-25):**
```
StandardAuthError: The field "user_id" does not exist in the schema for the model "account"
```

**Causa:** O Drizzle adapter lê column metadata diretamente do schema Drizzle
(`accountId: text("account_id")`). Ao também declarar `account.fields.userId: "user_id"`
no `standardAuth()`, o Standard Native Auth aplica um double-mapping que quebra as queries de join.
O adapter já faz a conversão camelCase→snake_case automaticamente via os nomes de coluna
definidos no schema Drizzle.

**Regra:**
- ❌ NUNCA declarar blocos `fields` para modelos `account`, `session`, `verification`, `user` quando o schema Drizzle já define as colunas snake_case.
- ✅ O Drizzle adapter mapeia camelCase→snake_case automaticamente via column names.
- ✅ Usar `additionalFields` com `fieldName` APENAS para campos custom que não existem no schema padrão do Standard Native Auth.

**Modelos afetados:** `account`, `session`, `verification` — todos têm schema Drizzle completo em `packages/schemas/src/db/auth-schema.ts`.

**Exemplo correto:**
```typescript
// ✅ CORRETO — sem fields, com additionalFields para campos custom
standardAuth({
  database: drizzleAdapter(db, { provider: "pg", schema }),
  user: {
    additionalFields: {
      jobTitle: { type: "string", fieldName: "job_title", required: false },
    }
  },
  // sem account.fields, sem session.fields, sem verification.fields
})
```

**Exemplo incorreto:**
```typescript
// ❌ ERRADO — double-mapping com o Drizzle adapter
standardAuth({
  account: {
    fields: { userId: "user_id" }  // já está no schema Drizzle
  }
})
```

---

## Regra 2 — additionalFields: sempre declarar required: false para campos opcionais

**Comportamento observado (bug 2026-05-25):**
```
[body.taxId] Invalid input: expected string, received undefined
[body.billingEmail] Invalid input: expected string, received undefined
... (10 campos)
```

**Causa:** Standard Native Auth trata `additionalFields` com `type: "string"` como **obrigatórios por default**. Sem `required: false`, o plugin `organization` gera um schema de validação que rejeita qualquer requisição que não envie todos os campos.

**Regra:**
- ❌ NUNCA declarar `additionalFields` sem `required: false` se o campo não for coletado na criação.
- ✅ Sempre adicionar `required: false` para campos que são opcionais ou coletados em etapas posteriores.
- Tipos disponíveis: `"string" | "number" | "boolean" | "date"`

**Exemplo correto:**
```typescript
// ✅ CORRETO — sem fieldName para campos multi-palavra (ver Regra 2b)
organization({
  schema: {
    organization: {
      additionalFields: {
        taxId: { type: "string", required: false },
        billingEmail: { type: "string", required: false },
      }
    }
  }
})
```

---

## Regra 2b — additionalFields em plugins: nunca especificar fieldName para campos camelCase multi-palavra

**Comportamento observado (bug 2026-05-25, descoberto via smoke test):**
```
POST /api/auth/organization/create com { taxId: "..." } → 500
POST /api/auth/organization/create com { phone: "..." } → 200 ✅
```

**Causa:** Em `plugins[].schema.organization.additionalFields`, o Drizzle adapter converte `camelCase → snake_case` automaticamente. Ao especificar `fieldName: "tax_id"` para `taxId`, o adapter aplica double-mapping → crash 500.

**Campos afetados (falham com fieldName):** `taxId`, `billingEmail`, `postalCode`, `employeeCount`  
**Campos não-afetados (palavra única):** `phone`, `address`, `city`, `state`, `country`, `industry`

**Regra:**
- ❌ NUNCA especificar `fieldName` em `additionalFields` de plugins para campos camelCase multi-palavra quando o Drizzle schema já define a coluna snake_case.
- ✅ Omitir `fieldName` — o Drizzle faz a conversão automaticamente.

```typescript
// ✅ CORRETO
taxId: { type: "string", required: false }          // → tax_id automático
billingEmail: { type: "string", required: false }   // → billing_email automático

// ❌ ERRADO — double-mapping → 500
taxId: { type: "string", fieldName: "tax_id", required: false }
```

---

## Regra 3 — Version lock: nunca usar ^ ou ~ na versão do standard-native-auth

**Comportamento observado (histórico git):**
```
fix: pin standard-native-auth to 1.2.10 — fixes dashboard TypeError crash
```

**Causa:** Minor versions do Standard Native Auth introduzem breaking changes silenciosos nos adapters e plugins. Historicamente: `1.2.x → TypeError crash`, `1.6.x → double-mapping bug`.

**Regra:**
- ❌ NUNCA usar `"standard-native-auth": "^1.6.11"` — permite minor updates automáticos sem revisão.
- ✅ Sempre usar versão exata: `"standard-native-auth": "1.6.11"`.
- ✅ Qualquer update segue o processo documentado em `docs/runbooks/standard-native-auth-update-process.md`.

---

## Regra 4 — BETTER_AUTH_SECRET: rotacionar com processo formal

**Risco:** Rotacionar o secret invalida TODAS as sessões ativas imediatamente. Não existe grace period. Todas as sessões existentes de todos os usuários são encerradas no momento do deploy.

**Regra:**
- ✅ Seguir runbook em `docs/runbooks/auth-secret-rotation.md` — nunca rotacionar ad-hoc.
- ✅ Comunicar usuários antes da rotação (mínimo 24h de antecedência).
- ✅ Registrar data de cada rotação no runbook.
- ❌ NUNCA commitar o valor do secret em nenhum arquivo.

---

## Regra 5 — Plugin organization: activeOrganizationId

**Comportamento:** A VERIFICAR com testes de integração.

**Questões abertas:**
- [ ] Após criar uma org, `activeOrganizationId` na session é setado automaticamente?
- [ ] Como limpar o `activeOrganizationId` (sign-out? set-active-organization com null?)
- [ ] O que acontece ao fazer `get-session` sem `activeOrganizationId` setado?

---

## Regra 6 — Plugin admin: endpoints e autorização

**Comportamento confirmado (auditado em 2026-05-25 via smoke test):**

| Endpoint | Método | Role admin | Sem auth | Notas |
|---|---|---|---|---|
| `/api/auth/admin/list-users` | GET | **200** `{users, total}` | 401 | Acessível para role admin |
| `/api/auth/admin/list-sessions` | GET | **404** | — | Não existe nesta versão |

**Regra:**
- ✅ `admin/list-users` exige sessão válida com role `admin` — retorna 401 sem cookie.
- ❌ `admin/list-sessions` não existe em Standard Native Auth 1.6.11.
- [ ] `ban/unban` — ainda não auditado.
- [ ] Impersonation — ainda não auditado.

---

## Regra 7 — emailVerified e verificação de email

**Comportamento:** A VERIFICAR.

**Questões abertas:**
- [ ] Default do campo `emailVerified` ao criar usuário via `emailAndPassword`?
- [ ] Com `requireEmailVerification: false` (nossa config atual), qual é o comportamento do fluxo de login?
- [ ] Existe risco de usuários com `emailVerified: false` acessarem endpoints protegidos?

---

## Regra 8 — Cookie session_token: atributos, expiração e get-session

**Comportamento confirmado (auditado em 2026-05-25 via smoke test):**

```
Set-Cookie: __Secure-standard-native-auth.session_token=...; Max-Age=604800; Path=/; HttpOnly; Secure; SameSite=Lax
```

| Atributo | Valor | Segurança |
|---|---|---|
| Nome | `__Secure-standard-native-auth.session_token` | Prefixo `__Secure-` exige HTTPS |
| Max-Age | **604800s (7 dias)** | Sessão persistente |
| HttpOnly | ✅ Presente | Protege contra XSS |
| Secure | ✅ Presente | Só envia em HTTPS |
| SameSite | ✅ Lax | Protege contra CSRF |

**get-session sem cookie:**
```
GET /api/auth/get-session sem cookie → 200 com body literal: null
```
Standard Native Auth retorna HTTP 200 com body `null` (não `{ session: null }`, não 401).

**Regras:**
- ✅ Sempre verificar `if (!session)` no frontend — não `if (!session.user)`.
- ❌ Nunca assumir que `get-session` retorna 401 quando não autenticado.
- ✅ Cookie expira em **7 dias**. Sessões devem ser renovadas antes disso.
- `Content-Type: text/plain` em sign-in → **415** (não 400). Exigir `application/json`.

---

## Histórico de Atualizações

| Data | Versão | Regra adicionada | Motivo |
|------|--------|-----------------|--------|
| 2026-05-25 | 1.6.11 | Regras 1-4 | Dois bugs críticos em produção |
| 2026-05-25 | 1.6.11 | Regra 2b | Smoke test revelou: `fieldName` em additionalFields multi-palavra causa 500 |
| 2026-05-25 | 1.6.11 | Regras 6, 8 | Admin audit e cookie audit confirmaram comportamentos reais |

