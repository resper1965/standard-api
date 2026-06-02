import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { router } from "./router-config";
import { LoadingFallback } from "./router";

/* Design System */
import "./styles/tokens.css";
import "./styles/reset.css";
import "./styles/layout.css";
import "./styles/components.css";
import "./index.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} fallbackElement={<LoadingFallback />} />
    </QueryClientProvider>
  </StrictMode>
);
