import "../apps/api-gateway/src/app";
import { generateOpenApiSpec } from "../apps/api-gateway/src/openapi/generator";
import { writeFileSync, mkdirSync, existsSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { dump } from "js-yaml";

const __dirname = dirname(fileURLToPath(import.meta.url));

// `--check` regenerates in memory and fails if the committed spec differs.
// The published spec had drifted for three months (51 paths against 366 real
// ones, missing /scf/* and /gap/* entirely) precisely because nothing compared
// the two. Same idea as check:migrations.
const checkOnly = process.argv.includes("--check");

const docsDir = join(__dirname, "..", "docs", "api");
if (!existsSync(docsDir)) {
  mkdirSync(docsDir, { recursive: true });
}

const spec = generateOpenApiSpec();
const jsonPath = join(docsDir, "openapi.json");
const yamlPath = join(docsDir, "openapi.yaml");
const jsonBody = `${JSON.stringify(spec, null, 2)}\n`;
const yamlBody = dump(spec, { noRefs: true, lineWidth: -1 });

const operationCount = Object.values(spec.paths ?? {}).reduce(
  (total, pathItem) => total + Object.keys(pathItem as object).length,
  0,
);

if (checkOnly) {
  const stale: string[] = [];
  for (const [path, expected] of [
    [jsonPath, jsonBody],
    [yamlPath, yamlBody],
  ] as const) {
    const actual = existsSync(path) ? readFileSync(path, "utf8") : "";
    if (actual !== expected) stale.push(path);
  }

  if (stale.length > 0) {
    console.error("OpenAPI spec is out of date:");
    for (const path of stale) console.error(`  ${path}`);
    console.error("\nRun `pnpm generate:openapi` and commit the result.");
    process.exit(1);
  }

  console.log(
    `OpenAPI spec is current (${Object.keys(spec.paths ?? {}).length} paths, ${operationCount} operations).`,
  );
  process.exit(0);
}

writeFileSync(jsonPath, jsonBody);
writeFileSync(yamlPath, yamlBody);
console.log(
  `Wrote ${Object.keys(spec.paths ?? {}).length} paths / ${operationCount} operations to docs/api/openapi.{json,yaml}`,
);
