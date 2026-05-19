import { createAuthClient, BetterAuthReactAdapter } from '@neondatabase/auth';

// Point directly to Neon Auth (Managed Better Auth)
const NEON_AUTH_URL = import.meta.env.VITE_NEON_AUTH_URL || "https://ep-blue-breeze-anyfua57.neonauth.c-6.us-east-1.aws.neon.tech/neondb/auth"

export const authClient = createAuthClient(NEON_AUTH_URL, {
  adapter: BetterAuthReactAdapter(),
});

// Re-export convenience hooks/methods from the fully-bound client
export const { useSession, signIn, signOut, signUp, useActiveOrganization } = authClient;
