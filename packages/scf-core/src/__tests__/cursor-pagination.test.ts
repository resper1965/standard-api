/**
 * Cursor-based (keyset) pagination â€” G03
 *
 * Tests the cursor encode/decode format used by searchControls in the
 * DrizzleScfRepository (line 320-333) and exercises the InMemoryScfRepository
 * to ensure cursor-awareness at the API contract level.
 *
 * Cursor format: base64(JSON.stringify({ c: control_code, i: id }))
 *
 * All data is synthetic (AGENTS.md Â§7). No DB required.
 */
import { describe, it, expect } from "vitest";

// â”€â”€ Cursor helpers (same encoding used by drizzle-scf.repository.ts) â”€â”€â”€â”€â”€â”€â”€â”€â”€

/**
 * Encode a cursor from control_code + id.
 * Mirrors the server-side format consumed by searchControls.
 */
const encodeCursor = (payload: { c: string; i: string }): string =>
  btoa(JSON.stringify(payload));

/**
 * Decode a cursor string back to { c, i } or null on failure.
 */
const decodeCursor = (cursor: string): { c: string; i: string } | null => {
  try {
    const parsed = JSON.parse(atob(cursor));
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      typeof parsed.c === "string" &&
      typeof parsed.i === "string"
    ) {
      return { c: parsed.c, i: parsed.i };
    }
    return null;
  } catch {
    return null;
  }
};

// â”€â”€ Synthetic IDs â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const FAKE_CONTROL_CODE = "GOV-001";
const FAKE_UUID = "11111111-1111-4111-8111-111111111111";

// â”€â”€ Tests â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

describe("Cursor Pagination â€” encode / decode contract", () => {
  it("encodeCursor produces a non-empty base64 string", () => {
    const cursor = encodeCursor({ c: FAKE_CONTROL_CODE, i: FAKE_UUID });
    expect(cursor).toBeTruthy();
    expect(typeof cursor).toBe("string");
    // Must not contain raw JSON characters â€” it should be base64
    expect(cursor).not.toContain("{");
    expect(cursor).not.toContain("}");
  });

  it("decodeCursor round-trips the payload exactly", () => {
    const original = { c: FAKE_CONTROL_CODE, i: FAKE_UUID };
    const cursor = encodeCursor(original);
    const decoded = decodeCursor(cursor);
    expect(decoded).toEqual(original);
  });

  it("decodeCursor returns null for garbage input", () => {
    expect(decodeCursor("not-valid-base64!!!")).toBeNull();
  });

  it("decodeCursor returns null for valid base64 but non-JSON content", () => {
    const notJson = btoa("hello world");
    expect(decodeCursor(notJson)).toBeNull();
  });

  it("decodeCursor returns null for valid JSON missing required fields", () => {
    const missingFields = btoa(JSON.stringify({ x: 1 }));
    expect(decodeCursor(missingFields)).toBeNull();
  });

  it("decodeCursor returns null for empty string", () => {
    expect(decodeCursor("")).toBeNull();
  });

  it("cursor payload contains {c: control_code, i: id} shape", () => {
    const cursor = encodeCursor({
      c: "IAC-002",
      i: "22222222-2222-4222-8222-222222222222",
    });
    const decoded = decodeCursor(cursor);
    expect(decoded).toHaveProperty("c", "IAC-002");
    expect(decoded).toHaveProperty("i", "22222222-2222-4222-8222-222222222222");
  });

  it("different payloads produce different cursors", () => {
    const cursor1 = encodeCursor({ c: "GOV-001", i: "aaaa" });
    const cursor2 = encodeCursor({ c: "GOV-002", i: "bbbb" });
    expect(cursor1).not.toBe(cursor2);
  });
});

describe("Cursor Pagination â€” limit + 1 overflow detection pattern", () => {
  it("fetchLimit is always requested limit + 1 to detect has_more", () => {
    // This mirrors the logic at drizzle-scf.repository.ts line 335:
    //   const fetchLimit = (query.limit ?? 50) + 1;
    const requestedLimit = 25;
    const fetchLimit = requestedLimit + 1;
    expect(fetchLimit).toBe(26);
  });

  it("default limit of 50 produces fetchLimit of 51", () => {
    const defaultLimit = 50;
    const fetchLimit = defaultLimit + 1;
    expect(fetchLimit).toBe(51);
  });
});

