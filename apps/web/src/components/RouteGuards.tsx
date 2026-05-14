import { useSession } from "../lib/auth-client";
import { Navigate, Outlet } from "react-router-dom";

export function ProtectedRoute() {
  const { data: session, isPending } = useSession();

  if (isPending) {
    return (
      <div className="fullpage-center">
        <div className="loading-spinner" />
      </div>
    );
  }

  if (!session?.user) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}

export function AdminRoute() {
  const { data: session, isPending } = useSession();

  if (isPending) {
    return (
      <div className="fullpage-center">
        <div className="loading-spinner" />
      </div>
    );
  }

  if (!session?.user || session.user.role !== "admin") {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}
