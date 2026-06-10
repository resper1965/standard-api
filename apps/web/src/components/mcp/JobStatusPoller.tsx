import { useEffect, useRef } from 'react';
import { useMcpPlayground } from '@/stores/mcpPlayground.store';

const POLL_INTERVAL_MS = 2_000;
const MAX_POLLS = 30; // 60s max

/**
 * Headless poller — mounts inside McpPlayground page.
 * When store status is 'dispatched' or 'polling', polls GET /api/v1/mcp/jobs/:jobId
 * and updates the store via setDone / setError / setPolling.
 *
 * ADR-003 compliant: no synchronous awaiting of tool dispatch.
 */
export function JobStatusPoller() {
  const { status, jobId, setPolling, setDone, setError } = useMcpPlayground();
  const pollCountRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (status !== 'dispatched' && status !== 'polling') {
      pollCountRef.current = 0;
      if (timerRef.current) clearTimeout(timerRef.current);
      return;
    }
    if (!jobId) return;

    const poll = async () => {
      pollCountRef.current += 1;
      if (pollCountRef.current > MAX_POLLS) {
        setError('Timeout — o job demorou mais de 60s. Verifica a consola AI Gateway.');
        return;
      }

      try {
        setPolling();
        const res = await fetch(`/api/v1/mcp/jobs/${jobId}`, { credentials: 'include' });

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          setError(body?.error?.message ?? `HTTP ${res.status}`);
          return;
        }

        const data = await res.json();
        const jobStatus: string = data?.data?.status ?? data?.status ?? 'pending';

        if (jobStatus === 'completed' || jobStatus === 'done') {
          setDone(data?.data?.result ?? data?.result ?? data);
        } else if (jobStatus === 'failed' || jobStatus === 'error') {
          setError(data?.data?.error ?? data?.error ?? 'Job falhou sem mensagem');
        } else {
          // Still pending — poll again
          timerRef.current = setTimeout(poll, POLL_INTERVAL_MS);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Falha na rede durante polling');
      }
    };

    timerRef.current = setTimeout(poll, POLL_INTERVAL_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [status, jobId, setPolling, setDone, setError]);

  return null; // headless
}
