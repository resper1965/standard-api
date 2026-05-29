# Design Doc: SCF Control Cross-Mapping Endpoint

This document details the design and specification for the new REST API endpoint to map SCF controls to other regulatory frameworks.

## 1. Requirements

- **Endpoint Route**: `GET /api/v1/scf/controls/:scf_control_id/mappings`
- **Path Parameter**: `:scf_control_id` accepts SCF control codes (e.g. `"IAC-01"`, `"SEC-04"`).
- **Query Parameters**:
  - `?framework=` (Optional): Filters mappings case-insensitively by framework name or identifier slug.
  - `?version=` (Optional): Version of the SCF catalog. Defaults to the latest version.
- **Security**: Must pass through Bearer Token authentication (`protected: true`) and tenant validation (`tenantRequired: true`).
- **Response Format**:
  ```json
  {
    "scf_control_id": "IAC-01",
    "scf_control_title": "...",
    "mappings": [
      {
        "framework": "ISO/IEC 27001:2022",
        "control_id": "A.8.8",
        "control_title": "Management of technical vulnerabilities",
        "control_description": "Information about technical vulnerabilities...",
        "mapping_type": "Direct"
      }
    ]
  }
  ```

## 2. Database & Repository Layer Design

### 2.1 Interface Definition (`packages/scf-core/src/repositories/scf.repository.ts`)
```typescript
export type ScfCrossMappingItem = {
  framework: string;
  control_id: string;
  control_title: string;
  control_description: string;
  mapping_type: string;
};

export type ScfControlCrossMapping = {
  scf_control_id: string;
  scf_control_title: string;
  mappings: ScfCrossMappingItem[];
};

// Interface addition:
getControlCrossMappings(versionId: string, controlCode: string, frameworkFilter?: string): Promise<ScfControlCrossMapping | null>;
```

### 2.2 Drizzle ORM implementation (`packages/scf-core/src/repositories/drizzle-scf.repository.ts`)
Queries the database by joining:
- `scf_controls`
- `scf_mappings`
- `scf_framework_requirements`
- `scf_frameworks`

Filters are delegated to database query filters or matched case-insensitively.

### 2.3 InMemory Repository (`packages/scf-core/src/repositories/scf.repository.ts`)
An in-memory fallback implementation for testing.

## 3. Security & Error Handling

- **401 Unauthorized**: Missing or invalid Bearer token.
- **400 Bad Request**: Missing `x-standard-tenant-id` header (enforced by `tenantRequired: true`).
- **404 Not Found**: Control code does not exist in the requested version.

## 4. Testing Plan

Tests will be added to `apps/api-gateway/tests/scf.test.ts` to assert:
- Successful mapping retrieval.
- Correct framework filtering.
- 404 for invalid control codes.
- 401 and 400 validation failures.
