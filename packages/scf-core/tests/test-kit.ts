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
    if (actual !== expected) throw new Error(`Expected ${String(actual)} to be ${String(expected)}`);
  },
  toBeTruthy(): void {
    if (!actual) throw new Error(`Expected ${String(actual)} to be truthy`);
  },
  toBeGreaterThan(expected: number): void {
    if (typeof actual !== "number" || actual <= expected) throw new Error(`Expected ${String(actual)} to be greater than ${expected}`);
  },
  toContain(expected: unknown): void {
    if (!Array.isArray(actual) && typeof actual !== "string") throw new Error("Expected array or string");
    if (!(actual as any).includes(expected)) throw new Error(`Expected ${String(actual)} to contain ${String(expected)}`);
  }
});

export const runTests = async (): Promise<void> => {
  for (const current of tests) {
    await current.run();
    console.log(`ok - ${current.name}`);
  }
  console.log(`${tests.length} scf-core tests passed`);
};
