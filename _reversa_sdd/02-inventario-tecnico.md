# Reversa — Fase 2: Inventário Técnico

> Gerado em 2026-05-23 por Antigravity
> Projeto: standard-api-standard v0.1.0

---

## 1. Inventário de Dados (PostgreSQL / Drizzle)

O banco de dados é hospedado no Neon e gerenciado via Drizzle ORM. As entidades principais estão modeladas em `@standard/schemas`.

### Tabelas do Core
| Tabela | Função | Schema |
|---|---|---|
| `tenants` | Isolamento principal de clientes | `tenants.ts` |
| `organizations` | Agrupamento de usuários e assessments | `organizations.ts` |
| `assessments` | Entidade central do ciclo de vida | `assessments.ts` |
| `scf_controls` | Base normativa SCF | `scf.ts` |
| `scf_domains` | Domínios do SCF | `scf.ts` |
| `scf_mappings` | Mapeamentos entre frameworks | `scf.ts` |

### Tabelas de Assessment Lifecycle
| Tabela | Função | Schema |
|---|---|---|
| `soa_items` | Itens do Statement of Applicability | `soa.ts` |
| `gap_analysis` | Registro de gaps identificados | `gap-analysis.ts` |
| `evidence_metadata`| Metadados de documentos de evidência | `documents.ts` |
| `findings` | Achados técnicos e vulnerabilidades | `v2-schemas.ts` |
| `poam_entries` | Plan of Action & Milestones | `poam.ts` |
| `approvals` | Registro de gatilhos de aprovação humana | `approvals.ts` |

### Tabelas de Identidade e Infra
| Tabela | Função | Schema |
|---|---|---|
| `users` | Base de usuários (Better Auth) | — (managed) |
| `sessions` | Sessões ativas | — (managed) |
| `api_keys` | Chaves programáticas | `api-key-scopes.ts` |
| `audit_logs` | Rastro de auditoria immutavel | `observability.ts` |

---

## 2. Inventário de Bindings Cloudflare

Configurações extraídas do `wrangler.toml` do API Gateway.

### Storage (R2)
- `STANDARD_DOCUMENTS_BUCKET`: Armazenamento de documentos e evidências brutas.
- `STANDARD_REPORTS_BUCKET`: Relatórios de assessment finalizados (PDF/HTML).
- `STANDARD_EXPORTS_BUCKET`: Dados exportados para outros sistemas.

### Mensageria (Queues)
- `DOCUMENT_INGESTION_QUEUE`: Orquestra o processamento de novos arquivos.
- `KB_EMBEDDING_QUEUE`: Gatilho para indexação vetorial.
- `REPORT_EXPORT_QUEUE`: Processamento assíncrono de documentos pesados.
- `AGENT_RUN_QUEUE`: Fila de execução para agentes IA (Assíncrono).
- `SOC_TRIAGE_QUEUE`: Processamento de alertas de segurança.

### AI & Observability
- `AI`: Worker AI (Llama 3, Mistral, etc).
- `STANDARD_KB_INDEX`: Vectorize Index para busca semântica (RAG).
- `STANDARD_CACHE`: KV para cache de tokens e configurações rápidas.
- `AI_GATEWAY`: Governança e rate limiting de chamadas LLM.

---

## 3. Segurança e Identidade

### Provedor de Identidade
- **Better Auth:** Gerenciamento de sessões, usuários e organizações diretamente no Cloudflare Worker.
- **Google OAuth:** Configurado para login social.
- **API Keys:** Scopes definidos em `@standard/schemas/api-key-scopes.ts`.

### Isolamento (Multi-tenancy)
- Cada linha de dados sensíveis possui `tenant_id` e `organization_id`.
- Middleware `resolveAuthContext()` no gateway injeta o contexto de segurança em cada request.

---

## 4. Agentes Disponíveis (Agent Runtime)

Configurados em `@standard/agent-runtime`:
- **Knowledge Steward:** Organização e ingestão de KB.
- **Council:** Orquestrador principal de decisões agênticas.
- **Guardrails:** Validação de segurança e compliance de outputs.
- **Executor:** Motor de execução de tools agênticas.

---

## 5. Próximos Passos (Reversa)
- Validar `04-fluxo-de-dados.md` (próxima fase).
- Mapear integrações externas (Webhooks/SOC).
