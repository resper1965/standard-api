import { useMcpPlayground, type JobStatus } from '@/stores/mcpPlayground.store';
import { CheckCircle2, Clock, Loader2, XCircle, Zap } from 'lucide-react';

/* ── Demo fixture for unauthenticated visitors ──────────────────────── */
const DEMO_RESULT = {
  tool: 'calcular_score_risco_terceiro',
  result: {
    risk_score: 0.73,
    risk_category: 'high',
    scf_domain_failures: ['CRY-01', 'IAC-15', 'RSK-04'],
    confidence: 0.89,
  },
  trace_id: 'demo-trace-abc123',
  scf_version: '2026.1',
};

type TimelineStep = {
  status: JobStatus;
  label: string;
  sublabel?: string;
};

const STEPS: TimelineStep[] = [
  { status: 'dispatched', label: '202 Accepted', sublabel: 'job_id recebido' },
  { status: 'polling', label: 'Processando...', sublabel: 'Computando via AI Gateway' },
  { status: 'done', label: 'Resultado', sublabel: 'Concluído' },
];

function stepState(step: JobStatus, current: JobStatus): 'done' | 'active' | 'pending' {
  const order: JobStatus[] = ['idle', 'dispatched', 'polling', 'done', 'error'];
  const si = order.indexOf(step);
  const ci = order.indexOf(current);
  if (si < ci) return 'done';
  if (si === ci) return 'active';
  return 'pending';
}

export function AsyncTimeline() {
  const { status, jobId, result, error, demoMode } = useMcpPlayground();

  /* ── Idle state ─────────────────────────────────────────────────── */
  if (status === 'idle') {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8 space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-muted/40 flex items-center justify-center">
          <Zap className="h-6 w-6 text-muted-foreground/40" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">
            {demoMode ? 'Modo demonstração activo' : 'Pronto para disparar'}
          </p>
          <p className="text-xs text-muted-foreground/60 mt-1">
            {demoMode
              ? 'Adiciona uma API key para fazer chamadas reais'
              : 'Selecciona uma tool e preenche os inputs'}
          </p>
        </div>
        {demoMode && (
          <span className="text-[10px] px-3 py-1 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-400">
            Sem chave — dados sintéticos serão usados
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="p-5 space-y-5 h-full overflow-y-auto">
      {/* Demo badge */}
      {demoMode && (
        <div className="text-[10px] px-3 py-1.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-center">
          ⚡ Modo demonstração — dados sintéticos
        </div>
      )}

      {/* Timeline steps */}
      <div className="space-y-4">
        {STEPS.map(({ status: stepStatus, label, sublabel }) => {
          const state = stepState(stepStatus, status === 'error' ? 'error' : status);

          return (
            <div key={stepStatus} className="flex items-start gap-3">
              {/* Icon */}
              <div className="mt-0.5 shrink-0">
                {state === 'done' ? (
                  <CheckCircle2 className="h-4 w-4 text-[#8fa89b]" />
                ) : state === 'active' && stepStatus === 'polling' ? (
                  <Loader2 className="h-4 w-4 text-[#8fa89b] animate-spin" />
                ) : state === 'active' ? (
                  <div className="h-4 w-4 rounded-full border-2 border-[#8fa89b] bg-[#8fa89b]/10 animate-pulse" />
                ) : (
                  <div className="h-4 w-4 rounded-full border border-border" />
                )}
              </div>

              {/* Content */}
              <div className={`flex-1 transition-opacity ${state === 'pending' ? 'opacity-30' : ''}`}>
                <p className={`text-sm font-medium ${state !== 'pending' ? 'text-foreground' : 'text-muted-foreground'}`}>
                  {label}
                </p>

                {/* job_id on dispatched */}
                {stepStatus === 'dispatched' && state !== 'pending' && jobId && (
                  <p className="font-mono text-xs text-muted-foreground mt-0.5">
                    job_id: <span className="text-[#8fa89b]">{jobId}</span>
                  </p>
                )}

                {/* Polling sublabel */}
                {stepStatus === 'polling' && state === 'active' && (
                  <p className="text-xs text-muted-foreground mt-0.5 animate-pulse">{sublabel}...</p>
                )}

                {/* Done sublabel */}
                {stepStatus === 'done' && state === 'done' && (
                  <p className="text-xs text-[#8fa89b] mt-0.5">✓ {sublabel}</p>
                )}
              </div>
            </div>
          );
        })}

        {/* Error state */}
        {status === 'error' && (
          <div className="flex items-start gap-3">
            <XCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-destructive">Erro</p>
              <p className="text-xs text-muted-foreground mt-0.5">{error}</p>
            </div>
          </div>
        )}
      </div>

      {/* Result JSON */}
      {status === 'done' && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Resultado</p>
          <div className="rounded-lg bg-muted/20 border border-border p-3 overflow-auto max-h-72 scrollbar-premium">
            <pre className="text-xs font-mono text-foreground whitespace-pre-wrap break-all">
              {JSON.stringify(result ?? DEMO_RESULT, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
