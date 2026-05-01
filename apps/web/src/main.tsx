import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";

/* Design System */
import "./styles/tokens.css";
import "./styles/reset.css";
import "./styles/layout.css";
import "./styles/components.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
