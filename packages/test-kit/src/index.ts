/**
 * @module @standard/test-kit
 * @description Minimal, zero-dependency test kit shared by the per-package
 * unit-test runners (`tsx tests/run-tests.ts`).
 *
 * Extracted from the identical `test-kit.ts` copies previously duplicated in
 * `gap-analysis`, `poam` and `scf-core` (ponytail debt paydown). Each package
 * now does:
 *
 * ```ts
 * import { createTestKit } from "@standard/test-kit";
 * export const { test, expect, expectRejects, runTests } =
 *   createTestKit("gap-analysis");
 * ```
 */

type TestCase = {
  name: string;
  run: () => Promise<void> | void;
};

/** @internal Builds a descriptive assertion error. */
const assertionError = (actual: unknown, expectation: string): Error =>
  new Error(`Expected ${String(actual)} ${expectation}`);

/**
 * Fluent matchers. Superset of what each consumer used before extraction
 * (toBe/toBeDefined/toBeTruthy/toBeGreaterThan/toContain) — stateless, so it is
 * shared verbatim across kits.
 */
export const expect = <T>(actual: T) => ({
  toBe(expected: T): void {
    if (actual !== expected)
      throw assertionError(actual, `to be ${String(expected)}`);
  },
  toBeDefined(): void {
    if (actual === undefined || actual === null)
      throw new Error("Expected value to be defined");
  },
  toBeTruthy(): void {
    if (!actual) throw assertionError(actual, "to be truthy");
  },
  toBeGreaterThan(expected: number): void {
    if (typeof actual !== "number" || actual <= expected)
      throw assertionError(actual, `to be greater than ${expected}`);
  },
  toContain(expected: unknown): void {
    if (!Array.isArray(actual) && typeof actual !== "string")
      throw new Error("Expected array or string");
    if (
      !(actual as unknown as { includes: (v: unknown) => boolean }).includes(
        expected,
      )
    )
      throw assertionError(actual, `to contain ${String(expected)}`);
  },
});

/** Asserts that `run()` rejects/throws with an error message containing `code`. */
export const expectRejects = async (
  run: () => Promise<unknown>,
  code: string,
): Promise<void> => {
  try {
    await run();
  } catch (error) {
    if (error instanceof Error && error.message.includes(code)) return;
    throw new Error(
      `Expected rejection with ${code}, got ${error instanceof Error ? error.message : String(error)}`,
      { cause: error },
    );
  }
  throw new Error(`Expected rejection with ${code}`);
};

/**
 * Creates an isolated test registry with a package `label` used in the final
 * "N <label> tests passed" line, preserving each runner's original output.
 */
export const createTestKit = (label: string) => {
  const tests: TestCase[] = [];

  const test = (name: string, run: () => Promise<void> | void): void => {
    tests.push({ name, run });
  };

  const runTests = async (): Promise<void> => {
    for (const current of tests) {
      await current.run();
      console.log(`ok - ${current.name}`);
    }
    console.log(`${tests.length} ${label} tests passed`);
  };

  return { test, expect, expectRejects, runTests };
};
