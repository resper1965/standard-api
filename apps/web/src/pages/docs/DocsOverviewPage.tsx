import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { BookOpen, Code2, Cpu, ArrowRight, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';

const CARDS = [
  {
    to: '/docs/quickstart',
    icon: Zap,
    title: 'Quickstart',
    description: 'Faz a tua primeira chamada API em menos de 5 minutos.',
    color: 'border-amber-500/20 hover:border-amber-500/40',
    iconColor: 'text-amber-400',
  },
  {
    to: '/docs/api',
    icon: Code2,
    title: 'API Reference',
    description: 'Todos os endpoints, schemas, autenticação e formatos de erro.',
    color: 'border-[#8fa89b]/20 hover:border-[#8fa89b]/40',
    iconColor: 'text-[#8fa89b]',
  },
  {
    to: '/docs/mcp',
    icon: Cpu,
    title: 'MCP Tools',
    description: 'Tools assíncronas para análise de evidências, TPRA e gap analysis.',
    color: 'border-violet-500/20 hover:border-violet-500/40',
    iconColor: 'text-violet-400',
  },
];

export function DocsOverviewPage() {
  useDocumentTitle('Documentação — Standard');

  return (
    <div className="max-w-3xl space-y-12">
      {/* Hero */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <BookOpen className="h-6 w-6 text-[#8fa89b]" />
          <h1 className="text-3xl font-bold text-foreground">Standard Docs</h1>
        </div>
        <p className="text-lg text-muted-foreground leading-relaxed">
          Documentação da plataforma Standard — GRC, Privacy &amp; TPRA API-first.
          Recursos optimizados para programadores clássicos e agentes de IA.
        </p>
        <div className="flex items-center gap-3 flex-wrap">
          <a
            href="/llms.txt"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border border-[#8fa89b]/30 bg-[#8fa89b]/5 text-[#8fa89b] hover:bg-[#8fa89b]/10 transition-colors"
          >
            <Cpu className="h-3 w-3" />
            llms.txt — optimizado para AI agents
          </a>
          <span className="text-xs text-muted-foreground">
            Acesso público — sem login necessário
          </span>
        </div>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {CARDS.map(({ to, icon: Icon, title, description, color, iconColor }) => (
          <Link
            key={to}
            to={to}
            className={`group flex flex-col gap-3 p-5 rounded-xl border bg-card/30 transition-all duration-200 hover:bg-card/60 ${color}`}
          >
            <div className={`w-8 h-8 rounded-lg bg-muted/30 flex items-center justify-center ${iconColor}`}>
              <Icon className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground group-hover:text-[#8fa89b] transition-colors">{title}</p>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{description}</p>
            </div>
            <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors mt-auto" />
          </Link>
        ))}
      </div>

      {/* Stack summary */}
      <div className="rounded-xl border border-border/30 bg-muted/5 p-6 space-y-4">
        <h2 className="text-base font-semibold text-foreground">Stack &amp; Arquitectura</h2>
        <div className="grid grid-cols-2 gap-3 text-sm">
          {[
            ['Runtime', 'Cloudflare Workers + Hono'],
            ['Base de dados', 'PostgreSQL / Neon + Drizzle ORM'],
            ['Autenticação', 'Better Auth + RBAC'],
            ['Async Jobs', 'Cloudflare Queues (ADR-003)'],
            ['Vector Search', 'Cloudflare Vectorize (RAG)'],
            ['SCF', 'Secure Controls Framework 2026.1'],
          ].map(([label, value]) => (
            <div key={label} className="flex flex-col gap-0.5">
              <span className="text-xs text-muted-foreground">{label}</span>
              <span className="text-xs font-mono text-foreground">{value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
