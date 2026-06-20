const fs = require('fs');
let c = fs.readFileSync('apps/api-gateway/src/openapi/docs/llms-constants.ts', 'utf8');

c = c.replace(/\\\$\\{spec\.openapi\\}/g, '${spec.openapi}');
c = c.replace(/\\\$\\{baseUrl\\}/g, '${baseUrl}');
c = c.replace('10 AI-powered endpoints', '13 AI-powered endpoints');
c = c.replace('https://standard-api.bekaa.eu/docs/api/B2B_INTEGRATION_GUIDE.md', '/docs/B2B_INTEGRATION_GUIDE.md');
c = c.replace('https://standard-api.bekaa.eu/docs/api/privacy-ropa-sdk.md', '/docs/privacy-ropa-sdk.md');
c = c.replace('PDF, DOCX, PNG, JPG, JPEG, WEBP, TXT, MD, CSV, JSON', 'PDF, DOCX, XLSX, PNG, JPG, JPEG, WEBP, TXT, MD, CSV, JSON');

// Fix Recipe 9
c = c.replace('{"text": "We digitize medical records from patients at the reception desk and store them in a cloud database for 10 years."}', '{"description": "We digitize medical records from patients at the reception desk and store them in a cloud database for 10 years.", "org_id": "org_123"}');
c = c.replace('{\n    "projectDescription":', '{\n    "process_description":');
c = c.replace('"ropaContext": {', '"org_id": "org_123",\n    "ropa_record": {');

// Fix Members from llms.txt section (remove it)
c = c.replace('- [Members](#members): Organization membership RBAC (invite, role, remove)\n', '');

// Name the 7 AI agents
c = c.replace('- [AI Agents](#ai-agents): 7 specialized agents\n', '- [AI Agents](#ai-agents): 7 specialized agents:\\n  1. Evidence Evaluator\\n  2. SOC Triage Analyst\\n  3. Executive Risk Translator\\n  4. Vendor Risk Scanner\\n  5. Privacy Data Steward\\n  6. POA&M Architect\\n  7. Intelligence Council\\n');

// Add "Mode B" to Gap Analysis
c = c.replace('**Mode A — Automated (run against uploaded documents):**', '**Mode A — Automated (run against uploaded documents):**\n\n**Mode B — Manual/Hybrid (upload specific evidence files manually for an analysis context):**\n```bash\ncurl -X POST ${baseUrl}/api/v1/assessments/YOUR_ASSESSMENT_ID/evidence-analysis \\\n  -H "Authorization: Bearer standard_live_YOUR_KEY" \\\n  -H "x-standard-tenant-id: YOUR_ORG_ID" \\\n  -F "file=@manual-evidence.pdf"\n```\n\n**Mode A — Automated (run against uploaded documents):**');

fs.writeFileSync('apps/api-gateway/src/openapi/docs/llms-constants.ts', c);
