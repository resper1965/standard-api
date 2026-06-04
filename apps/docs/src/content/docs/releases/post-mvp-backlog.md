---
title: "Post-MVP Backlog"
---

# Post-MVP Backlog

> [!WARNING]
> **[SUPERSEDED]** Este documento foi consolidado em `docs/backlog/backlog.md`. Não adicionar novos itens aqui.

## P0 Critical

- Enterprise auth: implementar provider real JWT/API key/Cloudflare Access e bloquear `mock_dev` fora de local/test.
- Cloudflare production resources: provisionar recursos production separados e validar smoke tests antes de qualquer dado real.
- Rate limiting: substituir placeholder por enforcement real por organization/organization.
- Audit log persistence: mover audit/security events de in-memory para storage persistente com retenção definida.
- Backup/restore: definir e testar backup/restore de PostgreSQL e artefatos R2.
- Data retention and legal holds: definir política por organization, assessment, artifact e audit log.

## P1 High

- SCF official importer hardening: endurecer importador oficial XLSX/OSCAL, validação STRM, rollback e versionamento.
- Real LLM provider integration: integrar provider real via AI Gateway com DLP, usage tracking, prompt hashing e evals manuais.
- Cloudflare production resources: automatizar criação por IaC e validar bindings por ambiente.
- Advanced evals: ampliar datasets sintéticos, cenários adversariais, prompt injection e regression metrics.
- SOC monitoring: criar alertas para security events, permission denied, organization mismatch, DLQ e custos anômalos.
- Billing/usage dashboards: expor visões operacionais por organization, organization, assessment, model e Cloudflare resource.

## P2 Medium

- UI/Web Console: construir console web como consumidor da API, sem lógica crítica de assessment no frontend.
- Advanced reporting: adicionar renderer DOCX/PDF, templates versionados e validação de fonte aprovada.
- Customer custom domains: desenhar Cloudflare for SaaS/custom hostnames com isolamento por organization.
- Performance/load testing: criar cenários k6 ou equivalente com dados sintéticos e orçamento por endpoint.
- Backup/restore: automatizar drills periódicos e evidências de restore.
- SOC monitoring: integrar com SIEM/SOC e playbooks de incidente.

## P3 Future

- Workers for Platforms extensions: avaliar apenas se houver requisito de workloads/extensões executáveis por organization.
- Real LLM provider integration: suportar múltiplos providers com seleção por política e fallback governado.
- UI/Web Console: dashboards avançados de auditoria, evidência, custos e maturity trends.
- Advanced reporting: relatórios executivos multi-framework e evidência navegável com redaction.
- Billing/usage dashboards: previsão de custo, budgets, quotas e chargeback por organization.
- Data retention and legal holds: self-service legal hold com approvals e export controlado.
