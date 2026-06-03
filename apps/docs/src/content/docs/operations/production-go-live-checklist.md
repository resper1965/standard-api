---
title: "Production Go-Live Checklist — Standard GRC"
---

# Production Go-Live Checklist — Standard GRC

Este documento compila a lista de verificações operacionais e configurações críticas necessárias para realizar o deploy seguro e resiliente da plataforma **Standard** em ambiente de produção Cloudflare.

---

## 1. Banco de Dados (Neon PostgreSQL)

- [ ] **Rotação de Credenciais**: Garantir que as credenciais do Neon de desenvolvimento e homologação não estejam expostas e que a connection string de produção use credenciais com privilégios restritos (mínimo privilégio).
- [ ] **Pooling de Conexões**: Configurar o `DATABASE_URL` em produção apontando para o endpoint do Neon Connection Pooler (geralmente porta `5432` com `-pooler` na URL) para evitar exaustão de conexões decorrente de chamadas simultâneas de Cloudflare Workers.
- [ ] **Migrations de Schema**: Executar `pnpm db:migrate` no banco de produção a partir de um bastidor controlado e garantir que todas as migrações drizzle anteriores tenham sido aplicadas sem alterações destrutivas em tabelas vivas.
- [ ] **Estratégia de Backups**: Validar que a retenção e snapshots automáticos diários estão habilitados no console do Neon.

---

## 2. Autenticação e Sessões (Better Auth)

- [ ] **Chave Secreta (`BETTER_AUTH_SECRET`)**: Gerar uma chave criptográfica forte (mínimo 32 caracteres gerados via `openssl rand -hex 32`) e registrá-la como secret do Wrangler.
- [ ] **URL Base (`BETTER_AUTH_URL`)**: Configurar a URL pública definitiva para o endpoint de autenticação (ex: `https://standard.bekaa.eu/api/auth`).
- [ ] **Atributos de Cookies**:
  - [ ] `useSecureCookies: true` ativado.
  - [ ] `sameSite: "none"` configurado (necessário para autenticação cross-origin entre o frontend e a API gateway).
  - [ ] `crossSubDomainCookies` ativado se o console e a API compartilharem domínios sob `.bekaa.eu`.

---

## 3. Infraestrutura Cloudflare Worker & Gateway

- [ ] **Domínios Customizados (Custom Domains)**: Associar o Worker do API Gateway à rota definitiva de produção (ex: `standard-api.bekaa.eu`).
- [ ] **Políticas de CORS**:
  - [ ] Limitar `Access-Control-Allow-Origin` aos domínios estritamente permitidos (`https://standard.bekaa.eu` e aliases autorizados).
  - [ ] Bloquear wildcards (`*`) em cabeçalhos de CORS em produção.
- [ ] **R2 Storage & Buckets**: Criar e associar os bindings dos buckets R2 definitivos no `wrangler.toml` do gateway para armazenamento isolado de evidências e documentos.
- [ ] **AI Gateway & Vectorize**: Configurar os namespaces de produção separados por tenant e registrar chaves seguras para acesso às APIs de inferência LLM.

---

## 4. Observabilidade & SOC Incidents

- [ ] **Políticas de Logs**: Verificar que logs estruturados de auditoria são enviados para o serviço SOC de monitoramento sem vazar informações sensíveis (hashes de chaves de API, prompts com dados brutos ou senhas).
- [ ] **Monitoramento de Integridade**: Registrar o endpoint `/health` da API em uma ferramenta de monitoramento externo (ex: UptimeRobot ou Better Uptime) para alertas instantâneos de indisponibilidade.
- [ ] **SOC Monitoring Queue**: Validar que o binding `SOC_TRIAGE_QUEUE` e `AGENT_RUN_QUEUE` estão associados às filas (Cloudflare Queues) corretas no ambiente de produção.

---

## 5. Hardening de Segurança

- [ ] **Content Security Policy (CSP)**: Validar que cabeçalhos CSP estritos (`default-src 'none'; frame-ancestors 'none';`) são retornados pela API, exceto em rotas de documentação Scalar (que necessitam de scripts/estilos Inline controlados).
- [ ] **Headers de Segurança Obrigatórios**: Garantir que as respostas incluam `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `X-XSS-Protection: 1; mode=block` e `Strict-Transport-Security`.
- [ ] **Rate Limiting**: Habilitar regras de rate limit para prevenir ataques de força bruta no login e exaustão de cota no gateway de API.

---

## 6. Comandos de Deploy (Produção)

```bash
# 1. Aplicar migrações ao banco de produção
DATABASE_URL="postgresql://user:pass@ep-pooler.us-east-1.neon.tech/dbname" pnpm db:migrate

# 2. Configurar secrets no wrangler (Cloudflare)
wrangler secret put DATABASE_URL --env production
wrangler secret put BETTER_AUTH_SECRET --env production

# 3. Deploy do Worker para o Cloudflare
pnpm cf:deploy:production
```
