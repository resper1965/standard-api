import { runCompletenessTests } from "./completeness.test";

const run = async () => {
  let passed = 0;
  let failed = 0;

  const assert = (name: string, condition: boolean, detail?: string) => {
    if (condition) {
      passed++;
      console.log(`  ✅ ${name}`);
    } else {
      failed++;
      console.error(`  ❌ ${name}${detail ? ` — ${detail}` : ""}`);
    }
  };

  await runCompletenessTests(assert);

  console.log(`\n${passed + failed} tests: ${passed} passed, ${failed} failed\n`);
  if (failed > 0) process.exit(1);
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
