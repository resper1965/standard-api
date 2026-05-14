/**
 * @module @standard/auth/client
 * @description Auth client for the Standard web frontend (React).
 *
 * Usage in apps/web:
 * ```ts
 * import { createStandardAuthClient } from "@standard/auth/client";
 * const authClient = createStandardAuthClient("http://localhost:8787");
 * const { data } = authClient.useSession();
 * ```
 */
import { createAuthClient } from "better-auth/react";
import { organizationClient, adminClient } from "better-auth/client/plugins";

export const createStandardAuthClient = (baseURL: string) =>
  createAuthClient({
    baseURL,
    plugins: [
      organizationClient(),
      adminClient(),
    ],
  });

export type StandardAuthClient = ReturnType<typeof createStandardAuthClient>;

