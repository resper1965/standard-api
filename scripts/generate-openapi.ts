import "../apps/api-gateway/src/app";
import { generateOpenApiSpec } from "../apps/api-gateway/src/openapi/generator";
import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

// Resolving current path
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Ensure the docs/api directory exists
const docsDir = join(__dirname, "..", "docs", "api");
if (!existsSync(docsDir)) {
  mkdirSync(docsDir, { recursive: true });
}

// Generate the spec
console.log("Generating OpenAPI specification...");
const spec = generateOpenApiSpec();

// Write as JSON
const jsonPath = join(docsDir, "openapi.json");
writeFileSync(jsonPath, JSON.stringify(spec, null, 2));
console.log(`OpenAPI JSON written to: ${jsonPath}`);

console.log("Done!");
