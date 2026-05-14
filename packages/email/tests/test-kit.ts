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
  toContain(substring: string): void {
    if (typeof actual !== "string" || !actual.includes(substring)) {
      throw new Error(`Expected "${String(actual)}" to contain "${substring}"`);
    }
  },
  toBeTruthy(): void {
    if (!actual) throw new Error(`Expected ${String(actual)} to be truthy`);
  },
  toBeGreaterThan(n: number): void {
    if (typeof actual !== "number" || actual <= n) {
      throw new Error(`Expected ${String(actual)} to be greater than ${n}`);
    }
  },
  toThrow(): void {
    if (typeof actual !== "function") throw new Error("Expected a function");
    try {
      (actual as () => void)();
      throw new Error("Expected function to throw");
    } catch {
      // ok
    }
  },
});

export const run = async (): Promise<void> => {
  let failures = 0;
  for (const item of tests) {
    try {
      await item.run();
      console.log(`ok - ${item.name}`);
    } catch (error) {
      failures += 1;
      console.error(`not ok - ${item.name}`);
      console.error(error);
    }
  }
  console.log(`\n${tests.length - failures}/${tests.length} email tests passed`);
  if (failures > 0) throw new Error(`${failures} email tests failed`);
};
