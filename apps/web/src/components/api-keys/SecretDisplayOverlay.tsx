import { Copy, Check, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';
import { useSecretDisplay } from '@/stores/secretDisplay.store';

/**
 * G13 — One-shot secret display.
 * Renders only when token is present in Zustand store.
 * Token is destroyed via store.clear() when the parent Sheet closes.
 */
export function SecretDisplayOverlay() {
  const { token, copied, markCopied } = useSecretDisplay();

  if (!token) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(token);
      markCopied();
      toast.success('Chave copiada — guarda-a agora num gestor de secrets seguro');
    } catch {
      toast.error('Falha ao copiar — selecciona e copia manualmente');
    }
  };

  return (
    <div className="rounded-lg border border-amber-500/50 bg-amber-950/40 p-5 space-y-4">
      {/* Security warning */}
      <div className="flex items-start gap-3">
        <ShieldAlert className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" aria-hidden />
        <p className="text-sm text-amber-200 leading-relaxed">
          <strong className="font-semibold">Esta chave não poderá ser recuperada ou exibida novamente.</strong>
          {' '}Copia-a agora e guarda-a num gestor de secrets seguro (ex: 1Password, AWS Secrets Manager).
        </p>
      </div>

      {/* Token display */}
      <div className="flex items-center gap-3 rounded-md bg-background/60 border border-border px-4 py-3">
        <code
          id="api-key-secret"
          className="font-mono text-sm text-foreground flex-1 break-all select-all"
          aria-label="Chave de API gerada"
        >
          {token}
        </code>
        <button
          onClick={handleCopy}
          className="shrink-0 p-2 rounded-md hover:bg-muted transition-colors focus-ring"
          aria-label={copied ? 'Copiado' : 'Copiar chave'}
          title={copied ? 'Copiado!' : 'Copiar para área de transferência'}
        >
          {copied
            ? <Check className="h-4 w-4 text-[#8fa89b]" />
            : <Copy className="h-4 w-4 text-muted-foreground" />
          }
        </button>
      </div>

      {copied && (
        <p className="text-xs text-[#8fa89b] text-center animate-slide-up">
          ✓ Copiado — agora podes fechar este painel com segurança
        </p>
      )}
    </div>
  );
}
