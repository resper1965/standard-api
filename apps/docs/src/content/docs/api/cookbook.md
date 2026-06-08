---
title: "Standard API — Cookbook"
---

# Standard API — Cookbook

> **Base URL:** `https://standard-api.bekaa.eu`
> **Auth:** Cookie session (browser) ou `Authorization: Bearer standard_live_...` (M2M)

---

## 🔐 Autenticação

### Login (email/password)
```bash
curl -X POST https://standard-api.bekaa.eu/api/auth/sign-in/email \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "s3cur3!"}'
```

### Verificar sessão
```bash
curl https://standard-api.bekaa.eu/api/auth/get-session \
  -H "Cookie: standard-native-auth.session_token=..."
```

---

## 🏢 Organizações (Organizations)

### Listar minhas organizações
```bash
curl https://standard-api.bekaa.eu/api/v1/users/me/organizations \
  -H "Cookie: ..."
```

### Ativar uma organização
```bash
curl -X POST https://standard-api.bekaa.eu/api/v1/users/me/orgs/{orgId}/activate \
  -H "Cookie: ..."
```

### Dashboard da organização
```bash
curl https://standard-api.bekaa.eu/api/v1/organizations/{orgId}/dashboard \
  -H "Cookie: ..." \
  -H "x-standard-tenant-id: {orgId}"
```

---

## 🛡️ SCF — Secure Controls Framework

### Listar domínios SCF
```bash
curl https://standard-api.bekaa.eu/api/v1/scf/domains \
  -H "Cookie: ..." \
  -H "x-standard-tenant-id: {orgId}"
```

### Buscar controles por domínio
```bash
curl "https://standard-api.bekaa.eu/api/v1/scf/controls?domain=ACC" \
  -H "Cookie: ..." \
  -H "x-standard-tenant-id: {orgId}"
```

### Buscar controles de um framework (ex: ISO 27001)
```bash
curl "https://standard-api.bekaa.eu/api/v1/scf/controls?framework=ISO+27001" \
  -H "Cookie: ..." \
  -H "x-standard-tenant-id: {orgId}"
```

### Controle específico
```bash
curl https://standard-api.bekaa.eu/api/v1/scf/controls/{controlId} \
  -H "Cookie: ..." \
  -H "x-standard-tenant-id: {orgId}"
```

### Frameworks disponíveis
```bash
curl https://standard-api.bekaa.eu/api/v1/scf/frameworks \
  -H "Cookie: ..." \
  -H "x-standard-tenant-id: {orgId}"
```

### Crosswalks (mappings entre frameworks)
```bash
curl "https://standard-api.bekaa.eu/api/v1/scf/crosswalks?framework=ISO+27001" \
  -H "Cookie: ..." \
  -H "x-standard-tenant-id: {orgId}"
```

---

## 📋 Assessments

### Criar
```bash
curl -X POST https://standard-api.bekaa.eu/api/v1/assessments \
  -H "Content-Type: application/json" \
  -H "Cookie: ..." \
  -H "x-standard-tenant-id: {orgId}" \
  -d '{"name": "ISO 27001 Q3", "framework_id": "iso-27001"}'
```

### Listar
```bash
curl https://standard-api.bekaa.eu/api/v1/assessments \
  -H "Cookie: ..." -H "x-standard-tenant-id: {orgId}"
```

### Detalhe
```bash
curl https://standard-api.bekaa.eu/api/v1/assessments/{id} \
  -H "Cookie: ..." -H "x-standard-tenant-id: {orgId}"
```

### Status
```bash
curl https://standard-api.bekaa.eu/api/v1/assessments/{id}/status \
  -H "Cookie: ..." -H "x-standard-tenant-id: {orgId}"
```

### Resumo (dashboard)
```bash
curl https://standard-api.bekaa.eu/api/v1/assessments/{id}/summary \
  -H "Cookie: ..." -H "x-standard-tenant-id: {orgId}"
```

### Timeline
```bash
curl https://standard-api.bekaa.eu/api/v1/assessments/{id}/timeline \
  -H "Cookie: ..." -H "x-standard-tenant-id: {orgId}"
```

---

## 📄 Documentos

### Upload
```bash
curl -X POST https://standard-api.bekaa.eu/api/v1/assessments/{id}/documents \
  -H "Cookie: ..." -H "x-standard-tenant-id: {orgId}" \
  -F "file=@policy.pdf" -F "category=policy"
```

### Listar
```bash
curl https://standard-api.bekaa.eu/api/v1/assessments/{id}/documents \
  -H "Cookie: ..." -H "x-standard-tenant-id: {orgId}"
```

### Chunks (pós-ingestão)
```bash
curl https://standard-api.bekaa.eu/api/v1/documents/{docId}/chunks \
  -H "Cookie: ..." -H "x-standard-tenant-id: {orgId}"
```

### Reprocessar
```bash
curl -X POST https://standard-api.bekaa.eu/api/v1/documents/{docId}/reprocess \
  -H "Cookie: ..." -H "x-standard-tenant-id: {orgId}"
```

---

## 🔍 Knowledge Base (KB)

### Busca semântica
```bash
curl -X POST https://standard-api.bekaa.eu/api/v1/kb/search \
  -H "Content-Type: application/json" \
  -H "Cookie: ..." -H "x-standard-tenant-id: {orgId}" \
  -d '{"query": "access control policy for privileged accounts", "assessment_id": "{id}", "top_k": 10}'
```

---

## 📊 Gap Analysis

### Listar gaps
```bash
curl https://standard-api.bekaa.eu/api/v1/assessments/{id}/gaps \
  -H "Cookie: ..." -H "x-standard-tenant-id: {orgId}"
```

### Criar gap
```bash
curl -X POST https://standard-api.bekaa.eu/api/v1/assessments/{id}/gaps \
  -H "Content-Type: application/json" \
  -H "Cookie: ..." -H "x-standard-tenant-id: {orgId}" \
  -d '{"control_id": "ACC-01", "status": "not_implemented", "severity": "high"}'
```

---

## ✅ SoA / 📈 POA&M / 📝 Reports

### SoA
```bash
curl https://standard-api.bekaa.eu/api/v1/assessments/{id}/soa \
  -H "Cookie: ..." -H "x-standard-tenant-id: {orgId}"
```

### POA&M
```bash
curl https://standard-api.bekaa.eu/api/v1/assessments/{id}/poam \
  -H "Cookie: ..." -H "x-standard-tenant-id: {orgId}"
```

### Gerar relatório
```bash
curl -X POST https://standard-api.bekaa.eu/api/v1/assessments/{id}/reports \
  -H "Content-Type: application/json" \
  -H "Cookie: ..." -H "x-standard-tenant-id: {orgId}" \
  -d '{"format": "pdf", "template": "executive_summary"}'
```

---

## 🤖 Agents / ⚙️ Workflows

### Listar agentes
```bash
curl https://standard-api.bekaa.eu/api/v1/agent-runtime/agents \
  -H "Cookie: ..." -H "x-standard-tenant-id: {orgId}"
```

### Executar agente
```bash
curl -X POST https://standard-api.bekaa.eu/api/v1/assessments/{id}/agent-runs \
  -H "Content-Type: application/json" \
  -H "Cookie: ..." -H "x-standard-tenant-id: {orgId}" \
  -d '{"agent_id": "standard-gap-analyst"}'
```

### Iniciar workflow
```bash
curl -X POST https://standard-api.bekaa.eu/api/v1/assessments/{id}/workflows \
  -H "Content-Type: application/json" \
  -H "Cookie: ..." -H "x-standard-tenant-id: {orgId}" \
  -d '{"workflow_type": "full_assessment"}'
```

### Transição de lifecycle
```bash
curl -X POST https://standard-api.bekaa.eu/api/v1/assessments/{id}/lifecycle/transition \
  -H "Content-Type: application/json" \
  -H "Cookie: ..." -H "x-standard-tenant-id: {orgId}" \
  -d '{"target_state": "documents_uploaded"}'
```

---

## 🔑 API Keys

### Criar API key
```bash
curl -X POST https://standard-api.bekaa.eu/api/v1/organizations/{orgId}/api-keys \
  -H "Content-Type: application/json" \
  -H "Cookie: ..." -H "x-standard-tenant-id: {orgId}" \
  -d '{"name": "CI Pipeline", "scopes": ["assessment:read", "scf:read"]}'
```

---

## 🏥 Health

```bash
# Público
curl https://standard-api.bekaa.eu/api/v1/health

# Detalhado (requer auth)
curl https://standard-api.bekaa.eu/api/v1/health/detailed \
  -H "Cookie: ..."
```

---

## 🛡️ Admin (requer platform_admin)

```bash
# Listar usuários
curl https://standard-api.bekaa.eu/api/v1/admin/users -H "Cookie: ..."

# Listar organizations
curl https://standard-api.bekaa.eu/api/v1/organizations -H "Cookie: ..."

# Banir usuário
curl -X POST https://standard-api.bekaa.eu/api/v1/admin/users/{userId}/ban \
  -H "Content-Type: application/json" -H "Cookie: ..." \
  -d '{"reason": "Policy violation"}'
```

---

## 📡 Headers

| Header | Quando | Valor |
|--------|--------|-------|
| `Cookie` | Browser | `standard-native-auth.session_token=...` |
| `Authorization` | M2M | `Bearer standard_live_...` |
| `x-standard-tenant-id` | Rotas organization-scoped | UUID da org ativa |
| `Content-Type` | POST/PUT/PATCH | `application/json` |

## ⚠️ Erros

```json
{"error": {"code": "NOT_FOUND", "message": "Resource not found.", "trace_id": "abc-123"}}
```

| HTTP | Código | Significado |
|------|--------|-------------|
| 401 | UNAUTHORIZED | Sessão expirada |
| 403 | FORBIDDEN | Sem permissão |
| 404 | NOT_FOUND | Recurso não existe |
| 409 | CONFLICT | Estado inválido |
| 422 | VALIDATION_ERROR | Input inválido |
| 429 | RATE_LIMITED | Rate limit |
| 500 | INTERNAL_ERROR | Erro interno |
