# Runbook: Processo de Update do Better Auth

**Regra:** Nunca atualizar o `better-auth` sem seguir este processo.  
**Motivo:** Minor versions introduzem breaking changes silenciosos em adapters e plugins.  
**Referência:** [ADR-AUTH-001 — Regra 3](../decisions/adr-auth-better-auth-behaviors.md)

---

## Histórico de Updates

| Data | De | Para | Executado por | PR |
|------|-----|------|--------------|-----|
| (primeiro update controlado ainda não executado) | — | — | — | — |

---

## Processo Obrigatório

### Passo 1 — Criar branch isolada

```bash
git checkout -b chore/better-auth-X.Y.Z
```

**Nunca fazer update direto na `main`.**

### Passo 2 — Ler o CHANGELOG antes de qualquer mudança

Acessar: https://github.com/better-auth/better-auth/releases

Focar em mudanças que afetam:
- `adapters/drizzle` — especialmente field mapping, schema parsing
- `plugins/organization` — schema, additionalFields, validation
- `plugins/admin` — endpoints, role enforcement
- Session/cookie behavior — expiração, SameSite, paths
- Schema validation — mudanças em como campos são validados

**Documentar** qualquer breaking change encontrado antes de prosseguir.  
Se houver breaking change relevante: discutir com o time antes de prosseguir.

### Passo 3 — Criar Neon branch isolado para teste

Via Neon Console ou CLI:
```bash
neon branches create --name test/better-auth-X.Y.Z --project-id <PROJECT_ID>
```

Anotar a `DATABASE_URL` do branch criado.

### Passo 4 — Atualizar a versão (versão exata, sem ^ ou ~)

Em `packages/auth/package.json`:
```json
{
  "dependencies": {
    "better-auth": "X.Y.Z"
  }
}
```

```bash
pnpm install
```

Verificar que o `pnpm-lock.yaml` reflete a versão exata.

### Passo 5 — Rodar migrations no branch de teste

```bash
DATABASE_URL=<URL_DO_BRANCH_TESTE> pnpm db:migrate
```

### Passo 6 — Rodar suite de testes de integração auth

```bash
TEST_USER_EMAIL=<email_teste> \
TEST_USER_PASSWORD=<senha_teste> \
DATABASE_URL=<URL_DO_BRANCH_TESTE> \
pnpm test --filter=apps/api-gateway -- tests/auth/
```

**Qualquer falha = parar aqui.** Investigar a causa antes de prosseguir.  
Se a causa for um breaking change do Better Auth:
1. Documentar no ADR
2. Aplicar o fix
3. Rodar os testes novamente
4. Só prosseguir quando TODOS os testes passarem

### Passo 7 — Deploy em staging

```bash
npx wrangler deploy -c infra/cloudflare/wrangler.api-gateway.toml -e staging
```

### Passo 8 — Smoke test manual em staging

- [ ] `POST /api/auth/sign-in/email` com credenciais válidas → 200 + cookie
- [ ] `GET /api/auth/get-session` com cookie → user correto
- [ ] `POST /api/auth/organization/create` sem campos opcionais → 200
- [ ] `POST /api/auth/organization/create` com todos os campos → 200
- [ ] `POST /api/auth/sign-out` → sessão encerrada
- [ ] `GET /api/health/auth` → `{ "status": "ok" }`

### Passo 9 — Atualizar o ADR com novos comportamentos descobertos

Se qualquer comportamento novo foi descoberto durante o update:
1. Abrir `docs/decisions/adr-auth-better-auth-behaviors.md`
2. Adicionar como nova regra documentada
3. Atualizar a tabela "Histórico de Atualizações"

### Passo 10 — Commit e PR

```bash
git add packages/auth/package.json pnpm-lock.yaml
# + quaisquer fixes para breaking changes
git commit -m "chore(auth): update better-auth from A.B.C to X.Y.Z

CHANGELOG highlights:
- [item relevante 1]
- [item relevante 2]

Breaking changes handled:
- [se houver]

Tests: all auth integration tests passing (N/N)
Staging: smoke tested manually (all 6 checks passed)"
```

Abrir PR com:
- Link para o CHANGELOG
- Lista de breaking changes encontrados
- Evidência dos testes passando (screenshot ou log)
- Resultado do smoke test em staging

### Passo 11 — Deploy em production após merge

```bash
npx wrangler deploy -c infra/cloudflare/wrangler.api-gateway.toml -e production
```

Verificar `GET /api/health/auth` em production após o deploy.

### Passo 12 — Deletar o Neon branch de teste

Via Neon Console ou CLI:
```bash
neon branches delete test/better-auth-X.Y.Z --project-id <PROJECT_ID>
```

### Passo 13 — Registrar no histórico

Atualizar a tabela "Histórico de Updates" acima com data, versões, responsável e link do PR.

---

## Referências

- [ADR-AUTH-001](../decisions/adr-auth-better-auth-behaviors.md)
- [Runbook de Rotação de Secret](./auth-secret-rotation.md)
- [Better Auth Releases](https://github.com/better-auth/better-auth/releases)
