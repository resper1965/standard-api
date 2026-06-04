# Plano: Fase 2 P1 Remanescente — Hardening & Evals

> **Data**: 2026-05-09
> **Fase**: 2 (Core Funcional Completo)
> **Itens**: 2.7, 2.8, 2.9, 2.11
> **Processo**: Superpowers SDLC (ADR-0009)

## Contexto

Fase 1 (Estabilização) e os P0 da Fase 2 (maturity, rejection loops, rastreabilidade) estão concluídos.
Restam 4 itens P1 na Fase 2, todos de hardening: anti-malware, SCF importer hardening, evals avançados e SOC monitoring.

## Itens

### 2.7 — Anti-malware scanning em uploads (P1)

**Estado atual**: Placeholder `MalwareScanPlaceholder` em `packages/security/src/upload-security/malware-scan.placeholder.ts` retorna `not_configured`.

**Plano**:
1. Criar interface `MalwareScanProvider` com contrato de scan em `packages/security/src/upload-security/malware-scan.ts`
2. Implementar `CloudflareWorkerScanProvider` que delega a um Worker dedicado (future) e `PassthroughScanProvider` que loga e aceita (para produção sem scanner configurado)
3. Integrar no `FileSecurityService.validate()` — incluir resultado de scan no `FileValidationSecurityResult`
4. Registrar evento de segurança em `security_events` quando scan rejeitar arquivo
5. Manter flag de configuração: se scanner não está configurado, log warning e aceitar (not_configured, sem bloqueio)

**Risco**: Sem provedor real de malware scan agora → implementar como contrato extensível com passthrough seguro.

---

### 2.8 — SCF official importer hardening (P1)

**Estado atual**: Importer XLSX funcional (`packages/scf-core`), SCF 2026.1.1 seedado em produção.

**Plano**:
1. Adicionar validação de schema no importer: verificar colunas esperadas antes de processar
2. Adicionar checksum/hash do arquivo XLSX para audit trail
3. Registrar `scf_version`, `source_hash`, `imported_at`, `imported_by` no audit log
4. Adicionar contagem de controles importados vs esperados como sanity check
5. Proteger contra re-import acidental: verificar se versão já existe antes de inserir

**Risco**: Nenhum bloqueador. Melhorias de robustez no caminho existente.

---

### 2.9 — Advanced evals (P1)

**Estado atual**: 7 evals de agentes com `MockLLMProvider`, guardrails e golden outputs. Métricas: schema_pass_rate, guardrail_pass_rate, hallucinated mappings, approval bypass, organization violations.

**Plano**:
1. Adicionar 2 evals de rejeição/rework: testar que rejection cria nova versão com rastreabilidade
2. Adicionar 1 eval de maturity classification: verificar regras CMMI contra golden dataset
3. Adicionar eval de prompt injection: input com instruções maliciosas deve ser rejeitado/sanitizado
4. Adicionar eval de cross-organization: verificar que agente não acessa dados de outro organization
5. Expandir golden outputs com cenários de borda (absent evidence, N/A controls, conflicting scores)

**Risco**: Nenhum bloqueador. Expansão do framework existente.

---

### 2.11 — SOC monitoring (P1)

**Estado atual**: `security_events` e `operational_metrics` persistem em PostgreSQL. Logs estruturados com redaction. Sem alertas automáticos.

**Plano**:
1. Criar `packages/observability/src/alerts.ts` com regras de alerta em código:
   - `TENANT_MISMATCH`: evento de segurança com organization_id inesperado
   - `APPROVAL_BYPASS_ATTEMPT`: tentativa de aprovação sem permissão
   - `DLQ_THRESHOLD`: fila de dead-letter acima do limiar
   - `ERROR_RATE_SPIKE`: taxa de 5xx acima de 5% em janela de 5 min
   - `COST_ANOMALY`: usage por organization acima de 2x média
2. Registrar alertas como `security_events` com severity e metadata
3. Estruturar para futura integração com webhook/Slack/email (interface `AlertSink`)
4. Adicionar health check endpoint `/api/v1/health/alerts` que retorna alertas ativos

**Risco**: Sem provedor de notificação real agora → implementar como log + security_event, extensível via `AlertSink`.

---

## Ordem de Execução

1. **2.8** SCF importer hardening (menor risco, maior valor imediato)
2. **2.7** Anti-malware scan contract (contrato extensível)
3. **2.11** SOC monitoring (alertas em código)
4. **2.9** Advanced evals (validação de tudo anterior)

## Validação

```bash
pnpm typecheck  # zero erros
pnpm test       # 51+ testes passando
pnpm lint       # sem secrets
```

Cada item será commitado separadamente para rastreabilidade.
