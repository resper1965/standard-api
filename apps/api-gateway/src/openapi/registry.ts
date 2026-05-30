import { OpenAPIRegistry, extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";

// Initialize extensions on zod globally
extendZodWithOpenApi(z);

export const registry = new OpenAPIRegistry();

// ==========================================
// Security Schemes
// ==========================================

registry.registerComponent("securitySchemes", "BearerApiKey", {
  type: "http",
  scheme: "bearer",
  description: "API Key issued from the Standard dashboard. Prefix: `standard_live_` or `standard_test_`."
});

registry.registerComponent("securitySchemes", "CookieSession", {
  type: "apiKey",
  in: "cookie",
  name: "standard-native-auth.session_token",
  description: "Session cookie set by Standard Native Auth after login."
});

// ==========================================
// Shared API Schemas
// ==========================================

export const ApiErrorSchema = z.object({
  error: z.object({
    code: z.string().openapi({ example: "NOT_FOUND" }),
    message: z.string().openapi({ example: "Resource not found." }),
    details: z.array(z.unknown()).optional(),
    trace_id: z.string().openapi({ example: "abc-123-def" })
  })
}).openapi("ApiError");

export const PaginatedMeta = z.object({
  page: z.number(),
  per_page: z.number(),
  total: z.number()
}).openapi("PaginatedMeta");
