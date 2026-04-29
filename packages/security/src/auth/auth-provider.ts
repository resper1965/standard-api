import type { AuthContext, Role } from "@aegis/schemas";

export type AuthenticateInput = {
  actorId?: string;
  tenantId?: string;
  organizationIds?: string[];
  roles?: Role[];
  permissions?: AuthContext["permissions"];
  traceId: string;
  authHeader?: string;
  apiKey?: string;
};

export type AuthProvider = {
  authenticate(input: AuthenticateInput): Promise<AuthContext | null>;
};
