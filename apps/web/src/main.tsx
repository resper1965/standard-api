import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { router } from "./router-config";

/* Design System */
import "./styles/tokens.css";
import "./styles/reset.css";
import "./styles/layout.css";
import "./styles/components.css";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>
);
