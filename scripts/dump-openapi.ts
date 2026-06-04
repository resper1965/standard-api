import fs from "fs";
import path from "path";
import { generateOpenApiSpec } from "../apps/api-gateway/src/openapi/generator";
import { LLMS_TXT } from "../apps/api-gateway/src/openapi/docs/llms-constants";
import { generateLlmsFullTxt } from "../apps/api-gateway/src/openapi/docs/llms-generator";
import yaml from "js-yaml";

async function main() {
  console.log("Generating OpenAPI specification...");
  
  // Mock routes required by the generator if any? No, the generator already uses the in-memory route registry.
  // Wait, importing generator might trigger side-effects from Hono or Zod. Let's try it.
  try {
    const spec = generateOpenApiSpec();
    const fullLlmsTxt = generateLlmsFullTxt(spec);

    const docsApiDir = path.join(process.cwd(), "docs", "api");
    if (!fs.existsSync(docsApiDir)) {
      fs.mkdirSync(docsApiDir, { recursive: true });
    }

    // 1. Write openapi.json
    fs.writeFileSync(path.join(docsApiDir, "openapi.json"), JSON.stringify(spec, null, 2));
    console.log("✅ Wrote docs/api/openapi.json");

    // 2. Write openapi.yaml
    fs.writeFileSync(path.join(docsApiDir, "openapi.yaml"), yaml.dump(spec));
    console.log("✅ Wrote docs/api/openapi.yaml");

    // 3. Write llms.txt
    fs.writeFileSync(path.join(docsApiDir, "llms.txt"), LLMS_TXT);
    console.log("✅ Wrote docs/api/llms.txt");

    // 4. Write llms-full.txt
    fs.writeFileSync(path.join(docsApiDir, "llms-full.txt"), fullLlmsTxt);
    console.log("✅ Wrote docs/api/llms-full.txt");

  } catch (error) {
    console.error("Failed to generate documentation:", error);
    process.exit(1);
  }
}

main();
