import { Component } from "react";
import type { ErrorInfo, ReactNode } from "react";

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div style={{ padding: "20px", color: "white", backgroundColor: "#333", height: "100vh", width: "100vw", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", fontFamily: "monospace" }}>
          <h2>Something went wrong in the React rendering tree.</h2>
          <pre style={{ color: "#ff5555", backgroundColor: "#222", padding: "20px", borderRadius: "8px", maxWidth: "80%", overflowX: "auto" }}>
            {this.state.error?.message}
            <br />
            {this.state.error?.stack}
          </pre>
          <button onClick={() => window.location.reload()} style={{ marginTop: "20px", padding: "10px 20px", cursor: "pointer" }}>Reload Page</button>
        </div>
      );
    }

    return this.props.children;
  }
}
