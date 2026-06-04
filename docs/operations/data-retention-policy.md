# Data Retention & Legal Hold Policy

> Standard Platform — Data lifecycle management, retention periods, and legal hold procedures.

## Principles

1. **Minimum necessary retention**: Data is kept only as long as required for operational, regulatory, or contractual purposes.
2. **Soft delete first**: All critical entities use `deleted_at` timestamps for reversible removal.
3. **Organization isolation**: Retention policies are enforced per-organization; no cross-organization data leakage.
4. **Legal holds override**: When active, legal holds suspend all automated purge for the affected scope.
5. **Audit trail**: All retention actions (purge, hold, release) are recorded in `audit_logs`.

---

## Retention Periods

| Entity | Default Retention | After Deletion | Notes |
|--------|:-----------------:|:--------------:|-------|
| **Organizations** | Indefinite (active) | 90 days soft delete | Cascade to all organization data |
| **Organizations** | Indefinite (active) | 90 days soft delete | Follows organization lifecycle |
| **Assessments** | Indefinite (active) | 1 year soft delete | Regulatory: retain completed assessments |
| **Documents** | Assessment lifetime | 1 year after assessment close | R2 objects purged after retention |
| **Document Chunks** | Document lifetime | Same as parent document | Cascade delete |
| **KB Entries** | Assessment lifetime | Same as assessment | Vectors purged from Vectorize |
| **Vector References** | KB entry lifetime | Same as KB entry | Vectorize cleanup job |
| **Audit Logs** | **3 years** | Never auto-purged | Regulatory requirement |
| **Security Events** | **2 years** | Never auto-purged | SOC/compliance requirement |
| **Operational Metrics** | 90 days | Auto-purged | Performance data only |
| **Usage Records** | 1 year | Auto-purged after billing cycle | Billing reconciliation |
| **Agent Usage Records** | 1 year | Auto-purged after billing cycle | Cost tracking |
| **Agent Runs** | Assessment lifetime | Same as assessment | Traceability requirement |
| **Agent Decisions** | Assessment lifetime | Same as assessment | Audit trail |
| **Workflow Runs** | Assessment lifetime | Same as assessment | Orchestration history |
| **Approval Events** | **3 years** | Never auto-purged | Compliance gate records |
| **SoA / Gap / POA&M** | Assessment lifetime + 1 year | Archived after assessment close | Versioned artifacts |
| **Reports** | Assessment lifetime + 2 years | Archived | Deliverable retention |
| **API Keys** | Until revoked + 90 days | Hard delete after retention | Security housekeeping |

---

## Soft Delete Mechanism

All tables with `deleted_at` column support soft deletion:

```sql
-- Soft delete
UPDATE assessments SET deleted_at = NOW() WHERE id = $1;

-- Query active only (default)
SELECT * FROM assessments WHERE deleted_at IS NULL;

-- Restore (within retention window)
UPDATE assessments SET deleted_at = NULL WHERE id = $1;
```

---

## Legal Hold

A legal hold freezes all automated purge operations for a specific organization, organization, or assessment.

### Activation
```json
{
  "entity_type": "assessment",
  "entity_id": "uuid",
  "hold_reason": "Regulatory investigation ref-2026-0042",
  "activated_by": "actor-uuid",
  "activated_at": "2026-05-08T00:00:00Z"
}
```

### Rules
- Legal holds are stored as metadata on the organization/assessment record
- No automated purge job may delete data under active legal hold
- Only `platform_admin` role can activate or release legal holds
- All hold/release events are recorded in `audit_logs`

### Release
- Legal hold is released by explicit action from `platform_admin`
- After release, normal retention timers resume from the release date
- A 30-day grace period applies before any purge occurs

---

## Purge Procedure

### Automated (Future)
A scheduled Cloudflare Worker or Cron Trigger will:
1. Query entities past retention period with `deleted_at` set
2. Verify no active legal hold on the entity or its parent organization
3. Hard delete from PostgreSQL
4. Remove associated R2 objects
5. Remove associated Vectorize vectors
6. Record purge in `audit_logs`

### Manual (Current)
Until automated purge is implemented:
1. Platform admin reviews candidates via SQL query
2. Validates no legal hold
3. Executes deletion with explicit audit log entry
4. Removes R2/Vectorize artifacts manually

---

## Compliance References

| Regulation | Requirement | Standard Coverage |
|------------|-------------|-------------------|
| GDPR Art. 17 | Right to erasure | Soft delete + purge workflow |
| SOC 2 CC6.1 | Logical access controls | Organization isolation + RBAC |
| ISO 27001 A.8.10 | Information deletion | Retention policy + audit trail |
| NIST 800-53 SI-12 | Information management | Defined retention periods |
