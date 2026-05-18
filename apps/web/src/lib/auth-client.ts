import { createAuthClient } from '@neondatabase/neon-js/auth';

// We point directly to Neon Auth (Managed Better Auth)
const NEON_AUTH_URL = import.meta.env.VITE_NEON_AUTH_URL || "https://ep-REDACTED-endpoint.neonauth.c-6.us-east-1.aws.neon.tech/neondb/auth"

export const authClient = createAuthClient(NEON_AUTH_URL);

// We export the standard destructured hooks just in case your Aegis UI components still invoke them natively.
export const { useSession, signIn, signOut, signUp, useActiveOrganization } = authClient as any;
