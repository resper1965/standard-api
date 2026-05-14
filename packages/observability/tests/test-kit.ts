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
  }
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
  if (failures > 0) throw new Error(`${failures} observability tests failed`);
};
