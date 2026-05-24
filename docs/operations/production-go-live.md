# Production Go-Live Operational Guide

Este documento detalha as configurações de infraestrutura e procedimentos finais obrigatórios para colocar a plataforma **Standard GRC** em produção real.

---

## 1. Configurações de DNS e Cloudflare

Para expor a API de forma segura e com suporte a múltiplos inquilinos (SaaS multi-tenant), a Cloudflare deve ser utilizada como camada de proxy, CDN, SSL/TLS e WAF.

### 1.1 Apontamentos DNS (Registros A/CNAME)
Configure as seguintes entradas de DNS no painel da Cloudflare:
- **API Gateway**:
  - Tipo: `CNAME`
  - Nome: `api` (resolvendo para `api.standard.bekaa.eu`)
  - Destino: Apontar para o endpoint de distribuição do provedor Cloud (AWS ALB, Vercel ou Cloudflare Workers)
  - Proxy Status: **Proxied (Orange Cloud)**
- **Console Web (Frontend)**:
  - Tipo: `CNAME`
  - Nome: `@` (domínio raiz) ou `app` (ex: `app.standard.bekaa.eu`)
  - Destino: Apontar para o endpoint do frontend (ex: URL do deploy Vercel)
  - Proxy Status: **Proxied (Orange Cloud)**

### 1.2 Regras de SSL/TLS e Edge Certificates
- **Encryption Mode**: Defina como **Full (Strict)** para garantir criptografia ponta a ponta desde o navegador do usuário até os servidores de backend.
- **Minimum TLS Version**: Configure como **TLS 1.2** ou **TLS 1.3** para mitigar vulnerabilidades em protocolos legados.
- **HTTP Strict Transport Security (HSTS)**: Habilitar com `max-age=31536000`, incluindo subdomínios e preload.

### 1.3 Regras de Segurança (WAF) e Rate Limiting
- **CORS Policies**: Restrinja o CORS no Gateway para permitir origens explícitas (ex: `https://app.standard.bekaa.eu`) em vez de curingas (`*`).
- **Cloudflare Rate Limiting**:
  - Rota: `/api/v1/*`
  - Limite: Máximo de 100 requisições por minuto por IP/Token para rotas gerais.
  - Rotas Críticas (`/api/v1/auth/*`, `/api/v1/assessments/*/agent-runs`): Limite restrito a 10 requisições por minuto por IP.

---

## 2. Variáveis de Ambiente Secretas

Todos os secrets devem ser injetados via gerenciador de segredos do ambiente produtivo (ex: AWS Secrets Manager, Vercel Env, ou Cloudflare Wrangler Secrets). **Nunca** armazene segredos em arquivos `.env` commitados ou em repositórios Git.

### 2.1 Lista de Secrets Necessários

| Nome da Variável | Finalidade / Serviço | Origem / Tipo |
| :--- | :--- | :--- |
| `DATABASE_URL` | String de conexão segura com o Neon PostgreSQL | Produção Pooler (Porta 5432) |
| `BETTER_AUTH_SECRET` | Chave de criptografia para cookies de sessão e tokens JWT | Hash aleatório de 32 bytes |
| `LLM_API_KEY` | Chave de acesso à API de inferência do modelo | OpenAI ou Anthropic |
| `R2_ACCESS_KEY_ID` | Credencial de acesso para armazenamento de documentos de evidência | Cloudflare R2 |
| `R2_SECRET_ACCESS_KEY` | Segredo de acesso para o bucket R2 | Cloudflare R2 |
| `R2_BUCKET_NAME` | Nome do bucket produtivo | Ex: `standard-evidence-production` |
| `RESEND_API_KEY` | Token de envio de e-mails transacionais (convites, alertas) | Resend |
| `WEBHOOK_SIGNING_KEY` | Chave de assinatura para disparar webhooks transacionais | Chave AES-256 aleatória |

---

## 3. Monitoramento de Erros e Logs

A observabilidade em tempo real é crítica para manter o SLA do serviço SaaS.

### 3.1 Integração com Sentry (Rastreamento de Erros)
- **Instalação**: Instale o SDK do Sentry no gateway e no frontend.
- **Variavéis**: Configure a variável `SENTRY_DSN` em ambos os ambientes.
- **Tratamento de Dados Sensíveis**:
  - Habilite a sanitização de dados no Sentry para filtrar campos como `Authorization`, `password`, `key` e `token` antes do envio.
  - Impeça logs de corpos de requisições de documentos para manter a conformidade com a privacidade de dados dos tenants.

### 3.2 Agregação de Logs (Logflare / Better Stack / Axiom)
- Todos os logs de console (`console.log`, `console.error`) devem ser transmitidos formatados como JSON estruturado contendo o correspondente `trace_id` e `tenant_id`.
- Alertas automáticos devem disparar no Slack ou PagerDuty se a taxa de erros `5xx` no gateway ultrapassar **1%** do tráfego total por 5 minutos consecutivos.

---

## 4. Procedimentos de Backup Agendados

A estratégia de recuperação de desastres do Standard GRC baseia-se em backups redundantes tanto para dados relacionais quanto para arquivos não-estruturados.

### 4.1 Neon PostgreSQL Backups
- **Backups Automáticos**: O Neon realiza backups diários automáticos com retenção de 30 dias por padrão.
- **Backups Adicionais (pg_dump)**:
  - Configure uma cron job interna (executada em ambiente isolado) para disparar diariamente às 02:00 UTC:
    ```bash
    pg_dump $DATABASE_URL | gzip > backup-$(date +%F).sql.gz
    ```
  - Os dumps comprimidos devem ser enviados para um bucket de arquivamento frio e de acesso restrito (ex: AWS S3 Glacier ou Cloudflare R2 Glacier class).

### 4.2 Retenção e Replicação de Evidências (R2)
- Configure uma política de ciclo de vida (Lifecycle Policy) no bucket do R2:
  - Arquivos na pasta `temp/` devem ser excluídos automaticamente após 24 horas.
  - Documentos de evidências finais de assessments arquivados devem ser mantidos por pelo menos 5 anos, em conformidade com as regras gerais de GRC.
- **Replicação**: Ative a replicação geográfica do bucket R2 principal para uma região secundária para garantir alta disponibilidade geográfica.
