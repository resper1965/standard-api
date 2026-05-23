# Reversa — Fase 5: Dependências de Runtime

> Gerado em 2026-05-23 por Antigravity
> Projeto: standard-api-standard v0.1.0

---

## 1. Configurações de Ambiente (ENV / Wrangler)

As variáveis de ambiente são injetadas via `wrangler.toml` e controladas por ambiente (dev/prod).

### Segurança e Auth
| Variável | Descrição | Origem |
|---|---|---|
| `BETTER_AUTH_SECRET` | Chave mestra do provedor de auth | Secret (Wrangler) |
| `BETTER_AUTH_URL` | URL base do servidor de auth | `wrangler.toml` [vars] |
| `JWT_SECRET` | Assinatura de tokens legados | Secret (Wrangler) |
| `DATABASE_URL` | String de conexão Neon (PostgreSQL) | Secret (Wrangler) |

### Inteligência Artificial
| Variável | Descrição | Origem |
|---|---|---|
| `OPENAI_API_KEY` | Chave para modelos GPT (opcional) | Secret (Wrangler) |
| `AI_GATEWAY_BASE_URL`| Proxy de governança Cloudflare AI | `wrangler.toml` [vars] |
| `AI_GATEWAY_NAME` | Nome do log/gateway no portal CF | `wrangler.toml` [vars] |

### Integrações de Documentos (OCR)
| Variável | Descrição | Origem |
|---|---|---|
| `AZURE_DOCUMENT_INTELLIGENCE_KEY` | Chave Azure Document IQ | Secret (Wrangler) |
| `AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT` | Endpoint regional Azure | `wrangler.toml` [vars] |
| `OPENSOURCE_OCR_ENDPOINT` | Servidor Tesseract/OCR externo | `wrangler.toml` [vars] |

---

## 2. Política de CORS (Cross-Origin Resource Sharing)

Definida programaticamente em `apps/api-gateway/src/app.ts`.

### Origins Permitidas
- `https://standard.bekaa.eu` (Produção oficial)
- `https://standard-web.pages.dev` (Preview principal)
- `https://*.standard-web.pages.dev` (Previews de PR)
- `http://localhost:5173` (Vite dev)
- `http://localhost:3000` (Next.js dev)

### Headers e Métodos
- **Métodos:** `GET, POST, PUT, PATCH, DELETE, OPTIONS`
- **Headers Customizados:** `X-Trace-Id`, `X-Tenant-Id`, `x-standard-tenant-id`.
- **Credenciais:** Permitidas (`true`).
- **Max Age:** 24 horas (`86400`).

---

## 3. Cabeçalhos de Segurança (CSP & Hardening)

Implementados via wrapper `withSecurityHeaders` no gateway:
- **X-Content-Type-Options:** `nosniff`
- **X-Frame-Options:** `DENY`
- **Strict-Transport-Security:** 1 ano (`max-age=31536000`)
- **Content-Security-Policy (CSP):** 
    - Padrão: `default-src 'none'` (Whitelist-only).
    - Docs: Relaxada para permitir scripts/estilos de CDNs (Scalar UI).

---

## 4. Dependências de Infraestrutura (Bindings)
- **Email:** Usa o Cloudflare Email Service via binding `EMAIL`.
- **Workflow:** Dependência circular com `standard-workflows` (precisa estar deployado para o gateway bindar).
- **Vectorize:** Dependência crítica do `STANDARD_KB_INDEX`.

---

## 5. Próximos Passos (Reversa)
- Fase 6: Diagnóstico de Saúde e Dívida Técnica.
- Encerrar análise Reversa e consolidar SDD.
