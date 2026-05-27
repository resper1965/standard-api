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
      throw new Error(`Expected ${JSON.stringify(actual)} to equal ${JSON.stringify(expected)}`);
    }
  },
  toBeDefined(): void {
    if (actual === undefined || actual === null) {
      throw new Error("Expected value to be defined");
    }
  },
  toBeLessThan(expected: number): void {
    if (typeof actual !== "number" || actual >= (expected as unknown as number)) {
      throw new Error(`Expected ${String(actual)} to be less than ${String(expected)}`);
    }
  },
  toBeGreaterThanOrEqual(expected: number): void {
    if (typeof actual !== "number" || actual < (expected as unknown as number)) {
      throw new Error(`Expected ${String(actual)} to be >= ${String(expected)}`);
    }
  },
  toContain(expected: unknown): void {
    if (Array.isArray(actual)) {
      if (!actual.includes(expected)) {
        throw new Error(`Expected array to contain ${String(expected)}, got: ${JSON.stringify(actual)}`);
      }
    } else if (typeof actual === "string") {
      if (!actual.includes(expected as string)) {
        throw new Error(`Expected string to contain "${String(expected)}", got: "${actual}"`);
      }
    } else {
      throw new Error(`toContain called on non-array/non-string: ${typeof actual}`);
    }
  }
});

export const runTests = async (): Promise<void> => {
  for (const current of tests) {
    await current.run();
    console.log(`ok - ${current.name}`);
  }
  console.log(`${tests.length} API tests passed`);
};
