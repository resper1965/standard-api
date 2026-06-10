# ADR-002 — Ledger Append-Only para Eventos de Controlo

**Status:** Aceite  
**Data:** 2026-06-10

---

## Contexto

As tabelas `soa_items`, `gap_findings` e `maturity_scores` são actualizadas
directamente (UPDATE). A tabela `audit_logs` regista eventos mas não tem
constraint de imutabilidade no banco — UPDATE e DELETE são tecnicamente possíveis.

Sistemas GRC enterprise requerem trilha de auditoria imutável para conformidade
com SOC 2, ISO 27001 Cláusula 9.1 e LGPD Art. 37.

---

## Decisão

Criar tabela `assessment_control_events` como ledger append-only.  
Mutações de estado em controlos geram INSERT nesta tabela (nunca UPDATE da linha).

### Regras de Imutabilidade

1. `assessment_control_events` — sem `updated_at`, sem `deleted_at`
2. Trigger PostgreSQL bloqueia UPDATE/DELETE nesta tabela e dispara `ledger.audit.alert`
3. Estado actual = reducer sobre todos os eventos de um `(assessment_id, control_id)`
4. Versões aprovadas (`status = "approved"`) são imutáveis — já implementado em
   `gap-analysis.routes.ts` L454–463, manter e estender

### O que NÃO muda

- As tabelas existentes (`soa_items`, `gap_findings`) continuam como estão para
  operações de draft/review — são mutáveis enquanto não aprovadas
- Só após aprovação é que o estado final é gravado como evento imutável no ledger

---

## Ficheiros Afectados

- Migration Drizzle — `CREATE TABLE assessment_control_events`
- `packages/observability/src/` — novo serviço `LedgerService`
- `apps/api-gateway/src/routes/gap-analysis.routes.ts` — emitir evento ledger no approve
