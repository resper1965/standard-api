# Recipe: Risk Assessment Setup with KRI Monitoring

> Set up a risk methodology, browse the risk taxonomy, and configure KRI thresholds
> for continuous risk monitoring.

## Step 1: Choose a Risk Methodology

```bash
export API_URL="https://standard-api-gateway-production.ness.workers.dev"
export API_KEY="sk-your-api-key"

# List available methodologies
curl -s -H "Authorization: ApiKey $API_KEY" \
  "$API_URL/api/v1/risk/methodologies" | jq '.'
```

```json
{
  "data": [
    { "id": "iso31000_qualitative", "name": "ISO 31000 Qualitative Risk Assessment", "standard": "ISO 31000:2018" },
    { "id": "nist_sp800_30", "name": "NIST SP 800-30 Risk Assessment", "standard": "NIST SP 800-30 Rev. 1" }
  ]
}
```

## Step 2: Get Full Methodology Detail

```bash
curl -s -H "Authorization: ApiKey $API_KEY" \
  "$API_URL/api/v1/risk/methodologies/iso31000_qualitative" | jq '.'
```

Response includes:
- **Likelihood scale** (1-5 with labels, descriptions, frequencies)
- **Impact scale** (1-5 with financial/operational thresholds)
- **Risk matrix** (low/medium/high/critical thresholds)
- **Treatment options** (avoid, mitigate, transfer, accept)
- **Appetite categories** (strategic, operational, financial, compliance)

## Step 3: Browse Risk Taxonomy

```bash
curl -s -H "Authorization: ApiKey $API_KEY" \
  "$API_URL/api/v1/risk/taxonomy" | jq '.data.categories[] | {id, name, subcategories: [.subcategories[].name]}'
```

```json
[
  { "id": "cyber", "name": "Cybersecurity Risk", "subcategories": ["Malware / Ransomware", "Phishing", "Insider Threat", ...] },
  { "id": "operational", "name": "Operational Risk", "subcategories": ["System Outage", "Human Error", ...] },
  { "id": "compliance", "name": "Compliance Risk", "subcategories": ["Regulatory Fine", "Privacy Violation", ...] },
  { "id": "strategic", "name": "Strategic Risk", "subcategories": ["Reputational Damage", "Third-Party Failure", ...] }
]
```

Each subcategory includes `related_controls` mapping to ISO 27001/CIS/NIST controls.

## Step 4: Set Up KRI Monitoring

```bash
# Get all KRIs
curl -s -H "Authorization: ApiKey $API_KEY" \
  "$API_URL/api/v1/risk/kri-library" | jq '.data[] | {id, name, thresholds, frequency}'

# Filter by category
curl -s -H "Authorization: ApiKey $API_KEY" \
  "$API_URL/api/v1/risk/kri-library?category=cyber" | jq '.'
```

Each KRI includes:
- **Formula**: How to calculate (e.g., `patched_systems / total_systems × 100`)
- **Thresholds**: Green/Yellow/Red levels for your dashboard
- **Frequency**: How often to measure
- **Related controls**: Which framework controls this maps to

## TypeScript: Auto-Configure Risk Dashboard

```typescript
const BASE = "https://standard-api-gateway-production.ness.workers.dev";
const headers = { "Authorization": `ApiKey ${process.env.STANDARD_API_KEY}` };

// Get methodology for risk matrix configuration
const methodology = await fetch(
  `${BASE}/api/v1/risk/methodologies/iso31000_qualitative`, { headers }
).then(r => r.json());

// Get KRIs for dashboard widgets
const kris = await fetch(`${BASE}/api/v1/risk/kri-library`, { headers })
  .then(r => r.json());

// Configure dashboard
for (const kri of kris.data) {
  console.log(`📊 ${kri.name}`);
  console.log(`   Formula: ${kri.formula}`);
  console.log(`   🟢 Green: ${kri.thresholds.green}`);
  console.log(`   🟡 Yellow: ${kri.thresholds.yellow}`);
  console.log(`   🔴 Red: ${kri.thresholds.red}`);
  console.log(`   Frequency: ${kri.frequency}`);
}
```
