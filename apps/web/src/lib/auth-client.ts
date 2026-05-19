import { createAuthClient } from '@neondatabase/neon-js/auth';

// Point directly to Neon Auth (Managed Better Auth)
// VITE_NEON_AUTH_URL must be set in the build environment for production
const NEON_AUTH_URL = import.meta.env.VITE_NEON_AUTH_URL || "https://ep-REDACTED-endpoint.neonauth.c-6.us-east-1.aws.neon.tech/neondb/auth"

export const authClient = createAuthClient(NEON_AUTH_URL);

// Re-export convenience hooks/methods from the client
export const { useSession, signIn, signOut, signUp, useActiveOrganization } = authClient as any;
