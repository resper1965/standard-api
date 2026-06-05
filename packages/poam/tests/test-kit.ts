// TODO: extract to shared test-utils — TestCase type, test(), runTests(),
// core matchers (toBe, toBeGreaterThan), and expectRejects are duplicated
// identically in the gap-analysis test-kit and partially in scf-core.

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
    if (actual !== expected) throw assertionError(actual, `to be ${String(expected)}`);
  },
  toBeDefined(): void {
    if (actual === undefined || actual === null)
      throw new Error("Expected value to be defined");
  },
  toBeGreaterThan(expected: number): void {
    if (typeof actual !== "number" || actual <= expected)
      throw assertionError(actual, `to be greater than ${expected}`);
  },
});

// TODO: extract to shared test-utils — expectRejects is identical in gap-analysis test-kit.
export const expectRejects = async (run: () => Promise<unknown>, code: string): Promise<void> => {
  try {
    await run();
  } catch (error) {
    if (error instanceof Error && error.message.includes(code)) return;
    throw new Error(`Expected rejection with ${code}, got ${error instanceof Error ? error.message : String(error)}`);
  }
  throw new Error(`Expected rejection with ${code}`);
};

export const runTests = async (): Promise<void> => {
  for (const current of tests) {
    await current.run();
    console.log(`ok - ${current.name}`);
  }
  console.log(`${tests.length} poam tests passed`);
};
