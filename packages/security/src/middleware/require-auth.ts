import type { AuthContext } from "@standard/schemas";

export const requireAuthContext = (auth?: AuthContext): AuthContext => {
  if (!auth) throw new Error("UNAUTHORIZED");
  return auth;
};

