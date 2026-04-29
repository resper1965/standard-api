# MVP Release Notes

## Nome do Release

Aegis API Standard MVP Release Candidate 0.1.

## Escopo do MVP

Este release consolida a primeira versão API-first do Aegis SCF-Based Assessment Lifecycle para validação em staging controlado com dados sintéticos.

O objetivo é permitir avaliação técnica do backend, contratos, packages, workflows, segurança, observabilidade, testes e documentação operacional antes de qualquer uso com dados reais de cliente.

## Funcionalidades Incluídas

- Monorepo TypeScript com packages reutilizáveis para schemas, assessment engine, SCF core, document ingestion, KB, SoA, Gap Analysis, POA&M, Reporting, Agent Runtime, Security e Observability.
- API Gateway com rotas versionadas `/api/v1`.
- State machine do lifecycle com approval gates obrigatórios.
- Workflows com signals, waits, retry/idempotency e estados `blocked`, `failed` e `cancelled`.
- SCF data service com dados estruturados e guardrail contra mappings oficiais inferidos.
- Document ingestion com validação de upload, adapters e jobs.
- KB search como candidate evidence, sem autoridade normativa.
- SoA, Gap Analysis, POA&M e Reporting com versionamento, traceability e aprovação humana.
- Agent Runtime com registry, allowed tools, MockLLMProvider e schema validation.
- Security layer com auth placeholder local, RBAC, tenant guard, secure errors, upload security e prompt injection defenses.
- Observability layer com logs estruturados, redaction, audit/security events, metrics e usage/cost records.
- Test suites, evals determinísticos, golden datasets sintéticos, regression tests e synthetic E2E.
- GitHub Actions para CI, staging deploy e production deploy manual.
- Documentação de arquitetura, operação, segurança, release e deployment.

## Funcionalidades Excluídas

- Frontend funcional.
- Uso de dados reais de clientes.
- Auth enterprise real completo.
- Persistência PostgreSQL production completa para todas as projections.
- Cloudflare resources production provisionados por padrão.
- Real LLM provider obrigatório nos testes.
- Importador oficial completo de SCF/XLSX/OSCAL.
- Malware scanning real.
- Rate limiting enforcement real.
- DOCX/PDF renderer server-side.
- Billing dashboard e suporte enterprise.

## Limitações Conhecidas

- Vários adapters ainda são in-memory/mock para local e testes.
- `packages/maturity` ainda não existe como pacote dedicado.
- Audit/security events persistentes dependem de storage futuro.
- Cloudflare Workflows real exige smoke tests em staging.
- Vectorize real e AI Gateway real estão documentados, mas não são obrigatórios no caminho padrão.
- Auth real JWT/API key/Cloudflare Access precisa ser implementado antes de exposição pública.

## Segurança e Compliance

- `.env.example` contém apenas placeholders.
- Secrets devem ser configurados por GitHub Secrets, Cloudflare bindings ou `wrangler secret put`.
- Logs não devem conter documentos, chunks completos, prompts completos, completions sensíveis, tokens ou credentials.
- KB é fonte de evidências candidatas, não fonte normativa.
- Approval gates não podem ser concluídos por agente LLM.
- Production deploy deve permanecer manual e protegido por GitHub Environment.

## Instruções de Deploy

Para staging:

```bash
pnpm install
pnpm test:ci
pnpm cf:deploy:staging
```

O caminho recomendado é GitHub Actions `Deploy Staging`, usando environment `staging` e secrets configurados fora do repositório.

Para production, usar apenas `Deploy Production` com approval manual do environment `production`.

## Rollback Básico

- Reimplantar o último commit/tag validado.
- Usar o histórico de deployments do Cloudflare Workers quando aplicável.
- Não reapontar staging para buckets, filas ou Vectorize production.
- Preservar audit trail e registrar motivo do rollback.

## Observações para Operadores

- Staging deve usar dados sintéticos.
- Smoke tests devem confirmar health, trace_id, tenant isolation, approval gate e ausência de vazamento em logs.
- DLQs devem ser monitoradas após deploy.
- Qualquer falha de tenant isolation, approval bypass ou secret em log é No-Go.

## Próximos Passos

- Executar staging deployment com recursos separados.
- Validar smoke tests.
- Priorizar backlog P0/P1 antes de produção.
- Formalizar auth real, rate limiting, persistence e backup/restore.
