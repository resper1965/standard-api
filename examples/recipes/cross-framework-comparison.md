# Recipe: Cross-Framework Compliance Simulation

> "I'm already ISO 27001 certified. How much of SOC 2 do I already cover?"

## The Idea

The Standard API maps all frameworks to the same set of SCF controls. This means you can
compare ANY two frameworks and see how much they overlap. ISO 27001 → SOC 2, NIST CSF → PCI DSS,
HIPAA → ISO 27001 — any combination.

## Step 1: Get Framework IDs

```bash
export API_URL="https://standard-api.bekaa.eu"
export API_KEY="sk-your-api-key"

# List all 231 frameworks
curl -s -H "Authorization: ApiKey $API_KEY" \
  "$API_URL/api/v1/scf/frameworks" \
  | jq '.data[] | {framework_id, framework_name}' | head -40
```

Find the IDs for the two frameworks you want to compare.

## Step 2: Get SCF Version

```bash
SCF_VERSION=$(curl -s -H "Authorization: ApiKey $API_KEY" \
  "$API_URL/api/v1/scf/versions/latest" \
  | jq -r '.scf_version_id')
```

## Step 3: Compare Frameworks

```bash
curl -s -H "Authorization: ApiKey $API_KEY" \
  "$API_URL/api/v1/scf/cross-mapping/$FW_ISO27001/$FW_SOC2?scf_version=$SCF_VERSION" \
  | jq '.'
```

Response:
```json
{
  "data": {
    "framework_a": {
      "id": "fw-iso27001",
      "name": "ISO/IEC 27001:2022",
      "requirement_count": 93,
      "control_count": 312
    },
    "framework_b": {
      "id": "fw-soc2",
      "name": "SOC 2 Type II (TSC)",
      "requirement_count": 60,
      "control_count": 187
    },
    "overlap": {
      "shared_control_count": 156,
      "only_in_a": 156,
      "only_in_b": 31,
      "overlap_percentage": 45
    },
    "interpretation": "Moderate overlap (45%). Significant gaps remain between the two frameworks."
  }
}
```

## Step 4: Check Individual Framework Coverage

```bash
# How well is ISO 27001 covered by SCF controls?
curl -s -H "Authorization: ApiKey $API_KEY" \
  "$API_URL/api/v1/scf/frameworks/$FW_ISO27001/coverage?scf_version=$SCF_VERSION" \
  | jq '.'
```

## Step 5: Find Equivalent Controls

For a specific control, see its equivalents across all frameworks:

```bash
# What maps to ISO 27001 A.5.1 across other frameworks?
curl -s -H "Authorization: ApiKey $API_KEY" \
  "$API_URL/api/v1/scf/controls/$CONTROL_ID/mappings" \
  | jq '.data[] | {framework: .framework_name, requirement: .requirement_code, title: .requirement_title}'
```

## TypeScript

```typescript
const BASE = "https://standard-api.bekaa.eu";
const headers = { "Authorization": `ApiKey ${process.env.STANDARD_API_KEY}` };

// Compare ISO 27001 vs SOC 2
const comparison = await fetch(
  `${BASE}/api/v1/scf/cross-mapping/${isoId}/${socId}?scf_version=${scfVersion}`,
  { headers }
).then(r => r.json());

console.log(`Overlap: ${comparison.data.overlap.overlap_percentage}%`);
console.log(`Shared controls: ${comparison.data.overlap.shared_control_count}`);
console.log(`Interpretation: ${comparison.data.interpretation}`);
```

## Use Cases

| Scenario | What to call |
|---|---|
| "Am I already SOC 2 ready?" | Cross-mapping ISO 27001 ↔ SOC 2 |
| "What does DORA add beyond ISO 27001?" | Cross-mapping ISO 27001 ↔ DORA |
| "Does NIST CSF cover PCI DSS?" | Cross-mapping NIST CSF ↔ PCI DSS |
| "What's the gap from HIPAA to ISO 27001?" | Cross-mapping HIPAA ↔ ISO 27001 |
