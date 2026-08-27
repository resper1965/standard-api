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
