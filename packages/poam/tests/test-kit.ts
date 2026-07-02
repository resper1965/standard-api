// Shared kit extracted to @standard/test-kit (ponytail debt paid down).
import { createTestKit } from "@standard/test-kit";

export const { test, expect, expectRejects, runTests } = createTestKit("poam");
