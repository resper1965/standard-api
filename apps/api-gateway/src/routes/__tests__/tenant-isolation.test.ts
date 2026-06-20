import { describe, it, expect } from "vitest";
import { assertTenantOwnership } from "../assessments.routes";
import { ApiError } from "../../errors/api-error";

describe("Tenant Isolation Enforcement", () => {
  it("should allow access when resourceTenantId matches resolvedTenantId", () => {
    expect(() => {
      assertTenantOwnership("org-123", "org-123", "Assessment");
    }).not.toThrow();
  });

  it("should deny access when resourceTenantId does NOT match resolvedTenantId", () => {
    try {
      assertTenantOwnership("org-999", "org-123", "Assessment");
      expect.fail("Should have thrown ApiError");
    } catch (e: any) {
      expect(e).toBeInstanceOf(ApiError);
      expect(e.status).toBe(403);
      expect(e.message).toBe(
        "Assessment does not belong to the current tenant.",
      );
    }
  });

  it("should deny access when resourceTenantId is null (data anomaly)", () => {
    try {
      assertTenantOwnership(null, "org-123", "Assessment");
      expect.fail("Should have thrown ApiError");
    } catch (e: any) {
      expect(e).toBeInstanceOf(ApiError);
      expect(e.status).toBe(403);
    }
  });

  it("should deny access when resourceTenantId is undefined (data anomaly)", () => {
    try {
      assertTenantOwnership(undefined, "org-123", "Assessment");
      expect.fail("Should have thrown ApiError");
    } catch (e: any) {
      expect(e).toBeInstanceOf(ApiError);
      expect(e.status).toBe(403);
    }
  });
});
