// @ts-nocheck -- Zod v4 CI type compat
import "zod";

declare module "zod" {
  interface ZodType<Output, Def, Input> {
    openapi(metadata: any): this;
  }
}

