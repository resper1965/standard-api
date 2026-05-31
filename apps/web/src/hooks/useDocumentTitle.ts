import { useEffect } from "react";

const APP_NAME = "Standard";

/**
 * Sets the browser tab title for a page.
 * Restores the previous title on unmount.
 *
 * @param title - Page-specific title (e.g. "Webhooks", "API Keys").
 *                Pass empty string to show just the app name.
 *
 * @example
 *   useDocumentTitle("API Keys")  → "API Keys — Standard"
 *   useDocumentTitle("")          → "Standard"
 */
export function useDocumentTitle(title: string): void {
  useEffect(() => {
    const previous = document.title;
    document.title = title ? `${title} — ${APP_NAME}` : APP_NAME;
    return () => {
      document.title = previous;
    };
  }, [title]);
}
