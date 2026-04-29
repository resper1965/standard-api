import type { AuthProvider } from "./auth-provider";

export class JwtAuthProviderPlaceholder implements AuthProvider {
  async authenticate(): Promise<null> {
    return null;
  }
}
