/**
 * Auth client for the Standard web frontend.
 *
 * Uses Better Auth's React client (stable, not beta).
 * Points to the API Gateway which hosts Better Auth server-side.
 */
import { createStandardAuthClient } from "@standard/auth/client";

import { API_URL } from "./config";

export const authClient = createStandardAuthClient(API_URL);

// React hooks — session & organization
export const useSession = () => authClient.useSession();
export const useActiveOrganization = () => authClient.useActiveOrganization();

// Auth actions
export const signIn = authClient.signIn;
export const signOut = authClient.signOut;
export const signUp = authClient.signUp;
