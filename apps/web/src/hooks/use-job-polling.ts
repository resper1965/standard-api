import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '@/lib/api';

export interface JobStatus {
  job_id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  output?: Record<string, any> | null;
  created_at?: string;
  updated_at?: string;
  error?: string;
}

export function useJobPolling(jobId: string | null, intervalMs: number = 3000) {
  const [job, setJob] = useState<JobStatus | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  // Ref to track if component is unmounted to prevent state updates
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const fetchJobStatus = useCallback(async () => {
    if (!jobId) return;

    try {
      const data = await api<{ job_id: string; status: any; output: any; created_at: string; updated_at: string }>(
        `/api/v1/jobs/${jobId}`,
        { method: 'GET' }
      );
      
      if (!isMounted.current) return;
      
      setJob(data as JobStatus);
      setError(null);

      // Stop polling when it hits a terminal state
      if (data.status === 'completed' || data.status === 'failed') {
        setIsPolling(false);
      }
    } catch (err: any) {
      if (!isMounted.current) return;
      
      console.error("[useJobPolling] Error:", err);
      setError(err instanceof Error ? err : new Error(String(err)));
      // Consider if we should stop polling on transient networking errors.
      // For now, we stop polling on error to prevent cascading failure logs.
      setIsPolling(false); 
    }
  }, [jobId]);

  useEffect(() => {
    if (!jobId) {
      setJob(null);
      setIsPolling(false);
      setError(null);
      return;
    }

    setIsPolling(true);
    fetchJobStatus(); // Immediate initial fetch

    const intervalId = setInterval(() => {
      if (isMounted.current) {
         fetchJobStatus();
      }
    }, intervalMs);

    return () => clearInterval(intervalId);
  }, [jobId, intervalMs, fetchJobStatus]);

  // Expose a stop method to manually halt
  const stopPolling = useCallback(() => setIsPolling(false), []);

  return { job, isPolling, error, stopPolling };
}
