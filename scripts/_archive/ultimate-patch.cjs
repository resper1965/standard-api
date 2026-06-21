const fs = require('fs');

const missingClasses = `
// ── Missing Resources Generated ──────────────────────────────────────────────

export type TenantsResourcePostResponse = paths["/api/v1/tenants"]["post"]["responses"]["201"]["content"]["application/json"];
export type TenantsResourceGetResponse = paths["/api/v1/tenants/{organizationId}"]["get"]["responses"]["200"]["content"]["application/json"];

class TenantsResource {
  constructor(private client: StandardClient) {}

  get(id: string, opts?: RequestOptions) {
    return this.client._get<TenantsResourceGetResponse>(\`/tenants/\${id}\`, opts);
  }
  create(data: any, opts?: RequestOptions) {
    return this.client._post<TenantsResourcePostResponse>("/tenants", data, opts);
  }
  update(id: string, data: any, opts?: RequestOptions) {
    return this.client._patch<any>(\`/tenants/\${id}\`, data, opts);
  }
  organizations(id: string, opts?: RequestOptions) {
    return this.client._get<any>(\`/tenants/\${id}/organizations\`, opts);
  }
}

class ScopesResource {
  constructor(private client: StandardClient) {}
  
  get(id: string, opts?: RequestOptions) {
    return this.client._get<any>(\`/scopes/\${id}\`, opts);
  }
  update(id: string, data: any, opts?: RequestOptions) {
    return this.client._patch<any>(\`/scopes/\${id}\`, data, opts);
  }
  submitReview(id: string, opts?: RequestOptions) {
    return this.client._post<any>(\`/scopes/\${id}/submit-review\`, undefined, opts);
  }
  approve(id: string, opts?: RequestOptions) {
    return this.client._post<any>(\`/scopes/\${id}/approve\`, undefined, opts);
  }
}

class IntelligenceResource {
  constructor(private client: StandardClient) {}
  
  blastRadius(data: any, opts?: RequestOptions) { return this.client._post<any>("/intelligence/blast-radius", data, opts); }
  gapAnalysis(data: any, opts?: RequestOptions) { return this.client._post<any>("/intelligence/gap-analysis", data, opts); }
  dpiaScore(data: any, opts?: RequestOptions) { return this.client._post<any>("/intelligence/dpia-score", data, opts); }
  complianceScore(data: any, opts?: RequestOptions) { return this.client._post<any>("/intelligence/compliance-score", data, opts); }
  retentionCheck(data: any, opts?: RequestOptions) { return this.client._post<any>("/intelligence/retention-check", data, opts); }
  breachSla(data: any, opts?: RequestOptions) { return this.client._post<any>("/intelligence/breach-sla", data, opts); }
  crossCoverage(data: any, opts?: RequestOptions) { return this.client._post<any>("/intelligence/cross-coverage", data, opts); }
  roiPath(data: any, opts?: RequestOptions) { return this.client._post<any>("/intelligence/roi-path", data, opts); }
}

class EvidenceFindingsResource {
  constructor(private client: StandardClient) {}
  
  get(id: string, opts?: RequestOptions) { return this.client._get<any>(\`/evidence-findings/\${id}\`, opts); }
  sources(id: string, opts?: RequestOptions) { return this.client._get<any>(\`/evidence-findings/\${id}/sources\`, opts); }
  refresh(id: string, opts?: RequestOptions) { return this.client._post<any>(\`/evidence-findings/\${id}/refresh\`, undefined, opts); }
}

class PrivacyResource {
  constructor(private client: StandardClient) {}
  
  scanVendorContract(data: any, opts?: RequestOptions) { return this.client._post<any>("/privacy/scan-vendor-contract", data, opts); }
  scanVendorContractBatch(data: any, opts?: RequestOptions) { return this.client._post<any>("/privacy/scan-vendor-contract/batch", data, opts); }
}

class MeResource {
  constructor(private client: StandardClient) {}
  
  account(opts?: RequestOptions) { return this.client._get<any>("/me/account", opts); }
  dataExport(opts?: RequestOptions) { return this.client._get<any>("/me/data-export", opts); }
}

class SocResource {
  constructor(private client: StandardClient) {}
  
  status(opts?: RequestOptions) { return this.client._get<any>("/soc/status", opts); }
}
`;

const missingMethods = {
  GapAnalysisResource: "\n  validate(versionId: string, opts?: RequestOptions) { return this.client._post<any>('/gap-analysis/' + versionId + '/validate', undefined, opts); }\n  regenerate(versionId: string, opts?: RequestOptions) { return this.client._post<any>('/gap-analysis/' + versionId + '/regenerate', undefined, opts); }\n  bulkUpdateFindings(versionId: string, data: any, opts?: RequestOptions) { return this.client._post<any>('/gap-analysis/' + versionId + '/findings/bulk-update', data, opts); }\n  evaluateEvidence(data: any, opts?: RequestOptions) { return this.client._post<any>('/gap/evaluate-evidence', data, opts); }\n  evaluateEvidenceBatch(data: any, opts?: RequestOptions) { return this.client._post<any>('/gap/evaluate-evidence/batch', data, opts); }",
  SoaResource: "\n  refreshEvidence(versionId: string, opts?: RequestOptions) { return this.client._post<any>('/soa/' + versionId + '/evidence/refresh', undefined, opts); }\n  markIngested(versionId: string, opts?: RequestOptions) { return this.client._post<any>('/soa/' + versionId + '/mark-ingested', undefined, opts); }\n  markIngestionRequired(versionId: string, opts?: RequestOptions) { return this.client._post<any>('/soa/' + versionId + '/mark-ingestion-required', undefined, opts); }\n  regenerate(versionId: string, opts?: RequestOptions) { return this.client._post<any>('/soa/' + versionId + '/regenerate', undefined, opts); }\n  updateItem(itemId: string, data: any, opts?: RequestOptions) { return this.client._patch<any>('/soa/items/' + itemId, data, opts); }",
  OrganizationsResource: "\n  update(orgId: string, data: any, opts?: RequestOptions) { return this.client._patch<any>('/organizations/' + orgId, data, opts); }\n  deleteOrg(orgId: string, opts?: RequestOptions) { return this.client._delete<any>('/organizations/' + orgId, opts); }",
  AssessmentsResource: "\n  automationRules(id: string, opts?: RequestOptions) { return this.client._get<any>('/assessments/' + id + '/automation-rules', opts); }\n  updateAutomationRules(id: string, data: any, opts?: RequestOptions) { return this.client._put<any>('/assessments/' + id + '/automation-rules', data, opts); }\n  newCycle(id: string, data: any, opts?: RequestOptions) { return this.client._post<any>('/assessments/' + id + '/new-cycle', data, opts); }\n  live(id: string, opts?: RequestOptions) { return this.client._get<any>('/assessments/' + id + '/live', opts); }\n  runEvidenceAnalysis(id: string, data: any, opts?: RequestOptions) { return this.client._post<any>('/assessments/' + id + '/evidence-analysis/run', data, opts); }",
  DocumentsResource: "\n  submitForEmbedding(docId: string, opts?: RequestOptions) { return this.client._post<any>('/documents/' + docId + '/submit-for-embedding', undefined, opts); }"
};

let clientCode = fs.readFileSync('packages/sdk/src/client.ts', 'utf8');

// Use proper newline normalization
clientCode = clientCode.replace(/\r\n/g, '\n');

let lines = clientCode.split('\n');

function insertMethod(className, methodString) {
  let classStart = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith(`class ${className} {`)) {
      classStart = i;
      break;
    }
  }
  if (classStart === -1) return;
  
  let depth = 0;
  for (let i = classStart; i < lines.length; i++) {
    if (lines[i].includes('{')) depth++;
    if (lines[i].includes('}')) depth--;
    if (depth === 0) {
      lines.splice(i, 0, methodString);
      break;
    }
  }
}

// 1. Insert imports
if (!lines[0].includes('api-types.js')) {
  lines.unshift('import type { paths } from "./api-types.js";');
}

// 2. Add _put
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('_patch<T>')) {
    let insertAt = -1;
    for (let j = i; j < lines.length; j++) {
      if (lines[j].includes('}')) {
        insertAt = j + 1;
        break;
      }
    }
    if (insertAt !== -1 && !lines.slice(i, i+10).join(' ').includes('_put<T>')) {
      lines.splice(insertAt, 0, "  /** @internal */\n  _put<T>(path: string, body?: unknown, opts?: RequestOptions) {\n    return this._request<T>(\"PUT\", path, body, opts);\n  }");
    }
    break;
  }
}

// 3. Inject new classes at the end of the file
if (!lines.join('\n').includes('class TenantsResource')) {
  lines.push(missingClasses);
}

// 4. Inject standard fields in StandardClient
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('readonly compliance: ComplianceResource;')) {
    if (!lines[i+1].includes('readonly tenants: TenantsResource;')) {
      lines.splice(i+1, 0, "  readonly tenants: TenantsResource;\n  readonly scopes: ScopesResource;\n  readonly intelligence: IntelligenceResource;\n  readonly evidenceFindings: EvidenceFindingsResource;\n  readonly privacy: PrivacyResource;\n  readonly me: MeResource;\n  readonly soc: SocResource;");
    }
    break;
  }
}

// 5. Inject instantiations
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('this.compliance = new ComplianceResource(this);')) {
    if (!lines[i+1].includes('this.tenants = new TenantsResource(this);')) {
      lines.splice(i+1, 0, "    this.tenants = new TenantsResource(this);\n    this.scopes = new ScopesResource(this);\n    this.intelligence = new IntelligenceResource(this);\n    this.evidenceFindings = new EvidenceFindingsResource(this);\n    this.privacy = new PrivacyResource(this);\n    this.me = new MeResource(this);\n    this.soc = new SocResource(this);");
    }
    break;
  }
}

// 6. Inject methods
if (!lines.join('\n').includes('validate(versionId: string, opts?: RequestOptions)')) {
  insertMethod('GapAnalysisResource', missingMethods.GapAnalysisResource);
  insertMethod('SoaResource', missingMethods.SoaResource);
  insertMethod('OrganizationsResource', missingMethods.OrganizationsResource);
  insertMethod('AssessmentsResource', missingMethods.AssessmentsResource);
  insertMethod('DocumentsResource', missingMethods.DocumentsResource);
}

fs.writeFileSync('packages/sdk/src/client.ts', lines.join('\n'), 'utf8');

console.log('client.ts patched optimally.');
