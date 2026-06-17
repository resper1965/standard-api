import "zod";

declare module "zod" {
  interface ZodType<Output, Def, Input> {
    openapi(metadata: any): this;
  }
}

