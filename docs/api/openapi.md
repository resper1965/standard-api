# Aegis API Contracts

Base funcional: `/api/v1`. `GET /health` também existe fora de versão para health checks de plataforma.

## Endpoints Iniciais

- `GET /health`
- `GET /api/v1/health`
- `POST /api/v1/tenants`
- `GET /api/v1/tenants/:tenantId`
- `PATCH /api/v1/tenants/:tenantId`
- `POST /api/v1/organizations`
- `GET /api/v1/organizations/:organizationId`
- `GET /api/v1/tenants/:tenantId/organizations`
- `POST /api/v1/assessments`
- `GET /api/v1/assessments/:assessmentId`
- `GET /api/v1/organizations/:organizationId/assessments`
- `PATCH /api/v1/assessments/:assessmentId`
- `GET /api/v1/assessments/:assessmentId/status`
- `GET /api/v1/assessments/:assessmentId/timeline`
- `POST /api/v1/assessments/:assessmentId/transitions`
- `GET /api/v1/assessments/:assessmentId/available-transitions`
- `GET /api/v1/assessments/:assessmentId/lifecycle-events`
- `POST /api/v1/assessments/:assessmentId/approvals`
- `GET /api/v1/assessments/:assessmentId/approvals`
- `GET /api/v1/approvals/:approvalId`
- `POST /api/v1/assessments/:assessmentId/artifacts/:artifactType/versions`
- `GET /api/v1/assessments/:assessmentId/artifacts/:artifactType/versions`
- `GET /api/v1/artifacts/:artifactVersionId`
- `POST /api/v1/artifacts/:artifactVersionId/submit-review`
- `POST /api/v1/artifacts/:artifactVersionId/approve`
- `POST /api/v1/artifacts/:artifactVersionId/supersede`
- `POST /api/v1/assessments/:assessmentId/documents`
- `GET /api/v1/assessments/:assessmentId/documents`
- `GET /api/v1/documents/:documentId`
- `GET /api/v1/documents/:documentId/chunks`
- `GET /api/v1/documents/:documentId/jobs`
- `POST /api/v1/documents/:documentId/reprocess`
- `DELETE /api/v1/documents/:documentId`
- `GET /api/v1/assessments/:assessmentId/ingestion-jobs`
- `GET /api/v1/ingestion-jobs/:jobId`
- `POST /api/v1/documents/:documentId/submit-for-embedding`
- `POST /api/v1/assessments/:assessmentId/kb/index`
- `GET /api/v1/assessments/:assessmentId/kb/indexing-jobs`
- `GET /api/v1/kb/indexing-jobs/:jobId`
- `POST /api/v1/kb/indexing-jobs/:jobId/process`
- `POST /api/v1/documents/:documentId/kb/reindex`
- `POST /api/v1/assessments/:assessmentId/kb/search`
- `GET /api/v1/assessments/:assessmentId/kb/vector-references`
- `GET /api/v1/documents/:documentId/kb/vector-references`
- `GET /api/v1/chunks/:chunkId/context?assessment_id=:assessmentId`
- `POST /api/v1/assessments/:assessmentId/scope`
- `GET /api/v1/assessments/:assessmentId/scope`
- `GET /api/v1/scopes/:scopeId`
- `PATCH /api/v1/scopes/:scopeId`
- `POST /api/v1/scopes/:scopeId/submit-review`
- `POST /api/v1/scopes/:scopeId/approve`
- `POST /api/v1/assessments/:assessmentId/soa/draft`
- `GET /api/v1/assessments/:assessmentId/soa`
- `GET /api/v1/soa/:soaVersionId`
- `GET /api/v1/soa/:soaVersionId/items`
- `PATCH /api/v1/soa/items/:soaItemId`
- `POST /api/v1/soa/:soaVersionId/evidence/refresh`
- `POST /api/v1/soa/:soaVersionId/submit-review`
- `POST /api/v1/soa/:soaVersionId/approve`
- `POST /api/v1/soa/:soaVersionId/mark-ingested`
- `POST /api/v1/soa/:soaVersionId/regenerate`
- `GET /api/v1/soa/:soaVersionId/validation`
- `POST /api/v1/assessments/:assessmentId/evidence-analysis/run`
- `GET /api/v1/assessments/:assessmentId/evidence-findings`
- `GET /api/v1/evidence-findings/:evidenceFindingId`
- `POST /api/v1/evidence-findings/:evidenceFindingId/refresh`
- `GET /api/v1/evidence-findings/:evidenceFindingId/sources`
- `POST /api/v1/assessments/:assessmentId/gap-analysis/draft`
- `GET /api/v1/assessments/:assessmentId/gap-analysis`
- `GET /api/v1/gap-analysis/:gapAnalysisVersionId`
- `GET /api/v1/gap-analysis/:gapAnalysisVersionId/findings`
- `GET /api/v1/gap-findings/:gapFindingId`
- `PATCH /api/v1/gap-findings/:gapFindingId`
- `POST /api/v1/gap-analysis/:gapAnalysisVersionId/validate`
- `POST /api/v1/gap-analysis/:gapAnalysisVersionId/submit-review`
- `POST /api/v1/gap-analysis/:gapAnalysisVersionId/approve`
- `POST /api/v1/gap-analysis/:gapAnalysisVersionId/regenerate`
- `POST /api/v1/gap-analysis/:gapAnalysisVersionId/findings/bulk-update`
- `POST /api/v1/assessments/:assessmentId/poam/draft`
- `GET /api/v1/assessments/:assessmentId/poam`
- `GET /api/v1/assessments/:assessmentId/poam-summary`
- `GET /api/v1/poam/:poamVersionId`
- `GET /api/v1/poam/:poamVersionId/items`
- `GET /api/v1/poam/:poamVersionId/summary`
- `GET /api/v1/poam-items/:poamItemId`
- `PATCH /api/v1/poam-items/:poamItemId`
- `GET /api/v1/poam-items/:poamItemId/milestones`
- `POST /api/v1/poam-items/:poamItemId/milestones`
- `PATCH /api/v1/poam-milestones/:milestoneId`
- `POST /api/v1/poam/:poamVersionId/validate`
- `POST /api/v1/poam/:poamVersionId/submit-review`
- `POST /api/v1/poam/:poamVersionId/approve`
- `POST /api/v1/poam/:poamVersionId/regenerate`
- `POST /api/v1/poam/:poamVersionId/items/bulk-update`
- `POST /api/v1/poam/:poamVersionId/dependencies/detect`
- `GET /api/v1/scf/versions`
- `GET /api/v1/scf/versions/:scfVersionId`
- `GET /api/v1/scf/versions/latest`
- `GET /api/v1/scf/versions/:scfVersionId/domains`
- `GET /api/v1/scf/versions/:scfVersionId/controls`
- `GET /api/v1/scf/controls/by-code/:controlCode?version=:scfVersionId`
- `GET /api/v1/scf/frameworks`
- `GET /api/v1/scf/frameworks/:frameworkId`
- `GET /api/v1/scf/controls/:controlId`
- `GET /api/v1/scf/frameworks/:frameworkId/requirements`
- `GET /api/v1/scf/requirements/:requirementId/mappings?scf_version=:scfVersionId`
- `GET /api/v1/scf/controls/:controlId/mappings?framework=:frameworkId`
- `GET /api/v1/scf/frameworks/:frameworkId/coverage?scf_version=:scfVersionId`
- `POST /api/v1/admin/scf/import-runs`
- `GET /api/v1/admin/scf/import-runs`
- `GET /api/v1/admin/scf/import-runs/:importRunId`
- `POST /api/v1/admin/scf/import-runs/:importRunId/dry-run`
- `GET /api/v1/agent-runtime/agents`
- `POST /api/v1/assessments/:assessmentId/agent-runs`
- `GET /api/v1/assessments/:assessmentId/agent-runs`
- `GET /api/v1/agent-runs/:agentRunId`
- `POST /api/v1/agent-runs/:agentRunId/tool-calls`
- `POST /api/v1/agent-runs/:agentRunId/complete`
- `GET /api/v1/assessments/:assessmentId/audit-logs`
- `GET /api/v1/audit-logs/:auditLogId`
- `GET /api/v1/admin/security-events`
- `GET /api/v1/admin/security-events/:securityEventId`
- `GET /api/v1/assessments/:assessmentId/metrics`
- `GET /api/v1/admin/metrics/operational`
- `GET /api/v1/assessments/:assessmentId/usage`
- `GET /api/v1/tenants/:tenantId/usage`
- `GET /api/v1/admin/usage`

## Requests e Responses Principais

`POST /api/v1/assessments`:

```json
{
  "organization_id": "uuid",
  "name": "Assessment name",
  "scf_version_id": "uuid",
  "document_count": 0
}
```

Response:

```json
{
  "assessment_id": "uuid",
  "tenant_id": "uuid",
  "organization_id": "uuid",
  "name": "Assessment name",
  "state": "draft",
  "scf_version_id": "uuid",
  "trace_id": "trace-id"
}
```

`POST /api/v1/assessments/:assessmentId/transitions`:

```json
{
  "next_state": "documents_uploaded",
  "reason": "documentos registrados",
  "approval_event_id": "uuid",
  "metadata": {}
}
```

`POST /api/v1/assessments/:assessmentId/approvals`:

```json
{
  "gate": "soa",
  "target_type": "assessment_state",
  "target_id": "uuid",
  "decision": "approved",
  "reason": "approved by reviewer"
}
```

`POST /api/v1/assessments/:assessmentId/artifacts/:artifactType/versions`:

```json
{
  "source_agent_run_id": "uuid",
  "metadata": {}
}
```

`POST /api/v1/assessments/:assessmentId/agent-runs`:

```json
{
  "agent_id": "gap_analyst",
  "agent_version": "0.1.0",
  "prompt_version": "gap-v1",
  "model": "mock-model",
  "framework_id": "uuid",
  "scf_version_id": "uuid",
  "input": {}
}
```

Response:

```json
{
  "agent_run_id": "uuid",
  "tenant_id": "uuid",
  "organization_id": "uuid",
  "assessment_id": "uuid",
  "agent_id": "gap_analyst",
  "agent_version": "0.1.0",
  "prompt_version": "gap-v1",
  "model": "mock-model",
  "input_hash": "sha256:...",
  "status": "running",
  "trace_id": "trace-id"
}
```

`POST /api/v1/agent-runs/:agentRunId/tool-calls`:

```json
{
  "tool_name": "kb_evidence_search",
  "input": {
    "tenant_id": "uuid",
    "organization_id": "uuid",
    "assessment_id": "uuid",
    "framework_id": "uuid",
    "scf_version_id": "uuid",
    "trace_id": "trace-id",
    "query": "policy evidence",
    "top_k": 5
  }
}
```

`POST /api/v1/agent-runs/:agentRunId/complete`:

```json
{
  "output": {
    "summary": "Draft analysis summary.",
    "assumptions": ["Input artifact is approved."],
    "limitations": ["No maturity assessment was available."],
    "sources": ["gap_analysis"],
    "confidence_score": 0.74
  },
  "usage": {
    "model_provider": "mock",
    "prompt_tokens": 100,
    "completion_tokens": 40,
    "embedding_tokens": 0,
    "estimated_cost": 0.01,
    "currency": "USD"
  }
}
```

## Observability, Audit e Usage

Todos os endpoints de observability ficam em `/api/v1`, exigem auth, tenant context e RBAC.

Audit:

- `GET /api/v1/assessments/:assessmentId/audit-logs` exige `audit:read`.
- `GET /api/v1/audit-logs/:auditLogId` exige `audit:read`.

Security events:

- `GET /api/v1/admin/security-events` exige `admin:read`.
- `GET /api/v1/admin/security-events/:securityEventId` exige `admin:read`.

Metrics:

- `GET /api/v1/assessments/:assessmentId/metrics` exige `assessment:read`.
- `GET /api/v1/admin/metrics/operational` exige `admin:read`.

Usage/cost:

- `GET /api/v1/assessments/:assessmentId/usage` exige `assessment:read`.
- `GET /api/v1/tenants/:tenantId/usage` exige `tenant:read` e não permite tenant divergente.
- `GET /api/v1/admin/usage` exige `admin:read`.

Queries aceitas:

- `from`
- `to`
- `limit` entre 1 e 100
- `metric_name` para métricas

Schemas principais:

- `StructuredLogEntry`
- `ObservabilityTraceContext`
- `AuditEvent`
- `SecurityEventRecord`
- `OperationalMetric`
- `UsageRecord`
- `AgentUsageRecord`
- `CostEstimate`

Respostas não retornam `document_text`, `chunk_text`, `prompt`, `completion`, `raw_llm_output`, tokens secretos, signed URLs ou conteúdo integral de cliente.

`POST /api/v1/assessments/:assessmentId/documents`:

Content type: `multipart/form-data`.

Campos:

- `file`: arquivo obrigatório.
- `classification`: opcional.
- `document_type`: opcional.
- `language`: opcional.
- `version_label`: opcional.
- `effective_date`: opcional.

Response:

```json
{
  "document": {
    "document_id": "uuid",
    "tenant_id": "uuid",
    "organization_id": "uuid",
    "assessment_id": "uuid",
    "original_filename": "evidence.txt",
    "normalized_filename": "evidence.txt",
    "storage_provider": "mock_r2",
    "storage_bucket": "aegis-documents-dev",
    "storage_key": "tenants/.../documents/.../evidence.txt",
    "content_hash": "sha256",
    "mime_type": "text/plain",
    "file_size": 128,
    "uploaded_by": "uuid",
    "uploaded_at": "iso-date",
    "classification": "internal",
    "document_type": "policy",
    "language": "pt-BR",
    "status": "queued_for_extraction",
    "trace_id": "trace-id"
  },
  "job": {
    "job_id": "uuid",
    "status": "queued",
    "job_type": "extract_and_chunk"
  },
  "trace_id": "trace-id"
}
```

`GET /api/v1/documents/:documentId/chunks` retorna chunks paginados e não retorna o arquivo original. `POST /api/v1/documents/:documentId/reprocess` cria novo job sem apagar chunks anteriores na estratégia padrão `append_new_chunks`.

## Knowledge Base

Endpoints de KB exigem `tenant_id` e sempre limitam consulta a um `assessment_id`. Resultados são evidências candidatas, não conclusões de controle.

`POST /api/v1/assessments/:assessmentId/kb/index`:

```json
{
  "document_id": "uuid-opcional",
  "force_reindex": false
}
```

Response:

```json
{
  "assessment_id": "uuid",
  "queued_job_ids": ["uuid"],
  "vector_reference_ids": ["uuid"],
  "skipped_chunk_ids": [],
  "trace_id": "trace-id"
}
```

`GET /api/v1/assessments/:assessmentId/kb/indexing-jobs` retorna jobs de embedding do assessment. `GET /api/v1/kb/indexing-jobs/:jobId` retorna o status de um job específico.

`POST /api/v1/documents/:documentId/kb/reindex`:

```json
{
  "reason": "mudança de modelo de embedding",
  "force_reindex": true
}
```

`POST /api/v1/assessments/:assessmentId/kb/search`:

```json
{
  "query": "controle de acesso",
  "search_type": "semantic",
  "filters": {
    "document_type": "policy",
    "document_id": "uuid-opcional"
  },
  "top_k": 5,
  "include_context": false
}
```

`top_k` é limitado a `20`. O texto integral da consulta não é gravado em logs; o serviço registra `query_hash`.

Response:

```json
{
  "assessment_id": "uuid",
  "search_type": "semantic",
  "candidate_evidence": true,
  "warning": "KB results are candidate evidence only. They do not determine compliance, maturity, or official SCF mappings.",
  "data": [
    {
      "tenant_id": "uuid",
      "organization_id": "uuid",
      "assessment_id": "uuid",
      "document_id": "uuid",
      "chunk_id": "uuid",
      "vector_reference_id": "uuid",
      "score": 0.91,
      "snippet": "Trecho sintético curto...",
      "page_number": 1,
      "document_type": "policy",
      "document_title": "kb-evidence.txt",
      "retrieval_method": "vector",
      "candidate_evidence": true,
      "trace_id": "trace-id"
    }
  ],
  "trace_id": "trace-id"
}
```

`GET /api/v1/assessments/:assessmentId/kb/vector-references` e `GET /api/v1/documents/:documentId/kb/vector-references` retornam referências vetoriais escopadas ao tenant.

`GET /api/v1/chunks/:chunkId/context?assessment_id=:assessmentId` retorna contexto controlado com snippet curto e IDs anterior/próximo quando disponíveis.

## SCF Data Service

Os endpoints SCF consultam a base normativa estruturada global. Eles não exigem `tenant_id`, porque SCF oficial não é dado de cliente. Endpoints admin exigem `x-aegis-actor-id` no placeholder atual.

`GET /api/v1/scf/versions/latest`:

```json
{
  "scf_version_id": "20000000-0000-4000-8000-000000000001",
  "version_label": "synthetic-2026.0-test",
  "release_date": "2026-01-01",
  "source_hash": "sha256:synthetic-scf-fixture",
  "import_status": "succeeded",
  "is_synthetic": true,
  "trace_id": "trace-id"
}
```

`GET /api/v1/scf/controls/:controlId`:

```json
{
  "control_id": "20000000-0000-4000-8000-000000000201",
  "scf_version_id": "20000000-0000-4000-8000-000000000001",
  "scf_domain_id": "20000000-0000-4000-8000-000000000101",
  "control_code": "GOV-001",
  "control_title": "Synthetic governance policy",
  "control_description": "Synthetic/test control. Not official SCF content.",
  "status": "active",
  "is_synthetic": true,
  "trace_id": "trace-id"
}
```

`GET /api/v1/scf/requirements/:requirementId/mappings?scf_version=:scfVersionId`:

```json
{
  "data": [
    {
      "id": "20000000-0000-4000-8000-000000000501",
      "scf_version_id": "20000000-0000-4000-8000-000000000001",
      "scf_framework_id": "20000000-0000-4000-8000-000000000301",
      "scf_framework_requirement_id": "20000000-0000-4000-8000-000000000401",
      "scf_control_id": "20000000-0000-4000-8000-000000000201",
      "relationship_type": "related",
      "relationship_strength": "source-defined",
      "mapping_source": "synthetic/test fixture",
      "is_official": true,
      "status": "active",
      "is_synthetic": true,
      "control_code": "GOV-001",
      "requirement_code": "SYNTH-1.1"
    }
  ],
  "scf_version_id": "20000000-0000-4000-8000-000000000001",
  "trace_id": "trace-id"
}
```

`GET /api/v1/scf/frameworks/:frameworkId/coverage?scf_version=:scfVersionId`:

```json
{
  "framework_id": "20000000-0000-4000-8000-000000000301",
  "scf_version_id": "20000000-0000-4000-8000-000000000001",
  "requirement_count": 2,
  "mapped_requirement_count": 2,
  "control_count": 2,
  "official_mapping_count": 2,
  "is_synthetic": true,
  "trace_id": "trace-id"
}
```

`POST /api/v1/admin/scf/import-runs` aceita fonte estruturada:

```json
{
  "source_type": "csv",
  "source_filename": "scf.csv",
  "version_label": "scf-version",
  "content": "record_type,id,version_label..."
}
```

O MVP suporta CSV estruturado para testes e registra import run com `source_hash`, `status`, `import_statistics`, `error_summary_safe` e `trace_id`. XLSX e OSCAL JSON estão modelados como extension points, ainda não implementados.

## Scope e Statement of Applicability

`POST /api/v1/assessments/:assessmentId/scope` cria escopo draft:

```json
{
  "title": "Synthetic ISO scope",
  "description": "Synthetic scope for API tests",
  "business_units": ["Security"],
  "systems": ["IAM"],
  "exclusions": [],
  "assumptions": ["Synthetic only"]
}
```

Resposta principal:

```json
{
  "scope_id": "uuid",
  "tenant_id": "uuid",
  "organization_id": "uuid",
  "assessment_id": "uuid",
  "scope_version": 1,
  "status": "draft",
  "title": "Synthetic ISO scope",
  "trace_id": "trace-id"
}
```

`POST /api/v1/assessments/:assessmentId/soa/draft` cria uma SoA draft a partir de framework + SCF version:

```json
{
  "framework_id": "uuid",
  "scf_version_id": "uuid",
  "source_scope_id": "uuid"
}
```

Cada item preserva `framework_requirement_id`, `scf_control_id` quando houver mapping oficial, `source_mapping_id`, `relationship_type` e `relationship_strength`. Requisitos sem mapping oficial retornam `mapping_status: "no_official_mapping"` e `applicability_status: "requires_validation"`; a API não inventa controles SCF.

`PATCH /api/v1/soa/items/:soaItemId` aceita decisões de aplicabilidade:

```json
{
  "applicability_status": "not_applicable",
  "non_applicability_rationale": "Synthetic justification"
}
```

Validações obrigatórias:

- `not_applicable` exige `non_applicability_rationale`.
- `out_of_scope` exige `scope_rationale`.
- `confidence_score` deve ficar entre 0 e 1.
- versões `approved` são imutáveis.

`POST /api/v1/soa/:soaVersionId/evidence/refresh` consulta a KB limitada ao `assessment_id` e retorna evidências como candidatas. `candidate_evidence` nunca é conclusão de implementação, não aplicabilidade ou gap. Ausência de evidência vira `not_evidenced`/`requires_validation`, nunca `not_applicable`.

`POST /api/v1/soa/:soaVersionId/approve` exige `approval_event_id` humano previamente criado para gate `soa` em `POST /api/v1/assessments/:assessmentId/approvals`. Aprovação sem `actor_id`, sem `trace_id` ou sem approval event válido é bloqueada.

Após aprovação, a SoA fica pronta para reingestão no KB. O contrato atual expõe `POST /api/v1/soa/:soaVersionId/mark-ingested` e o serviço interno mantém `metadata.soa_ingestion_status`.

## Evidence Analysis e Gap Analysis

Evidence Analysis e Gap Analysis exigem SoA aprovada. A KB é usada apenas como fonte de evidências candidatas; vector search não é fonte normativa e não cria conclusão de compliance.

`POST /api/v1/assessments/:assessmentId/evidence-analysis/run`:

```json
{
  "soa_version_id": "uuid"
}
```

Response:

```json
{
  "assessment_id": "uuid",
  "soa_version_id": "uuid",
  "findings": [
    {
      "evidence_finding_id": "uuid",
      "soa_item_id": "uuid",
      "framework_requirement_id": "uuid",
      "scf_control_id": "uuid",
      "evidence_strength": "absent",
      "evidence_status": "not_evidenced",
      "evidence_summary": "No candidate evidence was found in the KB search.",
      "evidence_limitations": ["Absence of evidence is not evidence of non-implementation."],
      "confidence_score": 0,
      "trace_id": "trace-id"
    }
  ],
  "trace_id": "trace-id"
}
```

`GET /api/v1/assessments/:assessmentId/evidence-findings` lista findings pagináveis por assessment. `GET /api/v1/evidence-findings/:evidenceFindingId/sources` retorna apenas fontes curtas:

```json
{
  "data": [
    {
      "evidence_source_id": "uuid",
      "document_id": "uuid",
      "chunk_id": "uuid",
      "vector_reference_id": "uuid",
      "snippet": "Trecho sintético curto...",
      "retrieval_score": 0.82,
      "retrieval_method": "vector",
      "candidate_evidence": true
    }
  ],
  "trace_id": "trace-id"
}
```

`POST /api/v1/assessments/:assessmentId/gap-analysis/draft`:

```json
{
  "soa_version_id": "uuid"
}
```

Response:

```json
{
  "gap_analysis_version_id": "uuid",
  "assessment_id": "uuid",
  "version_number": 1,
  "status": "draft",
  "source_soa_version_id": "uuid",
  "framework_id": "uuid",
  "scf_version_id": "uuid",
  "trace_id": "trace-id"
}
```

`GET /api/v1/gap-analysis/:gapAnalysisVersionId/findings?limit=50&offset=0` retorna achados com paginação:

```json
{
  "data": [
    {
      "gap_finding_id": "uuid",
      "soa_item_id": "uuid",
      "framework_requirement_id": "uuid",
      "scf_control_id": "uuid",
      "evidence_finding_id": "uuid",
      "gap_code": "GAP-001",
      "assessment_status": "not_evidenced",
      "gap_type": "evidence_gap",
      "severity": "medium",
      "gap_summary": "No sufficient evidence was found for an applicable SoA item.",
      "recommendation_summary": "Request or upload evidence before concluding implementation status.",
      "requires_user_validation": true
    }
  ],
  "pagination": {
    "limit": 50,
    "offset": 0,
    "total": 1
  },
  "trace_id": "trace-id"
}
```

`PATCH /api/v1/gap-findings/:gapFindingId` permite ajustes durante draft ou review:

```json
{
  "assessment_status": "not_met",
  "gap_rationale": "Synthetic explicit negative evidence",
  "severity": "high"
}
```

Validações obrigatórias:

- `not_met` exige `gap_rationale`.
- `met` exige evidência ou justificativa explícita.
- `not_evidenced` representa ausência de evidência, não ausência de implementação.
- versões `approved` são imutáveis.

`POST /api/v1/gap-analysis/:gapAnalysisVersionId/submit-review` valida findings e muda status para `under_review`.

`POST /api/v1/gap-analysis/:gapAnalysisVersionId/approve` exige `approval_event_id` humano do gate `gap_analysis` e `x-aegis-actor-id`:

```json
{
  "approval_event_id": "uuid"
}
```

## POA&M

POA&M é derivado de Gap Analysis aprovado. O workflow não usa vector search como fonte normativa, não cria ações sem vínculo com gap/requisito/controle e não aprova plano automaticamente.

`POST /api/v1/assessments/:assessmentId/poam/draft`:

```json
{
  "gap_analysis_version_id": "uuid",
  "maturity_assessment_version_id": "uuid",
  "include_optional_improvements": false
}
```

Response:

```json
{
  "poam_version_id": "uuid",
  "assessment_id": "uuid",
  "version_number": 1,
  "status": "draft",
  "source_gap_analysis_version_id": "uuid",
  "source_maturity_assessment_version_id": "uuid",
  "framework_id": "uuid",
  "scf_version_id": "uuid",
  "metadata": {
    "limitations": []
  },
  "trace_id": "trace-id"
}
```

Se não houver Maturity Assessment disponível, o draft ainda pode ser criado com base no Gap Analysis aprovado e registra a limitação em `metadata.limitations`.

`GET /api/v1/poam/:poamVersionId/items?limit=50&offset=0&priority=high&status=draft&action_type=evidence_collection` retorna itens paginados:

```json
{
  "data": [
    {
      "poam_item_id": "uuid",
      "related_gap_finding_id": "uuid",
      "soa_item_id": "uuid",
      "framework_requirement_id": "uuid",
      "scf_control_id": "uuid",
      "poam_code": "POAM-001",
      "corrective_action": "Collect and validate missing evidence for GAP-001 before concluding implementation status.",
      "action_type": "evidence_collection",
      "priority": "high",
      "severity": "medium",
      "risk_rating": "medium severity / evidence_gap / maturity not available",
      "effort_estimate": "small",
      "owner_role": "compliance_owner",
      "due_date": "2026-06-27",
      "expected_evidence": ["Accepted evidence artifact linked to the related SoA item."],
      "acceptance_criteria": ["Related gap GAP-001 is addressed or explicitly risk accepted."],
      "status": "draft",
      "requires_user_validation": true
    }
  ],
  "pagination": {
    "limit": 50,
    "offset": 0,
    "total": 1
  },
  "trace_id": "trace-id"
}
```

`PATCH /api/v1/poam-items/:poamItemId` permite ajuste humano enquanto a versão não está `approved`:

```json
{
  "suggested_owner": "security.lead@example.invalid",
  "due_date": "2026-07-15",
  "expected_evidence": ["Synthetic ticket reference", "Reviewer acceptance note"],
  "acceptance_criteria": ["Evidence is accepted by reviewer"]
}
```

`GET /api/v1/poam-items/:poamItemId/milestones`, `POST /api/v1/poam-items/:poamItemId/milestones` e `PATCH /api/v1/poam-milestones/:milestoneId` gerenciam marcos vinculados ao item. Milestones também ficam bloqueados quando a versão POA&M já está aprovada.

Validações obrigatórias:

- `poam_item` deve ter `related_gap_finding_id`, salvo exceção administrativa justificada.
- `corrective_action`, `expected_evidence` e `acceptance_criteria` são obrigatórios.
- `owner_role` ou `suggested_owner` é obrigatório para revisão/aprovação.
- `validation_required` exige `requires_user_validation = true`.
- versões `approved` são imutáveis.

`POST /api/v1/poam/:poamVersionId/submit-review` valida itens e muda status para `under_review`.

`POST /api/v1/poam/:poamVersionId/approve` exige `approval_event_id` humano do gate `poam` e `x-aegis-actor-id`:

```json
{
  "approval_event_id": "uuid"
}
```

`GET /api/v1/poam/:poamVersionId/summary` e `GET /api/v1/assessments/:assessmentId/poam-summary` retornam agregações por prioridade, status e action type.

## Reporting e Exports

Endpoints de reports:

- `POST /api/v1/assessments/:assessmentId/reports/draft`
- `GET /api/v1/assessments/:assessmentId/reports`
- `GET /api/v1/reports/:reportVersionId`
- `GET /api/v1/reports/:reportVersionId/sections`
- `GET /api/v1/reports/:reportVersionId/artifacts`
- `POST /api/v1/reports/:reportVersionId/validate`
- `POST /api/v1/reports/:reportVersionId/render`
- `POST /api/v1/reports/:reportVersionId/submit-review`
- `POST /api/v1/reports/:reportVersionId/approve`
- `POST /api/v1/reports/:reportVersionId/regenerate`

Endpoints de artifacts e exports:

- `GET /api/v1/report-artifacts/:artifactId`
- `GET /api/v1/report-artifacts/:artifactId/download-url`
- `POST /api/v1/assessments/:assessmentId/exports`
- `GET /api/v1/assessments/:assessmentId/exports`
- `GET /api/v1/export-jobs/:exportJobId`
- `POST /api/v1/reports/:reportVersionId/exports/:format`

Criar draft:

```json
{
  "report_type": "full_assessment_report",
  "title": "Synthetic Aegis Assessment Report"
}
```

Resposta sintética:

```json
{
  "report_version_id": "uuid",
  "tenant_id": "uuid",
  "organization_id": "uuid",
  "assessment_id": "uuid",
  "version_number": 1,
  "status": "draft",
  "report_type": "full_assessment_report",
  "title": "Synthetic Aegis Assessment Report",
  "source_soa_version_id": "uuid",
  "source_gap_analysis_version_id": "uuid",
  "source_poam_version_id": "uuid",
  "framework_id": "uuid",
  "scf_version_id": "uuid",
  "trace_id": "trace-id",
  "metadata": {
    "limitations": ["Maturity Assessment not available or not approved; maturity sections are marked as limitation."],
    "assumptions": ["Report content is derived from approved lifecycle artifacts and synthetic test fixtures in this MVP."],
    "source_status": {
      "soa": "approved",
      "gap_analysis": "approved",
      "poam": "approved"
    }
  }
}
```

Render:

```json
{
  "format": "markdown",
  "store_artifact": true
}
```

Resposta:

```json
{
  "rendered": {
    "report_version_id": "uuid",
    "artifact_type": "report",
    "format": "markdown",
    "mime_type": "text/markdown",
    "content": "# Synthetic Aegis Assessment Report\n...",
    "trace_id": "trace-id"
  },
  "artifact": {
    "report_artifact_id": "uuid",
    "artifact_type": "report",
    "format": "markdown",
    "storage_provider": "r2_compatible_mock",
    "storage_bucket": "aegis-reporting-local",
    "storage_key": "tenants/{tenant}/organizations/{org}/assessments/{assessment}/reports/{report}/report.markdown",
    "content_hash": "64-char-sha256",
    "file_size": 1234,
    "mime_type": "text/markdown"
  }
}
```

Regras:

- `full_assessment_report` exige SoA e Gap Analysis aprovados.
- Maturity e POA&M ausentes são permitidos no MVP apenas com limitação registrada.
- Relatórios aprovados são imutáveis.
- Aprovação exige `approval_event_id` do gate `report` e `x-aegis-actor-id`.
- Artifacts registram `content_hash` e storage key tenant-scoped.
- Evidências aparecem como índice/referência segura, não como documento completo.
- DOCX/PDF retornam placeholder documentado até existir renderer server-side.

## Workflow Orchestration

Endpoints de workflow:

- `POST /api/v1/assessments/:assessmentId/workflows/lifecycle/start`
- `GET /api/v1/assessments/:assessmentId/workflows/lifecycle`
- `GET /api/v1/workflows/:workflowRunId`
- `POST /api/v1/workflows/:workflowRunId/cancel`
- `POST /api/v1/workflows/:workflowRunId/resume`
- `POST /api/v1/workflows/:workflowRunId/signals`

Start:

```json
{
  "requested_by": "44444444-4444-4444-8444-444444444444",
  "idempotency_key": "workflow-start-0001",
  "options": {}
}
```

Resposta:

```json
{
  "workflow_run_id": "uuid",
  "status": "waiting_for_input",
  "idempotency_key": "workflow-start-0001",
  "created_at": "2026-04-28T20:00:00.000Z",
  "updated_at": "2026-04-28T20:00:00.000Z",
  "state": {
    "tenant_id": "uuid",
    "organization_id": "uuid",
    "assessment_id": "uuid",
    "current_step": "wait_for_documents",
    "assessment_state": "documents_uploaded",
    "trace_id": "trace-id",
    "started_at": "2026-04-28T20:00:00.000Z",
    "updated_at": "2026-04-28T20:00:00.000Z"
  }
}
```

Signal genérico:

```json
{
  "signal_type": "framework_selected",
  "actor_id": "44444444-4444-4444-8444-444444444444",
  "idempotency_key": "signal-framework-0001",
  "payload": {
    "framework_id": "66666666-6666-4666-8666-666666666666",
    "scf_version_id": "55555555-5555-4555-8555-555555555555"
  }
}
```

Signal de approval:

```json
{
  "signal_type": "soa_approved",
  "actor_id": "44444444-4444-4444-8444-444444444444",
  "approval_event_id": "77777777-7777-4777-8777-777777777777",
  "idempotency_key": "signal-soa-0001",
  "payload": {}
}
```

Resposta de signal:

```json
{
  "workflow_run_id": "uuid",
  "accepted": true,
  "status": "waiting_for_approval",
  "current_step": "wait_for_gap_approval",
  "pending_approval_type": "gap_analysis",
  "trace_id": "trace-id"
}
```

Cancel:

```json
{
  "actor_id": "44444444-4444-4444-8444-444444444444",
  "reason": "Synthetic cancellation reason.",
  "idempotency_key": "cancel-0001"
}
```

Resume:

```json
{
  "actor_id": "44444444-4444-4444-8444-444444444444",
  "reason": "Configuration fixed.",
  "idempotency_key": "resume-0001",
  "from_step": "wait_for_framework_selection"
}
```

Schemas de workflow:

- `WorkflowRunStatus`: `pending`, `running`, `waiting_for_input`, `waiting_for_approval`, `blocked`, `failed`, `cancelled`, `completed`.
- `WorkflowSignalType`: `framework_selected`, `scope_approved`, `soa_approved`, `gap_analysis_approved`, `maturity_approved`, `poam_approved`, `report_approved`, `assessment_cancelled`, `assessment_blocked`, `assessment_resumed`.
- `WorkflowBlockedReason`: `missing_tenant_context`, `missing_assessment`, `duplicate_active_workflow`, `waiting_for_documents`, `waiting_for_framework_selection`, `approval_event_invalid`, `business_prerequisite_missing`, `manual_intervention_required`, `cancelled_by_actor`.

Regras:

- Todos os endpoints exigem tenant context.
- Start exige actor context e `idempotency_key`.
- Não há workflow duplicado ativo por assessment.
- Signals de approval validam `approval_event_id` no gate correto antes de avançar.
- O workflow chama o Assessment Engine para transições e não aprova artefatos automaticamente.
- `trace_id` é preservado em state, responses e audit events.

## Segurança, Auth e RBAC

Headers de desenvolvimento/teste:

- `x-aegis-tenant-id`: tenant context para dados de cliente.
- `x-aegis-actor-id`: actor context.
- `Authorization: Bearer dev:<role>`: placeholder local para role específica.

`mock_dev` é placeholder e deve ser bloqueado em produção.

Schemas compartilhados:

- `AuthContext`
- `ActorType`
- `AuthMethod`
- `SecurityTenantContext`
- `Role`
- `Permission`
- `AccessDecision`
- `AccessDeniedReason`
- `PolicyInput`
- `PolicyResult`
- `ApiKeyScope`
- `ServiceAccount`
- `SecurityEvent`
- `FileSecurityPolicy`
- `FileValidationSecurityResult`
- `PromptContentTrustLevel`
- `ToolUsePolicy`

Roles iniciais:

- `platform_admin`
- `tenant_admin`
- `organization_admin`
- `assessment_owner`
- `assessor`
- `reviewer`
- `approver`
- `auditor_readonly`
- `integration_service`
- `support_readonly`
- `system`

Rotas críticas com permissões explícitas no MVP:

- `POST /api/v1/assessments/:assessmentId/documents` exige `document:upload`.
- `POST /api/v1/documents/:documentId/reprocess` exige `document:reprocess`.
- `POST /api/v1/assessments/:assessmentId/kb/index` exige `kb:index`.
- `POST /api/v1/assessments/:assessmentId/kb/search` exige `kb:search`.
- `POST /api/v1/assessments/:assessmentId/agent-runs` exige `agent:run`.
- `GET /api/v1/assessments/:assessmentId/agent-runs` exige `agent:read_runs`.
- `POST /api/v1/assessments/:assessmentId/workflows/lifecycle/start` exige `assessment:run_workflow`.
- `POST /api/v1/workflows/:workflowRunId/cancel` exige `assessment:cancel`.
- `POST /api/v1/workflows/:workflowRunId/resume` exige `assessment:run_workflow`.
- `POST /api/v1/workflows/:workflowRunId/signals` exige `assessment:run_workflow`.
- `GET /api/v1/report-artifacts/:artifactId/download-url` exige `report:download`.
- `POST /api/v1/admin/scf/import-runs` exige `scf:import`.

Approvals exigem permissão por gate:

- SoA: `soa:approve`
- Gap Analysis: `gap:approve`
- Maturity: `maturity:approve`
- POA&M: `poam:approve`
- Report: `report:approve`

Exemplo de erro sem auth:

```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Auth context is required for this operation.",
    "details": [],
    "trace_id": "trace-id"
  }
}
```

Exemplo de erro sem permissão:

```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "Permission denied.",
    "details": [
      {
        "reason": "permission_missing",
        "required_permissions": ["kb:search"]
      }
    ],
    "trace_id": "trace-id"
  }
}
```

Upload security:

- tamanho máximo de 10 MB;
- extensões permitidas: PDF, DOCX, TXT, Markdown, CSV e JSON;
- MIME validation;
- content hash;
- filename normalization contra path traversal;
- malware scan placeholder;
- quarantine flag para rejeições.

Prompt security:

- conteúdo de KB/documentos deve ser tratado como `untrusted_evidence`;
- conteúdo recuperado não pode alterar instruções, tools ou permissões;
- KB não substitui SCF estruturado;
- Agent Runtime mantém allowlist fora do prompt.

## Erros Padronizados

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request body.",
    "details": [],
    "trace_id": "trace-id"
  }
}
```

Códigos mínimos implementados: `VALIDATION_ERROR`, `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `CONFLICT`, `INVALID_STATE_TRANSITION`, `APPROVAL_REQUIRED`, `ARTIFACT_IMMUTABLE`, `TENANT_CONTEXT_REQUIRED`, `UNSUPPORTED_MEDIA_TYPE`, `FILE_TOO_LARGE`, `NON_APPLICABILITY_RATIONALE_REQUIRED`, `SCOPE_RATIONALE_REQUIRED`, `SOA_REVIEW_BLOCKED`, `SOA_VERSION_IMMUTABLE`, `APPROVED_SOA_REQUIRED`, `EVIDENCE_FINDING_NOT_FOUND`, `GAP_ANALYSIS_NOT_FOUND`, `GAP_FINDING_NOT_FOUND`, `GAP_ANALYSIS_IMMUTABLE`, `GAP_RATIONALE_REQUIRED`, `GAP_REVIEW_BLOCKED`, `GAP_APPROVAL_BLOCKED`, `APPROVED_GAP_ANALYSIS_REQUIRED`, `POAM_NOT_FOUND`, `POAM_ITEM_NOT_FOUND`, `POAM_MILESTONE_NOT_FOUND`, `POAM_IMMUTABLE`, `POAM_REVIEW_BLOCKED`, `POAM_APPROVAL_BLOCKED`, `POAM_CONTEXT_REQUIRED`, `POAM_ACTOR_REQUIRED`, `REPORT_NOT_FOUND`, `REPORT_ARTIFACT_NOT_FOUND`, `EXPORT_JOB_NOT_FOUND`, `REPORT_CONTEXT_REQUIRED`, `REPORT_ACTOR_REQUIRED`, `REPORT_IMMUTABLE`, `REPORT_REVIEW_BLOCKED`, `REPORT_APPROVAL_BLOCKED`, `REPORT_FORMAT_NOT_IMPLEMENTED`, `EXPORT_JOB_FAILED`, `APPROVAL_EVENT_REQUIRED`, `ACTOR_REQUIRED`, `NOT_IMPLEMENTED`, `INTERNAL_ERROR`.

## Limitações de Upload

O limite atual do MVP é 10 MB por arquivo. Tipos aceitos no contrato: PDF, DOCX, TXT, Markdown, CSV e JSON. TXT/Markdown/CSV/JSON possuem extração inicial. PDF/DOCX exigem adapter externo futuro para extração real.

## Versionamento

Todos os endpoints funcionais começam em `/api/v1`. Novas versões devem ser adicionadas em paralelo, sem quebrar contratos existentes.

## Ainda Não Implementado

SCF usa fixture sintética marcada como `is_synthetic` no gateway local. KB usa embeddings e vector store mock no ambiente local. SoA, Gap Analysis, POA&M, Reporting e Workflow Orchestration usam repositórios in-memory no gateway local. A classificação inicial de evidência, a priorização inicial do POA&M e a composição inicial de reports são conservadoras e heurísticas. O pacote `packages/maturity` ainda não está implementado; POA&M, Reporting e Workflow Orchestration modelam o gate de maturidade, mas a lógica especializada futura deverá viver em `packages/maturity`. Auth, RBAC, tenancy por hostname/JWT/API key, persistência PostgreSQL real para SCF/KB/SoA/Gap/POA&M/Reporting/Workflow, signed upload URL, importador XLSX/OSCAL oficial, PDF/DOCX extraction/rendering real, Cloudflare Vectorize real, Workers AI real, AI Gateway, rate limiting, Cloudflare Workflow execution persistida e audit log persistente ainda estão pendentes.
