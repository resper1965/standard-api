const fs = require('fs');
let c = fs.readFileSync('docs/api/llms-full.txt', 'utf8');

c = c.replace(/\\\$\\{spec\.openapi\\}/g, '3.0.0');
c = c.replace(/\\\$\\{baseUrl\\}/g, 'https://standard-api.bekaa.eu');
c = c.replace(/\$\{spec\.openapi\}/g, '3.0.0');
c = c.replace(/\$\{baseUrl\}/g, 'https://standard-api.bekaa.eu');
c = c.replace('10 AI-powered endpoints', '13 AI-powered endpoints');
c = c.replace('PDF, DOCX, PNG, JPG, JPEG, WEBP, TXT, MD, CSV, JSON', 'PDF, DOCX, XLSX, PNG, JPG, JPEG, WEBP, TXT, MD, CSV, JSON');

// Fix Recipe 9
c = c.replace('{"text": "We digitize medical records from patients at the reception desk and store them in a cloud database for 10 years."}', '{"description": "We digitize medical records from patients at the reception desk and store them in a cloud database for 10 years.", "org_id": "org_123"}');
c = c.replace('{\n    "projectDescription":', '{\n    "process_description":');
c = c.replace('"ropaContext": {', '"org_id": "org_123",\n    "ropa_record": {');

// Fix Members from llms.txt section (remove it) - wait, this is llms-full.txt, not llms.txt

// Add "Mode B" to Gap Analysis
if (!c.includes('Mode B — Manual/Hybrid')) {
    c = c.replace('**Mode A — Automated (run against uploaded documents):**', '**Mode A — Automated (run against uploaded documents):**\n\n**Mode B — Manual/Hybrid (upload specific evidence files manually for an analysis context):**\n```bash\ncurl -X POST https://standard-api.bekaa.eu/api/v1/assessments/YOUR_ASSESSMENT_ID/evidence-analysis \\\n  -H "Authorization: Bearer standard_live_YOUR_KEY" \\\n  -H "x-standard-tenant-id: YOUR_ORG_ID" \\\n  -F "file=@manual-evidence.pdf"\n```\n\n**Mode A — Automated (run against uploaded documents):**');
}

fs.writeFileSync('docs/api/llms-full.txt', c);

// Now for llms.txt
let llms = fs.readFileSync('docs/api/llms.txt', 'utf8');
llms = llms.replace('- [Members](#members): Organization membership RBAC (invite, role, remove)\n', '');
llms = llms.replace('- [AI Agents](#ai-agents): 7 specialized agents\n', '- [AI Agents](#ai-agents): 7 specialized agents:\\n  1. Evidence Evaluator\\n  2. SOC Triage Analyst\\n  3. Executive Risk Translator\\n  4. Vendor Risk Scanner\\n  5. Privacy Data Steward\\n  6. POA&M Architect\\n  7. Intelligence Council\\n');

fs.writeFileSync('docs/api/llms.txt', llms);
