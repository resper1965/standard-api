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
    // No plugins — our own API routes handle user/org management
  });

export type StandardAuthClient = ReturnType<typeof createStandardAuthClient>;
