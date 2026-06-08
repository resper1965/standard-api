import { describe, it, expect } from "vitest";
import { sanitizeLikeInput } from "./sanitize-like";

describe("sanitizeLikeInput", () => {
  it("should escape percent wildcard", () => {
    expect(sanitizeLikeInput("test%admin")).toBe("test\\%admin");
  });

  it("should escape underscore wildcard", () => {
    expect(sanitizeLikeInput("test_admin")).toBe("test\\_admin");
  });

  it("should escape backslash", () => {
    expect(sanitizeLikeInput("test\\admin")).toBe("test\\\\admin");
  });

  it("should escape multiple special chars", () => {
    expect(sanitizeLikeInput("test%_\\admin")).toBe("test\\%\\_\\\\admin");
  });

  it("should pass through normal strings unchanged", () => {
    expect(sanitizeLikeInput("normalquery")).toBe("normalquery");
  });

  it("should handle empty string", () => {
    expect(sanitizeLikeInput("")).toBe("");
  });

  it("should handle string with only special chars", () => {
    expect(sanitizeLikeInput("%%__\\\\")).toBe("\\%\\%\\_\\_\\\\\\\\");
  });

  it("should handle unicode characters", () => {
    expect(sanitizeLikeInput("café%test")).toBe("café\\%test");
  });
});
