// ponytail: extract to shared test-utils — TestCase type, test(), runTests(), and
// core matchers (toBe, toBeGreaterThan) are duplicated in gap-analysis and poam test-kits.

type TestCase = {
  name: string;
  run: () => Promise<void> | void;
};

const tests: TestCase[] = [];

// --- Internal assertion helpers (not exported — reduces coupling surface) ---

/** @internal Builds a descriptive assertion error */
const assertionError = (actual: unknown, expectation: string): Error =>
  new Error(`Expected ${String(actual)} ${expectation}`);

// --- Public API ---

export const test = (name: string, run: () => Promise<void> | void): void => {
  tests.push({ name, run });
};

export const expect = <T>(actual: T) => ({
  toBe(expected: T): void {
    if (actual !== expected)
      throw assertionError(actual, `to be ${String(expected)}`);
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
    if (!(actual as any).includes(expected))
      throw assertionError(actual, `to contain ${String(expected)}`);
  },
});

export const runTests = async (): Promise<void> => {
  for (const current of tests) {
    await current.run();
    console.log(`ok - ${current.name}`);
  }
  console.log(`${tests.length} scf-core tests passed`);
};
