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
 *
 * No plugins â€” user/org management via /api/v1/admin/* and /api/v1/users/me/*
 */
import { createAuthClient } from "better-auth/react";

export const createStandardAuthClient = (baseURL: string) =>
  createAuthClient({
    baseURL,
    fetchOptions: {
      // credentials: "include" is the default for same-site; explicit here for clarity
    },
    plugins: [],
    session: {
      // Declare server-side additionalFields so they appear in useSession() response.
      fields: {
        activeOrganizationId: {
          type: "string",
          required: false,
        },
      },
    },
  });

export type StandardAuthClient = ReturnType<typeof createStandardAuthClient>;

