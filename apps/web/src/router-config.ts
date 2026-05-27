/**
 * router-config.ts
 *
 * Singleton BrowserRouter instance.
 * Isolated from router.tsx so react-refresh/only-export-components
 * doesn't flag the non-component export.
 *
 * router.tsx exports only the routes array (and React component helpers),
 * while this file owns the createBrowserRouter call.
 */
import { createBrowserRouter } from "react-router-dom";
import { routes } from "./router";

export const router = createBrowserRouter(routes);
