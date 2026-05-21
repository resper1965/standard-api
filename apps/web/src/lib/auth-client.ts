<<<<<<< HEAD
/**
 * Auth client for the Standard web frontend.
 *
 * Uses Better Auth's React client (stable, not beta).
 * Points to the API Gateway which hosts Better Auth server-side.
 */
import { createStandardAuthClient } from "@standard/auth/client";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8787";

export const authClient = createStandardAuthClient(API_URL);

// React hooks — session & organization
export const useSession = authClient.useSession;
export const useActiveOrganization = authClient.useActiveOrganization;

// Auth actions
export const { signIn, signOut, signUp } = authClient;
=======
import { createAuthClient } from '@neondatabase/neon-js/auth';

// Point directly to Neon Auth (Managed Better Auth)
const NEON_AUTH_URL = import.meta.env.VITE_NEON_AUTH_URL || "https://ep-REDACTED-endpoint.neonauth.c-6.us-east-1.aws.neon.tech/neondb/auth"

export const authClient = createAuthClient(NEON_AUTH_URL);

// Re-export convenience hooks/methods from the client
export const { useSession, signIn, signOut, signUp, useActiveOrganization } = authClient as any;
>>>>>>> fdf6d291032b55389a8d20036039cda5e81d56d8
