import { create } from "zustand";

interface SecretDisplayStore {
  token: string | null;
  copied: boolean;
  /** Set the raw secret — call once immediately after API response */
  set: (token: string) => void;
  markCopied: () => void;
  /** CRÍTICO (G13): destroy token on modal close — never persists after close */
  clear: () => void;
}

export const useSecretDisplay = create<SecretDisplayStore>((set) => ({
  token: null,
  copied: false,
  set: (token) => set({ token, copied: false }),
  markCopied: () => set({ copied: true }),
  clear: () => set({ token: null, copied: false }),
}));
