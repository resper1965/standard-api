/**
 * Global vitest setup.
 *
 * Applies the `@asteasolutions/zod-to-openapi` augmentation once, so that
 * `z.string().openapi(...)` is available in tests that import `zod` directly
 * (the augmentation mutates the shared Zod instance and is otherwise only
 * triggered by importing a module that calls `extendZodWithOpenApi`).
 */
import { z } from "zod";
import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";

extendZodWithOpenApi(z);
