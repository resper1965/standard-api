const fs = require('fs');

const missingClasses = `
// ── Missing Resources Generated ──────────────────────────────────────────────

export type TenantsResourcePostResponse = paths["/api/v1/tenants"]["post"]["responses"]["201"]["content"]["application/json"];
export type TenantsResourceGetResponse = paths["/api/v1/tenants/{organizationId}"]["get"]["responses"]["200"]["content"]["application/json"];
export type TenantsResourceListResponse = paths["/api/v1/tenants"]["get"]["responses"]["200"]["content"]["application/json"];

class TenantsResource {
  constructor(private client: StandardClient) {}

  list(opts?: RequestOptions) {
    return this.client._get<TenantsResourceListResponse>("/tenants", opts);
  }
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

const clientCode = fs.readFileSync('packages/sdk/src/client.ts', 'utf8');

// Append new classes before the helper functions
const modifiedCode = clientCode.replace(/\/\/ ── Helper ──────────────────────────────────────────────────/g, missingClasses + '\n// ── Helper ──────────────────────────────────────────────────');

fs.writeFileSync('packages/sdk/src/client.ts', modifiedCode, 'utf8');

console.log('Classes added.');
