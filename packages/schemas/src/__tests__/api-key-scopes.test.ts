/**
 * API Key Scopes — Schema Tests
 *
 * Validates the scope catalogue follows resource:action format,
 * has no duplicates, and validates correctly via Zod.
 *
 * Uses synthetic fixtures only.
 */
import { describe, it, expect } from "vitest";
import { API_KEY_SCOPES, M2mScopeSchema, M2mScopesArraySchema } from "../api-key-scopes";

describe("API_KEY_SCOPES catalogue", () => {
  it("is a non-empty array", () => {
    expect(API_KEY_SCOPES.length).toBeGreaterThan(0);
  });

  it("has no duplicate scopes", () => {
    const unique = new Set(API_KEY_SCOPES);
    expect(unique.size).toBe(API_KEY_SCOPES.length);
  });

  it("all scopes follow resource:action format", () => {
    const pattern = /^[a-z][a-z_]*:[a-z][a-z_]*$/;
    for (const scope of API_KEY_SCOPES) {
      expect(scope, `scope "${scope}" does not match resource:action pattern`).toMatch(pattern);
    }
  });

  it("contains the required standard scopes", () => {
    const required = [
      "assessment:read", "assessment:write", "assessment:transition",
      "document:read", "document:write",
      "scf:read",
      "soa:read", "soa:write",
      "gap:read", "gap:write",
      "poam:read", "poam:write",
      "report:read", "report:write",
      "audit:read",
    ];
    for (const s of required) {
      expect(API_KEY_SCOPES, `missing required scope "${s}"`).toContain(s);
    }
  });
});

describe("M2mScopeSchema (Zod enum)", () => {
  it("accepts valid scope strings", () => {
    for (const scope of API_KEY_SCOPES) {
      expect(() => M2mScopeSchema.parse(scope)).not.toThrow();
    }
  });

  it("rejects unknown scope strings", () => {
    expect(() => M2mScopeSchema.parse("unknown:action")).toThrow();
    expect(() => M2mScopeSchema.parse("")).toThrow();
    expect(() => M2mScopeSchema.parse("admin:all")).toThrow();
  });
});

describe("M2mScopesArraySchema", () => {
  it("rejects empty array (schema requires at least one scope — wildcard is handled at business logic layer, not schema)", () => {
    expect(() => M2mScopesArraySchema.parse([])).toThrow();
  });

  it("accepts a valid subset of scopes", () => {
    expect(() => M2mScopesArraySchema.parse(["assessment:read", "scf:read"])).not.toThrow();
  });

  it("accepts all scopes simultaneously", () => {
    expect(() => M2mScopesArraySchema.parse([...API_KEY_SCOPES])).not.toThrow();
  });

  it("rejects arrays containing any invalid scope", () => {
    expect(() => M2mScopesArraySchema.parse(["assessment:read", "hacked:scope"])).toThrow();
  });
});

// ─── hasRequiredScopes logic tests ─────────────────────────────────

import { hasRequiredScopes } from "../api-key-scopes";

describe("hasRequiredScopes (M4 least privilege)", () => {
  it("returns false for null keyScopes (fail-closed)", () => {
    expect(hasRequiredScopes(null, ["scf:read"])).toBe(false);
  });

  it("returns false for undefined keyScopes (fail-closed)", () => {
    expect(hasRequiredScopes(undefined, ["scf:read"])).toBe(false);
  });

  it("returns false for empty scopes (M4: zero permissions)", () => {
    expect(hasRequiredScopes([], ["scf:read"])).toBe(false);
  });

  it("returns false for empty scopes even with no required scopes", () => {
    // Empty scopes = zero permissions, but no required scopes = open route
    // Edge: this returns false because empty check comes before required check
    expect(hasRequiredScopes([], [])).toBe(false);
  });

  it("returns true when key has all required scopes", () => {
    expect(hasRequiredScopes(["scf:read", "assessment:write"], ["scf:read", "assessment:write"])).toBe(true);
  });

  it("returns true when key has superset of required scopes", () => {
    expect(hasRequiredScopes(["scf:read", "assessment:write", "kb:read"], ["scf:read"])).toBe(true);
  });

  it("returns false when key is missing ONE required scope (every, not some)", () => {
    // This was the old bug: some() would return true because scf:read is present
    expect(hasRequiredScopes(["scf:read"], ["scf:read", "assessment:write"])).toBe(false);
  });

  it("returns false when key has none of the required scopes", () => {
    expect(hasRequiredScopes(["kb:read"], ["scf:read", "assessment:write"])).toBe(false);
  });

  it("returns true when no scopes are required (open route)", () => {
    expect(hasRequiredScopes(["scf:read"], [])).toBe(true);
  });
});
