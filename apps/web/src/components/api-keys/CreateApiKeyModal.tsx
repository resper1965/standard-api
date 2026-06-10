import { useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { SecretDisplayOverlay } from './SecretDisplayOverlay';
import { useSecretDisplay } from '@/stores/secretDisplay.store';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

/* ── Scope catalogue ───────────────────────────────────────────────── */
const SCOPE_GROUPS: Record<string, string[]> = {
  Assessment: ['assessment:read', 'assessment:create'],
  TPRA: ['tpra:read', 'tpra:write'],
  Privacy: ['privacy:read', 'privacy:write'],
  'Knowledge Base': ['kb:read', 'kb:write'],
  Admin: ['admin:read'],
};

type Step = 1 | 2 | 3;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/* ── Step indicator ─────────────────────────────────────────────────── */
function StepIndicator({ current }: { current: Step }) {
  const labels = ['Detalhes', 'Escopos', 'Chave Gerada'];
  return (
    <div className="flex items-center gap-0 mb-6" role="list" aria-label="Etapas">
      {labels.map((label, i) => {
        const step = (i + 1) as Step;
        const isActive = current === step;
        const isDone = current > step;
        return (
          <div key={step} className="flex items-center" role="listitem">
            <div className="flex flex-col items-center gap-1">
              <span
                className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-semibold border transition-colors ${
                  isActive
                    ? 'border-[#8fa89b] bg-[#8fa89b]/10 text-[#8fa89b]'
                    : isDone
                    ? 'border-[#8fa89b] bg-[#8fa89b] text-[#1a1d20]'
                    : 'border-border text-muted-foreground'
                }`}
                aria-current={isActive ? 'step' : undefined}
              >
                {isDone ? '✓' : step}
              </span>
              <span className={`text-[10px] ${isActive ? 'text-[#8fa89b]' : 'text-muted-foreground'}`}>
                {label}
              </span>
            </div>
            {i < labels.length - 1 && (
              <span className={`h-px w-8 mx-1 mb-4 ${isDone ? 'bg-[#8fa89b]/40' : 'bg-border'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ── Main modal ─────────────────────────────────────────────────────── */
export function CreateApiKeyModal({ open, onOpenChange }: Props) {
  const [step, setStep] = useState<Step>(1);
  const [name, setName] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [scopes, setScopes] = useState<string[]>([]);

  const { set: setToken, clear } = useSecretDisplay();
  const qc = useQueryClient();

  /* CRÍTICO (G13): on close destroy token + reset form */
  const handleClose = (v: boolean) => {
    if (!v) {
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
        body: JSON.stringify({
          name: name.trim(),
          scopes,
          expiresAt: expiresAt || undefined,
        }),
        credentials: 'include',
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error?.message ?? 'Falha ao criar chave');
      }
      return res.json() as Promise<{ data: { raw_key: string } }>;
    },
    onSuccess: (data) => {
      setToken(data.data.raw_key); // raw_key only exists in this single response
      qc.invalidateQueries({ queryKey: ['api-keys'] });
      setStep(3);
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  const toggleScope = (scope: string) =>
    setScopes((prev) =>
      prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope],
    );

  const sheetTitle =
    step === 1 ? 'Nova Chave — Detalhes' :
    step === 2 ? 'Nova Chave — Escopos' :
    'Chave Gerada com Sucesso';

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent
        id="create-api-key-sheet"
        className="w-full sm:max-w-lg flex flex-col overflow-y-auto"
      >
        <SheetHeader className="pb-2">
          <SheetTitle>{sheetTitle}</SheetTitle>
          {step < 3 && (
            <SheetDescription>
              Passo {step} de 2 — {step === 1 ? 'defina o nome e expiração' : 'seleccione os escopos de acesso'}
            </SheetDescription>
          )}
        </SheetHeader>

        <div className="flex-1 mt-4">
          <StepIndicator current={step} />

          {/* ── Step 1: Details ─────────────────────────────────── */}
          {step === 1 && (
            <div className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="key-name">Nome / Propósito *</Label>
                <Input
                  id="key-name"
                  placeholder="ex: Integração Hub GRC Interno"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoFocus
                />
                <p className="text-xs text-muted-foreground">
                  Descreve onde esta chave será usada — facilita a auditoria.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="key-expires">Data de expiração (opcional)</Label>
                <Input
                  id="key-expires"
                  type="date"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
              <Button
                id="btn-step1-continue"
                className="w-full"
                onClick={() => setStep(2)}
                disabled={!name.trim()}
              >
                Continuar →
              </Button>
            </div>
          )}

          {/* ── Step 2: Scopes ──────────────────────────────────── */}
          {step === 2 && (
            <div className="space-y-6">
              {Object.entries(SCOPE_GROUPS).map(([group, groupScopes]) => (
                <div key={group}>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                    {group}
                  </p>
                  <div className="space-y-2.5">
                    {groupScopes.map((scope) => (
                      <div key={scope} className="flex items-center gap-3">
                        <Checkbox
                          id={`scope-${scope}`}
                          checked={scopes.includes(scope)}
                          onCheckedChange={() => toggleScope(scope)}
                        />
                        <Label
                          htmlFor={`scope-${scope}`}
                          className="font-mono text-xs text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
                        >
                          {scope}
                        </Label>
                      </div>
                    ))}
                  </div>
                  <Separator className="mt-4" />
                </div>
              ))}

              {scopes.length > 0 && (
                <div className="rounded-md bg-muted/30 px-3 py-2">
                  <p className="text-[10px] text-muted-foreground mb-1">Escopos seleccionados:</p>
                  <p className="font-mono text-xs text-[#8fa89b] break-all">{scopes.join(' ')}</p>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <Button
                  id="btn-step2-back"
                  variant="outline"
                  onClick={() => setStep(1)}
                  className="w-24"
                >
                  ← Voltar
                </Button>
                <Button
                  id="btn-step2-generate"
                  className="flex-1"
                  onClick={() => createMutation.mutate()}
                  disabled={scopes.length === 0 || createMutation.isPending}
                >
                  {createMutation.isPending ? 'Gerando...' : 'Gerar Chave'}
                </Button>
              </div>
            </div>
          )}

          {/* ── Step 3: Secret Display (G13) ────────────────────── */}
          {step === 3 && (
            <div className="space-y-5">
              <SecretDisplayOverlay />
              <Button
                id="btn-step3-close"
                variant="outline"
                className="w-full"
                onClick={() => handleClose(false)}
              >
                Fechar com segurança
              </Button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
