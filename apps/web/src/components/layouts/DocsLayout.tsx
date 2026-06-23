import { Outlet, NavLink } from 'react-router-dom';
import { BookOpen, Code2, Cpu, ExternalLink, Zap } from 'lucide-react';

const NAV_ITEMS = [
  { to: '/docs', label: 'Visão Geral', icon: BookOpen, end: true },
  { to: '/docs/api', label: 'API Reference', icon: Code2, end: false },
  { to: '/docs/mcp', label: 'MCP Tools', icon: Cpu, end: false },
  { to: '/docs/quickstart', label: 'Quickstart', icon: Zap, end: false },
];

/**
 * DocsLayout — public layout accessible without authentication.
 * Optimised for AI agents (Cursor, Claude Code, Antigravity) and classic devs.
 * No auth check — intentionally public.
 */
export function DocsLayout() {
  return (
    <div className="min-h-screen bg-[#1a1d20] text-foreground font-sans">
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-border/40 bg-[#1a1d20]/95 backdrop-blur supports-[backdrop-filter]:bg-[#1a1d20]/80">
        <div className="max-w-screen-xl mx-auto flex items-center justify-between h-14 px-6">
          <div className="flex items-center gap-3">
            {/* Logo */}
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-md bg-[#8fa89b]/20 border border-[#8fa89b]/30 flex items-center justify-center">
                <BookOpen className="h-3 w-3 text-[#8fa89b]" />
              </div>
              <span className="text-sm font-semibold text-foreground">Standard</span>
              <span className="text-xs text-muted-foreground">Docs</span>
            </div>

            {/* Nav */}
            <nav className="hidden md:flex items-center gap-1 ml-6">
              {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  className={({ isActive }) =>
                    `flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs transition-colors ${
                      isActive
                        ? 'bg-[#8fa89b]/10 text-[#8fa89b]'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/20'
                    }`
                  }
                >
                  <Icon className="h-3 w-3" />
                  {label}
                </NavLink>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <a
              href="/llms.txt"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              title="llms.txt — optimised for AI agents"
            >
              <ExternalLink className="h-3 w-3" />
              llms.txt
            </a>
            <NavLink
              to="/login"
              className="text-xs px-3 py-1.5 rounded-md bg-[#8fa89b]/10 border border-[#8fa89b]/20 text-[#8fa89b] hover:bg-[#8fa89b]/20 transition-colors"
            >
              Entrar →
            </NavLink>
          </div>
        </div>
      </header>

      {/* Page content */}
      <main className="max-w-screen-xl mx-auto px-6 py-10">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="border-t border-border/30 mt-20">
        <div className="max-w-screen-xl mx-auto px-6 py-6 flex items-center justify-between text-xs text-muted-foreground">
          <span>Standard Platform — API-first GRC &amp; Privacy</span>
          <span>Docs públicos — acessíveis sem autenticação a agentes e programadores</span>
        </div>
      </footer>
    </div>
  );
}
