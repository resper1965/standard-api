import { describe, expect, test } from "vitest";
import { createTestClient, ids } from "./helpers";

describe("API Hardening & Connection Tests", () => {
  const client = createTestClient();

  describe("Authentication Hardening", () => {
    test("Should reject unauthenticated requests with 401", async () => {
      // Intentionally omitting x-standard-actor-id
      const { response, body } = await client.send("/api/v1/scf/versions/latest/controls", "GET", undefined, {
        "x-standard-tenant-id": ids.organizationId
      });
      expect(response.status).toBe(401);
      expect(body.error?.code).toBe("UNAUTHORIZED");
    });

    test("Should allow authenticated requests", async () => {
      const { response } = await client.send("/api/v1/scf/versions/latest/controls", "GET", undefined, {
        "x-standard-tenant-id": ids.organizationId,
        "x-standard-actor-id": ids.actorId
      });
      // It should return 200 (if latest is found) or 404 (if no versions exist in mock).
      // Crucially, it must NOT return 500.
      expect([200, 404]).toContain(response.status);
    });
  });

  describe("Path Traversal & UUID Validation (Fix 'latest' alias)", () => {
    const authHeaders = {
      "x-standard-tenant-id": ids.organizationId,
      "x-standard-actor-id": ids.actorId
    };

    test("Should correctly resolve /latest without 500", async () => {
      const { response } = await client.send("/api/v1/scf/versions/latest/controls", "GET", undefined, authHeaders);
      expect([200, 404]).toContain(response.status);
    });

    test("Should handle invalid UUID gracefully (400 or 404, not 500)", async () => {
      const { response } = await client.send("/api/v1/scf/versions/invalid-uuid-string/controls", "GET", undefined, authHeaders);
      expect([400, 404]).toContain(response.status);
    });
  });

  describe("Payload & Input Fuzzing", () => {
    const authHeaders = {
      "x-standard-tenant-id": ids.organizationId,
      "x-standard-actor-id": ids.actorId
    };

    test("Should not crash with SQL injection characters in search queries", async () => {
      const payloads = [
        "' OR 1=1 --",
        "\"; DROP TABLE scf_versions; --",
        "<script>alert(1)</script>"
      ];

      for (const payload of payloads) {
        const { response } = await client.send(`/api/v1/scf/versions/latest/controls?q=${encodeURIComponent(payload)}`, "GET", undefined, authHeaders);
        // It shouldn't crash with 500. 
        expect([200, 404]).toContain(response.status);
      }
    });

    test("Should enforce pagination limits and handle negative/huge limits", async () => {
      // Drizzle limits usually handle massive numbers or return empty, but let's check it doesn't crash
      const queries = [
        "?limit=9999999",
        "?limit=-1",
        "?limit=0",
        "?limit=NaN",
        "?limit=A"
      ];

      for (const query of queries) {
        const { response } = await client.send(`/api/v1/scf/versions/latest/controls${query}`, "GET", undefined, authHeaders);
        expect(response.status).not.toBe(500);
      }
    });
  });
});
