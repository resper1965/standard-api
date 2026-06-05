# Relatório de Avaliação de Segurança — OWASP Top 10, Headers & security.txt

Este documento apresenta a análise de conformidade do **Standard GRC** em relação aos principais controles de segurança de nível de produção (Enterprise Grade), cobrindo o OWASP Top 10, a política de cabeçalhos de segurança (HSTS, XSS, CSP) e a implementação do protocolo `security.txt` (RFC 9116).

---

## 1. Mapeamento OWASP Top 10 & Defesas do Standard

| Categoria OWASP | Status | Mecanismo de Defesa Aplicado no Codebase |
| :--- | :---: | :--- |
| **A01: Broken Access Control** | 🛡️ **Conforme** | Enforced por `withOrganization(orgId)` no banco de dados e resolução antecipada de UUIDs no `auth.middleware.ts`. O RBAC valida tanto sessões de usuário quanto escopos de chaves M2M (`assertRbac`). |
| **A02: Cryptographic Failures** | 🛡️ **Conforme** | Chaves de API são armazenadas apenas em hash SHA-256 (`crypto.subtle.digest`). O middleware de cabeçalhos força HSTS com 1 ano de expiração e includeSubDomains. |
| **A03: Injection** | 🛡️ **Conforme** | Utilização de consultas parametrizadas do Drizzle ORM. Validação e sanitização estrita de parâmetros de rotas usando Regex para UUIDs e esquemas Zod rígidos (`.strict()`). |
| **A04: Insecure Design** | 🛡️ **Conforme** | Arquitetura segura baseada no princípio de menor privilégio (Bypass restrito a Platform Admin) e rate limiting granular por Tenant/IP no Gateway. |
| **A05: Security Misconfiguration** | 🛡️ **Conforme** | CORS configurado sem wildcards em produção; endpoints de depuração como `/auth/debug` bloqueados em produção; headers de segurança injetados em todas as respostas. |
| **A06: Vulnerable Components** | 🛡️ **Conforme** | Versões do toolchain (`typescript`, `tsx`) pinadas a versões exatas. Pipeline CI com bloqueio de deploys se houver alertas críticos (Dependabot) e uso de `--frozen-lockfile`. |
| **A07: Identification and Auth Failures** | 🛡️ **Conforme** | Integrado com Better-Auth para sessões de cookie. Conta de usuário requer status `approved=true`. Revogação de JWT verificada em cache de borda (Cloudflare KV) a cada requisição. |
| **A08: Software and Data Integrity Failures** | 🛡️ **Conforme** | Upload de evidências passa por uma bateria de validação estrita (malware scan virtualizado, verificação de tipo mime e tamanho de arquivos). |
| **A09: Security Logging & Monitoring** | 🛡️ **Conforme** | logs de auditoria estruturados via `createDrizzleAuditRepository`. Sanitização estrita de PII e chaves usando Allowlist de metadados (`AUDIT_METADATA_ALLOWLIST`). |
| **A10: Server-Side Request Forgery (SSRF)** | 🛡️ **Conforme** | Dispatcher e ferramentas de agentes LLM (MCP) têm permissões limitadas a diretórios específicos e não realizam requisições arbitrárias para a rede interna. |

---

## 2. Auditoria de Cabeçalhos de Segurança (HTTP Response Headers)

Os cabeçalhos de segurança são aplicados de forma centralizada no gateway através da função `withSecurityHeaders` em `apps/api-gateway/src/app.ts#L253-L259`.

```typescript
const securityHeaders: Record<string, string> = {
  ...corsHeaders,
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "X-XSS-Protection": "1; mode=block",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
  "Content-Security-Policy": cspValue,
};
```

### Análise Detalhada dos Headers:

1. **Strict-Transport-Security (HSTS)**:
   - **Configuração**: `max-age=31536000; includeSubDomains`
   - **Objetivo**: Garante que o navegador/cliente faça requisições apenas via HTTPS durante 1 ano (31.536.000 segundos), abrangendo também subdomínios (ex: `api.standard.bekaa.eu`).
   - **Conformidade**: Totalmente adequado para APIs em Cloudflare, que já possuem terminação TLS nativa e redirecionamento automático de HTTP para HTTPS na borda.
2. **Content-Security-Policy (CSP)**:
   - **Configuração**: `default-src 'none'; frame-ancestors 'none';` (Para rotas de API normais)
   - **Configuração de Docs**: `default-src 'self'; script-src 'self' 'unsafe-inline' cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' fonts.googleapis.com; font-src fonts.gstatic.com; img-src 'self' data:; connect-src 'self';` (Para `/docs` e `/llms`)
   - **Objetivo**: Evita ataques de injeção de script ou carregamento de fontes não autorizadas. Para rotas normais de dados, o valor `default-src 'none'` desativa qualquer carregamento e `frame-ancestors 'none'` impede clickjacking e iframes.
3. **X-XSS-Protection**:
   - **Configuração**: `1; mode=block`
   - **Objetivo**: Ativa o filtro de Cross-Site Scripting (XSS) em navegadores legados que não suportam CSP completo. Se um ataque XSS for detectado, o navegador bloqueia a renderização da página em vez de tentar remover o script injetado.
4. **X-Frame-Options**:
   - **Configuração**: `DENY`
   - **Objetivo**: Impede que a resposta da API seja renderizada dentro de um `<frame>`, `<iframe>`, `<embed>` ou `<object>`, defendendo a aplicação contra ataques de Clickjacking.
5. **X-Content-Type-Options**:
   - **Configuração**: `nosniff`
   - **Objetivo**: Impede que navegadores adivinhem o tipo mime da resposta (MIME-sniffing), forçando o respeito ao cabeçalho `Content-Type` oficial retornado. Defesa contra XSS baseado em uploads maliciosos.

---

## 3. Prevenção de Cross-Site Scripting (XSS) & Injeções de Dados

O Standard adota as seguintes práticas contra vulnerabilidades de injeção e XSS:
- **Sanitização de Saídas de Erros**: O helper `sanitizeErrorDetails` em `packages/security/src/middleware/secure-error.ts` remove dados técnicos como trace de pilha (`stack`), queries SQL (`sql`), chaves secretas (`secret`, `api_key`) e tokens de erro que poderiam expor segredos ou servir de vetor de injeção.
- **Sanitização de Uploads**: Filenames de arquivos enviados são higienizados por `sanitizeFilename` em `@standard/document-ingestion`, removendo caminhos relativos (defesa contra Directory Traversal) e caracteres que possam ser interpretados por interpretadores de shell ou renderizadores.
- **Validação com Esquemas Rígidos (Zod Strict)**: Todos os endpoints aceitam apenas propriedades explicitadas na modelagem do schema. Elementos injetados contendo tags HTML ou scripts em campos não autorizados provocam rejeição imediata da requisição com status `400 Bad Request`.

---

## 4. RFC 9116 — security.txt e robots.txt

Os arquivos de governança pública estão implementados no gateway em `apps/api-gateway/src/routes/well-known.routes.ts`.

### Ficheiro `security.txt`:
Localizado em `/.well-known/security.txt` e com alias em `/security.txt`, o arquivo declara formalmente:
```text
Contact: mailto:security@bekaa.eu
Expires: 2027-12-31T23:59:00.000Z
Preferred-Languages: en, pt
Canonical: https://standard.bekaa.eu/.well-known/security.txt
Policy: https://github.com/resper1965/standard-api/blob/main/SECURITY.md
```
- **Conformidade RFC 9116**: Possui o campo obrigatório `Contact` e `Expires` formatados em data ISO 8601 futura. Indica o idioma suportado (`Preferred-Languages`), link canônico (`Canonical`) e aponta para a política oficial de disclosure de bugs (`Policy`) mantida no repositório.

### Ficheiro `robots.txt`:
Localizado em `/robots.txt`:
```text
User-agent: *
Disallow: /api/
Allow: /.well-known/
Allow: /health
```
- Evita que indexadores de busca públicos gastem quota ou indexem rotas transacionais `/api/`, enquanto permite o acesso a dados de infraestrutura pública (`/.well-known/`, `/health`).

---

## 5. Recomendações de Melhoria Contínua (Roadmap de Segurança)

Embora o sistema seja extremamente resiliente e conforme, recomendamos as seguintes otimizações de segurança futura:
1. **CSP Report-URI**: Configurar a diretiva `report-uri` ou `report-to` na CSP para monitorar violações e tentativas de injeção de script em tempo real.
2. **Assinatura PGP para security.txt**: Assinar digitalmente o arquivo `security.txt` usando GPG e disponibilizar o arquivo `security.txt.sig` para conformidade nível platina com a RFC 9116.
3. **Subresource Integrity (SRI)**: No frontend, garantir que qualquer biblioteca importada por CDN (como scripts de gráficos ou fontes) utilize hashes SRI (`integrity="sha384-..."`) para evitar ataques de supply chain de terceiros.
