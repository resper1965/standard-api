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
  toBeDefined(): void {
    if (actual === undefined || actual === null) throw new Error("Expected value to be defined");
  },
  toBeGreaterThan(expected: number): void {
    if (typeof actual !== "number" || actual <= expected) throw new Error(`Expected ${String(actual)} to be greater than ${expected}`);
  }
});

export const expectRejects = async (run: () => Promise<unknown>, code: string): Promise<void> => {
  try {
    await run();
  } catch (error) {
    if (error instanceof Error && (error.message.includes(code) || (error as any).code === code)) return;
    throw new Error(`Expected rejection with ${code}, got ${error instanceof Error ? `${error.name}: ${error.message} (code: ${(error as any).code})` : String(error)}`);
  }
  throw new Error(`Expected rejection with ${code}`);
};

export const runTests = async (): Promise<void> => {
  let failures = 0;
  for (const current of tests) {
    try {
      await current.run();
      console.log(`ok - ${current.name}`);
    } catch (e) {
      console.log(`not ok - ${current.name}`);
      console.error(e);
      failures++;
    }
  }
  console.log(`${tests.length} maturity tests run. Passed: ${tests.length - failures}, Failed: ${failures}`);
  if (failures > 0) throw new Error(`${failures} maturity tests failed`);
};
