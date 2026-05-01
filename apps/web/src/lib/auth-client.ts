import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  baseURL: import.meta.env.PROD
    ? "https://aegis-api-standard-api-gateway.ness.workers.dev"
    : "",           // dev proxy handles /api → localhost:8787
});

export const {
  signIn,
  signUp,
  signOut,
  useSession,
} = authClient;
