type TestCase = {
  name: string;
  run: () => Promise<void> | void;
};

const tests: TestCase[] = [];

/**
 * When vitest is the runner, register with it instead of the local array.
 *
 * These 30 files are the only thing covering the api-gateway's route handlers,
 * adapters and repositories, and they ran exclusively under the tsx runner
 * below — so v8 never saw those calls and every one of those functions counted
 * as untested. `scf.routes.ts` alone reported 47 of 47 uncovered while being
 * exercised by this suite.
 *
 * `expect` needs no equivalent: it throws plain Errors, which vitest already
 * reads as failures. Nothing about `pnpm test` changes — VITEST is unset there
 * and the array path is taken exactly as before.
 */
const vitest = process.env.VITEST ? await import("vitest") : null;

export const test = (name: string, run: () => Promise<void> | void): void => {
  if (vitest) {
    vitest.test(name, run);
    return;
  }
  tests.push({ name, run });
};

export const expect = <T>(actual: T) => ({
  toBe(expected: T): void {
    if (actual !== expected) {
      throw new Error(`Expected ${String(actual)} to be ${String(expected)}`);
    }
  },
  toEqual(expected: T): void {
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
      throw new Error(
        `Expected ${JSON.stringify(actual)} to equal ${JSON.stringify(expected)}`,
      );
    }
  },
  toBeDefined(): void {
    if (actual === undefined || actual === null) {
      throw new Error("Expected value to be defined");
    }
  },
  toBeUndefined(): void {
    if (actual !== undefined) {
      throw new Error(`Expected undefined, got ${JSON.stringify(actual)}`);
    }
  },
  toBeLessThan(expected: number): void {
    if (
      typeof actual !== "number" ||
      actual >= (expected as unknown as number)
    ) {
      throw new Error(
        `Expected ${String(actual)} to be less than ${String(expected)}`,
      );
    }
  },
  toBeGreaterThanOrEqual(expected: number): void {
    if (
      typeof actual !== "number" ||
      actual < (expected as unknown as number)
    ) {
      throw new Error(
        `Expected ${String(actual)} to be >= ${String(expected)}`,
      );
    }
  },
  toContain(expected: unknown): void {
    if (Array.isArray(actual)) {
      if (!actual.includes(expected)) {
        throw new Error(
          `Expected array to contain ${String(expected)}, got: ${JSON.stringify(actual)}`,
        );
      }
    } else if (typeof actual === "string") {
      if (!actual.includes(expected as string)) {
        throw new Error(
          `Expected string to contain "${String(expected)}", got: "${actual}"`,
        );
      }
    } else {
      throw new Error(
        `toContain called on non-array/non-string: ${typeof actual}`,
      );
    }
  },
  /**
   * Asserts that `actual` — which must be a function — throws when invoked.
   * Added so provenance-validation.test.ts can run: it had been written against
   * this matcher and was silently left out of run-tests.ts (audit finding M-04).
   */
  toThrow(expectedMessage?: string): void {
    if (typeof actual !== "function") {
      throw new Error(`toThrow called on non-function: ${typeof actual}`);
    }
    try {
      (actual as unknown as () => unknown)();
    } catch (err) {
      if (expectedMessage !== undefined) {
        const message = err instanceof Error ? err.message : String(err);
        if (!message.includes(expectedMessage)) {
          throw new Error(
            `Expected thrown message to contain "${expectedMessage}", got: "${message}"`,
            { cause: err },
          );
        }
      }
      return;
    }
    throw new Error("Expected function to throw, but it returned normally");
  },
});

export const runTests = async (): Promise<void> => {
  for (const current of tests) {
    await current.run();
    console.log(`ok - ${current.name}`);
  }
  console.log(`${tests.length} API tests passed`);
};
