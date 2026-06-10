import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { Code2, Copy, Check } from 'lucide-react';
import { useState } from 'react';

/* ── Inline code block with copy ─────────────────────────────────── */
function CodeBlock({ code, lang = 'bash' }: { code: string; lang?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="relative group rounded-lg border border-border/50 bg-muted/10 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-border/30 bg-muted/20">
        <span className="text-[10px] font-mono text-muted-foreground">{lang}</span>
        <button onClick={copy} className="text-muted-foreground hover:text-foreground transition-colors" aria-label="Copiar">
          {copied ? <Check className="h-3 w-3 text-[#8fa89b]" /> : <Copy className="h-3 w-3" />}
        </button>
      </div>
      <pre className="px-4 py-4 text-xs font-mono text-foreground overflow-x-auto whitespace-pre">{code}</pre>
    </div>
  );
}

/* ── Endpoint card ────────────────────────────────────────────────── */
function Endpoint({
  method, path, description, auth = true,
}: { method: string; path: string; description: string; auth?: boolean }) {
  const methodColor: Record<string, string> = {
    GET: 'text-[#8fa89b] bg-[#8fa89b]/10 border-[#8fa89b]/20',
    POST: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    DELETE: 'text-red-400 bg-red-500/10 border-red-500/20',
    PATCH: 'text-violet-400 bg-violet-500/10 border-violet-500/20',
  };
  return (
    <div className="flex items-start gap-3 py-3 border-b border-border/30 last:border-0">
      <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded border font-mono ${methodColor[method] ?? 'text-muted-foreground bg-muted/30 border-border/50'}`}>
        {method}
      </span>
      <div className="flex-1 min-w-0">
        <code className="text-xs font-mono text-foreground">{path}</code>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
      {auth && (
        <span className="text-[9px] px-1.5 py-0.5 rounded border border-border/30 text-muted-foreground/50 shrink-0">
          Bearer
        </span>
      )}
    </div>
  );
}

/* ── Section heading ─────────────────────────────────────────────── */
function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="space-y-4 scroll-mt-20">
      <h2 className="text-lg font-semibold text-foreground border-b border-border/30 pb-2">{title}</h2>
      {children}
    </section>
  );
}

/* ── Main page ───────────────────────────────────────────────────── */
export function ApiReferencePage() {
  useDocumentTitle('API Reference — Standard');

  return (
    <div className="max-w-4xl space-y-12">
      {/* Header */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Code2 className="h-5 w-5 text-[#8fa89b]" />
          <h1 className="text-2xl font-bold text-foreground">API Reference</h1>
        </div>
        <p className="text-muted-foreground leading-relaxed">
          API REST versão <code className="text-xs bg-muted/30 px-1.5 py-0.5 rounded font-mono">v1</code>.
          Todos os endpoints requerem autenticação Bearer (API Key ou sessão). Base URL:{' '}
          <code className="text-xs bg-muted/30 px-1.5 py-0.5 rounded font-mono">https://api.standard.com/v1</code>
        </p>
      </div>

      {/* Auth */}
      <Section id="authentication" title="Autenticação">
        <p className="text-sm text-muted-foreground">
          Todas as chamadas M2M usam Bearer token. Obtém uma API Key em{' '}
          <a href="/dashboard/api-keys" className="text-[#8fa89b] hover:underline">Dashboard → API Keys</a>.
        </p>
        <CodeBlock lang="http" code={`GET /v1/assessments HTTP/1.1
Authorization: Bearer sk_live_xxxxxxxxxxxxxxxxxxxx
Content-Type: application/json`} />
      </Section>

      {/* Assessment */}
      <Section id="assessments" title="Assessments">
        <div className="rounded-lg border border-border/40 bg-card/30 overflow-hidden">
          <Endpoint method="GET"    path="/v1/assessments"           description="Lista assessments da organização" />
          <Endpoint method="POST"   path="/v1/assessments"           description="Cria novo assessment (estado: draft)" />
          <Endpoint method="GET"    path="/v1/assessments/:id"       description="Detalhe de um assessment específico" />
          <Endpoint method="PATCH"  path="/v1/assessments/:id"       description="Actualiza metadados do assessment" />
        </div>
        <CodeBlock lang="json" code={`// POST /v1/assessments
{
  "name": "ISO 27001 Assessment Q3 2026",
  "framework_id": "ISO-27001-2022",
  "scf_version": "2026.1",
  "organization_id": "org_xxxxxxxxxxxx"
}`} />
      </Section>

      {/* API Keys */}
      <Section id="api-keys" title="API Keys">
        <div className="rounded-lg border border-border/40 bg-card/30 overflow-hidden">
          <Endpoint method="GET"    path="/v1/api-keys"              description="Lista chaves da organização (masked)" />
          <Endpoint method="POST"   path="/v1/api-keys"              description="Cria nova chave — raw_key retornado uma única vez" />
          <Endpoint method="DELETE" path="/v1/api-keys/:id"          description="Revoga chave imediatamente (401 instantâneo)" />
          <Endpoint method="PATCH"  path="/v1/api-keys/:id"          description="Actualiza nome ou expiração" />
        </div>
        <CodeBlock lang="json" code={`// POST /v1/api-keys — response (única exibição)
{
  "data": {
    "id": "key_xxxxxxxxxxxx",
    "name": "CI/CD Pipeline",
    "masked_key": "sk_live_xxxx...xxxx",
    "raw_key": "sk_live_xxxxxxxxxxxxxxxxxxxx",  // one-shot
    "scopes": ["assessment:read", "tpra:read"],
    "created_at": "2026-06-10T17:00:00Z"
  }
}`} />
      </Section>

      {/* MCP Tools */}
      <Section id="mcp" title="MCP Tools (Async)">
        <p className="text-sm text-muted-foreground">
          Todas as tools MCP são processadas de forma assíncrona (ADR-003).{' '}
          <code className="text-xs bg-muted/30 px-1.5 py-0.5 rounded">POST /v1/mcp/dispatch</code> retorna{' '}
          <code className="text-xs bg-muted/30 px-1.5 py-0.5 rounded">202</code> com{' '}
          <code className="text-xs bg-muted/30 px-1.5 py-0.5 rounded">job_id</code>.
          Faz poll em <code className="text-xs bg-muted/30 px-1.5 py-0.5 rounded">/v1/mcp/jobs/:job_id</code>.
        </p>
        <div className="rounded-lg border border-border/40 bg-card/30 overflow-hidden">
          <Endpoint method="POST"   path="/v1/mcp/dispatch"          description="Despacha tool assincronamente — retorna 202 + job_id" />
          <Endpoint method="GET"    path="/v1/mcp/jobs/:id"          description="Consulta estado do job (pending | completed | failed)" />
          <Endpoint method="GET"    path="/v1/mcp/tools"             description="Lista tools disponíveis e schemas de input" />
        </div>
        <CodeBlock lang="json" code={`// POST /v1/mcp/dispatch
{ "tool": "calcular_score_risco_terceiro", "inputs": { "vendor_id": "...", "assessment_id": "..." } }

// 202 Response
{ "data": { "job_id": "job_xxxxxxxxxxxx", "status": "pending", "estimated_seconds": 8 } }

// GET /v1/mcp/jobs/job_xxxxxxxxxxxx — completed
{ "data": { "status": "completed", "result": { "risk_score": 0.73, "risk_category": "high" } } }`} />
      </Section>

      {/* Webhooks */}
      <Section id="webhooks" title="Webhooks">
        <div className="rounded-lg border border-border/40 bg-card/30 overflow-hidden">
          <Endpoint method="GET"    path="/v1/webhooks"              description="Lista endpoints registados" />
          <Endpoint method="POST"   path="/v1/webhooks"              description="Registar novo endpoint (retorna signing_secret uma vez)" />
          <Endpoint method="DELETE" path="/v1/webhooks/:id"          description="Remove endpoint" />
          <Endpoint method="POST"   path="/v1/webhooks/:id/test"     description="Envia evento de teste" />
          <Endpoint method="POST"   path="/v1/webhooks/:id/rotate-secret" description="Rotaciona signing secret (retorna novo, one-shot)" />
        </div>

        <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-4 space-y-2">
          <p className="text-xs font-semibold text-amber-400">Eventos disponíveis (G15)</p>
          <div className="flex flex-wrap gap-1.5">
            {[
              'assessment.created','assessment.status_changed','assessment.closed',
              'gap.approved','maturity.approved','poam.approved','report.generated',
              'document.uploaded',
              'tpra.assessment.completed','vendor.risk_score.updated','ledger.audit.alert',
              'api_key.created','api_key.revoked',
            ].map((ev) => (
              <code key={ev} className="text-[10px] px-2 py-0.5 bg-muted/30 rounded border border-border/40 text-muted-foreground">
                {ev}
              </code>
            ))}
          </div>
        </div>
      </Section>

      {/* TPRA */}
      <Section id="tpra" title="TPRA — Third-Party Risk">
        <div className="rounded-lg border border-border/40 bg-card/30 overflow-hidden">
          <Endpoint method="GET"    path="/v1/tpra/vendors"          description="Lista vendors da organização" />
          <Endpoint method="POST"   path="/v1/tpra/vendors"          description="Regista novo vendor" />
          <Endpoint method="GET"    path="/v1/tpra/assessments"      description="Lista TPRA assessments" />
          <Endpoint method="POST"   path="/v1/tpra/assessments"      description="Inicia TPRA assessment para um vendor" />
          <Endpoint method="GET"    path="/v1/tpra/risk-scores"      description="Consulta scores de risco calculados" />
        </div>
      </Section>

      {/* Error format */}
      <Section id="errors" title="Formato de Erros">
        <CodeBlock lang="json" code={`{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "O campo 'scopes' é obrigatório",
    "trace_id": "trc_xxxxxxxxxxxx",
    "details": [
      { "field": "scopes", "issue": "required" }
    ]
  }
}`} />
      </Section>
    </div>
  );
}
