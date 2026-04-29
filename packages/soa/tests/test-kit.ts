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
  console.log(`${tests.length} soa tests passed`);
};
