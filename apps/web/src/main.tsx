import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { router } from "./router.tsx";

/* Design System */
import "./styles/tokens.css";
import "./styles/reset.css";
import "./styles/layout.css";
import "./styles/components.css";
import "./index.css";

/* Neon Auth UI */
import { NeonAuthUIProvider } from '@neondatabase/neon-js/auth/react';
import '@neondatabase/neon-js/ui/css';
import { authClient } from './lib/auth-client';

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <NeonAuthUIProvider emailOTP authClient={authClient}>
      <RouterProvider router={router} />
    </NeonAuthUIProvider>
  </StrictMode>
);
