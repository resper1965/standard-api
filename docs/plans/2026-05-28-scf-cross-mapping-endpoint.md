# SCF Control Cross-Mapping Endpoint Implementation Plan

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Implement a new REST endpoint `/api/v1/scf/controls/:scf_control_id/mappings` that performs cross-mapping of SCF controls to other regulatory frameworks with query parameter filters for framework and version, under Bearer Token authentication and organization context headers.

**Architecture:** We will implement an optimized join query in the Drizzle repository layer to fetch mappings and destination framework details in one roundtrip. We will also update the interface and InMemory repository to keep tests working, implement the Hono router endpoint with security tags, and write unit/integration tests verifying all behavior.

**Tech Stack:** TypeScript, Drizzle ORM, Hono, Zod, Vitest.

---

### Task 1: Update ScfRepository Interface and InMemory Implementation

**Files:**
- Modify: `packages/scf-core/src/repositories/scf.repository.ts`

**Step 1: Write the failing test**
Run typecheck to ensure it fails when signature is missing (or update tests that check repository shape if any).
For compile-time TDD, we can check types.

**Step 2: Add type definitions and method to `ScfRepository`**
Modify `packages/scf-core/src/repositories/scf.repository.ts` to add the following code:
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
```
And add to `ScfRepository` type:
```typescript
  getControlCrossMappings(versionId: string, controlCode: string, frameworkFilter?: string): Promise<ScfControlCrossMapping | null>;
```

**Step 3: Implement mock in `createInMemoryScfRepository`**
Modify `packages/scf-core/src/repositories/scf.repository.ts` around line 95 to add:
```typescript
    getControlCrossMappings: async (versionId, controlCode, frameworkFilter) => {
      const control = [...controls.values()].find(
        (c) => c.scf_version_id === versionId && c.control_code.toLowerCase() === controlCode.toLowerCase()
      );
      if (!control) return null;

      const list = [...mappings.values()].filter(
        (m) => m.scf_version_id === versionId && m.scf_control_id === control.id
      );

      const items: ScfCrossMappingItem[] = [];
      for (const m of list) {
        const req = requirements.get(m.scf_framework_requirement_id);
        if (!req) continue;
        const fw = frameworks.get(req.scf_framework_id);
        if (!fw) continue;

        items.push({
          framework: fw.name,
          control_id: req.requirement_code,
          control_title: req.title,
          control_description: req.description ?? "",
          mapping_type: m.relationship_type
        });
      }

      let filtered = items;
      if (frameworkFilter) {
        const filterLower = frameworkFilter.toLowerCase();
        filtered = items.filter(i => {
          const req = [...requirements.values()].find(r => r.requirement_code === i.control_id);
          const fw = req ? frameworks.get(req.scf_framework_id) : null;
          return i.framework.toLowerCase().includes(filterLower) || 
            (fw && fw.framework_code.toLowerCase().includes(filterLower));
        });
      }

      return {
        scf_control_id: control.control_code,
        scf_control_title: control.control_title,
        mappings: filtered
      };
    }
```

**Step 4: Run typecheck to verify**
Run: `pnpm typecheck`
Expected: Success

**Step 5: Commit**
```bash
git add packages/scf-core/src/repositories/scf.repository.ts
git commit -m "feat(scf): add getControlCrossMappings to ScfRepository interface and mock"
```

---

### Task 2: Implement Drizzle Repository Method

**Files:**
- Modify: `packages/scf-core/src/repositories/drizzle-scf.repository.ts`

**Step 1: Implement `getControlCrossMappings` method**
Modify `packages/scf-core/src/repositories/drizzle-scf.repository.ts` to add the implementation:
```typescript
  getControlCrossMappings: async (versionId, controlCode, frameworkFilter) => {
    const [control] = await db.select()
      .from(scfControls)
      .where(and(
        eq(scfControls.scfVersionId, versionId),
        eq(sql`LOWER(${scfControls.controlCode})`, controlCode.toLowerCase())
      ))
      .limit(1);

    if (!control) return null;

    const rows = await db.select({
      frameworkName: scfFrameworks.name,
      frameworkId: scfFrameworks.frameworkId,
      requirementCode: scfFrameworkRequirements.requirementCode,
      requirementTitle: scfFrameworkRequirements.title,
      requirementDescription: scfFrameworkRequirements.description,
      relationshipType: scfMappings.relationshipType
    })
    .from(scfMappings)
    .innerJoin(scfFrameworkRequirements, eq(scfMappings.scfFrameworkRequirementId, scfFrameworkRequirements.id))
    .innerJoin(scfFrameworks, eq(scfFrameworkRequirements.scfFrameworkId, scfFrameworks.id))
    .where(and(
      eq(scfMappings.scfControlId, control.id),
      eq(scfMappings.scfVersionId, versionId)
    ));

    let mappings = rows.map(r => ({
      framework: r.frameworkName,
      control_id: r.requirementCode,
      control_title: r.requirementTitle,
      control_description: r.requirementDescription ?? "",
      mapping_type: r.relationshipType
    }));

    if (frameworkFilter) {
      const filterLower = frameworkFilter.toLowerCase();
      mappings = mappings.filter((m, index) => {
        const originalRow = rows[index];
        return m.framework.toLowerCase().includes(filterLower) ||
          originalRow.frameworkId.toLowerCase().includes(filterLower);
      });
    }

    return {
      scf_control_id: control.controlCode,
      scf_control_title: control.title,
      mappings
    };
  }
```

**Step 2: Run typecheck to verify**
Run: `pnpm typecheck`
Expected: Success

**Step 3: Commit**
```bash
git add packages/scf-core/src/repositories/drizzle-scf.repository.ts
git commit -m "feat(scf): implement drizzle scf control cross-mappings query"
```

---

### Task 3: Implement Hono Route Handler

**Files:**
- Modify: `apps/api-gateway/src/routes/scf.routes.ts`

**Step 1: Write Route Definition**
Add route `/api/v1/scf/controls/:scf_control_id/mappings` to `apiKeysRoutes` list in `apps/api-gateway/src/routes/scf.routes.ts` before the `/api/v1/scf/controls/:controlId/mappings` route (to prevent path conflicts).
Specify `protected: true` and `tenantRequired: true`.

```typescript
  {
    method: "GET",
    path: "/api/v1/scf/controls/:scf_control_id/mappings",
    protected: true,
    tenantRequired: true,
    handler: async (context) => {
      const { scf_control_id } = context.params;
      const url = new URL(context.request.url);
      const frameworkFilter = url.searchParams.get("framework") ?? undefined;
      const versionQuery = url.searchParams.get("version") ?? undefined;

      let versionId = versionQuery;
      if (!versionId) {
        const latestVersion = await context.deps.scf.versions.getLatestVersion();
        if (!latestVersion) {
          throw new ApiError("NOT_FOUND", "No SCF versions found in database.", 404);
        }
        versionId = latestVersion.scf_version_id;
      }

      const result = await context.deps.scf.controls.getControlCrossMappings(
        versionId,
        scf_control_id!,
        frameworkFilter
      );

      if (!result) {
        throw new ApiError("NOT_FOUND", `SCF control '${scf_control_id}' not found.`, 404);
      }

      return json({
        ...result,
        trace_id: context.traceId
      });
    }
  },
```

**Step 2: Run typecheck to verify**
Run: `pnpm typecheck`
Expected: Success

**Step 3: Commit**
```bash
git add apps/api-gateway/src/routes/scf.routes.ts
git commit -m "feat(api-gateway): add get scf control cross-mappings endpoint route"
```

---

### Task 4: Add Unit/Integration Tests

**Files:**
- Modify: `apps/api-gateway/tests/scf.test.ts`

**Step 1: Add new test cases**
Open `apps/api-gateway/tests/scf.test.ts` and append the test suite:
```typescript
test("SCF cross-mappings endpoint - Success: returns mappings for existing control", async () => {
  const client = createTestClient();
  const result = await client.send(
    `/api/v1/scf/controls/GOV-001/mappings?version=${SYNTHETIC_SCF_VERSION_ID}`,
    "GET",
    undefined,
    {
      "x-standard-actor-id": ids.actorId,
      "x-standard-tenant-id": ids.organizationId
    }
  );

  expect(result.response.status).toBe(200);
  expect(result.body.scf_control_id).toBe("GOV-001");
  expect(result.body.scf_control_title).toBeDefined();
  expect(Array.isArray(result.body.mappings)).toBe(true);
  expect(result.body.mappings.length).toBeGreaterThan(0);
  expect(result.body.mappings[0].framework).toBeDefined();
  expect(result.body.mappings[0].control_id).toBeDefined();
});

test("SCF cross-mappings endpoint - Success: filters by framework query parameter", async () => {
  const client = createTestClient();
  const result = await client.send(
    `/api/v1/scf/controls/GOV-001/mappings?version=${SYNTHETIC_SCF_VERSION_ID}&framework=synthetic`,
    "GET",
    undefined,
    {
      "x-standard-actor-id": ids.actorId,
      "x-standard-tenant-id": ids.organizationId
    }
  );

  expect(result.response.status).toBe(200);
  expect(result.body.mappings.every((m: any) => m.framework.toLowerCase().includes("synthetic"))).toBe(true);
});

test("SCF cross-mappings endpoint - Error: returns 404 for non-existent control code", async () => {
  const client = createTestClient();
  const result = await client.send(
    `/api/v1/scf/controls/INVALID-999/mappings?version=${SYNTHETIC_SCF_VERSION_ID}`,
    "GET",
    undefined,
    {
      "x-standard-actor-id": ids.actorId,
      "x-standard-tenant-id": ids.organizationId
    }
  );

  expect(result.response.status).toBe(404);
  expect(result.body.error.code).toBe("NOT_FOUND");
});

test("SCF cross-mappings endpoint - Error: returns 401 for unauthenticated requests", async () => {
  const client = createTestClient();
  const result = await client.send(
    `/api/v1/scf/controls/GOV-001/mappings?version=${SYNTHETIC_SCF_VERSION_ID}`,
    "GET",
    undefined,
    {
      "x-standard-tenant-id": ids.organizationId
    }
  );

  expect(result.response.status).toBe(401);
});

test("SCF cross-mappings endpoint - Error: returns 400 when organization context is missing", async () => {
  const client = createTestClient();
  const result = await client.send(
    `/api/v1/scf/controls/GOV-001/mappings?version=${SYNTHETIC_SCF_VERSION_ID}`,
    "GET",
    undefined,
    {
      "x-standard-actor-id": ids.actorId
    }
  );

  expect(result.response.status).toBe(400);
  expect(result.body.error.code).toBe("TENANT_CONTEXT_REQUIRED");
});
```

**Step 2: Run the test suite**
Run: `pnpm --filter @standard/api-gateway test`
Expected: All tests pass

**Step 3: Commit**
```bash
git add apps/api-gateway/tests/scf.test.ts
git commit -m "test(api-gateway): add integration tests for scf cross-mapping endpoint"
```
