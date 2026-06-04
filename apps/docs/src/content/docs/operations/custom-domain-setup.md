---
title: "Custom Domain Setup — API Gateway"
---

# Custom Domain Setup — API Gateway

> Runbook operacional para conectar um domínio personalizado ao Worker do API Gateway.
> **Este runbook cobre o domínio da plataforma** (ex: `api.standard.bekaa.eu`).
> Custom domains por organization (Cloudflare for SaaS) está marcado como **fora de escopo** nesta fase.

## Pré-requisitos

- Cloudflare account com o domínio (`bekaa.eu` ou outro) gerenciado via DNS Cloudflare.
- Worker `standard-api-gateway-production` já deployado.
- `wrangler` CLI autenticado.

## 1. Opção A — Via wrangler.toml (recomendado)

Adicione ao `apps/api-gateway/wrangler.toml` (seção `[env.production]`):

```toml
[env.production]
routes = [
  { pattern = "api.standard.bekaa.eu/*", zone_name = "bekaa.eu" }
]
```

Depois faça deploy:

```bash
pnpm cf:deploy:production
```

O Cloudflare cria automaticamente o CNAME no DNS.

## 2. Opção B — Via dashboard Cloudflare

1. Acesse **Workers & Pages** → `standard-api-gateway-production`.
2. Aba **Settings** → **Domains & Routes** → **Add Route**.
3. Insira: `api.standard.bekaa.eu/*` com zone `bekaa.eu`.
4. Clique **Save**.

O registro DNS é criado automaticamente.

## 3. Verificação

```bash
# Health check no domínio customizado
curl -s https://api.standard.bekaa.eu/api/v1/health | jq .

# Auth health
curl -s https://api.standard.bekaa.eu/api/health/auth | jq .
```

Esperado:
```json
{ "status": "healthy", "database": "connected" }
```

## 4. TLS / HTTPS

O Cloudflare gerencia TLS automaticamente para domínios na zona. Nenhuma configuração adicional é necessária.

Para domínios externos (não gerenciados pelo Cloudflare), use **Cloudflare for SaaS** — ver seção abaixo.

## 5. Cloudflare for SaaS (Referência — Fora de Escopo)

> Custom domains por organization (ex: `api.cliente.com` → Standard) requer Cloudflare for SaaS.
> **Decisão arquitetural: fora de escopo nesta fase.**

Quando necessário, o processo é:
1. Habilitar **Cloudflare for SaaS** no account.
2. Configurar **Custom Hostname** por organization via API Cloudflare.
3. Organization adiciona CNAME `api.cliente.com → fallback.standard.bekaa.eu`.
4. Cloudflare provisiona TLS via DCV automático.

Referência: https://developers.cloudflare.com/cloudflare-for-platforms/cloudflare-for-saas/

## 6. Access / Zero Trust (Admin Endpoints)

Endpoints administrativos (`/api/v1/admin/*`, `/api/v1/soc/status`) **devem** ser protegidos por Cloudflare Access antes de exposição pública.

Configuração mínima:
1. **Zero Trust** → **Access** → **Applications** → **Add Application**.
2. Tipo: **Self-hosted**.
3. Domain: `api.standard.bekaa.eu/api/v1/admin/*`.
4. Policy: Email domain `bekaa.eu` (ou Identity Provider configurado).

## 7. Routes Atuais de Produção

| Rota | Worker |
|------|--------|
| `api.standard.bekaa.eu/*` | `standard-api-gateway-production` |
| `*.workers.dev` | Fallback automático (desabilitar em produção) |

## Status

- [ ] Domínio adicionado ao wrangler.toml production
- [ ] Deploy realizado (`pnpm cf:deploy:production`)
- [ ] Health check validado no domínio customizado
- [ ] Access policy configurada para `/admin/*` e `/soc/status`
- [ ] `*.workers.dev` desabilitado ou restrito por Access

> **Nota**: Este checklist deve ser preenchido com evidências no go-live.
> Veja `docs/operations/production-go-live-checklist.md`.
