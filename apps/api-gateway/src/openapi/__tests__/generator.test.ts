import { describe, expect, it } from "vitest";
import type { RouteDefinition } from "../../http";
import { synthesizeOperation, tagForPath } from "../generator";

const route = (over: Partial<RouteDefinition> = {}): RouteDefinition =>
  ({
    method: "GET",
    path: "/api/v1/scf/versions/:versionId/controls",
    protected: true,
    handler: async () => new Response(null),
    ...over,
  }) as RouteDefinition;

describe("tagForPath", () => {
  it("groups by the resource segment, not the version prefix", () => {
    expect(tagForPath("/api/v1/assessments/:id")).toBe("assessments");
  });

  it("upper-cases the SCF acronym", () => {
    expect(tagForPath("/api/v1/scf/versions")).toBe("SCF");
  });

  it("turns a hyphenated segment into words", () => {
    expect(tagForPath("/api/v1/risk-register/:id")).toBe("risk register");
  });

  it("falls back to the first segment for unversioned paths", () => {
    expect(tagForPath("/health")).toBe("health");
    expect(tagForPath("/llms-full.txt")).toBe("llms full.txt");
  });

  it("never yields an empty tag for the root path", () => {
    expect(tagForPath("/")).toBe("root");
  });
});

describe("synthesizeOperation", () => {
  it("declares every path parameter it is given", () => {
    const op = synthesizeOperation(
      route(),
      "/api/v1/scf/versions/{versionId}/controls",
    ) as any;

    expect(Object.keys(op.request.params.shape)).toEqual(["versionId"]);
  });

  it("omits the request block when the path has no parameters", () => {
    const op = synthesizeOperation(
      route({ path: "/api/v1/scf/versions" }),
      "/api/v1/scf/versions",
    ) as any;

    expect(op.request).toBeUndefined();
  });

  it("names the permissions the route already declares", () => {
    const op = synthesizeOperation(
      route({ permissions: ["assessment:read", "scf:read"] as any }),
      "/api/v1/scf/versions",
    ) as any;

    expect(op.description).toContain("assessment:read, scf:read");
  });

  // A route that opts out of auth must not inherit the global BearerApiKey
  // requirement, or the spec would tell clients to authenticate against
  // endpoints that reject credentials.
  it("clears security only for routes that are both unprotected and unauthenticated", () => {
    const open = synthesizeOperation(
      route({ protected: false, authRequired: false }),
      "/health",
    ) as any;
    expect(open.security).toEqual([]);

    const closed = synthesizeOperation(route(), "/api/v1/scf/versions") as any;
    expect(closed.security).toBeUndefined();
  });

  it("carries the 403 the scope middleware can raise", () => {
    const op = synthesizeOperation(route(), "/api/v1/scf/versions") as any;
    expect(Object.keys(op.responses)).toContain("403");
  });
});

describe("RESPONSE_SCHEMAS", () => {
  // A renamed route would leave its key orphaned here and the endpoint would
  // silently fall back to the generic response — documented, but shapeless,
  // and nothing would fail. This is that alarm.
  // Importing app.ts pulls in the whole route table and every module behind
  // it, which takes ~4.5s here - close enough to the 5s default that the test
  // passed alone and timed out inside the full suite. The work is real, so
  // the timeout is raised rather than the assertion weakened.
  it(
    "keys every entry to a route that exists",
    { timeout: 30_000 },
    async () => {
      const { RESPONSE_SCHEMAS } = await import("../response-schemas");
      const { routes } = await import("../../app");

      const real = new Set(
        (routes as { method: string; path: string }[]).map(
          (r) => `${r.method.toUpperCase()} ${r.path}`,
        ),
      );
      const orphans = Object.keys(RESPONSE_SCHEMAS).filter((k) => !real.has(k));

      expect(orphans).toEqual([]);
    },
  );
});

describe("FIELD_DOCS", () => {
  // A renamed component or field would leave the documentation pointing at
  // nothing, and the spec would quietly lose it. annotateFields reports what
  // it could not place.
  it("places every entry on a component that exists", async () => {
    const { annotateFields, FIELD_DOCS } = await import("../generator");

    const spec = {
      components: {
        schemas: Object.entries(FIELD_DOCS).reduce<Record<string, any>>(
          (acc, [key]) => {
            const [component, field] = key.split(".");
            acc[component as string] ??= { properties: {} };
            acc[component as string].properties[field as string] = {
              type: "string",
            };
            return acc;
          },
          {},
        ),
      },
    };

    expect(annotateFields(spec)).toEqual([]);
  });

  it("reports a key it could not place instead of dropping it", async () => {
    const { annotateFields } = await import("../generator");
    expect(
      annotateFields({ components: { schemas: {} } }).length,
    ).toBeGreaterThanOrEqual(1);
  });
});

type PermissionedRoute = {
  method: string;
  path: string;
  permissions?: string[];
};

/** Either a scope a key can hold, or an explicit "no key qualifies". */
const namesScope = (description: string): boolean =>
  description.includes("API keys need scope(s):") ||
  description.includes("restricted to human actors");

const describesAuth = (description: string): boolean =>
  description.includes("Requires permission(s):") && namesScope(description);

const operationFor = (spec: any, route: PermissionedRoute) =>
  spec.paths?.[route.path.replace(/:([a-zA-Z0-9_]+)/g, "{$1}")]?.[
    route.method.toLowerCase()
  ];

describe("authorization clause", () => {
  // A customer could not work out which scope to request, because the clause
  // reached only synthesized operations and named the permission rather than
  // the scope their key carries. Both halves are asserted here: every route
  // that declares permissions says so, and says which scope satisfies it.
  it("documents permission and scope for every route that needs one", async () => {
    const { registerRoutesForOpenApi, generateOpenApiSpec } =
      await import("../generator");
    const { routes } = await import("../../app");

    registerRoutesForOpenApi(routes as any);
    const spec = generateOpenApiSpec() as any;

    const mute = (routes as PermissionedRoute[])
      .filter((route) => route.permissions?.length)
      .filter(
        (route) => !describesAuth(operationFor(spec, route)?.description ?? ""),
      )
      .map((route) => `${route.method} ${route.path}`);

    expect(mute).toEqual([]);
  }, 30_000);
});

describe("routes with no declared permission", () => {
  // A route that is protected but declares no permission has nothing to derive
  // a scope from, so scope.middleware fails closed and every API key gets a
  // 403. The spec said nothing about these, and a customer read that silence
  // as "open to any valid key" before hitting the 403 on GET /regulations.
  //
  // The 119 below are the backlog as of 2026-08-27. They are listed rather
  // than counted so that fixing one is a visible deletion, and so that a NEW
  // one fails this test instead of joining a number nobody reads. The
  // authorization-clause test above cannot catch them: it only checks routes
  // that DO declare permissions.
  //
  // To fix one: give the route the permission it actually needs and delete its
  // line here. Never add a line to make this test pass.
  const KNOWN_WITHOUT_PERMISSION = [
    "DELETE /api/v1/assessments/:id/risk-register/:entryId",
    "DELETE /api/v1/auth/sessions/others",
    "DELETE /api/v1/privacy/processing-activities/:id",
    "DELETE /api/v1/privacy/processing-activities/:id/data-categories/:categoryId",
    "DELETE /api/v1/privacy/processing-activities/:id/data-subjects/:subjectId",
    "DELETE /api/v1/privacy/processing-activities/:id/third-parties/:partyId",
    "GET /api/v1/agent-runs/:jobId",
    "GET /api/v1/assessments/:assessmentId/risk-exposure",
    "GET /api/v1/assessments/:id/maturity-targets",
    "GET /api/v1/assessments/:id/risk-register",
    "GET /api/v1/assessments/:id/risk-register/:entryId",
    "GET /api/v1/assessments/:id/risk-register/export",
    "GET /api/v1/assessments/templates",
    "GET /api/v1/assessments/templates/:templateId",
    "GET /api/v1/dpmp/domains",
    "GET /api/v1/dpmp/frameworks",
    "GET /api/v1/dpmp/frameworks/:frameworkId/principles",
    "GET /api/v1/dpmp/principles",
    "GET /api/v1/dpmp/principles/:principleId",
    "GET /api/v1/flow-templates",
    "GET /api/v1/flow-templates/:templateId",
    "GET /api/v1/flow-templates/scf-mapping",
    "GET /api/v1/governance/bg-check-types",
    "GET /api/v1/governance/clearance-levels",
    "GET /api/v1/governance/departments",
    "GET /api/v1/governance/maturity-levels",
    "GET /api/v1/privacy/processing-activities",
    "GET /api/v1/privacy/processing-activities/:id",
    "GET /api/v1/privacy/processing-activities/:id/completeness",
    "GET /api/v1/privacy/processing-activities/:id/data-categories",
    "GET /api/v1/privacy/processing-activities/:id/data-subjects",
    "GET /api/v1/privacy/processing-activities/:id/field-reviews",
    "GET /api/v1/privacy/processing-activities/:id/report",
    "GET /api/v1/privacy/processing-activities/:id/screenings",
    "GET /api/v1/privacy/processing-activities/:id/third-parties",
    "GET /api/v1/reference-data/bg-check-types",
    "GET /api/v1/reference-data/clearance-levels",
    "GET /api/v1/reference-data/collection-methods",
    "GET /api/v1/reference-data/data-categories",
    "GET /api/v1/reference-data/data-origins",
    "GET /api/v1/reference-data/data-subjects",
    "GET /api/v1/reference-data/departments",
    "GET /api/v1/reference-data/disposal-methods",
    "GET /api/v1/reference-data/life-cycle-stages",
    "GET /api/v1/reference-data/maturity-levels",
    "GET /api/v1/reference-data/processing-purposes",
    "GET /api/v1/reference-data/retention-rules",
    "GET /api/v1/reference-data/risk-factors",
    "GET /api/v1/reference-data/security-measures",
    "GET /api/v1/reference-data/volume-scale",
    "GET /api/v1/regulations",
    "GET /api/v1/regulations/:regulationId",
    "GET /api/v1/regulations/:regulationId/breach-rules",
    "GET /api/v1/regulations/:regulationId/consent",
    "GET /api/v1/regulations/:regulationId/dpia-triggers",
    "GET /api/v1/regulations/:regulationId/dsar-statuses",
    "GET /api/v1/regulations/:regulationId/legal-bases",
    "GET /api/v1/regulations/:regulationId/penalties",
    "GET /api/v1/regulations/:regulationId/rights",
    "GET /api/v1/regulations/:regulationId/transfer-mechanisms",
    "GET /api/v1/risk-catalog",
    "GET /api/v1/risk-catalog/:riskId",
    "GET /api/v1/risk/categories",
    "GET /api/v1/risk/controls/:riskId",
    "GET /api/v1/risk/kris",
    "GET /api/v1/risk/methodologies",
    "GET /api/v1/risk/methodologies/:methodId",
    "GET /api/v1/risk/methodologies/:methodId/matrix",
    "GET /api/v1/risk/methodology",
    "GET /api/v1/risk/taxonomy",
    "GET /api/v1/risk/taxonomy/:categoryId",
    "GET /api/v1/risk/taxonomy/:categoryId/:riskId",
    "GET /api/v1/risk/treatment-options",
    "GET /api/v1/ropa/collection-methods",
    "GET /api/v1/ropa/data-categories",
    "GET /api/v1/ropa/data-origins",
    "GET /api/v1/ropa/data-subjects",
    "GET /api/v1/ropa/disposal-methods",
    "GET /api/v1/ropa/life-cycle-stages",
    "GET /api/v1/ropa/processing-purposes",
    "GET /api/v1/ropa/retention-rules",
    "GET /api/v1/ropa/risk-factors",
    "GET /api/v1/ropa/security-measures",
    "GET /api/v1/ropa/volume-scale",
    "GET /api/v1/scf/risks",
    "GET /api/v1/scf/risks/:riskId",
    "GET /api/v1/scf/threats",
    "GET /api/v1/scf/threats/:threatId",
    "GET /api/v1/threat-catalog",
    "GET /api/v1/threat-catalog/:threatId",
    "GET /api/v1/tpra/questionnaires",
    "GET /api/v1/tpra/questionnaires/:questionnaireId",
    "GET /api/v1/tpra/questionnaires/:questionnaireId/sections/:sectionId",
    "GET /api/v1/tpra/scf-mapping",
    "GET /api/v1/tpra/tiers",
    "GET /api/v1/users/me",
    "GET /api/v1/workflows/templates",
    "GET /api/v1/workflows/templates/:templateId",
    "PATCH /api/v1/assessments/:id/risk-register/:entryId",
    "POST /api/v1/assessments/:id/risk-register",
    "POST /api/v1/executive/translate-risk",
    "POST /api/v1/optimizer/compliance-strategy",
    "POST /api/v1/poam/architect-remediation",
    "POST /api/v1/privacy/analyze-ropa",
    "POST /api/v1/privacy/assess-dpia",
    "POST /api/v1/privacy/processing-activities",
    "POST /api/v1/privacy/processing-activities/:id/data-categories",
    "POST /api/v1/privacy/processing-activities/:id/data-subjects",
    "POST /api/v1/privacy/processing-activities/:id/field-reviews",
    "POST /api/v1/privacy/processing-activities/:id/screen",
    "POST /api/v1/privacy/processing-activities/:id/status",
    "POST /api/v1/privacy/processing-activities/:id/third-parties",
    "POST /api/v1/privacy/processing-activities/from-text",
    "POST /api/v1/privacy/scan-vendor-contract/batch",
    "POST /api/v1/soc/triage-incident",
    "POST /api/v1/tpra/score",
    "PUT /api/v1/assessments/:id/maturity-targets",
    "PUT /api/v1/privacy/processing-activities/:id",
    "PUT /api/v1/privacy/processing-activities/:id/field-reviews/:reviewId",
  ];

  it("has not grown", async () => {
    const { routes } = await import("../../app");

    const requiresAuth = (route: any) =>
      route.authRequired ??
      (Boolean(route.protected) ||
        Boolean(route.requireActor) ||
        Boolean(route.permissions?.length));

    const actual = (routes as any[])
      .filter((route) => requiresAuth(route) && !route.permissions?.length)
      .map((route) => `${route.method} ${route.path}`)
      .sort();

    const added = actual.filter(
      (route) => !KNOWN_WITHOUT_PERMISSION.includes(route),
    );

    expect(added).toEqual([]);
    expect(actual.length).toBeLessThanOrEqual(KNOWN_WITHOUT_PERMISSION.length);
  }, 30_000);
});
