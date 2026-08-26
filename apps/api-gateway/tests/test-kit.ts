type TestCase = {
  name: string;
  run: () => Promise<void> | void;
};

const tests: TestCase[] = [];

export const test = (name: string, run: () => Promise<void> | void): void => {
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
