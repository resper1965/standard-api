---
title: "Runbook: Rotação do BETTER_AUTH_SECRET"
---

# Runbook: Rotação do BETTER_AUTH_SECRET

**Impacto:** TODAS as sessões ativas são invalidadas imediatamente. Sem grace period.  
**Frequência:** A cada 90 dias ou em caso de comprometimento suspeito.  
**Responsável:** Engenheiro com acesso ao Cloudflare Dashboard e Neon.  
**Estimativa de tempo:** ~30 minutos (excluindo comunicação de usuários).

---

## ⚠️ Antes de começar

- Este procedimento **encerra todas as sessões ativas** de todos os usuários imediatamente.
- Todos os usuários precisarão fazer login novamente após o deploy.
- **Comunicar usuários com pelo menos 24h de antecedência.**

---

## Histórico de Rotações

| Data | Executado por | Motivo | SHA do commit |
|------|--------------|--------|--------------|
| (primeira rotação ainda não executada) | — | Setup inicial | — |

---

## Pré-requisitos

- [ ] Acesso ao Cloudflare Dashboard → Workers & Pages → `standard-api-gateway-production`
- [ ] Acesso ao canal de comunicação com usuários (email ou banner no app)
- [ ] `openssl` disponível no terminal local

---

## Procedimento

### Passo 1 — Comunicar usuários (mínimo 24h antes)

Enviar comunicado informando:
- Que as sessões serão encerradas em [data/hora exata]
- Que todos precisarão fazer login novamente
- Que o serviço não ficará indisponível — apenas sessões são invalidadas

### Passo 2 — Gerar novo secret

```bash
openssl rand -base64 64
```

Copie o output completo. **NUNCA commitar este valor em nenhum arquivo.**

### Passo 3 — Adicionar o novo secret no Cloudflare (sem remover o antigo ainda)

1. Dashboard → Workers & Pages → `standard-api-gateway-production`
2. Settings → Variables and Secrets
3. Adicionar nova variável de ambiente: `BETTER_AUTH_SECRET` com o novo valor
4. **Não remover o valor atual ainda** — o deploy no próximo passo vai ativar o novo.

### Passo 4 — Verificar que o wrangler.toml referencia como secret

```bash
grep "BETTER_AUTH_SECRET" infra/cloudflare/wrangler.api-gateway.toml
```

Esperado: referência como `[vars]` ou `[[secrets]]`, nunca o valor em texto plano.

### Passo 5 — Deploy

```bash
npx wrangler deploy -c infra/cloudflare/wrangler.api-gateway.toml -e production
```

**No momento do deploy:** o secret antigo fica inválido. Todas as sessões existentes são encerradas.

### Passo 6 — Verificar saúde do auth

```bash
curl -s https://standard-api.bekaa.eu/api/health/auth | jq .
```

Esperado:
```json
{ "status": "ok", "auth": "standard-native-auth@1.6.11", "db": "connected" }
```

Se retornar `"degraded"` ou erro: verificar logs via `npx wrangler tail standard-api-gateway-production`.

### Passo 7 — Smoke test de login

```bash
curl -s -X POST https://standard-api.bekaa.eu/api/auth/sign-in/email \
  -H "Content-Type: application/json" \
  -H "Origin: https://standard.bekaa.eu" \
  -d '{"email":"resper@bekaa.eu","password":"<senha>"}' | jq .user.email
```

Esperado: `"resper@bekaa.eu"`.

### Passo 8 — Registrar no histórico

Atualizar a tabela "Histórico de Rotações" acima com:
- Data e hora exata
- Nome de quem executou
- Motivo
- SHA do commit de deploy

---

## Rollback

Não há rollback possível — rotacionar de volta para o secret antigo não restaura as sessões.  
Se o novo secret apresentar problema, gerar um terceiro secret e repetir o procedimento.

---

## Referências

- [ADR-AUTH-001 — Regra 4](../decisions/adr-auth-standard-native-auth-behaviors.md)
- [Processo de Update do Standard Native Auth](./standard-native-auth-update-process.md)
