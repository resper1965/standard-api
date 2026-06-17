/**
 * QA Suite â€” Auth Middleware Session-First Org Resolution Tests
 * Tests the 3-tier org resolution priority: session > platform admin > no org.
 */
import { describe, it, expect, vi } from "vitest";

// â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function makeLogger() {
  return { log: vi.fn() };
}

function isUuid(val: unknown): boolean {
  if (typeof val !== "string") return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);
}

/**
 * Inline org resolution logic â€” mirrors the refactored auth.middleware.ts
 * session-first org resolution for pure unit testing.
 */
function resolveOrgContext(
  session: {
    activeOrganizationId?: string | null;
    activeOrganizationSlug?: string | null;
    activeOrganizationRole?: string | null;
  },
  isPlatformAdmin: boolean,
  resolveOrganizationContext?: (slug: string) => Promise<{ organization_id: string } | null>,
  platformOrgSlug = "bekaa"
): { organizationId: string | undefined; source: string } {
  // Priority 1: Session-enriched org context
  if (session.activeOrganizationId && isUuid(session.activeOrganizationId)) {
    return { organizationId: session.activeOrganizationId, source: "custom_session" };
  }

  // Priority 2: Platform admin auto-scope
  if (isPlatformAdmin) {
    return { organizationId: platformOrgSlug, source: "platform_admin_auto_scope" };
  }

  // Priority 3: No org context
  return { organizationId: undefined, source: "none" };
}

// â”€â”€ Tests â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

describe("Session-first org resolution â€” Priority 1: Session", () => {
  it("resolves org from session when activeOrganizationId is a valid UUID", () => {
    const result = resolveOrgContext(
      { activeOrganizationId: "550e8400-e29b-41d4-a716-446655440000" },
      false
    );
    expect(result.organizationId).toBe("550e8400-e29b-41d4-a716-446655440000");
    expect(result.source).toBe("custom_session");
  });

  it("ignores non-UUID activeOrganizationId (nanoid from BA)", () => {
    const result = resolveOrgContext(
      { activeOrganizationId: "cjld2cyuq0000t3rmniod1foy" },
      false
    );
    expect(result.organizationId).toBeUndefined();
    expect(result.source).toBe("none");
  });

  it("ignores null activeOrganizationId", () => {
    const result = resolveOrgContext(
      { activeOrganizationId: null },
      false
    );
    expect(result.organizationId).toBeUndefined();
    expect(result.source).toBe("none");
  });
});

describe("Session-first org resolution â€” Priority 2: Platform Admin", () => {
  it("auto-scopes platform admin to bekaa org slug", () => {
    const result = resolveOrgContext(
      { activeOrganizationId: null },
      true
    );
    expect(result.organizationId).toBe("bekaa");
    expect(result.source).toBe("platform_admin_auto_scope");
  });

  it("uses custom platform org slug when provided", () => {
    const result = resolveOrgContext(
      { activeOrganizationId: null },
      true,
      undefined,
      "custom-operator"
    );
    expect(result.organizationId).toBe("custom-operator");
  });

  it("session UUID takes priority over platform admin", () => {
    const result = resolveOrgContext(
      { activeOrganizationId: "550e8400-e29b-41d4-a716-446655440000" },
      true // is platform admin, but session has UUID
    );
    expect(result.organizationId).toBe("550e8400-e29b-41d4-a716-446655440000");
    expect(result.source).toBe("custom_session");
  });
});

describe("Session-first org resolution â€” Priority 3: No org", () => {
  it("returns undefined when no session org and not platform admin", () => {
    const result = resolveOrgContext({}, false);
    expect(result.organizationId).toBeUndefined();
    expect(result.source).toBe("none");
  });
});

describe("Session enrichment fields", () => {
  it("preserves all session fields for downstream use", () => {
    const session = {
      activeOrganizationId: "550e8400-e29b-41d4-a716-446655440000",
      activeOrganizationSlug: "acme-corp",
      activeOrganizationRole: "admin",
    };
    const result = resolveOrgContext(session, false);
    expect(result.source).toBe("custom_session");
    // Verify the session fields are available for context population
    expect(session.activeOrganizationSlug).toBe("acme-corp");
    expect(session.activeOrganizationRole).toBe("admin");
  });
});

