import { useRouteError, isRouteErrorResponse } from "react-router-dom";
import { AlertTriangle, RefreshCw, Home, ShieldAlert } from "lucide-react";

export function ErrorPage() {
  const error = useRouteError();
  console.error(error);

  let status = "Unexpected Error";
  let title = "Oauth, something went wrong";
  let message = "An unexpected error occurred in Standard. context layer.";
  let isChunkError = false;

  if (isRouteErrorResponse(error)) {
    status = error.status.toString();
    title = error.statusText;
    message = error.data?.message || message;
  } else if (error instanceof Error) {
    message = error.message;
    // Detect "Failed to fetch dynamically imported module" or "Loading chunk failed"
    if (message.includes("dynamically imported module") || message.includes("Loading chunk")) {
      isChunkError = true;
      title = "New Version Available";
      message = "Standard has been updated with new security controls. Please refresh to sync your session with the latest version.";
    }
  }

  const handleRefresh = () => {
     // Force a hard reload to clear cache
     window.location.reload();
  };

  const handleGoHome = () => {
    window.location.href = "/dashboard";
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-6 text-white font-sans">
      <div className="max-w-md w-full relative">
        {/* Decorative background glow */}
        <div className="absolute -top-24 -left-24 w-64 h-64 bg-primary/20 rounded-full blur-[100px]" />
        <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-accent/20 rounded-full blur-[100px]" />

        <div className="relative z-10 glass-card border border-white/10 p-10 rounded-2xl shadow-2xl text-center space-y-8 backdrop-blur-xl">
          <div className="flex justify-center">
            <div className={`p-4 rounded-full ${isChunkError ? 'bg-primary/10 text-primary' : 'bg-destructive/10 text-destructive'}`}>
              {isChunkError ? <ShieldAlert size={48} /> : <AlertTriangle size={48} />}
            </div>
          </div>

          <div className="space-y-3">
            <div className="text-zinc-500 text-xs font-mono tracking-widest uppercase">{status}</div>
            <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
            <p className="text-zinc-400 text-sm leading-relaxed">
              {message}
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <button
              onClick={handleRefresh}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-white text-black font-semibold rounded-xl hover:bg-zinc-200 transition-all active:scale-[0.98]"
            >
              <RefreshCw size={18} className={isChunkError ? "animate-spin-slow" : ""} />
              {isChunkError ? "Update App Now" : "Try Again"}
            </button>
            <button
              onClick={handleGoHome}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-zinc-900 border border-zinc-800 text-zinc-300 font-semibold rounded-xl hover:bg-zinc-800 transition-all active:scale-[0.98]"
            >
              <Home size={18} />
              Back to Dashboard
            </button>
          </div>

          <div className="pt-4 border-t border-white/5">
            <p className="text-[10px] text-zinc-600 font-mono">
              Trace ID: {Math.random().toString(36).substring(7).toUpperCase()}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
