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
  toContain(expected: unknown): void {
    if (!Array.isArray(actual) && typeof actual !== "string") throw new Error("Expected array or string");
    if (!(actual as any).includes(expected)) throw new Error(`Expected ${String(actual)} to contain ${String(expected)}`);
  },
  toBeGreaterThan(expected: number): void {
    if (typeof actual !== "number" || actual <= expected) throw new Error(`Expected ${String(actual)} to be greater than ${expected}`);
  }
});

export const expectRejects = async (run: () => Promise<void>, expectedMessage: string): Promise<void> => {
  try {
    await run();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!message.includes(expectedMessage)) throw new Error(`Expected ${message} to include ${expectedMessage}`);
    return;
  }
  throw new Error("Expected promise to reject");
};

export const runTests = async (): Promise<void> => {
  for (const current of tests) {
    await current.run();
    console.log(`ok - ${current.name}`);
  }
  console.log(`${tests.length} document-ingestion tests passed`);
};
