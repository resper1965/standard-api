import { OpenApiGeneratorV3 } from "@asteasolutions/zod-to-openapi";
import { registry } from "./registry";
import { routes } from "../app";

let cachedSpec: any = null;

/**
 * Dynamically generates the final OpenAPI specification JSON by aggregating 
 * all routes and schemas registered across the decentralized modules.
 */
export function generateOpenApiSpec() {
  if (cachedSpec) {
    return cachedSpec;
  }
  // Dynamically register modern API-First routes from Hono routes wrapper
  routes.forEach(route => {
    if (route.openapi) {
      // Replace Express-style `:param` with OpenAPI-style `{param}`
      const openapiPath = route.path.replace(/:([a-zA-Z0-9_]+)/g, "{$1}");
      
      registry.registerPath({
        method: route.method.toLowerCase() as any,
        path: openapiPath,
        ...route.openapi
      });
    }
  });

  const generator = new OpenApiGeneratorV3(registry.definitions);
  
  const baseDescription = "API-first agentic GRC platform for compliance assessments powered by the Secure Controls Framework (SCF). Features 7 specialized AI agents, assessment lifecycle management, document ingestion, knowledge base search, and multi-tenant authorization.";
  
  const aiFirstNotice = `
> **🤖 AI-Dev First**: Se você é um Agente Autônomo ou está configurando uma integração LLM, consuma nossa documentação contextual nativa em [\`/llms-full.txt\`](/llms-full.txt).
  `;

  const cookbooks = "\n\n---\n\n## 📖 Manuais & Cookbook\n\nConsulte [`/llms-full.txt`](/llms-full.txt) para workflows completos e [`/llms.txt`](/llms.txt) para referência rápida.";

  const fullDescription = [baseDescription, aiFirstNotice, cookbooks].join("\n\n---\n\n");

  cachedSpec = generator.generateDocument({
    openapi: "3.0.0",
    info: {
      title: "Standard GRC Platform — API Reference",
      version: "1.0.0",
      description: fullDescription
    },
    servers: [
      { url: "/", description: "Current environment" },
      { url: "https://standard-api.bekaa.eu", description: "Production" }
    ],
    security: [{ BearerApiKey: [] }]
  });

  return cachedSpec;
}
