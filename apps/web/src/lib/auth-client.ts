/**
 * Auth client for the Standard web frontend.
 *
 * Uses Standard Native Auth's React client (stable, not beta).
 * Points to the API Gateway which hosts Standard Native Auth server-side.
 *
 * NOTE: No plugins — user/org management via /api/v1/admin/* and /api/v1/users/me/*
 */
import { createStandardAuthClient } from "@standard/auth/client";
import { API_URL } from "./config";

export const authClient = createStandardAuthClient(API_URL);

// React hooks — session only (no plugins)
export const useSession = () => authClient.useSession();

// Auth actions
export const signIn = authClient.signIn;
export const signOut = authClient.signOut;
export const signUp = authClient.signUp;
