export const openApiSpec = {
  openapi: "3.1.0",
  info: {
    title: "Aegis API Standard",
    version: "0.1.0",
    description: "Initial API-first contracts for the Aegis SCF-Based Assessment Lifecycle."
  },
  servers: [
    { url: "http://localhost:8787", description: "Local Wrangler API" },
    { url: "https://api.example.com", description: "Placeholder production API" }
  ],
  paths: {
    "/health": { get: { summary: "Service health check" } },
    "/api/v1/health": { get: { summary: "Versioned service health check" } },
    "/api/v1/tenants": { post: { summary: "Create tenant" } },
    "/api/v1/tenants/{tenantId}": {
      get: { summary: "Get tenant" },
      patch: { summary: "Update tenant" }
    },
    "/api/v1/organizations": { post: { summary: "Create organization" } },
    "/api/v1/assessments": { post: { summary: "Create assessment" } },
    "/api/v1/assessments/{assessmentId}/transitions": {
      post: { summary: "Execute assessment lifecycle transition" }
    },
    "/api/v1/assessments/{assessmentId}/approvals": {
      post: { summary: "Create approval event" },
      get: { summary: "List assessment approvals" }
    },
    "/api/v1/assessments/{assessmentId}/artifacts/{artifactType}/versions": {
      post: { summary: "Create artifact version" },
      get: { summary: "List artifact versions" }
    },
    "/api/v1/assessments/{assessmentId}/documents": {
      post: { summary: "Upload and queue assessment document ingestion" },
      get: { summary: "List assessment documents" }
    },
    "/api/v1/documents/{documentId}/chunks": {
      get: { summary: "List document chunks" }
    },
    "/api/v1/documents/{documentId}/reprocess": {
      post: { summary: "Queue document reprocessing" }
    },
    "/api/v1/assessments/{assessmentId}/ingestion-jobs": {
      get: { summary: "List assessment ingestion jobs" }
    },
    "/api/v1/scf/versions": { get: { summary: "List SCF versions placeholder" } }
  }
} as const;
