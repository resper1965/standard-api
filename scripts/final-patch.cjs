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

// 1. Inject imports
if (!clientCode.includes('import type { paths }')) {
  clientCode = clientCode.replace(/import type \{/, 'import type { paths } from "./api-types.js";\nimport type {');
}

// 2. Inject `_put` to StandardClient
clientCode = clientCode.replace(
  /  \/\*\* \@internal \*\/\n  _patch<T>\(path: string, body\?: unknown, opts\?: RequestOptions\) \{\n    return this\._request<T>\("PATCH", path, body, opts\);\n  \}/,
  "  /** @internal */\n  _patch<T>(path: string, body?: unknown, opts?: RequestOptions) {\n    return this._request<T>(\"PATCH\", path, body, opts);\n  }\n  /** @internal */\n  _put<T>(path: string, body?: unknown, opts?: RequestOptions) {\n    return this._request<T>(\"PUT\", path, body, opts);\n  }"
);

// 3. Inject new classes
clientCode = clientCode.replace(/(\/\/ ── Helper ──────────────────────────────────────────)/, missingClasses + '\n$1');

// 4. Inject standard fields in StandardClient
const standardClientFields = "\n  readonly tenants: TenantsResource;\n  readonly scopes: ScopesResource;\n  readonly intelligence: IntelligenceResource;\n  readonly evidenceFindings: EvidenceFindingsResource;\n  readonly privacy: PrivacyResource;\n  readonly me: MeResource;\n  readonly soc: SocResource;";
clientCode = clientCode.replace(/readonly compliance: ComplianceResource;/, "readonly compliance: ComplianceResource;" + standardClientFields);

// 5. Inject instantiations in StandardClient
const standardClientInstantiations = "\n    this.tenants = new TenantsResource(this);\n    this.scopes = new ScopesResource(this);\n    this.intelligence = new IntelligenceResource(this);\n    this.evidenceFindings = new EvidenceFindingsResource(this);\n    this.privacy = new PrivacyResource(this);\n    this.me = new MeResource(this);\n    this.soc = new SocResource(this);";
clientCode = clientCode.replace(/this\.compliance = new ComplianceResource\(this\);/, "this.compliance = new ComplianceResource(this);" + standardClientInstantiations);

// 6. Inject methods to existing classes
clientCode = clientCode.replace(
  /class GapAnalysisResource \{([\s\S]*?)^\}/m,
  function(match, content) { return "class GapAnalysisResource {" + content + missingMethods.GapAnalysisResource + "\n}"; }
);
clientCode = clientCode.replace(
  /class SoaResource \{([\s\S]*?)^\}/m,
  function(match, content) { return "class SoaResource {" + content + missingMethods.SoaResource + "\n}"; }
);
clientCode = clientCode.replace(
  /class OrganizationsResource \{([\s\S]*?)^\}/m,
  function(match, content) { return "class OrganizationsResource {" + content + missingMethods.OrganizationsResource + "\n}"; }
);
clientCode = clientCode.replace(
  /class AssessmentsResource \{([\s\S]*?)^\}/m,
  function(match, content) { return "class AssessmentsResource {" + content + missingMethods.AssessmentsResource + "\n}"; }
);
clientCode = clientCode.replace(
  /class DocumentsResource \{([\s\S]*?)^\}/m,
  function(match, content) { return "class DocumentsResource {" + content + missingMethods.DocumentsResource + "\n}"; }
);

fs.writeFileSync('packages/sdk/src/client.ts', clientCode, 'utf8');

console.log('client.ts patched fully and correctly.');
