const fs = require('fs');

const missingMethods = {
  GapAnalysisResource: "  validate(versionId: string, opts?: RequestOptions) { return this.client._post<any>('/gap-analysis/' + versionId + '/validate', undefined, opts); }\n  regenerate(versionId: string, opts?: RequestOptions) { return this.client._post<any>('/gap-analysis/' + versionId + '/regenerate', undefined, opts); }\n  bulkUpdateFindings(versionId: string, data: any, opts?: RequestOptions) { return this.client._post<any>('/gap-analysis/' + versionId + '/findings/bulk-update', data, opts); }\n  evaluateEvidence(data: any, opts?: RequestOptions) { return this.client._post<any>('/gap/evaluate-evidence', data, opts); }\n  evaluateEvidenceBatch(data: any, opts?: RequestOptions) { return this.client._post<any>('/gap/evaluate-evidence/batch', data, opts); }\n",
  SoaResource: "  refreshEvidence(versionId: string, opts?: RequestOptions) { return this.client._post<any>('/soa/' + versionId + '/evidence/refresh', undefined, opts); }\n  markIngested(versionId: string, opts?: RequestOptions) { return this.client._post<any>('/soa/' + versionId + '/mark-ingested', undefined, opts); }\n  markIngestionRequired(versionId: string, opts?: RequestOptions) { return this.client._post<any>('/soa/' + versionId + '/mark-ingestion-required', undefined, opts); }\n  regenerate(versionId: string, opts?: RequestOptions) { return this.client._post<any>('/soa/' + versionId + '/regenerate', undefined, opts); }\n  updateItem(itemId: string, data: any, opts?: RequestOptions) { return this.client._patch<any>('/soa/items/' + itemId, data, opts); }\n",
  OrganizationsResource: "  update(orgId: string, data: any, opts?: RequestOptions) { return this.client._patch<any>('/organizations/' + orgId, data, opts); }\n  deleteOrg(orgId: string, opts?: RequestOptions) { return this.client._delete<any>('/organizations/' + orgId, opts); }\n",
  AssessmentsResource: "  automationRules(id: string, opts?: RequestOptions) { return this.client._get<any>('/assessments/' + id + '/automation-rules', opts); }\n  updateAutomationRules(id: string, data: any, opts?: RequestOptions) { return this.client._put<any>('/assessments/' + id + '/automation-rules', data, opts); }\n  newCycle(id: string, data: any, opts?: RequestOptions) { return this.client._post<any>('/assessments/' + id + '/new-cycle', data, opts); }\n  live(id: string, opts?: RequestOptions) { return this.client._get<any>('/assessments/' + id + '/live', opts); }\n  runEvidenceAnalysis(id: string, data: any, opts?: RequestOptions) { return this.client._post<any>('/assessments/' + id + '/evidence-analysis/run', data, opts); }\n",
  DocumentsResource: "  submitForEmbedding(docId: string, opts?: RequestOptions) { return this.client._post<any>('/documents/' + docId + '/submit-for-embedding', undefined, opts); }\n"
};

let clientCode = fs.readFileSync('packages/sdk/src/client.ts', 'utf8');

clientCode = clientCode.replace(
  /class GapAnalysisResource \{([\s\S]*?)^\}/m,
  function(match, content) { return "class GapAnalysisResource {" + content + missingMethods.GapAnalysisResource + "}"; }
);

clientCode = clientCode.replace(
  /class SoaResource \{([\s\S]*?)^\}/m,
  function(match, content) { return "class SoaResource {" + content + missingMethods.SoaResource + "}"; }
);

clientCode = clientCode.replace(
  /class OrganizationsResource \{([\s\S]*?)^\}/m,
  function(match, content) { return "class OrganizationsResource {" + content + missingMethods.OrganizationsResource + "}"; }
);

clientCode = clientCode.replace(
  /class AssessmentsResource \{([\s\S]*?)^\}/m,
  function(match, content) { return "class AssessmentsResource {" + content + missingMethods.AssessmentsResource + "}"; }
);

clientCode = clientCode.replace(
  /class DocumentsResource \{([\s\S]*?)^\}/m,
  function(match, content) { return "class DocumentsResource {" + content + missingMethods.DocumentsResource + "}"; }
);

// Inject variable declarations into StandardClient
const standardClientFields = "\n  readonly tenants: TenantsResource;\n  readonly scopes: ScopesResource;\n  readonly intelligence: IntelligenceResource;\n  readonly evidenceFindings: EvidenceFindingsResource;\n  readonly privacy: PrivacyResource;\n  readonly me: MeResource;\n  readonly soc: SocResource;";
clientCode = clientCode.replace(/readonly compliance: ComplianceResource;/, "readonly compliance: ComplianceResource;" + standardClientFields);

// Inject instantiations into StandardClient constructor
const standardClientInstantiations = "\n    this.tenants = new TenantsResource(this);\n    this.scopes = new ScopesResource(this);\n    this.intelligence = new IntelligenceResource(this);\n    this.evidenceFindings = new EvidenceFindingsResource(this);\n    this.privacy = new PrivacyResource(this);\n    this.me = new MeResource(this);\n    this.soc = new SocResource(this);";
clientCode = clientCode.replace(/this\.compliance = new ComplianceResource\(this\);/, "this.compliance = new ComplianceResource(this);" + standardClientInstantiations);

// Add imports at top
if (!clientCode.includes('import type { paths }')) {
  clientCode = clientCode.replace(/import type \{/, 'import type { paths } from "./api-types.js";\nimport type {');
}

fs.writeFileSync('packages/sdk/src/client.ts', clientCode, 'utf8');

console.log('Methods and StandardClient updated properly.');
