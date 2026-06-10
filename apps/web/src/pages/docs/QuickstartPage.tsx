import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { Zap, Copy, Check } from 'lucide-react';
import { useState } from 'react';

function CodeBlock({ code, lang = 'bash' }: { code: string; lang?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="relative rounded-lg border border-border/50 bg-muted/10 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-border/30 bg-muted/20">
        <span className="text-[10px] font-mono text-muted-foreground">{lang}</span>
        <button
          onClick={() => { navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
          className="text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Copiar"
        >
          {copied ? <Check className="h-3 w-3 text-[#8fa89b]" /> : <Copy className="h-3 w-3" />}
        </button>
      </div>
      <pre className="px-4 py-4 text-xs font-mono text-foreground overflow-x-auto whitespace-pre">{code}</pre>
    </div>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center">
        <div className="w-7 h-7 rounded-full border border-[#8fa89b]/40 bg-[#8fa89b]/10 flex items-center justify-center text-xs font-bold text-[#8fa89b] shrink-0">
          {n}
        </div>
        <div className="flex-1 w-px bg-border/30 mt-2" />
      </div>
      <div className="flex-1 pb-8 space-y-3">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {children}
      </div>
    </div>
  );
}

export function QuickstartPage() {
  useDocumentTitle('Quickstart — Standard');

  return (
    <div className="max-w-3xl space-y-10">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-amber-400" />
          <h1 className="text-2xl font-bold text-foreground">Quickstart</h1>
        </div>
        <p className="text-muted-foreground">Faz a tua primeira chamada API à plataforma Standard em menos de 5 minutos.</p>
      </div>

      <div className="space-y-0">
        <Step n={1} title="Gera uma API Key">
          <p className="text-sm text-muted-foreground">
            Acede a <a href="/dashboard/api-keys" className="text-[#8fa89b] hover:underline">Dashboard → API Keys</a> e
            clica em <strong className="text-foreground">Gerar Nova Chave</strong>. Copia o{' '}
            <code className="text-xs bg-muted/30 px-1 py-0.5 rounded">raw_key</code> — só é exibido uma vez.
          </p>
          <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-amber-300">
            ⚠️ O <code>raw_key</code> é exibido uma única vez. Guarda-o imediatamente num gestor de secrets.
          </div>
        </Step>

        <Step n={2} title="Autenticação Bearer">
          <CodeBlock lang="bash" code={`export STANDARD_API_KEY="sk_live_xxxxxxxxxxxxxxxxxxxx"
export STANDARD_BASE_URL="https://api.standard.com/v1"`} />
        </Step>

        <Step n={3} title="Primeira chamada — listar assessments">
          <CodeBlock lang="bash" code={`curl -X GET "$STANDARD_BASE_URL/assessments" \\
  -H "Authorization: Bearer $STANDARD_API_KEY" \\
  -H "Content-Type: application/json"`} />
          <CodeBlock lang="json" code={`{
  "data": [],
  "meta": { "total": 0, "page": 1, "per_page": 20 }
}`} />
        </Step>

        <Step n={4} title="Criar um assessment">
          <CodeBlock lang="bash" code={`curl -X POST "$STANDARD_BASE_URL/assessments" \\
  -H "Authorization: Bearer $STANDARD_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "Meu Primeiro Assessment",
    "framework_id": "NIST-CSF-2.0",
    "scf_version": "2026.1",
    "organization_id": "org_xxxxxxxxxxxx"
  }'`} />
        </Step>

        <Step n={5} title="Disparar uma tool MCP (assíncrono)">
          <p className="text-sm text-muted-foreground">
            Tools MCP retornam <code className="text-xs bg-muted/30 px-1 py-0.5 rounded">202</code> com{' '}
            <code className="text-xs bg-muted/30 px-1 py-0.5 rounded">job_id</code>. Faz poll até completar.
          </p>
          <CodeBlock lang="bash" code={`# 1. Despacha a tool
curl -X POST "$STANDARD_BASE_URL/mcp/dispatch" \\
  -H "Authorization: Bearer $STANDARD_API_KEY" \\
  -d '{ "tool": "calcular_score_risco_terceiro", "inputs": { "vendor_id": "...", "assessment_id": "..." } }'
# → { "data": { "job_id": "job_abc123", "status": "pending" } }

# 2. Poll até "completed"
curl "$STANDARD_BASE_URL/mcp/jobs/job_abc123" \\
  -H "Authorization: Bearer $STANDARD_API_KEY"`} />
        </Step>
      </div>

      <div className="rounded-xl border border-[#8fa89b]/20 bg-[#8fa89b]/5 p-5 space-y-2">
        <p className="text-sm font-semibold text-[#8fa89b]">Próximos passos</p>
        <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
          <li>Consulta a <a href="/docs/api" className="text-[#8fa89b] hover:underline">API Reference completa</a></li>
          <li>Experimenta as tools MCP no <a href="/dashboard/mcp" className="text-[#8fa89b] hover:underline">MCP Playground</a></li>
          <li>Configura <a href="/dashboard/webhooks" className="text-[#8fa89b] hover:underline">Webhooks</a> para receber eventos em tempo real</li>
        </ul>
      </div>
    </div>
  );
}
