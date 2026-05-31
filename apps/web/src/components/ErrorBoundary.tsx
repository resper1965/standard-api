import { Component } from "react";
import type { ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCcw, ChevronDown, ChevronUp } from "lucide-react";

interface Props {
  children?: ReactNode;
  /** Custom fallback — overrides the default error card */
  fallback?: ReactNode;
  /** Called on error — hook for observability/logging */
  onError?: (error: Error, info: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
  detailsOpen: boolean;
}

/**
 * ErrorBoundary — wraps any subtree and catches runtime errors.
 *
 * Design decisions:
 * - Never renders raw stack traces in production — hides details behind toggle.
 * - Uses the design system's CSS variables so it matches the app theme.
 * - Provides a retry button that clears state (soft retry) before hard reload.
 * - Accepts an `onError` prop for observability/reporting hooks.
 */
export class ErrorBoundary extends Component<Props, State> {
  public state: State = { hasError: false, detailsOpen: false };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Always log — useful in development, harmless in production.
    console.error("[ErrorBoundary]", error.message, errorInfo.componentStack);
    this.props.onError?.(error, errorInfo);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: undefined, detailsOpen: false });
  };

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    if (this.props.fallback) {
      return this.props.fallback;
    }

    const isDev = import.meta.env.DEV;
    const { error, detailsOpen } = this.state;

    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "60vh",
          padding: "2rem",
        }}
      >
        <div
          style={{
            maxWidth: "480px",
            width: "100%",
            background: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "16px",
            padding: "2rem",
            boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
          }}
        >
          {/* Icon */}
          <div
            style={{
              width: "44px",
              height: "44px",
              borderRadius: "12px",
              background: "hsl(var(--destructive)/0.12)",
              border: "1px solid hsl(var(--destructive)/0.25)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: "1.25rem",
              color: "hsl(var(--destructive))",
            }}
          >
            <AlertTriangle size={22} />
          </div>

          {/* Heading */}
          <h2
            style={{
              margin: "0 0 0.5rem",
              fontSize: "1.125rem",
              fontWeight: 600,
              color: "hsl(var(--foreground))",
              letterSpacing: "-0.02em",
            }}
          >
            Something went wrong
          </h2>

          <p
            style={{
              margin: "0 0 1.5rem",
              fontSize: "0.875rem",
              lineHeight: 1.6,
              color: "hsl(var(--muted-foreground))",
            }}
          >
            An unexpected error occurred while rendering this page.
            Your data is safe — try recovering below.
          </p>

          {/* Actions */}
          <div style={{ display: "flex", gap: "0.75rem", marginBottom: isDev && error ? "1.25rem" : "0" }}>
            <button
              onClick={this.handleRetry}
              style={{
                flex: 1,
                height: "38px",
                borderRadius: "8px",
                border: "1px solid hsl(var(--border))",
                background: "hsl(var(--card))",
                color: "hsl(var(--foreground))",
                fontSize: "0.8125rem",
                fontWeight: 500,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.4rem",
                fontFamily: "inherit",
                transition: "background 0.15s",
              }}
              onMouseOver={(e) => (e.currentTarget.style.background = "hsl(var(--muted))")}
              onMouseOut={(e) => (e.currentTarget.style.background = "hsl(var(--card))")}
            >
              <RefreshCcw size={14} />
              Try again
            </button>
            <button
              onClick={this.handleReload}
              style={{
                flex: 1,
                height: "38px",
                borderRadius: "8px",
                border: "none",
                background: "hsl(var(--primary))",
                color: "hsl(var(--primary-foreground))",
                fontSize: "0.8125rem",
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.4rem",
                fontFamily: "inherit",
              }}
            >
              Reload page
            </button>
          </div>

          {/* Dev-only error details */}
          {isDev && error && (
            <div style={{ marginTop: "0.75rem" }}>
              <button
                onClick={() => this.setState((s) => ({ detailsOpen: !s.detailsOpen }))}
                style={{
                  background: "none",
                  border: "none",
                  padding: "0",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.4rem",
                  fontSize: "0.75rem",
                  color: "hsl(var(--muted-foreground))",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  marginBottom: detailsOpen ? "0.5rem" : "0",
                }}
              >
                {detailsOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                {detailsOpen ? "Hide" : "Show"} error details (dev only)
              </button>
              {detailsOpen && (
                <pre
                  style={{
                    margin: 0,
                    padding: "0.875rem",
                    background: "hsl(var(--muted))",
                    borderRadius: "8px",
                    fontSize: "0.7rem",
                    lineHeight: 1.5,
                    color: "hsl(var(--destructive))",
                    overflowX: "auto",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-all",
                  }}
                >
                  {error.message}
                  {"\n\n"}
                  {error.stack?.split("\n").slice(0, 12).join("\n")}
                </pre>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }
}
