# ADR-AUTH-001: Better Auth — Comportamentos e Regras Operacionais

**Status:** Ativo  
**Data:** 2026-05-25  
**Versão Better Auth:** 1.6.11  
**Contexto:** Dois bugs críticos em produção revelaram defaults não-documentados do Better Auth v1.6.x. Este documento é a fonte canônica de regras para usar o Better Auth corretamente neste projeto. Atualizar a cada bug descoberto ou update de versão.

---

## Regra 1 — Drizzle Adapter: nunca duplicar field mappings

**Comportamento observado (bug 2026-05-25):**
```
BetterAuthError: The field "user_id" does not exist in the schema for the model "account"
```

**Causa:** O Drizzle adapter lê column metadata diretamente do schema Drizzle
(`accountId: text("account_id")`). Ao também declarar `account.fields.userId: "user_id"`
no `betterAuth()`, o Better Auth aplica um double-mapping que quebra as queries de join.
O adapter já faz a conversão camelCase→snake_case automaticamente via os nomes de coluna
definidos no schema Drizzle.

**Regra:**
- ❌ NUNCA declarar blocos `fields` para modelos `account`, `session`, `verification`, `user` quando o schema Drizzle já define as colunas snake_case.
- ✅ O Drizzle adapter mapeia camelCase→snake_case automaticamente via column names.
- ✅ Usar `additionalFields` com `fieldName` APENAS para campos custom que não existem no schema padrão do Better Auth.

**Modelos afetados:** `account`, `session`, `verification` — todos têm schema Drizzle completo em `packages/schemas/src/db/auth-schema.ts`.

**Exemplo correto:**
```typescript
// ✅ CORRETO — sem fields, com additionalFields para campos custom
betterAuth({
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
betterAuth({
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

**Causa:** Better Auth trata `additionalFields` com `type: "string"` como **obrigatórios por default**. Sem `required: false`, o plugin `organization` gera um schema de validação que rejeita qualquer requisição que não envie todos os campos.

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

## Regra 3 — Version lock: nunca usar ^ ou ~ na versão do better-auth

**Comportamento observado (histórico git):**
```
fix: pin better-auth to 1.2.10 — fixes dashboard TypeError crash
```

**Causa:** Minor versions do Better Auth introduzem breaking changes silenciosos nos adapters e plugins. Historicamente: `1.2.x → TypeError crash`, `1.6.x → double-mapping bug`.

**Regra:**
- ❌ NUNCA usar `"better-auth": "^1.6.11"` — permite minor updates automáticos sem revisão.
- ✅ Sempre usar versão exata: `"better-auth": "1.6.11"`.
- ✅ Qualquer update segue o processo documentado em `docs/runbooks/better-auth-update-process.md`.

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

**Comportamento:** A VERIFICAR com testes de integração (Task 6 do plano).

**Questões abertas:**
- [ ] `/api/auth/admin/list-users` — exige role `admin` na session?
- [ ] `ban/unban` — invalida sessões existentes imediatamente?
- [ ] Impersonation — funciona em Cloudflare Workers (ambiente sem filesystem)?
- [ ] Como o plugin `admin` interage com o campo `role` na tabela `user`?

---

## Regra 7 — emailVerified e verificação de email

**Comportamento:** A VERIFICAR.

**Questões abertas:**
- [ ] Default do campo `emailVerified` ao criar usuário via `emailAndPassword`?
- [ ] Com `requireEmailVerification: false` (nossa config atual), qual é o comportamento do fluxo de login?
- [ ] Existe risco de usuários com `emailVerified: false` acessarem endpoints protegidos?

---

## Regra 8 — Cookie session_token e get-session sem autenticação

**Comportamento confirmado (auditado em 2026-05-25 via smoke test):**

```
GET /api/auth/get-session sem cookie → 200 com body literal: null
```

Better Auth retorna HTTP 200 com body `null` (string JSON literal) quando não há sessão ativa.
Não retorna 401. Não retorna `{ session: null }`.

**Implicação para o frontend:**
- Verificar `body === null` (não `body.session === null`) para detectar ausência de sessão.
- O frontend deve tratar `null` como "não autenticado".

**Regra:**
- ✅ Sempre verificar `if (!session)` no frontend — não `if (!session.user)`.
- ❌ Nunca assumir que `get-session` retorna 401 quando não autenticado.

**Comportamento adicional confirmado:**
- `POST /api/auth/sign-in/email` com `Content-Type: text/plain` → **415** (não 400)
- Better Auth requer `Content-Type: application/json` obrigatoriamente.

---

## Histórico de Atualizações

| Data | Versão | Regra adicionada | Motivo |
|------|--------|-----------------|--------|
| 2026-05-25 | 1.6.11 | Regras 1-4 | Dois bugs críticos em produção |
| 2026-05-25 | 1.6.11 | Regra 2b | Smoke test revelou: `fieldName` em additionalFields multi-palavra causa 500 |
| 2026-05-25 | 1.6.11 | Regra 8 | Smoke test auditou: `get-session` sem cookie retorna `200 null`, não 401 |
