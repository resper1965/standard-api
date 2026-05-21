import { useSession } from "../lib/auth-client";
import { Bell, Search } from "lucide-react";

type PageTopBarProps = {
  title: string;
};

export function PageTopBar({ title }: PageTopBarProps) {
  const { data: session } = useSession();
  const initials = session?.user?.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) ?? "?";

  return (
    <header className="page-topbar glass sticky top-0 z-10 border-b border-white/5 backdrop-blur-md">
      <div className="page-topbar-left">
        <h1 className="text-xl font-brand font-semibold tracking-tight">{title}</h1>
      </div>

      <div className="page-topbar-right">
        <div className="topbar-search-compact">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input type="text" placeholder="Search..." className="topbar-search-input" />
        </div>
        <button className="topbar-icon-btn" aria-label="Notifications">
          <Bell className="h-4 w-4" />
          <span className="topbar-badge">3</span>
        </button>
        <div className="topbar-avatar-sm">{initials}</div>
      </div>
    </header>
  );
}
