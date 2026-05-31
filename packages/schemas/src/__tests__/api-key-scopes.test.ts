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
