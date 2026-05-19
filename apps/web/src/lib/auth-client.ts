import { createAuthClient } from 'better-auth/react';

/**
 * Better Auth client — points to the API Gateway which handles
 * all /api/auth/* routes via the centralized @standard/auth package.
 *
 * In production the gateway lives at a different origin, so we
 * read VITE_API_BASE_URL from environment. In local dev the Vite
 * proxy in vite.config.ts forwards /api → localhost:8787.
 */
const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

export const authClient = createAuthClient({
  baseURL: API_BASE,
});

export const { useSession, signIn, signOut, signUp } = authClient;
