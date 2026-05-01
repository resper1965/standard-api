/**
 * @module @aegis/auth/client
 * @description Auth client for the Aegis web frontend (React).
 *
 * Usage in apps/web:
 * ```ts
 * import { createAegisAuthClient } from "@aegis/auth/client";
 * const authClient = createAegisAuthClient("http://localhost:8787");
 * const { data } = authClient.useSession();
 * ```
 */
import { createAuthClient } from "better-auth/react";
import { organizationClient, adminClient } from "better-auth/client/plugins";

export const createAegisAuthClient = (baseURL: string) =>
  createAuthClient({
    baseURL,
    plugins: [
      organizationClient(),
      adminClient(),
    ],
  });

export type AegisAuthClient = ReturnType<typeof createAegisAuthClient>;
