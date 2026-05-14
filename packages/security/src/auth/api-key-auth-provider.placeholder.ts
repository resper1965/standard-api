import type { AuthProvider } from "./auth-provider";

export class ApiKeyAuthProviderPlaceholder implements AuthProvider {
  async authenticate(): Promise<null> {
    return null;
  }
}
