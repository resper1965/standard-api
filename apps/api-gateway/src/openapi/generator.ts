// @ts-nocheck -- Zod v4 CI type compat
import { OpenApiGeneratorV3 } from "@asteasolutions/zod-to-openapi";
import { registry } from "./registry";
import type { RouteDefinition } from "../http";

let cachedSpec: any = null;

/**
 * Registers all routes with OpenAPI configurations into the central registry.
 * This should be called once at startup (e.g., from app.ts) to break circular dependencies.
 */
export function registerRoutesForOpenApi(routes: RouteDefinition[]) {
  routes.forEach(route => {
    if (route.openapi) {
      const openapiPath = route.path.replace(/:([a-zA-Z0-9_]+)/g, "{$1}");
      registry.registerPath({
        method: route.method.toLowerCase() as any,
        path: openapiPath,
        ...route.openapi
      });
    }
  });
}

/**
 * Dynamically generates the final OpenAPI specification JSON by aggregating 
 * all routes and schemas registered across the decentralized modules.
 */
export function generateOpenApiSpec() {
  if (cachedSpec) {
    return cachedSpec;
  }

  const generator = new OpenApiGeneratorV3(registry.definitions);
  
  const baseDescription = "API-first agentic GRC platform for compliance assessments powered by the Secure Controls Framework (SCF). Features 7 specialized AI agents, assessment lifecycle management, document ingestion, knowledge base search, and multi-tenant authorization.";
  
  const aiFirstNotice = `
> **ðŸ¤– AI-Dev First**: Se vocÃª Ã© um Agente AutÃ´nomo ou estÃ¡ configurando uma integraÃ§Ã£o LLM, consuma nossa documentaÃ§Ã£o contextual nativa em [\`/llms-full.txt\`](/llms-full.txt).
  `;

  const cookbooks = "\n\n---\n\n## ðŸ“– Manuais & Cookbook\n\nConsulte [`/llms-full.txt`](/llms-full.txt) para workflows completos e [`/llms.txt`](/llms.txt) para referÃªncia rÃ¡pida.";

  const fullDescription = [baseDescription, aiFirstNotice, cookbooks].join("\n\n---\n\n");

  cachedSpec = generator.generateDocument({
    openapi: "3.0.0",
    info: {
      title: "Standard GRC Platform â€” API Reference",
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

