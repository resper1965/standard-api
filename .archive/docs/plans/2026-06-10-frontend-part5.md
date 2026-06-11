# Frontend Part 5 — Admin Console + Developer Portal Implementation Plan

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Implementar 4 módulos frontend — API Keys (G13), MCP Playground (G14), Webhook Manager (G15) e API Reference — sobre o Vite SPA Nordic Tech existente.

**Architecture:** Vite SPA com React 19 + React Router. Novos módulos admin em `/admin/api-keys`, portal público em `/docs/*`. Estado global via Zustand (secret one-shot + MCP job status). Dados de servidor via TanStack Query. Nordic Tech design system mantido integralmente.

**Tech Stack:** React 19, Vite, React Router DOM 7, TanStack Query 5, Zustand, Radix UI, Tailwind CSS, Sonner (toasts), react-json-view-lite (payload inspector), shadcn/ui Sheet + AlertDialog + Badge + Tabs

**Design Doc:** `docs/plans/2026-06-10-frontend-part5-design.md`

---

## Task 1: Instalar dependências e configurar Shadcn components

**Files:**
- Modify: `apps/web/package.json`
- Modify: `apps/web/src/router.tsx`

**Step 1: Instalar dependências runtime**

```bash
cd apps/web
pnpm add zustand sonner react-json-view-lite
```

Expected: `packages installed` sem erros de peer deps.

**Step 2: Adicionar componentes Shadcn via CLI**

```bash
cd apps/web
npx shadcn@latest add sheet alert-dialog badge tabs scroll-area separator sonner
```

Expected: ficheiros criados em `src/components/ui/` (sheet.tsx, alert-dialog.tsx, badge.tsx, tabs.tsx, scroll-area.tsx, separator.tsx, sonner.tsx).

**Step 3: Adicionar `<Toaster />` ao root**

Em `apps/web/src/main.tsx`, adicionar:
```tsx
import { Toaster } from '@/components/ui/sonner';
// ...dentro do JSX root:
<Toaster theme="dark" position="bottom-right" />
```

**Step 4: Verificar typecheck**

```bash
cd apps/web && npx tsc --noEmit
```
Expected: 0 erros.

**Step 5: Commit**

```bash
git add apps/web/package.json apps/web/src/main.tsx apps/web/src/components/ui/
git commit -m "feat(web): add zustand, sonner, react-json-view-lite + shadcn sheet/alert-dialog/badge/tabs"
```

---

## Task 2: Zustand stores — SecretDisplay + McpPlayground

**Files:**
- Create: `apps/web/src/stores/secretDisplay.store.ts`
- Create: `apps/web/src/stores/mcpPlayground.store.ts`

**Step 1: Criar `secretDisplay.store.ts`**

```ts
// apps/web/src/stores/secretDisplay.store.ts
import { create } from 'zustand';

interface SecretDisplayStore {
  token: string | null;
  copied: boolean;
  set: (token: string) => void;
  markCopied: () => void;
  /** CRÍTICO: chamar sempre que o modal fechar — destrói o token */
  clear: () => void;
}

export const useSecretDisplay = create<SecretDisplayStore>((set) => ({
  token: null,
  copied: false,
  set: (token) => set({ token, copied: false }),
  markCopied: () => set({ copied: true }),
  clear: () => set({ token: null, copied: false }),
}));
```

**Step 2: Criar `mcpPlayground.store.ts`**

```ts
// apps/web/src/stores/mcpPlayground.store.ts
import { create } from 'zustand';

export type JobStatus = 'idle' | 'dispatched' | 'polling' | 'done' | 'error';

interface McpPlaygroundStore {
  apiKey: string;
  selectedTool: string | null;
  jobId: string | null;
  status: JobStatus;
  result: unknown | null;
  error: string | null;
  demoMode: boolean;
  setApiKey: (key: string) => void;
  selectTool: (tool: string) => void;
  dispatch: (jobId: string) => void;
  setPolling: () => void;
  setDone: (result: unknown) => void;
  setError: (error: string) => void;
  reset: () => void;
}

export const useMcpPlayground = create<McpPlaygroundStore>((set, get) => ({
  apiKey: '',
  selectedTool: null,
  jobId: null,
  status: 'idle',
  result: null,
  error: null,
  get demoMode() { return !get().apiKey; },
  setApiKey: (apiKey) => set({ apiKey }),
  selectTool: (tool) => set({ selectedTool: tool, status: 'idle', result: null, error: null, jobId: null }),
  dispatch: (jobId) => set({ jobId, status: 'dispatched' }),
  setPolling: () => set({ status: 'polling' }),
  setDone: (result) => set({ status: 'done', result }),
  setError: (error) => set({ status: 'error', error }),
  reset: () => set({ status: 'idle', jobId: null, result: null, error: null }),
}));
```

**Step 3: Verificar tipos**

```bash
cd apps/web && npx tsc --noEmit
```
Expected: 0 erros.

**Step 4: Commit**

```bash
git add apps/web/src/stores/
git commit -m "feat(web): add zustand stores — secret display one-shot + mcp playground job state"
```

---

## Task 3: SecretDisplayOverlay + CreateApiKeyModal (G13)

**Files:**
- Create: `apps/web/src/components/api-keys/SecretDisplayOverlay.tsx`
- Create: `apps/web/src/components/api-keys/CreateApiKeyModal.tsx`

**Step 1: `SecretDisplayOverlay.tsx`**

```tsx
// apps/web/src/components/api-keys/SecretDisplayOverlay.tsx
import { useState } from 'react';
import { Copy, Check, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';
import { useSecretDisplay } from '@/stores/secretDisplay.store';

export function SecretDisplayOverlay() {
  const { token, copied, markCopied } = useSecretDisplay();
  if (!token) return null;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(token);
    markCopied();
    toast.success('Chave copiada para a área de transferência');
  };

  return (
    <div className="rounded-lg border border-amber-500/50 bg-amber-950/40 p-5 space-y-4">
      {/* Aviso */}
      <div className="flex items-start gap-3">
        <ShieldAlert className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
        <p className="text-sm text-amber-200 leading-relaxed">
          <strong>Esta chave não poderá ser recuperada ou exibida novamente.</strong>
          {' '}Copia-a agora e guarda num gestor de secrets seguro.
        </p>
      </div>

      {/* Token */}
      <div className="flex items-center gap-3 rounded-md bg-background/60 border border-border px-4 py-3">
        <code className="font-mono text-sm text-foreground flex-1 break-all select-all">
          {token}
        </code>
        <button
          onClick={handleCopy}
          className="shrink-0 p-2 rounded-md hover:bg-muted transition-colors"
          aria-label="Copiar chave"
        >
          {copied
            ? <Check className="h-4 w-4 text-[#8fa89b]" />
            : <Copy className="h-4 w-4 text-muted-foreground" />
          }
        </button>
      </div>

      {copied && (
        <p className="text-xs text-[#8fa89b] text-center">
          ✓ Copiado — podes fechar este painel
        </p>
      )}
    </div>
  );
}
```

**Step 2: `CreateApiKeyModal.tsx`** — Sheet com 3 steps

```tsx
// apps/web/src/components/api-keys/CreateApiKeyModal.tsx
import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { SecretDisplayOverlay } from './SecretDisplayOverlay';
import { useSecretDisplay } from '@/stores/secretDisplay.store';
import { useMutation, useQueryClient } from '@tanstack/react-query';

const SCOPE_GROUPS = {
  Assessment: ['assessment:read', 'assessment:create'],
  TPRA: ['tpra:read', 'tpra:write'],
  Privacy: ['privacy:read', 'privacy:write'],
  KB: ['kb:read', 'kb:write'],
  Admin: ['admin:read'],
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateApiKeyModal({ open, onOpenChange }: Props) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [name, setName] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [scopes, setScopes] = useState<string[]>([]);
  const { set: setToken, clear } = useSecretDisplay();
  const qc = useQueryClient();

  const handleClose = (v: boolean) => {
    if (!v) {
      // CRÍTICO: destruir token ao fechar (G13)
      clear();
      setStep(1);
      setName('');
      setExpiresAt('');
      setScopes([]);
    }
    onOpenChange(v);
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/v1/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, scopes, expiresAt: expiresAt || undefined }),
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Falha ao criar chave');
      return res.json();
    },
    onSuccess: (data) => {
      setToken(data.data.raw_key); // raw_key só existe nesta resposta
      qc.invalidateQueries({ queryKey: ['api-keys'] });
      setStep(3);
    },
  });

  const toggleScope = (scope: string) =>
    setScopes(prev => prev.includes(scope) ? prev.filter(s => s !== scope) : [...prev, scope]);

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>
            {step === 1 && 'Nova Chave de API — Detalhes'}
            {step === 2 && 'Nova Chave de API — Escopos'}
            {step === 3 && 'Chave Gerada'}
          </SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Step indicator */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {[1, 2, 3].map(s => (
              <span key={s} className={`flex items-center gap-2 ${step === s ? 'text-[#8fa89b]' : ''}`}>
                <span className={`w-5 h-5 rounded-full flex items-center justify-center border text-[10px]
                  ${step === s ? 'border-[#8fa89b] text-[#8fa89b]' : step > s ? 'border-[#8fa89b] bg-[#8fa89b]/10' : 'border-border'}`}>
                  {s}
                </span>
                {s < 3 && <span className="w-8 h-px bg-border" />}
              </span>
            ))}
          </div>

          {step === 1 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="key-name">Nome / Propósito</Label>
                <Input id="key-name" placeholder="ex: Integração Hub GRC Interno" value={name} onChange={e => setName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="key-expires">Expiração (opcional)</Label>
                <Input id="key-expires" type="date" value={expiresAt} onChange={e => setExpiresAt(e.target.value)} />
              </div>
              <Button className="w-full" onClick={() => setStep(2)} disabled={!name.trim()}>
                Continuar →
              </Button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              {Object.entries(SCOPE_GROUPS).map(([group, groupScopes]) => (
                <div key={group} className="space-y-3">
                  <p className="text-sm font-medium text-foreground">{group}</p>
                  {groupScopes.map(scope => (
                    <div key={scope} className="flex items-center gap-3">
                      <Checkbox id={scope} checked={scopes.includes(scope)} onCheckedChange={() => toggleScope(scope)} />
                      <Label htmlFor={scope} className="font-mono text-xs text-muted-foreground cursor-pointer">{scope}</Label>
                    </div>
                  ))}
                </div>
              ))}
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep(1)}>← Voltar</Button>
                <Button className="flex-1" onClick={() => createMutation.mutate()} disabled={scopes.length === 0 || createMutation.isPending}>
                  {createMutation.isPending ? 'Gerando...' : 'Gerar Chave'}
                </Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <SecretDisplayOverlay />
              <Button variant="outline" className="w-full" onClick={() => handleClose(false)}>
                Fechar
              </Button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
```

**Step 3: Commit**

```bash
git add apps/web/src/components/api-keys/
git commit -m "feat(web/g13): secret display overlay + create api key modal — one-shot token reveal"
```

---

## Task 4: Página `/admin/api-keys`

**Files:**
- Create: `apps/web/src/pages/admin/ApiKeys.tsx`
- Modify: `apps/web/src/router.tsx` — adicionar rota

**Step 1: Criar `ApiKeys.tsx`**

```tsx
// apps/web/src/pages/admin/ApiKeys.tsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Key } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { CreateApiKeyModal } from '@/components/api-keys/CreateApiKeyModal';
import { toast } from 'sonner';

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function ApiKeysPage() {
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['api-keys'],
    queryFn: async () => {
      const res = await fetch('/api/v1/api-keys', { credentials: 'include' });
      return res.json();
    },
  });

  const revokeMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/v1/api-keys/${id}`, { method: 'DELETE', credentials: 'include' });
      if (!res.ok) throw new Error('Falha ao revogar');
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['api-keys'] });
      toast.success('Chave revogada — 401 imediato em todas as chamadas activas');
    },
    onError: () => toast.error('Falha ao revogar a chave'),
  });

  const keys = data?.data ?? [];

  return (
    <div className="space-y-6 animate-page-enter">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Chaves de API</h1>
          <p className="text-sm text-muted-foreground mt-1">Gerencie credenciais programáticas de acesso M2M.</p>
        </div>
        <Button onClick={() => setOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" /> Nova Chave
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/30 text-muted-foreground text-xs uppercase tracking-wider">
              <th className="px-4 py-3 text-left">Chave</th>
              <th className="px-4 py-3 text-left">Escopos</th>
              <th className="px-4 py-3 text-left">Criada em</th>
              <th className="px-4 py-3 text-left">Último uso</th>
              <th className="px-4 py-3 text-right">Acções</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">Carregando...</td></tr>
            )}
            {keys.map((k: any) => (
              <tr key={k.id} className="hover:bg-muted/20 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Key className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="font-mono text-xs">{k.maskedKey}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{k.name}</p>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {(k.scopes ?? []).map((s: string) => (
                      <Badge key={s} variant="secondary" className="font-mono text-[10px]">{s}</Badge>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{formatDate(k.createdAt)}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  {k.lastUsedAt ? formatDate(k.lastUsedAt) : '—'}
                </td>
                <td className="px-4 py-3 text-right">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive hover:bg-destructive/10 gap-1.5">
                        <Trash2 className="h-3.5 w-3.5" /> Revogar
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Revogar chave de API?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Esta acção é irreversível. A chave <code className="font-mono text-xs bg-muted px-1 rounded">{k.maskedKey}</code> será invalidada imediatamente e todas as chamadas activas receberão 401.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          className="bg-destructive hover:bg-destructive/90"
                          onClick={() => revokeMutation.mutate(k.id)}
                        >
                          Revogar agora
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <CreateApiKeyModal open={open} onOpenChange={setOpen} />
    </div>
  );
}
```

**Step 2: Adicionar rota em `router.tsx`**

No array de rotas admin existente, adicionar:
```tsx
import ApiKeysPage from '@/pages/admin/ApiKeys';
// ...
{ path: '/admin/api-keys', element: <ApiKeysPage /> }
```

**Step 3: Verificar typecheck**

```bash
cd apps/web && npx tsc --noEmit
```
Expected: 0 erros.

**Step 4: Commit**

```bash
git add apps/web/src/pages/admin/ApiKeys.tsx apps/web/src/router.tsx
git commit -m "feat(web/g13): /admin/api-keys page — api key management with revoke + secret display"
```

---

## Task 5: AsyncTimeline + JobStatusPoller (G14)

**Files:**
- Create: `apps/web/src/components/mcp/AsyncTimeline.tsx`
- Create: `apps/web/src/components/mcp/JobStatusPoller.tsx`

**Step 1: `AsyncTimeline.tsx`**

```tsx
// apps/web/src/components/mcp/AsyncTimeline.tsx
import { useMcpPlayground, type JobStatus } from '@/stores/mcpPlayground.store';
import { CheckCircle2, Clock, Loader2, XCircle } from 'lucide-react';

const steps: { status: JobStatus; label: string }[] = [
  { status: 'dispatched', label: '202 Accepted' },
  { status: 'polling', label: 'Processando...' },
  { status: 'done', label: 'Resultado' },
];

export function AsyncTimeline() {
  const { status, jobId, result, error, demoMode } = useMcpPlayground();

  if (status === 'idle') {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground p-8 space-y-3">
        <Clock className="h-8 w-8 opacity-30" />
        <p className="text-sm">{demoMode ? 'Modo demonstração — sem chave de API' : 'Pronto para disparar'}</p>
        <p className="text-xs opacity-60">Selecciona uma tool e preenche os inputs</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4">
      {demoMode && (
        <div className="text-xs px-3 py-1.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-center">
          Modo demonstração — dados sintéticos
        </div>
      )}

      {/* Timeline steps */}
      <div className="space-y-3">
        {steps.map(({ status: stepStatus, label }) => {
          const isActive = status === stepStatus;
          const isDone = stepStatus === 'done'
            ? status === 'done'
            : ['polling', 'done'].includes(status) && stepStatus === 'dispatched'
              || status === 'done' && stepStatus === 'polling';
          const isPast = !isActive && isDone;

          return (
            <div key={stepStatus} className={`flex items-start gap-3 transition-opacity ${!isActive && !isDone && stepStatus !== 'done' ? 'opacity-30' : ''}`}>
              <div className="mt-0.5">
                {isActive && stepStatus === 'polling'
                  ? <Loader2 className="h-4 w-4 text-[#8fa89b] animate-spin" />
                  : isDone || isPast
                  ? <CheckCircle2 className="h-4 w-4 text-[#8fa89b]" />
                  : <div className="h-4 w-4 rounded-full border border-border" />
                }
              </div>
              <div className="flex-1">
                <p className={`text-sm font-medium ${isActive ? 'text-foreground' : 'text-muted-foreground'}`}>{label}</p>
                {stepStatus === 'dispatched' && (status === 'dispatched' || isDone) && jobId && (
                  <p className="font-mono text-xs text-muted-foreground mt-0.5">job_id: {jobId}</p>
                )}
                {stepStatus === 'polling' && isActive && (
                  <p className="text-xs text-muted-foreground mt-0.5 animate-pulse">Computando inferência via AI Gateway...</p>
                )}
              </div>
            </div>
          );
        })}

        {status === 'error' && (
          <div className="flex items-start gap-3 text-destructive">
            <XCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium">Erro</p>
              <p className="text-xs mt-0.5">{error}</p>
            </div>
          </div>
        )}
      </div>

      {/* Result JSON */}
      {status === 'done' && result && (
        <div className="rounded-lg bg-muted/30 border border-border p-3 overflow-auto max-h-64">
          <pre className="text-xs font-mono text-foreground whitespace-pre-wrap">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
```

**Step 2: `JobStatusPoller.tsx`**

```tsx
// apps/web/src/components/mcp/JobStatusPoller.tsx
import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useMcpPlayground } from '@/stores/mcpPlayground.store';

// Fixtures sintéticos para demo mode
const DEMO_RESULT = {
  tool: 'calcular_score_risco_terceiro',
  result: { risk_score: 0.73, risk_category: 'high', scf_domain_failures: ['CRY-01', 'IAC-15'] },
  confidence: 0.89,
  trace_id: 'demo-trace-abc123',
};

export function JobStatusPoller() {
  const { jobId, status, apiKey, demoMode, setPolling, setDone, setError } = useMcpPlayground();

  // Demo mode simulation
  useEffect(() => {
    if (!demoMode || status !== 'dispatched') return;
    const t1 = setTimeout(() => setPolling(), 800);
    const t2 = setTimeout(() => setDone(DEMO_RESULT), 3200);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [demoMode, status]);

  // Real mode poll
  const { data } = useQuery({
    queryKey: ['mcp-job', jobId],
    queryFn: async () => {
      const res = await fetch(`/api/v1/jobs/${jobId}`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      return res.json();
    },
    enabled: !demoMode && !!jobId && (status === 'dispatched' || status === 'polling'),
    refetchInterval: 2000,
  });

  useEffect(() => {
    if (!data) return;
    if (data.status === 'processing') setPolling();
    if (data.status === 'completed') setDone(data.result);
    if (data.status === 'failed') setError(data.error ?? 'Erro desconhecido');
  }, [data]);

  return null; // componente invisível — apenas side-effects
}
```

**Step 3: Commit**

```bash
git add apps/web/src/components/mcp/
git commit -m "feat(web/g14): async timeline + job status poller — 202 pattern with demo/real mode"
```

---

## Task 6: ToolExplorer + Página MCP Playground (G14)

**Files:**
- Create: `apps/web/src/components/mcp/ToolExplorer.tsx`
- Create: `apps/web/src/pages/docs/McpPlayground.tsx`

**Step 1: `ToolExplorer.tsx`**

```tsx
// apps/web/src/components/mcp/ToolExplorer.tsx
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Zap } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useMcpPlayground } from '@/stores/mcpPlayground.store';
import { ScrollArea } from '@/components/ui/scroll-area';

export function ToolExplorer() {
  const [search, setSearch] = useState('');
  const { selectedTool, selectTool } = useMcpPlayground();

  const { data } = useQuery({
    queryKey: ['mcp-tools'],
    queryFn: async () => {
      const res = await fetch('/api/v1/mcp/tools');
      return res.json();
    },
    staleTime: Infinity,
  });

  const tools: any[] = (data?.data ?? []).filter((t: any) =>
    !search || t.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full border-r border-border">
      <div className="p-4 border-b border-border">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Buscar tools..."
            className="pl-9 h-8 text-xs"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {tools.map((tool: any) => (
            <button
              key={tool.name}
              onClick={() => selectTool(tool.name)}
              className={`w-full text-left px-3 py-2.5 rounded-lg text-xs transition-colors ${
                selectedTool === tool.name
                  ? 'bg-[#8fa89b]/10 text-[#8fa89b] border border-[#8fa89b]/20'
                  : 'hover:bg-muted/50 text-muted-foreground'
              }`}
            >
              <div className="flex items-center gap-2">
                <Zap className="h-3 w-3 shrink-0" />
                <span className="font-mono truncate">{tool.name}</span>
              </div>
              {tool.description && (
                <p className="mt-1 text-[10px] opacity-60 truncate">{tool.description}</p>
              )}
            </button>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
```

**Step 2: `McpPlayground.tsx`** (página)

```tsx
// apps/web/src/pages/docs/McpPlayground.tsx
import { useState } from 'react';
import { useMcpPlayground } from '@/stores/mcpPlayground.store';
import { ToolExplorer } from '@/components/mcp/ToolExplorer';
import { AsyncTimeline } from '@/components/mcp/AsyncTimeline';
import { JobStatusPoller } from '@/components/mcp/JobStatusPoller';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Play, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';

export default function McpPlaygroundPage() {
  const { selectedTool, apiKey, demoMode, status, dispatch, setApiKey, setError, reset } = useMcpPlayground();
  const [inputs, setInputs] = useState<Record<string, string>>({});

  const handleDispatch = async () => {
    if (!selectedTool) return;
    if (demoMode) {
      dispatch('demo-' + crypto.randomUUID().slice(0, 8));
      return;
    }
    try {
      const res = await fetch('/api/v1/mcp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({ tool: selectedTool, inputs }),
      });
      if (res.status !== 202) throw new Error('Esperado 202 Accepted');
      const data = await res.json();
      dispatch(data.job_id);
    } catch (e: any) {
      setError(e.message);
      toast.error('Falha ao disparar tool');
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-border px-6 py-4">
        <h1 className="text-lg font-semibold">MCP Playground</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Testa tools de IA em modo assíncrono — sem chave entra em modo demonstração.
        </p>
      </div>

      <div className="flex-1 grid grid-cols-[220px_1fr_1fr] overflow-hidden">
        {/* Col 1: Tool Explorer */}
        <ToolExplorer />

        {/* Col 2: Input Form */}
        <div className="p-6 border-r border-border space-y-6 overflow-y-auto">
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground uppercase tracking-wider">API Key (opcional)</Label>
            <Input
              type="password"
              placeholder="scf_live_..."
              className="font-mono text-xs"
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
            />
            {demoMode && (
              <p className="text-[10px] text-amber-400">Sem chave — modo demonstração activo</p>
            )}
          </div>

          {selectedTool ? (
            <>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground uppercase tracking-wider">
                  Tool: <span className="font-mono text-foreground">{selectedTool}</span>
                </Label>
                {/* Inputs dinâmicos — simplificados como textarea JSON */}
                <textarea
                  className="w-full h-40 rounded-md border border-border bg-background px-3 py-2 font-mono text-xs resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder='{ "vendor_id": "uuid", "answers": {} }'
                  onChange={e => { try { setInputs(JSON.parse(e.target.value)); } catch {} }}
                />
                <p className="text-[10px] text-muted-foreground">JSON dos parâmetros da tool</p>
              </div>

              <div className="flex gap-3">
                {status !== 'idle' && (
                  <Button variant="outline" size="sm" onClick={reset} className="gap-1.5">
                    <RotateCcw className="h-3.5 w-3.5" /> Reset
                  </Button>
                )}
                <Button
                  className="flex-1 gap-2"
                  onClick={handleDispatch}
                  disabled={status !== 'idle' && status !== 'done' && status !== 'error'}
                >
                  <Play className="h-4 w-4" />
                  {demoMode ? 'Simular Disparo' : 'Disparar'}
                </Button>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">← Selecciona uma tool para começar</p>
          )}
        </div>

        {/* Col 3: Async Timeline */}
        <div className="overflow-y-auto">
          <AsyncTimeline />
        </div>
      </div>

      {/* Poller invisível */}
      <JobStatusPoller />
    </div>
  );
}
```

**Step 3: Commit**

```bash
git add apps/web/src/components/mcp/ apps/web/src/pages/docs/
git commit -m "feat(web/g14): mcp playground page — tool explorer + async 202 timeline + demo mode"
```

---

## Task 7: Webhook Manager (G15)

**Files:**
- Create: `apps/web/src/components/webhooks/WebhookConfigurator.tsx`
- Create: `apps/web/src/components/webhooks/DeliveryHistory.tsx`
- Create: `apps/web/src/components/webhooks/PayloadInspector.tsx`
- Create: `apps/web/src/pages/docs/Webhooks.tsx`

**Step 1: `PayloadInspector.tsx`**

```tsx
// apps/web/src/components/webhooks/PayloadInspector.tsx
import { lazy, Suspense } from 'react';
const JsonView = lazy(() => import('react-json-view-lite').then(m => ({ default: m.JsonView })));
import 'react-json-view-lite/dist/index.css';

interface Props { data: unknown; }

export function PayloadInspector({ data }: Props) {
  return (
    <Suspense fallback={<div className="text-xs text-muted-foreground p-4">Carregando inspector...</div>}>
      <div className="rounded-lg bg-muted/20 border border-border p-3 text-xs overflow-auto max-h-80">
        <JsonView data={data as object} />
      </div>
    </Suspense>
  );
}
```

**Step 2: `DeliveryHistory.tsx`**

```tsx
// apps/web/src/components/webhooks/DeliveryHistory.tsx
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { PayloadInspector } from './PayloadInspector';

export function DeliveryHistory({ webhookId }: { webhookId: string }) {
  const [expanded, setExpanded] = useState<string | null>(null);

  const { data } = useQuery({
    queryKey: ['webhook-deliveries', webhookId],
    queryFn: async () => {
      const res = await fetch(`/api/v1/webhooks/${webhookId}/deliveries`, { credentials: 'include' });
      return res.json();
    },
    refetchInterval: 15_000, // refresh a cada 15s
  });

  const deliveries = data?.data ?? [];

  return (
    <div className="space-y-2">
      {deliveries.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-8">Nenhuma entrega registada ainda.</p>
      )}
      {deliveries.map((d: any) => (
        <div key={d.id} className="rounded-lg border border-border overflow-hidden">
          <button
            onClick={() => setExpanded(expanded === d.id ? null : d.id)}
            className="w-full flex items-center gap-4 px-4 py-3 hover:bg-muted/20 transition-colors text-left"
          >
            {expanded === d.id ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
            <Badge variant={d.httpStatus < 300 ? 'default' : 'destructive'} className="font-mono text-xs shrink-0">
              {d.httpStatus}
            </Badge>
            <span className="text-sm font-mono text-muted-foreground flex-1 truncate">{d.event}</span>
            <span className="text-xs text-muted-foreground shrink-0">{new Date(d.deliveredAt).toLocaleString('pt-BR')}</span>
            <span className="font-mono text-[10px] text-muted-foreground/50 shrink-0">{d.traceId?.slice(0, 8)}</span>
          </button>
          {expanded === d.id && (
            <div className="px-4 pb-4 space-y-3 border-t border-border pt-4">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Payload enviado</p>
              <PayloadInspector data={d.payload} />
              {d.responseBody && (
                <>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Resposta do servidor</p>
                  <div className="rounded bg-muted/30 p-3 font-mono text-xs">{d.responseBody}</div>
                </>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
```

**Step 3: `Webhooks.tsx`** (página completa)

```tsx
// apps/web/src/pages/docs/Webhooks.tsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { DeliveryHistory } from '@/components/webhooks/DeliveryHistory';
import { toast } from 'sonner';

const EVENTS = [
  { id: 'tpra.assessment.completed', label: 'TPRA assessment concluído' },
  { id: 'vendor.risk_score.updated', label: 'Risk score de vendor actualizado' },
  { id: 'ledger.audit.alert', label: 'Alerta de auditoria no ledger' },
  { id: 'gap_analysis.approved', label: 'Gap analysis aprovado' },
  { id: 'maturity.approved', label: 'Maturity assessment aprovado' },
];

export default function WebhooksPage() {
  const [url, setUrl] = useState('');
  const [events, setEvents] = useState<string[]>([]);
  const [selectedWebhook, setSelectedWebhook] = useState<string | null>(null);
  const qc = useQueryClient();

  const { data } = useQuery({
    queryKey: ['webhooks'],
    queryFn: async () => {
      const res = await fetch('/api/v1/webhooks', { credentials: 'include' });
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/v1/webhooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, events }),
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Falha');
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['webhooks'] });
      toast.success('Webhook registado');
      setUrl(''); setEvents([]);
    },
    onError: () => toast.error('Falha ao registar webhook'),
  });

  const webhooks = data?.data ?? [];

  return (
    <div className="max-w-4xl mx-auto p-8 space-y-10 animate-page-enter">
      <div>
        <h1 className="text-2xl font-semibold">Webhooks</h1>
        <p className="text-sm text-muted-foreground mt-1">Recebe eventos assíncronos no teu sistema. Útil para integrações M2M e pipelines de GRC.</p>
      </div>

      {/* Configurador */}
      <div className="rounded-xl border border-border p-6 space-y-6">
        <h2 className="text-base font-medium">Registar destino</h2>
        <div className="space-y-2">
          <Label>URL de destino (Payload URL)</Label>
          <Input placeholder="https://seu-sistema.com/webhook" value={url} onChange={e => setUrl(e.target.value)} />
        </div>
        <div className="space-y-3">
          <Label>Eventos a subscrever</Label>
          {EVENTS.map(ev => (
            <div key={ev.id} className="flex items-center gap-3">
              <Checkbox
                id={ev.id}
                checked={events.includes(ev.id)}
                onCheckedChange={checked =>
                  setEvents(prev => checked ? [...prev, ev.id] : prev.filter(e => e !== ev.id))
                }
              />
              <Label htmlFor={ev.id} className="cursor-pointer">
                <span className="font-mono text-xs text-[#8fa89b]">{ev.id}</span>
                <span className="text-xs text-muted-foreground ml-2">— {ev.label}</span>
              </Label>
            </div>
          ))}
        </div>
        <Button onClick={() => createMutation.mutate()} disabled={!url || events.length === 0 || createMutation.isPending}>
          {createMutation.isPending ? 'Registando...' : 'Salvar webhook'}
        </Button>
      </div>

      <Separator />

      {/* Lista + histórico */}
      {webhooks.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-base font-medium">Webhooks registados</h2>
          <div className="flex gap-2 flex-wrap">
            {webhooks.map((w: any) => (
              <button
                key={w.id}
                onClick={() => setSelectedWebhook(w.id)}
                className={`px-3 py-1.5 rounded-lg border text-xs font-mono transition-colors ${
                  selectedWebhook === w.id ? 'border-[#8fa89b] text-[#8fa89b] bg-[#8fa89b]/5' : 'border-border text-muted-foreground hover:border-[#8fa89b]/30'
                }`}
              >
                {w.url.replace('https://', '').slice(0, 40)}
              </button>
            ))}
          </div>
          {selectedWebhook && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium">Histórico de entregas</h3>
              <DeliveryHistory webhookId={selectedWebhook} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

**Step 4: Commit**

```bash
git add apps/web/src/components/webhooks/ apps/web/src/pages/docs/Webhooks.tsx
git commit -m "feat(web/g15): webhook manager — configurator + delivery history + payload inspector"
```

---

## Task 8: DocsLayout + ApiReference + Rotas públicas + /llms.txt

**Files:**
- Create: `apps/web/src/pages/docs/DocsLayout.tsx`
- Create: `apps/web/src/pages/docs/ApiReference.tsx`
- Create: `apps/web/public/llms.txt`
- Modify: `apps/web/src/router.tsx` — rotas `/docs/*` sem auth

**Step 1: `DocsLayout.tsx`**

```tsx
// apps/web/src/pages/docs/DocsLayout.tsx
import { NavLink, Outlet } from 'react-router-dom';
import { Code2, Webhook, Cpu, BookOpen } from 'lucide-react';

const NAV = [
  { to: '/docs/api', label: 'API Reference', icon: BookOpen },
  { to: '/docs/mcp', label: 'MCP Playground', icon: Cpu },
  { to: '/docs/webhooks', label: 'Webhooks', icon: Webhook },
];

export default function DocsLayout() {
  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className="w-56 border-r border-border p-4 flex flex-col gap-1 shrink-0">
        <div className="flex items-center gap-2 px-2 py-3 mb-4">
          <Code2 className="h-4 w-4 text-[#8fa89b]" />
          <span className="font-brand text-sm font-medium">Developer Portal</span>
        </div>
        {NAV.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors nav-magnetic ${
                isActive ? 'bg-[#8fa89b]/10 text-[#8fa89b] nav-active-pill' : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
              }`
            }
          >
            <Icon className="h-4 w-4 nav-icon" />
            {label}
          </NavLink>
        ))}
        <div className="mt-auto pt-4 border-t border-border">
          <a href="/llms.txt" className="text-xs text-muted-foreground hover:text-[#8fa89b] transition-colors flex items-center gap-1.5 px-3 py-2">
            <Code2 className="h-3 w-3" /> llms.txt
          </a>
        </div>
      </aside>
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
```

**Step 2: `ApiReference.tsx`** (versão funcional base)

```tsx
// apps/web/src/pages/docs/ApiReference.tsx
import { useQuery } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

const METHOD_COLORS: Record<string, string> = {
  get: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  post: 'bg-[#8fa89b]/10 text-[#8fa89b] border-[#8fa89b]/20',
  put: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  patch: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  delete: 'bg-red-500/10 text-red-400 border-red-500/20',
};

export default function ApiReferencePage() {
  const { data, isLoading } = useQuery({
    queryKey: ['openapi'],
    queryFn: async () => {
      const res = await fetch('/openapi.json');
      return res.json();
    },
    staleTime: Infinity,
  });

  const paths = data?.paths ?? {};
  const tags: Record<string, any[]> = {};
  Object.entries(paths).forEach(([path, methods]: any) => {
    Object.entries(methods).forEach(([method, op]: any) => {
      const tag = op.tags?.[0] ?? 'Geral';
      if (!tags[tag]) tags[tag] = [];
      tags[tag].push({ path, method, op });
    });
  });

  if (isLoading) return <div className="p-8 text-muted-foreground">Carregando especificação...</div>;

  return (
    <div className="flex h-full overflow-hidden">
      {/* Tag nav */}
      <ScrollArea className="w-48 border-r border-border p-3 shrink-0">
        {Object.keys(tags).map(tag => (
          <a key={tag} href={`#${tag}`} className="block px-3 py-2 text-xs text-muted-foreground hover:text-foreground rounded hover:bg-muted/30 transition-colors">{tag}</a>
        ))}
      </ScrollArea>

      {/* Endpoints */}
      <ScrollArea className="flex-1 p-6">
        <div className="space-y-10">
          {Object.entries(tags).map(([tag, routes]) => (
            <section key={tag} id={tag}>
              <h2 className="text-base font-semibold mb-4 text-foreground">{tag}</h2>
              <div className="space-y-2">
                {routes.map(({ path, method, op }) => (
                  <div key={`${method}:${path}`} className="rounded-lg border border-border p-4 hover:border-[#8fa89b]/30 transition-colors">
                    <div className="flex items-center gap-3">
                      <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded border ${METHOD_COLORS[method] ?? ''}`}>
                        {method}
                      </span>
                      <code className="font-mono text-sm text-foreground">{path}</code>
                    </div>
                    {op.summary && <p className="text-xs text-muted-foreground mt-2">{op.summary}</p>}
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
```

**Step 3: `public/llms.txt`**

```
# Standard API — AI Agent Context (llms.txt)
# https://llmstxt.org

> Standard é uma plataforma SaaS API-first para assessments de segurança e conformidade baseados no SCF (Secure Controls Framework).

## Base URL
https://api.standard.grc/v1

## Authentication
Authorization: Bearer <api_key>
API Keys: POST /api/v1/api-keys

## Core Modules
- SCF Controls: GET /api/v1/scf/controls
- Assessments: CRUD /api/v1/assessments
- Gap Analysis: /api/v1/gap-analysis
- TPRA (Third-Party Risk): /api/v1/tpra/vendors
- MCP Tools (async): POST /api/v1/mcp → 202 + job_id

## Async Pattern (MCP)
POST /api/v1/mcp → 202 Accepted { job_id }
GET  /api/v1/jobs/:job_id → { status: "processing"|"completed"|"failed", result }

## OpenAPI Spec
GET /openapi.json

## MCP Tools Schema
GET /api/v1/mcp/tools

## Key Design Rules
- Multi-tenant: sempre incluir organization_id no contexto
- STRM compliance: não usar fórmula binária (ver ADR-001)
- MCP tools são async: nunca esperar resposta síncrona (ver ADR-003)
- Ledger append-only: assessment_control_events (ver ADR-002)
```

**Step 4: Adicionar rotas em `router.tsx`**

```tsx
import DocsLayout from '@/pages/docs/DocsLayout';
import ApiReferencePage from '@/pages/docs/ApiReference';
import McpPlaygroundPage from '@/pages/docs/McpPlayground';
import WebhooksPage from '@/pages/docs/Webhooks';

// Adicionar ao router (sem auth guard):
{
  path: '/docs',
  element: <DocsLayout />,
  children: [
    { index: true, element: <Navigate to="/docs/api" replace /> },
    { path: 'api', element: <ApiReferencePage /> },
    { path: 'mcp', element: <McpPlaygroundPage /> },
    { path: 'webhooks', element: <WebhooksPage /> },
  ],
}
```

**Step 5: Verificar typecheck**

```bash
cd apps/web && npx tsc --noEmit
```
Expected: 0 erros.

**Step 6: Commit**

```bash
git add apps/web/src/pages/docs/ apps/web/public/llms.txt apps/web/src/router.tsx
git commit -m "feat(web): docs portal — api reference, mcp playground, webhooks, /llms.txt public"
```

---

## Task 9: Verificação final + push

**Step 1: Smoke test local**

```bash
pnpm dev:web
```

Verificar manualmente:
- [ ] `/admin/api-keys` — tabela carrega, botão "Nova Chave" abre Sheet
- [ ] Sheet step 1 → step 2 → step 3 exibe SecretDisplayOverlay
- [ ] Fechar Sheet após exibir chave → reabrir NÃO exibe a chave (token destruído)
- [ ] `/docs/api` carrega OpenAPI spec
- [ ] `/docs/mcp` — modo demo: clicar "Simular Disparo" → timeline anima 202 → polling → resultado
- [ ] `/docs/webhooks` — formulário de webhook, history vazio sem dados
- [ ] `/llms.txt` acessível sem login

**Step 2: Typecheck monorepo**

```bash
pnpm typecheck
```
Expected: 0 erros.

**Step 3: Commit final + push**

```bash
git add -A
git commit -m "feat(web): frontend part 5 complete — g13 g14 g15 + docs portal + llms.txt"
git push
```

---

## Matriz de Gap — Validação Final

| Gap | Critério | Solução implementada | Status |
|-----|---------|---------------------|--------|
| G12 | Edge tenant isolation | CF Worker shim (tech debt documentado) | ⚠️ Parcial |
| G13 | Secret display one-shot | `SecretDisplayOverlay` + Zustand `clear()` no close | ✅ |
| G14 | Async MCP 202 | `AsyncTimeline` + `JobStatusPoller` + Zustand job state | ✅ |
| G15 | Webhook payload logs | `DeliveryHistory` + `PayloadInspector` lazy | ✅ |
