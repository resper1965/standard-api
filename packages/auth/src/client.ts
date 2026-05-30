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
 * No plugins — user/org management via /api/v1/admin/* and /api/v1/users/me/*
 */
import { createAuthClient } from "better-auth/react";

export const createStandardAuthClient = (baseURL: string) =>
  createAuthClient({
    baseURL,
    // Declare additional server-side fields so they appear in useSession().
    // These are returned by the server via additionalFields but the client
    // must declare them to include them in the typed session object.
    fetchOptions: {
      // credentials: "include" is the default for same-site; explicit here for clarity
    },
    plugins: [],
  });

export type StandardAuthClient = ReturnType<typeof createStandardAuthClient>;
