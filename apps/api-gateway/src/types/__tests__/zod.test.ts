import { z } from "zod";
import { test, expect } from "vitest";

test("Zod instance must have openapi method via augmentation", () => {
    const schema = z.string().openapi({ description: "Funciona" });
    expect(schema).toBeDefined();
});
