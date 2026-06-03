---
title: "Backup & Restore Strategy"
---

# Backup & Restore Strategy

> Standard Platform — Production backup procedures for PostgreSQL and R2 storage.

## PostgreSQL (Neon Managed)

### Automatic Backups
- **Provider**: Neon (managed PostgreSQL)
- **Point-in-Time Recovery (PITR)**: Available on all Neon plans
- **Retention**: 7 days (Free/Launch), 30 days (Scale/Enterprise)
- **Granularity**: Any point within the retention window
- **Location**: Same region as the database (us-east-1)

### Restore Procedure
1. Open [Neon Console](https://console.neon.tech)
2. Navigate to project → **Branches**
3. Click **Restore** → Select point-in-time
4. Neon creates a new branch with restored data
5. Validate data integrity on the restored branch
6. If confirmed, promote the branch to production via `ALTER DATABASE ... RENAME`

### Manual Logical Backup
```bash
# Export full schema + data (run from trusted machine)
pg_dump "$DATABASE_URL" --format=custom --file=standard_backup_$(date +%Y%m%d_%H%M%S).dump

# Restore
pg_restore --dbname="$DATABASE_URL" --clean --if-exists standard_backup_YYYYMMDD_HHMMSS.dump
```

---

## R2 Object Storage

### Bucket Inventory
| Bucket | Content | Criticality |
|--------|---------|:-----------:|
| `standard-documents-dev` | Customer documents, evidence | **Critical** |
| `standard-reports-dev` | Generated reports, exports | High |
| `standard-exports-dev` | Bulk exports, audit packages | High |

### Backup Script
Use `scripts/backup-r2.mjs` for periodic R2 backup:

```bash
node scripts/backup-r2.mjs --bucket standard-documents-dev --output ./backups/r2/
```

### Restore Procedure
```bash
# Re-upload objects from local backup
npx wrangler r2 object put standard-documents-dev/<key> --file=<local-path>
```

---

## Disaster Recovery Summary

| Component | RPO | RTO | Method |
|-----------|-----|-----|--------|
| PostgreSQL | Minutes (PITR) | < 1 hour | Neon branch restore |
| R2 Documents | Daily (script) | < 2 hours | Re-upload from backup |
| KV Cache | N/A (ephemeral) | Instant | Auto-regenerated |
| Vectorize | Re-indexable | < 4 hours | Re-run embedding pipeline |

---

## Schedule

| Task | Frequency | Responsible |
|------|-----------|-------------|
| Neon PITR verification | Monthly | Platform team |
| R2 backup script | Weekly (manual until automated) | Platform team |
| Restore drill | Quarterly | Platform team |
