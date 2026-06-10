import { useState } from 'react';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { PageHeader } from '@/components/ui/PageHeader';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ToolExplorer, MCP_TOOLS, type McpToolDef } from '@/components/mcp/ToolExplorer';
import { AsyncTimeline } from '@/components/mcp/AsyncTimeline';
import { JobStatusPoller } from '@/components/mcp/JobStatusPoller';
import { useMcpPlayground } from '@/stores/mcpPlayground.store';
import { toast } from 'sonner';
import { Eye, EyeOff, Play, RotateCcw, Terminal } from 'lucide-react';

/* ── Input field renderer ───────────────────────────────────────── */
function ToolInputs({
  tool,
  values,
  onChange,
}: {
  tool: McpToolDef;
  values: Record<string, string>;
  onChange: (id: string, val: string) => void;
}) {
  return (
    <div className="space-y-4">
      {tool.inputs.map((input) => (
        <div key={input.id} className="space-y-1.5">
          <Label htmlFor={`mcp-input-${input.id}`} className="text-xs text-muted-foreground">
            {input.label}
          </Label>
          {input.type === 'textarea' ? (
            <textarea
              id={`mcp-input-${input.id}`}
              value={values[input.id] ?? ''}
              onChange={(e) => onChange(input.id, e.target.value)}
              placeholder={input.placeholder}
              rows={4}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs font-mono text-muted-foreground focus:text-foreground focus:border-[#8fa89b] outline-none transition-colors resize-none"
            />
          ) : (
            <Input
              id={`mcp-input-${input.id}`}
              value={values[input.id] ?? ''}
              onChange={(e) => onChange(input.id, e.target.value)}
              placeholder={input.placeholder}
              className="font-mono text-xs"
            />
          )}
        </div>
      ))}
    </div>
  );
}

/* ── Main page ──────────────────────────────────────────────────── */
export function McpPlaygroundPage() {
  useDocumentTitle('MCP Playground');

  const {
    apiKey, demoMode,
    selectedTool, status,
    setApiKey, dispatch, reset,
  } = useMcpPlayground();

  const [showKey, setShowKey] = useState(false);
  const [inputValues, setInputValues] = useState<Record<string, string>>({});

  const activeTool = MCP_TOOLS.find((t) => t.name === selectedTool) ?? null;

  const handleInputChange = (id: string, val: string) => {
    setInputValues((prev) => ({ ...prev, [id]: val }));
  };

  /* ── Demo dispatch: uses synthetic fixture ─────────────────────── */
  const handleDemoDispatch = () => {
    const fakeJobId = `demo-${Date.now()}`;
    dispatch(fakeJobId);
    // Simulate completion after 2.5s
    setTimeout(() => {
      useMcpPlayground.getState().setDone({
        tool: activeTool?.name,
        result: {
          risk_score: 0.73,
          risk_category: 'high',
          scf_domain_failures: ['CRY-01', 'IAC-15', 'RSK-04'],
          confidence: 0.89,
          _demo: true,
        },
        trace_id: fakeJobId,
        scf_version: '2026.1',
      });
    }, 2_500);
  };

  /* ── Real dispatch ─────────────────────────────────────────────── */
  const handleRealDispatch = async () => {
    if (!activeTool) return;
    try {
      const res = await fetch('/api/v1/mcp/dispatch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          tool: activeTool.name,
          inputs: inputValues,
        }),
        credentials: 'include',
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err?.error?.message ?? `HTTP ${res.status}`);
        return;
      }

      const data = await res.json();
      const jobId: string = data?.data?.job_id ?? data?.job_id;
      if (!jobId) {
        toast.error('API não retornou job_id');
        return;
      }
      dispatch(jobId);
      toast.success(`Job ${jobId.slice(0, 8)}… despachado`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Falha na chamada');
    }
  };

  const handleDispatch = () => {
    if (!activeTool) return;
    if (demoMode) {
      handleDemoDispatch();
    } else {
      handleRealDispatch();
    }
  };

  const isDispatching = status === 'dispatched' || status === 'polling';

  return (
    <div className="h-full flex flex-col">
      {/* Headless job poller */}
      <JobStatusPoller />

      <PageHeader
        title="MCP Playground"
        description="Testa as tools MCP Standard de forma interactiva — modo demo sem chave ou real com API key."
      />

      {/* API Key input */}
      <div className="flex items-end gap-3 pb-4 border-b border-border/40">
        <div className="flex-1 space-y-1.5 max-w-md">
          <Label htmlFor="mcp-api-key" className="text-xs">
            API Key{' '}
            <span className="text-muted-foreground">(opcional — sem chave = modo demo)</span>
          </Label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Input
                id="mcp-api-key"
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk_live_..."
                className="font-mono text-xs pr-10"
                autoComplete="off"
              />
              <button
                onClick={() => setShowKey((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                type="button"
                aria-label={showKey ? 'Esconder chave' : 'Mostrar chave'}
              >
                {showKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>
        </div>
        {demoMode ? (
          <span className="text-[10px] px-3 py-2 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-400 h-10 flex items-center">
            ⚡ Modo Demo
          </span>
        ) : (
          <span className="text-[10px] px-3 py-2 rounded-full border border-[#8fa89b]/30 bg-[#8fa89b]/10 text-[#8fa89b] h-10 flex items-center">
            ✓ Chave configurada
          </span>
        )}
      </div>

      {/* 3-column layout */}
      <div className="flex-1 flex min-h-0 mt-4 gap-0 rounded-xl border border-border/50 overflow-hidden">

        {/* Left: Tool explorer */}
        <div className="w-64 shrink-0 border-r border-border/50 bg-muted/10 overflow-hidden flex flex-col">
          <ToolExplorer />
        </div>

        {/* Centre: Input panel */}
        <div className="flex-1 flex flex-col min-w-0 border-r border-border/50">
          <div className="flex items-center gap-2 px-5 py-3 border-b border-border/40 bg-muted/10">
            <Terminal className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground">
              {activeTool?.label ?? 'Selecciona uma tool →'}
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-5">
            {!activeTool ? (
              <div className="flex flex-col items-center justify-center h-full text-center space-y-3 text-muted-foreground">
                <Terminal className="h-8 w-8 opacity-20" />
                <p className="text-sm">Selecciona uma tool na sidebar</p>
              </div>
            ) : (
              <div className="space-y-6">
                <div>
                  <p className="text-sm font-medium text-foreground mb-1">{activeTool.label}</p>
                  <p className="text-xs text-muted-foreground">{activeTool.description}</p>
                </div>

                <Separator />

                <ToolInputs
                  tool={activeTool}
                  values={inputValues}
                  onChange={handleInputChange}
                />

                <div className="flex gap-2 pt-2">
                  <Button
                    id="btn-mcp-dispatch"
                    onClick={handleDispatch}
                    disabled={isDispatching}
                    className="gap-2"
                  >
                    {isDispatching ? (
                      <>Processando...</>
                    ) : (
                      <>
                        <Play className="h-3.5 w-3.5" />
                        {demoMode ? 'Executar Demo' : 'Executar Tool'}
                      </>
                    )}
                  </Button>
                  {status !== 'idle' && (
                    <Button
                      id="btn-mcp-reset"
                      variant="ghost"
                      onClick={() => { reset(); setInputValues({}); }}
                      className="gap-2"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      Reset
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: Async timeline + result */}
        <div className="w-80 shrink-0 flex flex-col">
          <div className="px-4 py-3 border-b border-border/40 bg-muted/10">
            <p className="text-xs font-medium text-muted-foreground">Resultado Assíncrono</p>
          </div>
          <div className="flex-1 overflow-hidden">
            <AsyncTimeline />
          </div>
        </div>

      </div>
    </div>
  );
}
