# Production Readiness Checklist

## Security Review

- Auth real implementado e `mock_dev` bloqueado.
- Cloudflare Access/Zero Trust protegendo superfícies internas/admin.
- RBAC revisado por endpoint crítico.
- Secure error handling validado.
- Secrets fora do repositório.
- Security events persistentes e monitorados.

## Organization Isolation

- Organization guard aplicado em rotas de cliente.
- Repositories e storage keys escopados por organization/organization/assessment.
- KB, reports, workflows e agent runs filtrados por organization.
- Testes cross-organization verdes.
- Admin/support access com trilha auditável e menor privilégio.

## Backup/Restore

- Backup PostgreSQL automatizado.
- Restore drill executado e documentado.
- R2 retention/lifecycle definido.
- Artifacts aprovados versionados e recuperáveis.
- Recovery Point Objective e Recovery Time Objective definidos.

## DR Considerations

- Plano de indisponibilidade Cloudflare.
- Plano de indisponibilidade PostgreSQL.
- DLQ e replay controlado de filas.
- Runbook de rollback.
- Responsáveis e contatos definidos.

## Observability

- Logs estruturados com redaction.
- Trace propagation validado.
- Metrics por endpoint, workflow, queue e job.
- Audit/security events persistentes.
- Alertas para organization mismatch, approval bypass attempt, DLQ, erro 5xx e custo anômalo.

## Incident Response

- Severidades definidas.
- Processo de triage.
- Preservação de evidências.
- Comunicação interna.
- Postmortem blameless.
- Rotação de secrets em incidente.

## Rate Limiting

- Rate limiting real por organization/organization.
- Quotas para uploads, KB search, agents, reports e admin imports.
- Proteção contra abuse em endpoints públicos.
- Métricas e alertas de throttling.

## WAF/Access

- WAF habilitado para API pública.
- Cloudflare Access em rotas admin/internal.
- Regras por ambiente.
- Sem wildcard CORS em production.
- Tokens Cloudflare com menor privilégio.

## Data Retention

- Política por documentos, chunks, embeddings, reports e audit logs.
- Exclusão controlada por organization/assessment.
- Legal hold definido.
- Retenção de logs compatível com privacy/compliance.

## Secrets Rotation

- Inventário de secrets.
- Rotação periódica.
- Rotação emergencial.
- Sem secrets em logs.
- Service tokens com escopo mínimo.

## Audit Log Retention

- Storage persistente.
- Retenção mínima aprovada.
- Integridade e hash quando aplicável.
- Export controlado para auditoria.
- Acesso auditor readonly.

## Legal/Privacy Review

- Data Processing Agreement.
- Política de privacidade.
- Base legal para processamento.
- Regras de dados sensíveis.
- Revisão de sub-processadores.

## Load/Performance

- Load tests com dados sintéticos.
- Limites de upload documentados.
- Backpressure em queues.
- Budget de latência por endpoint crítico.
- Capacity plan para organizations iniciais.

## Cost Budgets

- Budgets Cloudflare por ambiente.
- AI Gateway cost tracking.
- Alertas por organization/assessment.
- Quotas para LLM/embedding/reporting.
- Revisão FinOps antes de clientes reais.

## Support Process

- Processo de suporte organization-aware.
- Acesso support readonly auditado.
- Runbooks por incidente comum.
- SLA/SLO inicial.
- Canal de escalation.

## Go-Live Approval

Production Go-Live exige:

- todos os P0 resolvidos;
- `pnpm test:ci` verde;
- smoke tests staging verdes;
- security review aprovada;
- backup/restore validado;
- legal/privacy aprovado;
- approval formal de engineering, security e operations.
