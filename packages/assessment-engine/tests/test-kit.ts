type TestCase = {
  name: string;
  run: () => void;
};

const tests: TestCase[] = [];

const test = (name: string, run: () => void): void => {
  tests.push({ name, run });
};

const expect = <T>(actual: T) => ({
  toBe(expected: T): void {
    if (actual !== expected) {
      throw new Error(`Expected ${String(expected)}, received ${String(actual)}`);
    }
  },
  toEqual(expected: T): void {
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
      throw new Error(`Expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`);
    }
  },
  toContain(expected: unknown): void {
    if (!Array.isArray(actual) || !actual.includes(expected)) {
      throw new Error(`Expected ${JSON.stringify(actual)} to contain ${String(expected)}`);
    }
  }
});

const expectErrorCode = (run: () => void, code: string): void => {
  try {
    run();
  } catch (error) {
    const actual = error instanceof Error && "code" in error ? String(error.code) : "unknown";
    if (actual !== code) {
      throw new Error(`Expected error code ${code}, received ${actual}`);
    }
    return;
  }

  throw new Error(`Expected error code ${code}, but no error was thrown`);
};

export const runTests = (): void => {
  let passed = 0;

  for (const item of tests) {
    item.run();
    passed += 1;
    console.log(`✓ ${item.name}`);
  }

  console.log(`${passed} assessment-engine tests passed`);
};
