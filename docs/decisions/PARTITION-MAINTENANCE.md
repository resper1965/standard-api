# Particionamento de Ledger — Guia de Manutenção

> **Última actualização:** 2026-06-10  
> **Implementado em:** migration `0049_partition_ledger_tables.sql`

## Tabelas Particionadas

| Tabela | Estratégia | Coluna | Granularidade |
|--------|-----------|--------|---------------|
| `assessment_control_events` | RANGE | `occurred_at` | Trimestral |
| `audit_logs` | RANGE | `created_at` | Trimestral |

## Por que RANGE(tempo) e não LIST(organization_id)?

- `LIST(org_id)` requer DDL por tenant → N tenants = N partitions = DDL caro a cada novo cliente
- `RANGE(time)` permite rotação automática futura via `pg_partman` e é compatível com o padrão append-only dos ledgers
- Queries tenantizadas usam o índice composto `(organization_id, occurred_at)` → partition pruning automático

## Limitação Importante — FK Constraints

PostgreSQL **não suporta Foreign Keys em tabelas particionadas**.  
As FKs originais (`actor_id → users`, `agent_run_id → agent_runs`, etc.) foram removidas na migration 0049.  
A integridade referencial é garantida pela camada de aplicação (INSERT só ocorre após validação no API gateway).

## Partições Existentes

```
assessment_control_events_2026_q2  → 2026-04-01 até 2026-07-01
assessment_control_events_2026_q3  → 2026-07-01 até 2026-10-01
assessment_control_events_2026_q4  → 2026-10-01 até 2027-01-01
assessment_control_events_2027_q1  → 2027-01-01 até 2027-04-01
assessment_control_events_2027_q2  → 2027-04-01 até 2027-07-01

audit_logs_2026_q2  → 2026-04-01 até 2026-07-01
audit_logs_2026_q3  → 2026-07-01 até 2026-10-01
audit_logs_2026_q4  → 2026-10-01 até 2027-01-01
audit_logs_2027_q1  → 2027-01-01 até 2027-04-01
audit_logs_2027_q2  → 2027-04-01 até 2027-07-01
```

## ⚠️ Criação Manual de Novas Partições

> **Criar nova partição 30 dias antes do início do trimestre seguinte.**  
> Se nenhuma partição cobrir a data de um INSERT, PostgreSQL lança erro imediatamente.

**Calendário de criação:**

| Criar em | Para cobrir |
|----------|------------|
| 2027-06-01 | 2027 Q3 → `2027-07-01` a `2027-10-01` |
| 2027-09-01 | 2027 Q4 → `2027-10-01` a `2028-01-01` |
| 2027-12-01 | 2028 Q1 → `2028-01-01` a `2028-04-01` |

**Template SQL:**

```sql
-- assessment_control_events — nova partição
CREATE TABLE assessment_control_events_2027_q3
  PARTITION OF assessment_control_events
  FOR VALUES FROM ('2027-07-01') TO ('2027-10-01');

-- audit_logs — nova partição
CREATE TABLE audit_logs_2027_q3
  PARTITION OF audit_logs
  FOR VALUES FROM ('2027-07-01') TO ('2027-10-01');
```

## Monitorização de Tamanho

```sql
-- Ver tamanho de todas as partições
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname || '.' || tablename)) AS size,
  pg_total_relation_size(schemaname || '.' || tablename) AS size_bytes
FROM pg_tables
WHERE tablename LIKE 'assessment_control_events%'
   OR tablename LIKE 'audit_logs%'
ORDER BY size_bytes DESC;
```

## Verificar Partition Pruning (Explain)

```sql
EXPLAIN (ANALYZE, BUFFERS)
SELECT *
FROM assessment_control_events
WHERE organization_id = '<org-uuid>'
  AND occurred_at >= '2026-07-01'
  AND occurred_at <  '2026-10-01';
-- Esperado: "Partitions selected: 1"
```

## Activação de pg_partman (opcional)

Se `pg_partman` estiver disponível no Neon:

```sql
-- Verificar disponibilidade:
SELECT * FROM pg_extension WHERE extname = 'pg_partman';

-- Se disponível, registar para automação:
SELECT pg_partman.create_parent(
  p_parent_table := 'public.assessment_control_events',
  p_control      := 'occurred_at',
  p_type         := 'native',
  p_interval     := 'quarterly',
  p_premake      := 4
);

SELECT pg_partman.create_parent(
  p_parent_table := 'public.audit_logs',
  p_control      := 'created_at',
  p_type         := 'native',
  p_interval     := 'quarterly',
  p_premake      := 4
);
```

## Rollback

Ver `infra/docker/postgres/migrations/0049_partition_ledger_tables.down.sql`.  
**Não executar em produção sem janela de manutenção e backup prévio.**
