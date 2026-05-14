type TestCase = {
  name: string;
  run: () => Promise<void> | void;
};

const tests: TestCase[] = [];

export const test = (name: string, run: TestCase["run"]): void => {
  tests.push({ name, run });
};

export const expect = <T>(actual: T) => ({
  toBe(expected: T): void {
    if (actual !== expected) throw new Error(`Expected ${String(actual)} to be ${String(expected)}`);
  },
  toBeDefined(): void {
    if (actual === undefined || actual === null) throw new Error("Expected value to be defined");
  },
  toContain(expected: unknown): void {
    if (!Array.isArray(actual) || !actual.includes(expected)) {
      throw new Error(`Expected ${JSON.stringify(actual)} to contain ${String(expected)}`);
    }
  },
  toBeGreaterThan(expected: number): void {
    if (typeof actual !== "number" || actual <= expected) throw new Error(`Expected ${String(actual)} > ${expected}`);
  }
});

export const runTests = async (suiteName: string): Promise<void> => {
  for (const item of tests) {
    await item.run();
    console.log(`ok - ${item.name}`);
  }
  console.log(`${tests.length} ${suiteName} tests passed`);
};
