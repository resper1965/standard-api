import "../apps/api-gateway/src/app";
import { generateOpenApiSpec } from "../apps/api-gateway/src/openapi/generator";

async function main() {
  console.log("Generating OpenAPI spec for validation...");
  const spec = generateOpenApiSpec();

  let operationCount = 0;
  for (const pathObj of Object.values(spec.paths || {})) {
    operationCount += Object.keys(pathObj).length;
  }
  console.log(`Found ${operationCount} operations in OpenAPI specification.`);

  if (operationCount < 56) {
    console.error(
      `❌ Validation failed: Expected at least 56 operations, but found ${operationCount}.`,
    );
    console.error(
      "This suggests endpoints were accidentally removed from the registry.",
    );
    process.exit(1);
  }

  console.log("✅ OpenAPI validation passed.");
  process.exit(0);
}

main().catch((e) => {
  console.error("Failed to generate OpenAPI spec:", e);
  process.exit(1);
});
