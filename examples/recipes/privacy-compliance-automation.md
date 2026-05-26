# Recipe: Privacy Compliance Automation (LGPD/GDPR)

> Look up regulatory requirements, legal bases, breach notification rules, and data subject rights
> to automate your privacy compliance workflows.

## Available Regulations

```bash
export API_URL="https://standard-api.bekaa.eu"
export API_KEY="sk-your-api-key"

# List all available regulations
curl -s -H "Authorization: ApiKey $API_KEY" \
  "$API_URL/api/v1/regulations" | jq '.'
```

Response:
```json
{
  "data": [
    { "id": "lgpd", "name": "Lei Geral de Proteção de Dados", "jurisdiction": "BR", "legal_base_count": 10, "rights_count": 9 },
    { "id": "gdpr", "name": "General Data Protection Regulation", "jurisdiction": "EU", "legal_base_count": 6, "rights_count": 7 },
    { "id": "hipaa", "name": "Health Insurance Portability and Accountability Act", "jurisdiction": "US", "legal_base_count": 3, "rights_count": 5 }
  ]
}
```

## Use Case 1: Auto-fill ROPA Legal Basis

When building a ROPA (Record of Processing Activities), query legal bases to auto-populate the form:

```bash
curl -s -H "Authorization: ApiKey $API_KEY" \
  "$API_URL/api/v1/regulations/lgpd/legal-bases" | jq '.'
```

Response includes `needs_lia: true` for legitimate interest — your app can auto-trigger a LIA workflow.

## Use Case 2: DSAR Response SLA

When a data subject submits a request, look up the response SLA:

```bash
curl -s -H "Authorization: ApiKey $API_KEY" \
  "$API_URL/api/v1/regulations/lgpd/rights" \
  | jq '.data[] | select(.id == "access") | {description, sla_days}'
```

```json
{ "description": "Acesso aos dados", "sla_days": 15 }
```

## Use Case 3: Breach Notification Checklist

When a breach is detected, immediately get the notification rules:

```bash
curl -s -H "Authorization: ApiKey $API_KEY" \
  "$API_URL/api/v1/regulations/lgpd/breach-rules" | jq '.'
```

```json
{
  "data": {
    "authority_deadline_hours": 48,
    "authority_name": "ANPD",
    "required_fields": ["nature", "categories_affected", "number_of_subjects", "measures_taken", "risks", "measures_to_mitigate"]
  }
}
```

## Use Case 4: International Transfer Assessment

Check available transfer mechanisms before a TIA:

```bash
curl -s -H "Authorization: ApiKey $API_KEY" \
  "$API_URL/api/v1/regulations/gdpr/transfer-mechanisms" | jq '.'
```

## TypeScript Example

```typescript
const BASE = "https://standard-api.bekaa.eu";
const headers = { "Authorization": `ApiKey ${process.env.STANDARD_API_KEY}` };

// Get all LGPD legal bases for ROPA form
const legalBases = await fetch(`${BASE}/api/v1/regulations/lgpd/legal-bases`, { headers })
  .then(r => r.json());

// Find bases that require LIA
const needsLia = legalBases.data.filter((b: any) => b.needs_lia);
console.log(`${needsLia.length} legal bases require Legitimate Interest Assessment`);

// Get breach rules for incident response
const breachRules = await fetch(`${BASE}/api/v1/regulations/lgpd/breach-rules`, { headers })
  .then(r => r.json());
console.log(`Notify ${breachRules.data.authority_name} within ${breachRules.data.authority_deadline_hours}h`);
```

## Python Example

```python
import httpx, os

client = httpx.Client(
    base_url="https://standard-api.bekaa.eu",
    headers={"Authorization": f"ApiKey {os.getenv('STANDARD_API_KEY')}"}
)

# Compare LGPD vs GDPR rights
lgpd_rights = client.get("/api/v1/regulations/lgpd/rights").json()["data"]
gdpr_rights = client.get("/api/v1/regulations/gdpr/rights").json()["data"]

print(f"LGPD: {len(lgpd_rights)} rights (SLA: {lgpd_rights[0]['sla_days']} dias)")
print(f"GDPR: {len(gdpr_rights)} rights (SLA: {gdpr_rights[0]['sla_days']} days)")
```
