import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";

export function AppLayout() {
  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content animate-fade-in">
        <Outlet />
      </main>
    </div>
  );
}
