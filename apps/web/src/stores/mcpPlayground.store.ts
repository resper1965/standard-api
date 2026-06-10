import { create } from "zustand";

export type JobStatus = "idle" | "dispatched" | "polling" | "done" | "error";

interface McpPlaygroundStore {
  apiKey: string;
  selectedTool: string | null;
  jobId: string | null;
  status: JobStatus;
  result: unknown | null;
  error: string | null;
  /** true when no apiKey provided — uses demo fixtures */
  demoMode: boolean;
  setApiKey: (key: string) => void;
  selectTool: (tool: string) => void;
  /** Called immediately after POST /mcp returns 202 */
  dispatch: (jobId: string) => void;
  setPolling: () => void;
  setDone: (result: unknown) => void;
  setError: (error: string) => void;
  reset: () => void;
}

export const useMcpPlayground = create<McpPlaygroundStore>((set, get) => ({
  apiKey: "",
  selectedTool: null,
  jobId: null,
  status: "idle",
  result: null,
  error: null,
  demoMode: true,
  setApiKey: (apiKey) => set({ apiKey, demoMode: !apiKey.trim() }),
  selectTool: (tool) =>
    set({
      selectedTool: tool,
      status: "idle",
      result: null,
      error: null,
      jobId: null,
    }),
  dispatch: (jobId) => set({ jobId, status: "dispatched" }),
  setPolling: () => set({ status: "polling" }),
  setDone: (result) => set({ status: "done", result }),
  setError: (error) => set({ status: "error", error }),
  reset: () => set({ status: "idle", jobId: null, result: null, error: null }),
}));
