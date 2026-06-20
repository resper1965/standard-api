import {
  OpenAPIRegistry,
  extendZodWithOpenApi,
} from "@asteasolutions/zod-to-openapi";
import { z } from "@standard/schemas";
import * as schemas from "@standard/schemas";

extendZodWithOpenApi(z);

export const registry = new OpenAPIRegistry();

// ==========================================
// Security Schemes
// ==========================================

registry.registerComponent("securitySchemes", "BearerApiKey", {
  type: "http",
  scheme: "bearer",
  description:
    "API Key issued from the Standard dashboard. Prefix: `standard_live_` or `standard_test_`.",
});

registry.registerComponent("securitySchemes", "CookieSession", {
  type: "apiKey",
  in: "cookie",
  name: "standard-native-auth.session_token",
  description: "Session cookie set by Standard Native Auth after login.",
});

// ==========================================
// Dynamic Registration of all Standard Schemas
// ==========================================
// Iterate over all exports from @standard/schemas. If it's a ZodObject, register it.
for (const [key, value] of Object.entries(schemas)) {
  if (value && value instanceof z.ZodType) {
    // Only register if it looks like a named schema (usually ends with Schema, or starts with capital letter)
    if (key.endsWith("Schema") || /^[A-Z]/.test(key)) {
      const openapiName = key.endsWith("Schema")
        ? key.replace(/Schema$/, "")
        : key;
      // Many schemas already have .openapi("Name") called, so we use that or the extracted name.
      registry.registerComponent("schemas", openapiName, value as any);
    }
  }
}

// ==========================================
// Shared API Schemas
// ==========================================

export const ApiErrorSchema = registry.register(
  "ApiError",
  z.object({
    error: z.object({
      code: z.string().openapi({ example: "NOT_FOUND" }),
      message: z.string().openapi({ example: "Resource not found." }),
      details: z.array(z.unknown()).optional(),
      trace_id: z.string().openapi({ example: "abc-123-def" }),
    }),
  }),
);

export const PaginatedMeta = registry.register(
  "PaginatedMeta",
  z.object({
    page: z.number(),
    per_page: z.number(),
    total: z.number(),
  }),
);
