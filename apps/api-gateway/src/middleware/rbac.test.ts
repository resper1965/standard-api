/**
 * QA Suite — RBAC Middleware Unit Tests
 * Tests permission resolution for session, M2M scopes, and missing auth contexts.
 * Updated for 2-role model: platform_admin + customer
 */
import { describe, it, expect, vi } from "vitest";

// —— Helpers —————————————————————————————————————————————————————————————

function makeAudit() {
  return { record: vi.fn().mockResolvedValue(undefined) };
}

function makeObservability() {
  return { record: vi.fn().mockResolvedValue(undefined) };
}

function baseContext(overrides: Record<string, unknown> = {}) {
  return {
    organizationId: "org-aaa",
    actorId: "user-001",
    traceId: "trace-001",
    request: { url: "https://api.standard-grc.com/api/v1/assessments" },
    params: {},
    deps: {
      audit: makeAudit(),
      observability: makeObservability(),
      alerts: null,
    },
    ...overrides,
  } as any;
}

// —— Inline RBAC logic (mirrors rbac.middleware.ts for pure unit tests) ——————

type Permission = string;

const STANDARD_ROLE_PERMISSIONS: Record<string, Record<string, string[]>> = {
  platform_admin: {
    assessment: [
      "read",
      "write",
      "delete",
      "approve",
      "create",
      "update",
      "run_workflow",
      "close",
      "cancel",
    ],
    document: ["read", "write", "delete", "upload", "reprocess"],
    approval: ["read", "create"],
    organization: ["read", "update", "create", "delete"],
    admin: ["read", "write", "create", "delete", "approve"],
  },
  customer: {
    assessment: [
      "read",
      "write",
      "delete",
      "approve",
      "create",
      "update",
      "run_workflow",
      "close",
      "cancel",
    ],
    document: ["read", "write", "delete", "upload", "reprocess"],
    approval: ["read", "create"],
    organization: ["read", "update", "create", "delete"],
  },
};

function roleHasPermission(
  role: string,
  resource: string,
  action: string,
): boolean {
  return STANDARD_ROLE_PERMISSIONS[role]?.[resource]?.includes(action) ?? false;
}

function checkRbac(
  ctx: any,
  permissions: Permission[],
): { allowed: boolean; reason: string } {
  if (permissions.length === 0) return { allowed: true, reason: "" };
  if (ctx.session?.user?.platformAdmin) return { allowed: true, reason: "" };

  if (!ctx.auth && !ctx.session && !ctx.m2mScopes) {
    return { allowed: false, reason: "missing_auth_context" };
  }

  if (ctx.m2mScopes) {
    for (const perm of permissions) {
      if (!ctx.m2mScopes.includes(perm))
        return { allowed: false, reason: "permission_missing" };
    }
    return { allowed: true, reason: "" };
  }

  if (ctx.session) {
    // Normalize any raw role to canonical 2-role values (mirrors auth.middleware.ts)
    const rawRole = ctx.session.user?.role ?? "customer";
    const isPlatformAdmin = rawRole === "platform_admin" || rawRole === "admin";
    const role = isPlatformAdmin ? "platform_admin" : "customer";
    for (const perm of permissions) {
      const [resource = "", action = ""] = perm.split(":");
      if (!roleHasPermission(role, resource, action)) {
        return { allowed: false, reason: "permission_missing" };
      }
    }
    return { allowed: true, reason: "" };
  }

  return { allowed: false, reason: "missing_auth_context" };
}

// —— Tests ————————————————————————————————————————————————————————————————————

describe("RBAC — no required permissions", () => {
  it("always allows when permissions list is empty", () => {
    const ctx = baseContext();
    expect(checkRbac(ctx, []).allowed).toBe(true);
  });
});

describe("RBAC — platform admin bypass", () => {
  it("allows platform admin on any permission via platformAdmin flag", () => {
    const ctx = baseContext({
      session: { user: { role: "customer", platformAdmin: true } },
    });
    expect(checkRbac(ctx, ["assessment:delete"]).allowed).toBe(true);
  });
});

describe("RBAC — M2M scopes", () => {
  it("allows when m2mScopes includes the required permission", () => {
    const ctx = baseContext({
      m2mScopes: ["assessment:read", "document:read"],
    });
    expect(checkRbac(ctx, ["assessment:read"]).allowed).toBe(true);
  });

  it("denies when m2mScopes is missing a required permission", () => {
    const ctx = baseContext({ m2mScopes: ["assessment:read"] });
    const result = checkRbac(ctx, ["assessment:write"]);
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("permission_missing");
  });

  it("denies when m2mScopes is empty array", () => {
    const ctx = baseContext({ m2mScopes: [] });
    const result = checkRbac(ctx, ["assessment:read"]);
    expect(result.allowed).toBe(false);
  });
});

describe("RBAC — session-based roles (2-role model)", () => {
  it("customer can delete assessment", () => {
    const ctx = baseContext({
      session: { user: { role: "customer", platformAdmin: false } },
    });
    expect(checkRbac(ctx, ["assessment:delete"]).allowed).toBe(true);
  });

  it("customer can write documents", () => {
    const ctx = baseContext({
      session: { user: { role: "customer", platformAdmin: false } },
    });
    expect(checkRbac(ctx, ["document:write"]).allowed).toBe(true);
  });

  it("customer cannot access admin routes", () => {
    const ctx = baseContext({
      session: { user: { role: "customer", platformAdmin: false } },
    });
    expect(checkRbac(ctx, ["admin:read"]).allowed).toBe(false);
  });

  it("platform_admin can access admin routes", () => {
    const ctx = baseContext({
      session: { user: { role: "platform_admin", platformAdmin: false } },
    });
    expect(checkRbac(ctx, ["admin:read"]).allowed).toBe(true);
  });

  it("normalizes raw 'admin' role to 'platform_admin'", () => {
    const ctx = baseContext({
      session: { user: { role: "admin", platformAdmin: false } },
    });
    expect(checkRbac(ctx, ["admin:approve"]).allowed).toBe(true);
  });

  it("normalizes unknown role to 'customer'", () => {
    const ctx = baseContext({
      session: { user: { role: "superadmin_custom", platformAdmin: false } },
    });
    expect(checkRbac(ctx, ["assessment:read"]).allowed).toBe(true);
  });

  it("normalizes missing role to 'customer'", () => {
    const ctx = baseContext({ session: { user: { platformAdmin: false } } });
    expect(checkRbac(ctx, ["assessment:read"]).allowed).toBe(true);
  });
});

describe("RBAC — missing auth context", () => {
  it("denies when no auth, session, or m2mScopes", () => {
    const ctx = baseContext(); // no auth/session/m2mScopes
    const result = checkRbac(ctx, ["assessment:read"]);
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("missing_auth_context");
  });
});

describe("RBAC — approval gate permissions", () => {
  it("customer can approve assessments", () => {
    const ctx = baseContext({
      session: { user: { role: "customer", platformAdmin: false } },
    });
    expect(checkRbac(ctx, ["assessment:approve"]).allowed).toBe(true);
  });

  it("platform_admin can approve assessments", () => {
    const ctx = baseContext({
      session: { user: { role: "platform_admin", platformAdmin: false } },
    });
    expect(checkRbac(ctx, ["assessment:approve"]).allowed).toBe(true);
  });
});
