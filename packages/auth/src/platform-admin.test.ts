/**
 * Platform Admin helpers — Unit Tests
 *
 * Garante a "fonte única de verdade" para os emails sempre-admin:
 * parsing de PLATFORM_ADMIN_EMAILS, normalização e match case-insensitive.
 */
import { describe, it, expect } from "vitest";
import {
  DEFAULT_PLATFORM_ADMIN_EMAILS,
  parsePlatformAdminEmails,
  isPlatformAdminEmail,
} from "./auth";

describe("parsePlatformAdminEmails", () => {
  it("falls back to the default master account when unset", () => {
    expect(parsePlatformAdminEmails(undefined)).toEqual([
      ...DEFAULT_PLATFORM_ADMIN_EMAILS,
    ]);
    expect(parsePlatformAdminEmails(null)).toEqual([
      ...DEFAULT_PLATFORM_ADMIN_EMAILS,
    ]);
  });

  it("falls back to the default when the env var is empty/whitespace", () => {
    expect(parsePlatformAdminEmails("")).toEqual([
      ...DEFAULT_PLATFORM_ADMIN_EMAILS,
    ]);
    // Only whitespace/commas → no usable entries → empty list (explicit override)
    expect(parsePlatformAdminEmails("  ,  ")).toEqual([]);
  });

  it("parses a CSV list, trims and lowercases", () => {
    expect(parsePlatformAdminEmails(" Admin@Bekaa.eu , ops@bekaa.eu ")).toEqual(
      ["admin@bekaa.eu", "ops@bekaa.eu"],
    );
  });
});

describe("isPlatformAdminEmail", () => {
  it("matches the default master account case-insensitively", () => {
    expect(isPlatformAdminEmail("resper@bekaa.eu")).toBe(true);
    expect(isPlatformAdminEmail("RESPER@bekaa.eu")).toBe(true);
    expect(isPlatformAdminEmail("  Resper@Bekaa.eu  ")).toBe(true);
  });

  it("rejects non-admin emails", () => {
    expect(isPlatformAdminEmail("someone@example.com")).toBe(false);
    expect(isPlatformAdminEmail(null)).toBe(false);
    expect(isPlatformAdminEmail(undefined)).toBe(false);
    expect(isPlatformAdminEmail("")).toBe(false);
  });

  it("honours a custom PLATFORM_ADMIN_EMAILS override", () => {
    const raw = "ciso@bekaa.eu,ops@bekaa.eu";
    expect(isPlatformAdminEmail("ops@bekaa.eu", raw)).toBe(true);
    expect(isPlatformAdminEmail("CISO@BEKAA.EU", raw)).toBe(true);
    // The hardcoded default is NOT implicitly included once an override is set
    expect(isPlatformAdminEmail("resper@bekaa.eu", raw)).toBe(false);
  });
});
