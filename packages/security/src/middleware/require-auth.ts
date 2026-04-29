import type { AuthContext } from "@aegis/schemas";

export const requireAuthContext = (auth?: AuthContext): AuthContext => {
  if (!auth) throw new Error("UNAUTHORIZED");
  return auth;
};
